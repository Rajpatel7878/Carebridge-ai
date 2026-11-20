# CareBridge AI — final gap closure report

**Overall: PARTIALLY IMPLEMENTED.** This is a synthetic-data workflow prototype, not a medical device, diagnosis, or clinically validated prediction tool. Do not use real patient data. The isolated synthetic browser journey passed, but translation, audit and other acceptance criteria remain incomplete.

## Feature status

| Feature | Status | Evidence and limitations |
|---|---|---|
| Local extraction and OCR | **PARTIALLY IMPLEMENTED** | Readable PDF text and local OCR for PNG, JPEG and scanned PDF pages are implemented. Real local inference passed synthetic PNG, JPEG and scanned PDF tests and a live PNG upload. Originals remain stored; unverified extracted text is displayed separately from analysis. Limits: 10 MB, 10 PDF pages, 12 million pixels per image and 50,000 characters. OCR may miss or misread information, especially on blurry/rotated images; Hindi accuracy and concurrent resource usage are unverified. PDF pages with any embedded text are not additionally OCRed, so image content on mixed pages may be missed. First model load may delay requests. |
| Gemini | **UNVERIFIED** | Backend-only `GEMINI_API_KEY`, configurable `GEMINI_MODEL` (default `gemini-2.5-flash`), timeout, explicit external-processing consent, structured validation, source quote checks and sanitized failures are implemented. No key was configured and no real provider request was attempted; account/model access and live failure behavior are unverified. No analysis-specific rate limiter or automatic retry. AI output is not clinical advice. |
| Fallback | **SIMULATED** | When external processing is unavailable, results are labelled MOCK/SIMULATED and do not invent medical findings. Local source extraction is separate from this result. |
| Operational priority | **PARTIALLY IMPLEMENTED** | Manual recalculation uses report review states and overdue pending follow-ups, with reasons, stale indication, scoped doctor queue and reason-required override. Recalculation and override are audited. It is workflow coordination, not a diagnosis or validated risk prediction; LOW means no tracked flags, not normal health. No automatic recalculation, clinician-entered care needs, concurrency-safe deduplication, queue pagination/history UI or trends; saved admin counts can be stale. |
| Admin/security audit | **PARTIALLY IMPLEMENTED** | Account and assignment mutations, priority mutations, doctor appointment transitions/reschedules and referral creation/status changes now generate transactional audit events. Some business rejections are recorded; validation/authentication failures, other failed operations and sensitive reads remain uncovered. See the endpoint/test matrix below. There is no admin appointment/referral mutation route or separate doctor-rejection action. |
| English/Hindi | **PARTIALLY IMPLEMENTED** | Public copy, login labels and local validation, navigation, audit page and report-analysis UI including explicit external-consent wording have Hindi translations. Dashboard language controls now appear for every role. Component and browser checks cover selected switches and persistence, not all UI or translation quality. Registration, patient/doctor/admin pages, shared controls, backend errors, notifications, dynamic statuses and backend-generated results remain substantially English. See [candidate inventory](docs/translation-remaining.md). |
| Browser journey | **WORKING** | A single uninterrupted headless browser run on a newly seeded isolated SQLite database completed the synthetic patient → doctor → admin journey with consent, OCR, labelled simulation, assignment audit and Hindi/English switching. This does not validate all screens or production readiness. Details below. |

## Verification

- Backend: **76 passed**, including actual local OCR for PNG, JPEG and scanned PDF and invalid/empty/oversized input tests, role checks, simulated analysis, priority and audit tests.
- Frontend: **96 passed**, including public, login, audit and report-analysis dictionary key checks, Hindi login validation, consent/OCR component test and follow-up validation. Lint, typecheck, production build and format check passed after correcting a test typing error; build emitted dependency annotation warnings.
- SQLite: `alembic upgrade head` and `alembic check` passed. PostgreSQL was not verified.
- Live proxy and SQLite health passed. After the backend restart, a live rejected priority recalculation and admin audit lookup passed. The browser run and HTTP checks are described separately below. PostgreSQL and clinical accuracy were not verified.

## Startup and synthetic demo

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
# RapidOCR's OpenCV dependency shares files with the headless wheel; restore it last.
.venv/bin/pip install --force-reinstall --no-deps opencv-python-headless==5.1.0.95
cp .env.example .env  # only if no existing configuration
.venv/bin/alembic upgrade head
CAREBRIDGE_DEMO_PASSWORD='DemoOnly!2026A' .venv/bin/python -m app.cli.seed_demo  # fresh local SQLite only
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

In another terminal:

```bash
cd frontend
npm ci
npm run dev -- --host 0.0.0.0 --port 5173
```

Frontend: http://localhost:5173; backend docs: http://localhost:8000/docs. Synthetic accounts are `admin@demo.example.org`, `doctor1@demo.example.org`, and `patient1@demo.example.org`, using the seed password above for a fresh local seed. See [docs/demo.md](docs/demo.md) for seed restrictions and workflow. Configure a newly rotated Gemini key only in the backend environment; do not commit it. Explicit consent is required before sending extracted text to an external provider.


## Security and provider verification

- `.env.example` and `backend/.env.example` have blank Gemini keys; `backend/.env` is ignored. A pattern scan of currently tracked working files found no Google API-key-shaped strings, GitHub token-shaped strings or private-key headers. This limited scan is not proof that all secrets or Git history are clean. No `.env`, `backend/.env`, or `frontend/.env` path appears in reachable Git history. A credential was previously exposed in conversation; treat it as compromised and **revoke and rotate it**. Never reuse it. Revocation cannot be verified from this environment.
- The backend uses `google-genai` 3.6.1 with a configurable model, JSON response schema, timeout, Pydantic validation and source-quote filtering. Consent is checked for each external request. Missing key/provider errors result in clearly labelled simulation rather than fabricated success. A real provider test was not run because no key is configured; provider access, quota and network behavior remain **UNVERIFIED**. Outbound access from this sandbox is restricted, so even with a key a real request may require an unrestricted host. Source verification cannot prove a summary is clinically correct.
- To verify on a suitable network: revoke the exposed key, obtain a new one, set `GEMINI_API_KEY` securely in the backend process environment (or the ignored `backend/.env` file), optionally set `GEMINI_MODEL` and `GEMINI_TIMEOUT_SECONDS`, then restart the backend. Do not put the key in frontend variables, Git, terminal output, screenshots or chat. In the patient report panel upload a synthetic image, explicitly check the external consent box, and click **Run / retry external analysis**. Inspect the displayed provider, mode, status, and source extraction: a SIMULATED/MOCK result or failure is not proof of Gemini success. Check the provider console on the account if confirmation is needed without exposing the report or key.

### Secure Gemini configuration on a host with provider network access

From the backend directory in a private shell, after rotating the previously exposed key, enter the new key at the hidden prompt (do not paste it into commands, chat, or logs):

```bash
cd backend
read -r -s -p 'Gemini API key: ' GEMINI_API_KEY; echo
export GEMINI_API_KEY
export GEMINI_MODEL='gemini-2.5-flash'  # replace if your account cannot access it
export GEMINI_TIMEOUT_SECONDS=30
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
# After stopping the server, remove the shell variable:
unset GEMINI_API_KEY
```

Run the synthetic consented external-analysis UI steps above. Only a `GEMINI` / `EXTERNAL` / `COMPLETED` response counts as a successful real request; simulation or an error does not. Account access to the configured model remains unverified. These environment variables are backend-only and must never be given a frontend prefix.

## Audit coverage matrix

Events include actor ID/role, action, resource type/ID, timestamp, outcome and allowlisted metadata. Successful business changes and events commit together. No notes, passwords, token, report text or API keys are intentionally included. Admin audit is read-only via the application; database-level immutability is not enforced. No events are emitted for earlier historical records. No administrator appointment/referral mutation endpoint exists; the corresponding doctor mutations are listed below. Other clinical operations such as report review and follow-up changes, sensitive reads, and unauthenticated/CSRF/Pydantic failures are **NOT IMPLEMENTED** in the central audit log.

| Sensitive endpoint / operation | Event(s) | Evidence / coverage | Status |
|---|---|---|---|
| `POST /api/admin/users` | `user.created`, `user.create_failed` | `test_admin_account_state_changes_and_provisioning_audit` | **WORKING** |
| `PATCH /api/admin/users/{id}`: role/verification, doctor or patient active state | `user.updated`, `user.update_failed` | `test_admin_account_state_changes_and_provisioning_audit`, `test_rejected_admin_mutations_are_audited_without_request_contents`, `test_audit_failure_prevents_account_change` | **WORKING** for tested changes |
| Dedicated doctor rejection | none | No dedicated rejection state/action exists; changing verification is not an equivalent rejection workflow. | **NOT IMPLEMENTED** |
| `POST /api/admin/assignments` | `assignment.created`, `assignment.create_failed`; `assignment.reassigned` for each replaced record | `test_replace_existing_assignment_audits_each_changed_record`, `test_patient_assignment_scope_pagination_revocation_and_reassignment` | **WORKING** for tested successful and rejected changes |
| `PATCH /api/admin/assignments/{id}` | `assignment.revoked`, `assignment.reassigned`, `assignment.update_failed` | `test_patient_assignment_scope_pagination_revocation_and_reassignment`, `test_rejected_admin_mutations_are_audited_without_request_contents` | **WORKING** |
| `POST /api/doctor/patients/{id}/priority/{recalculate,override}` | `priority.recalculated`, `priority.overridden`, `priority.recalculate_failed`, `priority.override_failed` | `test_operational_priority_lifecycle_and_audit`; only service-level rejection is covered, not request validation. Override reason stays in priority record, not audit metadata. | **PARTIALLY IMPLEMENTED** |
| `PATCH /api/doctor/appointments/{id}/status`, `/reschedule` | `appointment.status_changed`, `appointment.rescheduled`, `appointment.status_change_failed`, `appointment.reschedule_failed` | `test_appointment_confirmation_conflicts_transitions_reschedule_and_isolation` checks success and service-level rejection events; request-validation failures remain uncovered. | **PARTIALLY IMPLEMENTED** |
| `POST /api/doctor/referrals`, `PATCH /api/doctor/referrals/{id}/status` | `referral.created`, `referral.status_changed`, `referral.create_failed`, `referral.status_change_failed` | `test_referrals_follow_ups_notifications_and_overview_workflows`, `test_referral_creation_rolls_back_when_audit_fails` cover successes, service rejections and rollback; request-validation failures remain uncovered. | **PARTIALLY IMPLEMENTED** |
| `POST /api/patient/appointments/request`, patient appointment cancellation | none | Existing patient workflow tests, no central audit assertion/event. | **NOT IMPLEMENTED** |
| `GET /api/admin/audit-logs` and nonexistent edit/delete endpoints | read-only; admin authorization | `test_admin_audit_is_transactional_and_read_only`; patient denial also checked in browser session. | **WORKING** for app API |
| Other admin endpoints | none | Admin users/assignments lists, audit, analytics and priority aggregate are reads; sensitive-read audit is not implemented. | **NOT IMPLEMENTED** |

## Hindi translation coverage

`docs/translation-remaining.md` lists **836 static literal candidates across 58 UI files**, not an exact untranslated count. It excludes dynamic expressions, validation/backend messages and data-driven labels, and includes some brands or already-conditionally translated strings. Manual review is still required. Known untranslated examples include registration and backend login errors; patient “Upload Report”, report metadata and review statuses; doctor “Record Clinical Review”, priority queue, referral/follow-up forms and their validation; admin doctor management, assignment forms, analytics, legacy preview pages and notifications. Provider output, OCR source text and patient-entered content are deliberately not translated. The public/login/audit/analysis dictionary tests detect missing keys only in those dictionaries, not all interface strings. Hindi font consistency and translation accuracy have not received a professional review.

## Clean-database browser workflow evidence

**WORKING** for the specific synthetic journey. A newly created, isolated SQLite database and upload directory were migrated and seeded; no existing data was deleted. Playwright drove one Chromium page through the entire sequence in one uninterrupted run: public landing; patient login; Hindi switch; synthetic PNG upload; explicit external consent; local OCR; labelled MOCK/SIMULATED result; logout and doctor login with Hindi persisted; assigned report and review; operational priority/explanation; referral; follow-up; logout and admin login; assignment creation; audit filtering/details; English switch and reload persistence. Each mutation returned its expected success status. No uncaught page exceptions were observed. Four `/api/auth/me` 401 bootstrap responses occurred before authentication; therefore a blanket zero-error claim is inappropriate. A prior first attempt stopped at the open report modal; a fresh second isolated database was created and the successful run started from the beginning. The browser script and sanitized stage evidence are [frontend/scripts/verify-demo.mjs](frontend/scripts/verify-demo.mjs) and [docs/demo-browser-evidence.md](docs/demo-browser-evidence.md).

This verifies only the listed journey, not every link, responsive breakpoint, console message, duplicate scenario, or translation. The application remains a prototype: no clinical validation, prediction or medical advice. The audit page was previously checked at 390px without horizontal page overflow. Patient ownership and unassigned-doctor denials were checked in prior browser-session API checks and backend tests, not in the single uninterrupted clean run.

### Repeatable isolated setup and execution

In a backend terminal, after installing dependencies as above:

```bash
cd backend
mkdir -p tmp
DEMO_DIR="$(mktemp -d "$(pwd)/tmp/hackathon-demo-XXXXXX")"
mkdir -p "$DEMO_DIR/uploads"
export DATABASE_URL="sqlite:///$DEMO_DIR/demo.db"
export UPLOAD_STORAGE_DIR="$DEMO_DIR/uploads"
export CORS_ORIGINS='http://localhost:5174,http://127.0.0.1:5174'
# For HTTPS previews embedded cross-site (not needed for ordinary localhost):
export COOKIE_SAMESITE=none COOKIE_SECURE=true
export CAREBRIDGE_DEMO_PASSWORD='DemoOnly!2026A'  # synthetic local demo only
.venv/bin/alembic upgrade head
.venv/bin/python -m app.cli.seed_demo
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8001
```

Use a fresh directory for each run; seed refuses a database with users. In a frontend terminal:

```bash
cd frontend
npm ci
VITE_DEV_PROXY_TARGET='http://127.0.0.1:8001' npm run dev -- --host 0.0.0.0 --port 5174
```

In a third terminal, use a compatible local Chromium executable and its system libraries (install those separately if needed), with no Gemini key configured in the isolated backend. The script is designed for the seeded synthetic accounts and expects the external-consent attempt to fall back to MOCK/SIMULATED:

```bash
cd frontend
export CAREBRIDGE_DEMO_PASSWORD='DemoOnly!2026A'
export CAREBRIDGE_DEMO_URL='http://127.0.0.1:5174'
export CHROMIUM_EXECUTABLE_PATH='/path/to/chromium'  # set to your executable
node scripts/verify-demo.mjs
```

The script generates real records and is intended for a fresh demo database, not production or a repeated run on the same dataset. It intentionally prints only stage outcomes and sanitized HTTP error categories, not passwords or source report text. A configured external Gemini key would cause the consented synthetic report text to be sent to Google and the script's expected-simulation assertion would fail; do not use such a key for this fallback run.

## Manual demo checklist

1. Start both services using the commands above. Open the landing page and log in as the synthetic patient; select Hindi in the dashboard and refresh. Expect untranslated sections.
2. Open **My Health Reports**, upload a synthetic PNG/JPEG/scanned PDF, open **Details**, check external consent and choose external processing. With no key, expect MOCK/SIMULATED, not real Gemini. Compare the displayed OCR source with the synthetic original. Simulated analysis is also available without sending data externally.
3. Sign out, log in as the assigned doctor, open the report, save a review, recalculate the operational priority, create a referral and a future follow-up within 365 days. These are internal coordination records, not a diagnosis or an external referral.
4. Sign in as patient to see the referral and follow-up. Sign in as administrator; in Doctor Management use the live assignment panel, then open Audit Logs and filter/expand the corresponding event. Switch between Hindi and English using the dashboard control.
5. Check browser console/network, role boundaries, patient ownership and unassigned-doctor access, responsive layouts and links. Some admin screens are explicitly fictional previews; do not present them as live data.
