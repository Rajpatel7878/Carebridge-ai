# CareBridge AI

> **"Connecting Every Patient to the Care They Need."**  
> *From health screening to timely care — one intelligent healthcare connection.*

**Team:** ALPHA  
**Competition:** Future Health Challenge  
**Category:** Population Health  
**Current Status:** Working patient/doctor prototype with partial live administrator analytics and report analysis; master build incomplete. See [synthetic demo setup](docs/demo.md) and the [current feature report](FINAL_COMPLETION_REPORT.md) for verified status and limitations.

---

## 1. Project Overview

**CareBridge AI** is an intelligent population-health web platform developed by **Team ALPHA** for the **Future Health Challenge**. It is engineered to bridge the gap between early health screening and timely clinical follow-up by connecting patients, healthcare providers, and public-health administrators on a single unified platform.

---

## 2. Problem Statement

Across community and population-health programs, early screening initiatives frequently fail to translate into timely care:

- Diagnostic and screening reports are difficult for patients to interpret, delaying care-seeking behavior.
- High-risk individuals are not consistently prioritized when clinician capacity is constrained.
- Referrals, follow-up appointments, and care handoffs are fragmented across disconnected workflows, leading to preventable drop-offs.
- Health administrators lack real-time, structured visibility into population-level risk trends and care-completion bottlenecks.

---

## 3. Proposed Solution

CareBridge AI closes the screening-to-care loop through a coordinated digital foundation designed to support:

- **Secure Role-Scoped Workspaces:** Dedicated, server-enforced portals for **Patients** (`PATIENT`), **Doctors** (`DOCTOR`), and **Administrators** (`ADMIN`).
- **AI-Assisted Report Understanding *(upcoming)*:** Plain-language summaries of screening reports with transparent uncertainty disclosures and clinician oversight.
- **Explainable Risk Prioritization *(upcoming)*:** Structured triage cues that help care teams identify urgent follow-ups faster.
- **Closed-Loop Care Coordination:** Live, assignment-scoped clinical report reviews, clinical risk reviews, appointment confirmation/rejection/rescheduling/completion, specialist referral generation with full status history, follow-up milestone tracking with overdue alerts, and in-app notifications across patients, doctors, and administrators.
- **Population-Health Visibility *(upcoming)*:** Aggregated operational and population-level insights for healthcare administrators, plus multilingual accessibility.

> **Clinical Safety Notice:** CareBridge AI is a hackathon prototype designed for demonstration with synthetic/fictional data. AI features are assistive only and do not constitute medical diagnosis or prescription.

---

## 4. Technology Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 19, Vite 7, TypeScript 5 (strict mode), Tailwind CSS 4, React Router 7, Axios, Lucide React, Recharts, React Hook Form, Zod |
| **Code Quality** | ESLint 10, Prettier 3, TypeScript strict compiler checks |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, `python-multipart`, Pydantic v2, Pydantic Settings, python-dotenv, `email-validator` |
| **Authentication & Security** | Argon2id (`argon2-cffi`), PyJWT (`HS256`), HttpOnly `SameSite=Lax` cookies (`Secure` in HTTPS production), double-submit CSRF protection, refresh-token rotation + replay revocation, per-user `token_version` invalidation, sliding-window auth rate limiting |
| **Database & ORM** | PostgreSQL 16 (primary), Psycopg 3, SQLAlchemy 2, Alembic migrations, SQLite (automatic local dev fallback) |
| **Testing** | Pytest + HTTPX / FastAPI TestClient (backend), Vitest + React Testing Library + jsdom (frontend) |
| **Containerization** | Docker, Docker Compose, Nginx (optional for local development) |

---

## 5. Project Architecture

```text
Browser (React 19 + Vite + TypeScript + Tailwind CSS + AuthContext/RoleGuard)
        │
        │  Same-Origin HTTP(S) / JSON (/api/*)
        │  HttpOnly SameSite Cookies + X-CSRF-Token Header
        ▼
FastAPI Backend (CORS + Security Headers + CSRF + Rate Limiting + RBAC Deps)
        │
        │  Auth Service (Argon2id + Signed JWT + Rotating Refresh Tokens)
        │  SQLAlchemy 2.x ORM + Alembic Migrations
        ▼
PostgreSQL 16 (Primary)  ──or──▶  SQLite (Local Dev Fallback)
```

See [`docs/architecture.md`](docs/architecture.md) for complete system, authentication, and RBAC architectural details.

---

## 6. Folder Structure

```text
carebridge-ai/
├── frontend/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/          # ProtectedRoute, RoleGuard, GuestOnlyRoute
│   │   │   ├── charts/        # Recharts clinical & population charts
│   │   │   ├── common/        # Design-system primitives, Pagination, Logo, ThemeToggle, LanguageSwitcher
│   │   │   ├── dashboard/     # StatCard, DataTable, ActivityFeed, CareAssignmentsPanel, modals
│   │   │   ├── forms/         # Input, Textarea, PasswordInput, Select, SearchBar, filters
│   │   │   ├── landing/       # HeroEcosystemVisual, MultilingualShowcase, SectionHeading
│   │   │   └── navigation/    # PublicNavbar, PublicFooter, DashboardNavbar, Sidebar
│   │   ├── contexts/          # AuthContext, PatientPortalContext, DoctorPortalContext, ThemeContext, LanguageContext, DemoContext
│   │   ├── data/              # Fictional synthetic preview datasets (Admin preview views)
│   │   ├── hooks/             # useAuth, usePatientPortal, useDoctorPortal, useTheme, useLanguage, useDemo, useDocumentTitle
│   │   ├── i18n/              # Typed English (en) & Hindi (hi) translation dictionaries
│   │   ├── layouts/           # PublicLayout, AuthLayout, DashboardLayout
│   │   ├── pages/             # public/, auth/, patient/ (live API), doctor/ (12 live API pages), admin/
│   │   ├── routes/            # AppRouter (40 routes + RBAC guards) & navigation config
│   │   ├── services/          # api.ts (credentials + CSRF + silent refresh), auth.ts, patient.ts, doctor.ts
│   │   ├── styles/            # tokens.css (light & dark healthcare tokens)
│   │   ├── test/              # app.test.tsx, patient-portal.test.tsx, doctor-portal.test.tsx (Vitest + RTL)
│   │   ├── types/             # auth.ts, patient.ts, doctor.ts, api.ts, domain.ts
│   │   └── utils/             # env.ts, password.ts, scroll.ts, format.ts, cn.ts
│   ├── .env.example
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── alembic/
│   │   ├── versions/
│   │   │   ├── 0001_initial_foundation.py
│   │   │   ├── 0002_auth_users_and_refresh_tokens.py
│   │   │   ├── 0003_patient_portal_models.py
│   │   │   └── 0004_doctor_portal_models.py
│   │   └── env.py
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps/          # get_current_user, get_current_active_user, require_roles, verify_csrf
│   │   │   ├── routes/        # health.py, auth.py, roles.py, patient.py, doctor.py
│   │   │   └── router.py
│   │   ├── cli/               # create_admin.py (secure initial ADMIN provisioning)
│   │   ├── core/              # config.py, security.py, rate_limit.py, exceptions.py
│   │   ├── database/          # base.py, session.py
│   │   ├── middleware/        # error_handler.py (safe non-leaking JSON errors)
│   │   ├── models/            # User, RefreshToken, PatientProfile, DoctorProfile, PatientDoctorAssignment, MedicalReport, ReportReview, RiskAssessment, ClinicalReview, Appointment, Referral, ReferralHistory, FollowUp, Notification
│   │   ├── schemas/           # auth.py, health.py, patient.py, doctor.py
│   │   ├── services/          # auth_service.py, patient.py, doctor.py, notifications.py, file_storage.py
│   │   ├── ai/                # Reserved for later phases
│   │   └── main.py
│   ├── uploads/               # Private git-ignored medical report storage (0700 dir / 0600 files)
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_health.py
│   │   ├── test_auth.py
│   │   ├── test_patient.py
│   │   └── test_doctor.py
│   ├── .env.example
│   ├── alembic.ini
│   ├── Dockerfile
│   ├── pytest.ini
│   └── requirements.txt
│
├── docs/
│   └── architecture.md
├── scripts/
│   └── verify-phase1.sh
├── .env.example
├── .gitignore
├── docker-compose.yml
├── LICENSE
└── README.md
```

---

## 7. Prerequisites

### Local Development (without Docker)

- **Node.js** `>= 20.19` or `>= 22.13` (tested on Node.js `v22.22.3`) and **npm** `>= 10`
- **Python** `>= 3.11` with `venv` and `pip`
- **Git** `>= 2.30`
- **PostgreSQL** `15+` *(optional — local SQLite fallback works automatically when `DATABASE_URL` is unset)*

### Containerized Development (optional)

- **Docker Engine** `>= 24` and **Docker Compose** `v2`

---

## 8. Installation & Configuration

### 1. Clone the Repository

```bash
git clone https://github.com/Rajpatel7878/Carebridge-ai.git
cd Carebridge-ai
```

### 2. Configure Environment Files

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Generate a strong `SECRET_KEY` (`>= 32` characters) and paste it into `backend/.env` (and `.env` if using Docker):

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

### 3. Install Backend Dependencies & Run Migrations

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows (PowerShell): .venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
# RapidOCR and headless OpenCV share files; restore the headless wheel last.
pip install --force-reinstall --no-deps opencv-python-headless==5.1.0.95

# Apply Alembic migrations (creates users & refresh_tokens tables non-destructively)
alembic upgrade head
cd ..
```

### 4. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

---

## 9. Provisioning the Initial Administrator Account

Public `ADMIN` registration is permanently disabled at the API layer (`403 Forbidden`). Provision the initial administrator safely via the backend CLI:

### Option A: Interactive Secure Prompt (Recommended)

```bash
cd backend
source .venv/bin/activate
python -m app.cli.create_admin
```

The CLI prompts for full name, email, and a hidden password confirmation (`getpass`), hashes the password with **Argon2id**, marks the account active and verified, and never echoes or logs the password.

### Option B: Environment Variables (Non-Interactive / CI / Containers)

```bash
cd backend
ADMIN_FULL_NAME="Platform Administrator" \
ADMIN_EMAIL="admin@example.org" \
ADMIN_PASSWORD="<strong-unique-password>" \
.venv/bin/python -m app.cli.create_admin
```

- **Duplicate prevention:** If an `ADMIN` account already exists, the command exits safely without creating another admin unless `--allow-additional` is explicitly passed.
- **Docker usage:** `docker compose exec backend python -m app.cli.create_admin`

---

## 10. Running the Application Locally

### Start Backend (`http://localhost:8000`)

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- **API Base URL:** `http://localhost:8000/api`
- **Swagger UI:** `http://localhost:8000/docs` *(automatically disabled when `ENVIRONMENT=production`)*
- **ReDoc:** `http://localhost:8000/redoc`

### Start Frontend (`http://localhost:5173`)

```bash
cd frontend
npm run dev
```

Vite proxies `/api/*` directly to `http://127.0.0.1:8000` so `HttpOnly` `SameSite=Lax` session cookies and `X-CSRF-Token` headers operate seamlessly on the same origin.

---

## 11. Authentication & Role-Based Access Control (Phase 3)

### Role Permissions Matrix

| Role | Provisioning & Approval | Frontend Routes | Backend Endpoints |
| --- | --- | --- | --- |
| **`PATIENT`** | Default role on `POST /api/auth/register` | `/patient/*` | `GET /api/auth/me`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `/api/patient/*` |
| **`DOCTOR`** | Admin-created (`POST /api/admin/users`) **or** self-registered clinician request approved by an Admin (`PATCH /api/admin/users/{id}`) | `/doctor/*` | `GET /api/auth/me`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `/api/doctor/*` (strictly scoped to `ACTIVE` assigned patients) |
| **`ADMIN`** | CLI-provisioned (`python -m app.cli.create_admin`) or promoted by an existing Admin; **never** via public signup | `/admin/*` | `GET /api/auth/me`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `/api/admin/users*`, `/api/admin/assignments*` |

> **Untrusted Role Escalation Prevention:** Submitting `"role": "ADMIN"` to `POST /api/auth/register` returns `403 admin_registration_forbidden`. Submitting `"role": "DOCTOR"` creates an active `PATIENT` account with `requested_role="DOCTOR"` and `requires_role_approval=true`; clinician routes remain blocked until an `ADMIN` verifies and approves the account (via `/admin/doctors` or `PATCH /api/admin/users/{id}`).

### Authentication & RBAC API Endpoints

| Method & Path | Auth / CSRF | Description |
| --- | --- | --- |
| `GET /api/health` | Public | Application health check (`200 OK`) |
| `GET /api/health/database` | Public | Database connectivity check (`200 OK` / `503`) |
| `POST /api/auth/register` | Public (rate-limited) | Register a new account (validates name, email, strong password, confirmation; defaults to `PATIENT`) |
| `POST /api/auth/login` | Public (rate-limited) | Verify credentials, issue `HttpOnly` access + rotating refresh cookies and CSRF cookie |
| `GET /api/auth/me` | Authenticated | Return authenticated user's safe public profile (never exposes `hashed_password`) |
| `POST /api/auth/refresh` | Refresh cookie + `X-CSRF-Token` | Rotate refresh token (revokes family on replay) and issue fresh access + CSRF cookies |
| `POST /api/auth/logout` | Cookie + `X-CSRF-Token` | Revoke refresh token in DB, increment user `token_version` (invalidating active access JWTs), and clear cookies |
| `GET /api/patient/me` | `PATIENT` | Patient-scoped authorized workspace endpoint |
| `GET /api/doctor/me` | `DOCTOR` | Doctor-scoped authorized workspace endpoint |
| `GET /api/admin/users` | `ADMIN` | List/filter registered users (supports `role`, `is_active`, `pending_doctor_only`, `search`) |
| `POST /api/admin/users` | `ADMIN` + `X-CSRF-Token` | Provision a verified user (e.g., onboard a `DOCTOR`) |
| `GET /api/admin/users/{user_id}` | `ADMIN` | Inspect a single user's safe account record |
| `PATCH /api/admin/users/{user_id}` | `ADMIN` + `X-CSRF-Token` | Approve doctor requests, update role/verification, or activate/deactivate accounts (prevents self-lockout) |

### Patient Portal API Endpoints (Phase 5)

Every `/api/patient/*` endpoint enforces authentication, active `PATIENT` role (`403` for `DOCTOR`/`ADMIN`), strict server-side ownership (`patient_id == current_user.id`; `404` on non-owned IDs), `Cache-Control: no-store`, and `X-CSRF-Token` on all mutating cookie requests:

| Method & Path | Auth / CSRF | Description |
| --- | --- | --- |
| `GET /api/patient/overview` | `PATIENT` | Live dashboard metrics, 6-stage Health Journey progress, and recent care activity |
| `GET /api/patient/profile` | `PATIENT` | Retrieve authenticated patient's 1:1 profile & completion percentage (optional fields never forced) |
| `PUT /api/patient/profile` | `PATIENT` + `X-CSRF-Token` | Validate and update permitted patient profile & language fields (`extra="forbid"`) |
| `POST /api/patient/reports` | `PATIENT` + `X-CSRF-Token` | Upload verified PDF/PNG/JPG report (`<= MAX_REPORT_UPLOAD_MB`, magic-byte checked) to private storage |
| `GET /api/patient/reports` | `PATIENT` | List patient's own uploaded reports (filterable by `file_type`, `review_status`, `search`) |
| `GET /api/patient/reports/{report_id}` | `PATIENT` | Retrieve metadata for an owned medical report (never exposes storage keys/paths) |
| `GET /api/patient/reports/{report_id}/download` | `PATIENT` | Stream owned report privately with `nosniff`, `no-store`, and safe `Content-Disposition` |
| `GET /api/patient/risk-assessments` | `PATIENT` | Read-only authorized risk coordination summaries + clinical disclaimer (no AI/risk generation in Phase 5) |
| `GET /api/patient/appointments` | `PATIENT` | List patient's upcoming and past appointments |
| `GET /api/patient/appointments/{appointment_id}` | `PATIENT` | Retrieve details of an owned appointment |
| `POST /api/patient/appointments/request` | `PATIENT` + `X-CSRF-Token` | Submit validated `PENDING` appointment request (future tz-aware date; no doctor self-assignment) |
| `PATCH /api/patient/appointments/{appointment_id}/cancel` | `PATIENT` + `X-CSRF-Token` | Cancel an owned `PENDING` or `CONFIRMED` appointment |
| `GET /api/patient/referrals` | `PATIENT` | Read-only list of patient's specialist/department referrals |
| `GET /api/patient/referrals/{referral_id}` | `PATIENT` | Read-only details for an owned referral |
| `GET /api/patient/follow-ups` | `PATIENT` | List patient's overdue, upcoming, and completed follow-up milestones |
| `GET /api/patient/follow-ups/{follow_up_id}` | `PATIENT` | Retrieve details for an owned follow-up milestone |
| `PATCH /api/patient/follow-ups/{follow_up_id}/complete` | `PATIENT` + `X-CSRF-Token` | Transition an owned `PENDING` follow-up to `COMPLETED` |
| `GET /api/patient/notifications` | `PATIENT` | List in-app notifications (`unread_only` supported) with live `unread_count` |
| `PATCH /api/patient/notifications/{notification_id}/read` | `PATIENT` + `X-CSRF-Token` | Mark a single owned notification as read |
| `PATCH /api/patient/notifications/read-all` | `PATIENT` + `X-CSRF-Token` | Mark all unread notifications for the authenticated patient as read |

### Doctor Portal & Admin Care-Assignment API Endpoints (Phase 6)

Every `/api/doctor/*` endpoint enforces authentication, active `DOCTOR` role (`403` for `PATIENT`/`ADMIN`), strict server-side `ACTIVE` patient–doctor assignment scoping (`404` on unassigned/non-existent IDs to prevent cross-patient IDOR/enumeration), `Cache-Control: no-store`, and `X-CSRF-Token` on all state-changing cookie requests. Patient–doctor assignments are managed exclusively by `ADMIN` users (doctors cannot self-assign patients):

| Method & Path | Auth / CSRF | Description |
| --- | --- | --- |
| `GET /api/admin/assignments` | `ADMIN` | List/filter patient–doctor care assignments (`status`, `doctor_id`, `patient_id`) |
| `POST /api/admin/assignments` | `ADMIN` + `X-CSRF-Token` | Create an `ACTIVE` patient–doctor assignment (blocks self-assignment & duplicate active pairs with `409`) |
| `PATCH /api/admin/assignments/{assignment_id}` | `ADMIN` + `X-CSRF-Token` | Revoke or mark an assignment `REASSIGNED` (immediately removes doctor access) |
| `GET /api/doctor/overview` | `DOCTOR` | Live assigned-patient counts, report/risk review backlogs, upcoming visits, pending referrals, overdue follow-ups, attention queue, and clinical activity |
| `GET /api/doctor/profile` | `DOCTOR` | Retrieve authenticated doctor's 1:1 clinician profile, completion percentage, and verification status |
| `PUT /api/doctor/profile` | `DOCTOR` + `X-CSRF-Token` | Update permitted clinician fields (`specialization`, `qualification`, `license_number`, `department`, `hospital_or_clinic`, `experience_years`; rejects self-verification) |
| `GET /api/doctor/patients` | `DOCTOR` | Paginated list of `ACTIVE` assigned patients with `search`, `attention_only`, and `pending_review_only` filters |
| `GET /api/doctor/patients/{patient_id}` | `DOCTOR` | Authorized clinical dossier for an assigned patient (profile, reports, risk assessments, appointments, referrals, follow-ups, timeline) |
| `GET /api/doctor/reports` | `DOCTOR` | Paginated medical reports queue across assigned patients (`review_status`, `file_type`, `patient_id`, `search`) |
| `GET /api/doctor/reports/{report_id}` | `DOCTOR` | Report metadata plus full immutable `ReportReview` audit history (private clinician notes never leak to patients) |
| `GET /api/doctor/reports/{report_id}/download` | `DOCTOR` | Authorized private stream of an assigned patient's PDF/PNG/JPG report with `nosniff`, `no-store`, and sandbox CSP |
| `POST /api/doctor/reports/{report_id}/review` | `DOCTOR` + `X-CSRF-Token` | Append an immutable `ReportReview` (`PENDING`, `IN_REVIEW`, `REVIEWED`, `NEEDS_FOLLOW_UP`), update report status, and notify patient safely |
| `GET /api/doctor/risk-assessments` | `DOCTOR` | Paginated authorized risk assessments (`status`, `risk_category`, `patient_id`) with source metadata and non-diagnostic clinical notice |
| `GET /api/doctor/risk-assessments/{assessment_id}` | `DOCTOR` | Single authorized risk assessment with full `ClinicalReview` history |
| `POST /api/doctor/risk-assessments/{assessment_id}/review` | `DOCTOR` + `X-CSRF-Token` | Record a `ClinicalReview` (`REVIEWED`, `FLAGGED_FOR_REVIEW`, `FOLLOW_UP_REQUIRED`, `ARCHIVED`) and `recommended_action` |
| `GET /api/doctor/appointments` | `DOCTOR` | Paginated appointments queue (`status`, `scope`, `patient_id`) across assigned patients |
| `GET /api/doctor/appointments/{appointment_id}` | `DOCTOR` | Authorized appointment detail including `status_note` |
| `PATCH /api/doctor/appointments/{appointment_id}/status` | `DOCTOR` + `X-CSRF-Token` | Transition appointment (`CONFIRMED`, `COMPLETED`, or `CANCELLED` with mandatory reason on rejection and ±30-min conflict guard) |
| `PATCH /api/doctor/appointments/{appointment_id}/reschedule` | `DOCTOR` + `X-CSRF-Token` | Reschedule `PENDING`/`CONFIRMED` appointment to a validated future slot with ±30-min doctor conflict guard (`409`) |
| `GET /api/doctor/referrals` | `DOCTOR` | Paginated specialist/department referrals (`status`, `patient_id`, `search`) |
| `GET /api/doctor/referrals/{referral_id}` | `DOCTOR` | Authorized referral detail with immutable `ReferralHistory` transition log |
| `POST /api/doctor/referrals` | `DOCTOR` + `X-CSRF-Token` | Create specialist referral for an assigned patient, log initial `ReferralHistory`, and notify patient |
| `PATCH /api/doctor/referrals/{referral_id}/status` | `DOCTOR` + `X-CSRF-Token` | Apply validated referral transition (`PENDING → ACCEPTED/SCHEDULED/CANCELLED`, `ACCEPTED → SCHEDULED/COMPLETED/CANCELLED`, `SCHEDULED → COMPLETED/CANCELLED`) |
| `GET /api/doctor/follow-ups` | `DOCTOR` | Paginated follow-up plans (`status`, `scope=OVERDUE/UPCOMING/COMPLETED`, `patient_id`) with deduplicated overdue notifications |
| `GET /api/doctor/follow-ups/{follow_up_id}` | `DOCTOR` | Authorized follow-up detail with linked appointment/referral IDs |
| `POST /api/doctor/follow-ups` | `DOCTOR` + `X-CSRF-Token` | Create a scheduled follow-up plan for an assigned patient (verifies same-patient ownership on linked appointment/referral) |
| `PATCH /api/doctor/follow-ups/{follow_up_id}` | `DOCTOR` + `X-CSRF-Token` | Update follow-up status (`COMPLETED`, `MISSED`, `CANCELLED`, or reschedule `MISSED → PENDING` with future timestamp) |
| `GET /api/doctor/notifications` | `DOCTOR` | Paginated privacy-safe clinician notifications (`unread_only` supported) with live `unread_count` |
| `PATCH /api/doctor/notifications/{notification_id}/read` | `DOCTOR` + `X-CSRF-Token` | Mark a single owned doctor notification as read |
| `PATCH /api/doctor/notifications/read-all` | `DOCTOR` + `X-CSRF-Token` | Mark all unread notifications for the authenticated doctor as read |

### Security Model Summary

- **Password hashing:** Argon2id (`argon2-cffi`) with enforced policy (`8–128` chars, uppercase, lowercase, digit, special character) and timing-safe dummy verification on unknown emails.
- **No tokens in Web Storage:** Access and refresh tokens live strictly in `HttpOnly`, `SameSite=Lax` cookies (`Secure=True` automatically enforced outside local development); zero tokens or passwords are ever written to `localStorage` or `sessionStorage`. Refresh cookie path is restricted to `/api/auth`.
- **CSRF protection:** Double-submit cookie (`cb_csrf_token`) compared in constant time against `X-CSRF-Token` on cookie-authenticated state-changing requests.
- **Honest session revocation:** Refresh tokens are stored strictly as SHA-256 hashes in `refresh_tokens`, rotated on every refresh with token-family replay detection, and revoked on logout. Additionally, `users.token_version` is verified on authenticated requests and incremented on logout, deactivation, role change, and refresh replay so existing short-lived access JWTs are rejected immediately.
- **Error & log hygiene:** Generic `401` on invalid credentials (no email enumeration), `Cache-Control: no-store` on `/api/{auth,admin,patient,doctor}/*`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, clinician-only confinement of private `ReportReview.review_note` and `DoctorProfile.license_number`, and zero passwords/tokens/emails/PHI in logs or error payloads.

---

## 12. Database Setup

### Option A: Local SQLite Fallback (Default — Zero Setup)

Leave `DATABASE_URL=` blank in `backend/.env`. Both FastAPI and Alembic automatically use a git-ignored SQLite database at `backend/carebridge_dev.db` (with foreign keys enabled):

```bash
cd backend
.venv/bin/alembic upgrade head
```

### Option B: Local or Hosted PostgreSQL

1. Create a PostgreSQL database (e.g., `carebridge_ai`).
2. Set `DATABASE_URL=postgresql+psycopg://<username>:<password>@localhost:5432/carebridge_ai` in `backend/.env`.
3. Run `alembic upgrade head` inside `backend/`.

---

## 13. Environment Variable Configuration

Never commit `.env` files or real credentials. Use `.env.example`, `backend/.env.example`, and `frontend/.env.example` as templates.

| Variable | Location | Default | Description |
| --- | --- | --- | --- |
| `ENVIRONMENT` | Root / Backend | `development` | Runtime mode (`development`, `test`, `production`; enforces strict `SECRET_KEY` & `Secure` cookies in production) |
| `DATABASE_URL` | Root / Backend | *(empty → SQLite)* | PostgreSQL URL (`postgresql+psycopg://user:pass@host:5432/db`) or SQLite URL |
| `SECRET_KEY` | Root / Backend | *(required `>=32` chars in prod)* | Strong secret key for signing JWTs (`python3 -c "import secrets; print(secrets.token_urlsafe(48))"`) |
| `JWT_ALGORITHM` | Root / Backend | `HS256` | Allowed JWT HMAC algorithm (`HS256`, `HS384`, `HS512`) |
| `JWT_ISSUER` / `JWT_AUDIENCE` | Root / Backend | `carebridge-ai` / `carebridge-ai-web` | Validated JWT `iss` and `aud` claims |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Root / Backend | `30` | Access JWT lifetime in minutes |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Root / Backend | `7` | Persistent refresh session lifetime ("Keep me signed in") |
| `SESSION_REFRESH_EXPIRE_HOURS` | Root / Backend | `12` | Browser-session refresh token lifetime when "Keep me signed in" is unchecked |
| `COOKIE_SAMESITE` / `COOKIE_SECURE` | Root / Backend | `lax` / *(auto)* | Cookie policy (`Secure=true` automatic in production or when `SameSite=none`) |
| `LOGIN_RATE_LIMIT_ATTEMPTS` | Root / Backend | `5` | Max login attempts per account+IP per `RATE_LIMIT_WINDOW_SECONDS` (`60`s) |
| `LOGIN_RATE_LIMIT_IP_ATTEMPTS` | Root / Backend | `15` | Max login attempts per IP per window |
| `REGISTER_RATE_LIMIT_IP_ATTEMPTS` | Root / Backend | `10` | Max registration attempts per IP per window |
| `ADMIN_FULL_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | CLI only | *(unset)* | Optional one-shot env vars for `python -m app.cli.create_admin` |
| `UPLOAD_STORAGE_DIR` | Root / Backend | `backend/uploads/medical_reports` | Private git-ignored directory for uploaded patient reports (never publicly mounted) |
| `MAX_REPORT_UPLOAD_MB` | Root / Backend | `10` | Maximum allowed upload size in megabytes for PDF, PNG, and JPG reports |
| `CORS_ORIGINS` | Root / Backend | `http://localhost:5173,...` | Comma-separated explicit allowed origins (supports credentials) |
| `VITE_API_BASE_URL` | Root / Frontend | `/api` | Same-origin API prefix routed via Vite (dev) or Nginx (Docker/prod) |
| `GEMINI_API_KEY` | Root / Backend | *(empty placeholder)* | Reserved for AI report workflows in later phases |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | Root (Docker) | `carebridge_ai` / `carebridge` / *(required)* | PostgreSQL container credentials for `docker-compose.yml` |

---

## 14. Testing & Quality Verification

```bash
# Backend automated test suite (health, migrations, registration, login, cookies, CSRF, refresh rotation/replay, logout, RBAC, admin CLI)
cd backend && .venv/bin/pytest -v

# Frontend formatting, strict TypeScript, ESLint, automated Vitest suite, and production build
cd frontend
npm run format:check
npm run typecheck
npm run lint
npm test
npm run build

# End-to-end repository verification script (from repo root)
./scripts/verify-phase1.sh
```

---

## 15. Docker Instructions (Optional)

Docker remains optional for local development. When Docker and Docker Compose are installed:

```bash
# 1. Copy .env.example to .env and set strong POSTGRES_PASSWORD and SECRET_KEY values
cp .env.example .env

# 2. Build and start PostgreSQL, FastAPI backend (auto-runs alembic upgrade head), and Nginx frontend
docker compose up --build -d

# 3. Provision the initial ADMIN account inside the backend container
docker compose exec backend python -m app.cli.create_admin

# 4. Inspect or stop services
docker compose ps
docker compose down
```

---

## 16. Development Roadmap & Phase Status

- [x] **Phase 1 — Project Setup & Foundation:** Repository architecture, React + Vite + TypeScript + Tailwind frontend scaffold, FastAPI + SQLAlchemy + Alembic backend scaffold, PostgreSQL + SQLite fallback, environment templates, Docker Compose stack, Git security rules, and baseline health tests.
- [x] **Phase 2 — UI/UX Design & Frontend Architecture:** Healthcare design system and light/dark themes, public landing page, reusable component & chart library, responsive Patient, Doctor, and Admin dashboards with separated fictional preview datasets, and automated UI tests.
- [x] **Phase 3 — Authentication & Role-Based Access Control:** `users` and `refresh_tokens` ORM models and Alembic migration, Argon2id password hashing, signed JWT + rotating refresh tokens in `HttpOnly` `SameSite` cookies, double-submit CSRF protection, brute-force rate limiting, server-side RBAC dependencies, admin user/doctor-approval management, secure `create_admin` CLI, connected React auth flows & route guards, session restoration, logout revocation, and automated backend + frontend test suites.
- [x] **Phase 4 — Landing Page & Public Experience:** Production-grade public landing experience with refined CareBridge AI brand mark and Open Graph metadata, sticky section-aware navbar, interactive 6-stage connected care ecosystem hero, Problem, Solution, How It Works, 10 status-transparent Key Features, Patient/Doctor/Admin role experience pathways wired to live auth, Population Health Impact, live English & Hindi (`i18n`) language switching, truthful Privacy/Security and medical disclaimer section, About Team ALPHA & Contact sections, comprehensive footer with Privacy Policy (`/privacy`) and Terms of Service (`/terms`) placeholder pages, reduced-motion accessibility, and full light/dark mode compatibility.
- [x] **Phase 5 — Patient Dashboard & Patient Experience:** Complete backend- and database-connected Patient Portal across all 9 `/patient/*` routes (`PatientProfile`, `MedicalReport`, read-only `RiskAssessment`, `Appointment`, `Referral`, `FollowUp`, and `Notification` models + Alembic migration `0003_patient_portal_models`), strict `PATIENT` RBAC & cross-patient ownership isolation, magic-byte-verified private PDF/PNG/JPG report storage & authorized download, live overview metrics and 6-stage Health Journey timeline, `PENDING` appointment requests, read-only referral & risk tracking with clinical disclaimers, follow-up completion workflow, live in-app notifications, bilingual/theme settings, and automated backend + frontend test suites.
- [x] **Phase 6 — Doctor Dashboard & Doctor Workflows:** Complete backend- and database-connected Doctor Portal across all 12 `/doctor/*` routes (`DoctorProfile`, `PatientDoctorAssignment`, `ReportReview`, `ClinicalReview`, and `ReferralHistory` models + Alembic migration `0004_doctor_portal_models`), admin-managed care assignments (`/api/admin/assignments*` + Admin `CareAssignmentsPanel`), strict `DOCTOR` RBAC & active-assignment anti-IDOR scoping, authorized private report downloads and immutable clinical review histories, non-diagnostic risk review workflows, appointment confirmation/rejection/rescheduling/completion with ±30-minute conflict detection, referral generation & audited status transitions, follow-up plan creation/completion & deduplicated overdue alerts, privacy-safe cross-portal notifications, bilingual/theme settings, and 141 passing automated backend (60) + frontend (81) tests.
- [ ] **Upcoming Phases:** AI-assisted medical report analysis & summarization (Gemini integration), explainable automated clinical risk triage, external notification channels, and remaining live administrator population-health views.

---

## 17. Team ALPHA & License

- **Team:** Team ALPHA
- **Competition:** Future Health Challenge
- **Category:** Population Health
- **Project:** CareBridge AI — *"From Early Screening to Timely Care — One Intelligent Platform."*
- **License:** Released under the [MIT License](LICENSE).
