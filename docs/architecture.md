# CareBridge AI — System Architecture

**Project:** CareBridge AI  
**Team:** ALPHA  
**Competition:** Future Health Challenge — Population Health  
**Tagline:** *"Connecting Every Patient to the Care They Need."*  
**Supporting Tagline:** *"From health screening to timely care — one intelligent healthcare connection."*  
**Architecture Revision:** Phase 5 (Patient Dashboard, Private Report Storage & Ownership-Scoped Patient Portal)

---

## 1. Architectural Overview

CareBridge AI follows a modular three-tier architecture designed for strict security boundaries, clean separation of concerns, testability, and incremental delivery:

```text
┌──────────────────────────────────────────────────────────────────────┐
│                     Presentation Tier (frontend/)                    │
│  React 19 · Vite 7 · TypeScript (Strict) · Tailwind CSS 4            │
│  AuthContext · ProtectedRoute · RoleGuard · GuestOnlyRoute           │
│  Axios Client (withCredentials + X-CSRF-Token + Silent 401 Refresh)  │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │  Same-Origin HTTP(S) / JSON (/api/*)
                                   │  HttpOnly Cookies + X-CSRF-Token
┌──────────────────────────────────▼───────────────────────────────────┐
│                     Application Tier (backend/)                      │
│  FastAPI · Uvicorn · Pydantic v2 · Security Headers · CORS           │
│  ├── api/deps/    JWT/cookie extraction, CSRF check, require_roles   │
│  ├── api/routes/  health.py, auth.py, roles.py (patient/doctor/admin)│
│  ├── schemas/     Strict request/response contracts (no secret leak) │
│  ├── services/    auth_service.py (signup, login, rotation, admin)   │
│  ├── models/      User (UserRole) & RefreshToken ORM entities        │
│  ├── cli/         create_admin.py (secure initial ADMIN bootstrap)   │
│  ├── middleware/  Centralized non-leaking error & validation handler │
│  └── core/        config.py, security.py (Argon2id/JWT), rate_limit  │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │  SQLAlchemy 2.x ORM + Alembic
┌──────────────────────────────────▼───────────────────────────────────┐
│                      Data Tier (PostgreSQL / SQLite)                 │
│  Primary: PostgreSQL 16 (psycopg v3)                                 │
│  Fallback: SQLite (carebridge_dev.db with PRAGMA foreign_keys = ON)  │
│  Tables: alembic_version, users, refresh_tokens                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication & Session Lifecycle (Phase 3)

1. **Registration (`POST /api/auth/register`):**
   - Validates and trims `full_name`, normalizes and validates `email` (stored lowercase with unique index), enforces password complexity (`8–128` characters, uppercase, lowercase, digit, special character) and confirmation match, and hashes passwords with **Argon2id** (`argon2-cffi`).
   - Rejects unknown fields (`extra="forbid"`) and blocks public `ADMIN` requests (`403 admin_registration_forbidden`).
   - Assigns `PATIENT` by default. If a registrant requests `DOCTOR`, the account is persisted as `role=PATIENT` with `requested_role=DOCTOR` until an `ADMIN` verifies and approves promotion.

2. **Login & Cookie Transport (`POST /api/auth/login`):**
   - Protected by per-IP and per-(account, IP) sliding-window rate limiting (`429 Too Many Requests` with `Retry-After`).
   - Performs timing-safe dummy Argon2id verification on unknown emails and returns an identical generic `401` for invalid email or wrong password to prevent account enumeration; rejects inactive accounts (`403`).
   - Issues three cookies (zero tokens stored in `localStorage` or `sessionStorage`):
     - `cb_access_token` — `HttpOnly`, `SameSite=Lax`, `Path=/`, short-lived signed JWT (`sub`, `role`, `ver`, `iat`, `exp`, `iss`, `aud`, `jti`).
     - `cb_refresh_token` — `HttpOnly`, `SameSite=Lax`, `Path=/api/auth`, opaque 256-bit random token (only its SHA-256 hash is stored in `refresh_tokens`); scoped as a browser-session cookie by default or persistent (`REFRESH_TOKEN_EXPIRE_DAYS`) when `remember_session=true`.
     - `cb_csrf_token` — readable `SameSite=Lax` cookie mirrored by Axios into the `X-CSRF-Token` header on unsafe methods and verified in constant time on the server.
   - Outside local development/test environments, `Secure=True` and a `SECRET_KEY` of at least 32 characters are strictly enforced.

3. **Session Restoration & Silent Refresh (`GET /api/auth/me`, `POST /api/auth/refresh`):**
   - On page load or refresh, `AuthProvider` calls `GET /api/auth/me`. If the short-lived access cookie has expired, the Axios response interceptor runs a single-flight `POST /api/auth/refresh` (with `X-CSRF-Token`) and retries `/auth/me`.
   - Each refresh marks the previous `refresh_tokens` row revoked and links it via `replaced_by_id` within a `family_id`. Replaying an already-rotated or revoked refresh token immediately revokes the entire token family, increments `users.token_version`, and clears stale cookies.

4. **Logout & Immediate Invalidation (`POST /api/auth/logout`):**
   - Verifies CSRF, revokes the active `refresh_tokens` row in the database, increments `users.token_version` so any previously issued access JWT is rejected immediately on the next request, and clears all three auth cookies.

---

## 3. Role-Based Access Control (RBAC)

Authorization is enforced independently at both layers, with the backend acting as the sole source of truth:

- **Backend (`app/api/deps/auth.py`):** Reusable FastAPI dependencies (`get_current_user`, `get_current_active_user`, `require_roles(...)`, `require_patient`, `require_doctor`, `require_admin`) verify JWT signature/expiry/issuer/audience, load the live `User` row, check `is_active` and `token_version`, and enforce allowed roles (`401` unauthenticated, `403` wrong role or inactive).
- **Admin Governance (`app/api/routes/roles.py` & `app/cli/create_admin.py`):** Initial `ADMIN` accounts are provisioned via CLI (`python -m app.cli.create_admin`) with duplicate-admin protection. Authenticated admins can list/filter accounts, onboard verified clinicians, approve or decline pending `DOCTOR` requests, and activate/deactivate users while self-demotion and self-deactivation are blocked.
- **Frontend (`src/components/auth/`):** `ProtectedRoute` redirects unauthenticated visitors to `/login` (preserving safe return path), `RoleGuard` renders a dedicated `403` `UnauthorizedPage` when a signed-in user navigates outside their role portal, and `GuestOnlyRoute` routes already-authenticated users from `/login` and `/register` directly to their role home (`/patient`, `/doctor`, or `/admin`).

---

## 4. Database Schema & Migration Strategy

- **`0001_initial_foundation`:** Baseline Alembic migration scaffold.
- **`0002_auth_users_and_refresh_tokens`:** Non-destructive, reversible migration creating:
  - `users`: `id` (UUID PK), `full_name`, `email` (unique + indexed), `hashed_password`, `role` (`PATIENT`/`DOCTOR`/`ADMIN`, CHECK-constrained + indexed), `requested_role` (nullable `DOCTOR`, CHECK-constrained), `is_active`, `is_verified`, `token_version`, `created_at`, `updated_at`.
  - `refresh_tokens`: `id` (UUID PK), `user_id` (FK → `users.id` `ON DELETE CASCADE`, indexed), `token_hash` (unique + indexed SHA-256), `family_id` (indexed), `is_persistent`, `expires_at` (indexed), `revoked_at`, `replaced_by_id`, `created_at`.
- **`0003_patient_portal_models`:** Non-destructive, reversible migration creating Phase 5 patient portal tables:
  - `patient_profiles`: 1:1 with `users.id` (unique FK `ON DELETE CASCADE`), optional `date_of_birth`, `phone_number`, `gender`, `city`, `state`, required `preferred_language` (`en`/`hi`), optional `emergency_contact_name`, `emergency_contact_phone`, timestamps.
  - `medical_reports`: `patient_id` (FK → `users.id`), sanitized `original_filename`, unique opaque `stored_filename` (never exposed to clients), magic-byte-verified `file_type` (`PDF`/`PNG`/`JPG`), `file_size`, `upload_status`, `review_status`, timestamps.
  - `risk_assessments`: Read-only extensible schema (`patient_id`, nullable `related_report_id`, nullable `reviewed_by_doctor_id`, `status`, nullable `risk_category`, `explanation`, `recommended_action`, `assessed_at`, timestamps). Automated risk generation is intentionally deferred beyond Phase 5.
  - `appointments`: `patient_id`, nullable `doctor_id`, timezone-aware `scheduled_at`, `appointment_type`, `status` (`PENDING`/`CONFIRMED`/`COMPLETED`/`CANCELLED`), `location_or_mode`, `notes`, timestamps.
  - `referrals`: Read-only for patients (`patient_id`, nullable `referring_doctor_id`, `referred_department`, restricted `reason`, `next_action`, `status` in `PENDING`/`ACCEPTED`/`SCHEDULED`/`COMPLETED`/`CANCELLED`, timestamps).
  - `follow_ups`: `patient_id`, nullable `related_appointment_id`, nullable `related_referral_id`, timezone-aware `scheduled_at`, `follow_up_type`, `status` (`PENDING`/`COMPLETED`/`MISSED`/`CANCELLED`), restricted `notes`, timestamps.
  - `notifications`: In-app user notifications (`user_id`, `title`, `message`, `notification_type`, `is_read`, `created_at`).

---

## 5. Private Medical Report Storage & Ownership Enforcement (Phase 5)

- **Ownership Boundary:** Every `/api/patient/*` endpoint derives identity exclusively from `PatientUser` (server-verified access JWT + active `PATIENT` role + CSRF token on cookie mutations). Non-owned IDs return `404 Not Found` to prevent cross-patient enumeration, and all input payloads enforce `extra="forbid"`.
- **Upload Security (`app/services/file_storage.py`):** Streams uploads in 64 KiB chunks enforcing `MAX_REPORT_UPLOAD_MB` (default `10` MB, `413` on overflow), rejects executables/scripts/SVG/double-extensions/empty files, validates PDF (`%PDF-` + `%%EOF`), PNG (`IHDR` + `IEND`), and JPEG (`SOI` + `EOI`) binary signatures, writes atomically (`0600`) under private git-ignored `UPLOAD_STORAGE_DIR` (`0700`) using random UUID hex keys, rolls back on DB failure, and streams downloads solely through `GET /api/patient/reports/{id}/download` with `X-Content-Type-Options: nosniff`, `Cache-Control: no-store, private`, and `Content-Security-Policy: default-src 'none'; sandbox`.
- **Browser Storage Hygiene:** Zero auth tokens and zero patient medical/profile records are written to `localStorage` or `sessionStorage` (only `carebridge-theme` and `carebridge-language` UI preferences are stored).

---

## 6. Current Scope Boundary

All nine patient portal routes (`/patient/*`) are backed by real database persistence and strict access control. Doctor (`/doctor/*`) and Admin (`/admin/*`) clinical views remain backed by synthetic preview datasets until their dedicated phases. Gemini AI integration, automated medical report extraction, clinical risk calculation, automated referral/scheduling generation, external SMS/email/push delivery, and live population-health analytics are intentionally deferred to subsequent phases.
