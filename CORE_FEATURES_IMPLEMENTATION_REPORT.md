# Core features implementation report

## Overall status

**Phase 2 is incomplete.** Do not use this prototype with real patient data or for clinical decisions. The existing authenticated patient and doctor workflows remain in place. New work in this phase adds an administrator audit trail for existing account and assignment mutations and Hindi sidebar navigation labels.

| Requested feature | Status | Details |
|---|---|---|
| Gemini integration | NOT IMPLEMENTED | `GEMINI_API_KEY` remains an empty backend configuration placeholder; no provider call, validation, external consent workflow, SDK integration, or retry logic exists. No report data is sent to Gemini. The supplied chat credential was not written to the repository and should be revoked/rotated. Google’s [model documentation](https://ai.google.dev/gemini-api/docs/models?hl=en) lists Gemini 2.5 Flash, but account-level model availability and the SDK were not verified; do not interpret this as a successful API test. |
| Report extraction | NOT IMPLEMENTED | Existing PDF/JPG/PNG upload, validation, private storage and download work; no PDF text extraction or OCR exists. |
| Mock AI fallback | NOT IMPLEMENTED | No report analysis is generated; synthetic report PDFs are placeholders, not analysis. |
| Explainable operational prioritization | NOT IMPLEMENTED | Existing manually entered clinical assessments remain separate and readable; there is no automated priority engine, queue, deduplication, override, or history for operational priority. No score or finding was invented. |
| Admin audit logging | PARTIALLY IMPLEMENTED | Admin user provisioning and role/verification/active-status changes, and assignment creation, revocation and reassignment are recorded in the same transaction. Admin-only read API supports action, actor ID, actor role, resource type, date range and pagination. The audit page exposes filters, pagination and event details. Successful events only; prior events, failed attempts, sensitive reads, appointment/referral administration and priority overrides are not logged. Existing demo-only admin operations are not real mutations. |
| English coverage | PARTIALLY IMPLEMENTED | Most existing interface text is English, but translation strings are not centralized for all dashboard pages. |
| Hindi coverage | PARTIALLY IMPLEMENTED | Existing public-site dictionary and selector plus new dashboard navigation translations. Many dashboard forms, statuses, notifications, errors and new audit page remain English. Patient settings can store preferred language in the patient profile, but the global selector does not persist for all roles or restore preferences reliably after login. |

The audit viewer exposes no mutation endpoint; ordinary users cannot read its API. Metadata is limited to account flags/roles and assignment-replacement identifiers; passwords, API keys and clinical notes are excluded. This is an application-level audit trail, not an immutable or tamper-proof database ledger. Account and assignment operations fail if recording the audit entry fails; rollback on failure is tested. Events only exist after this feature is installed, and initial seed records are not automatically audited.

## Database migrations

- `0005_audit_logs` adds `audit_logs` with actor, role, action, resource, timestamp, outcome and minimal metadata, plus indexes.
- Applied to the local SQLite demo database. `alembic check` reported no schema drift. The migration upgrade and downgrade path is exercised by the backend test suite. PostgreSQL was not exercised here.

## APIs

- Added `GET /api/admin/audit-logs` with `action`, `actor_id`, `actor_role`, `resource_type`, `from_date`, `to_date`, `limit`, and `offset` filters; admin role required.
- Existing `POST /api/admin/users`, `PATCH /api/admin/users/{user_id}`, `POST /api/admin/assignments`, and `PATCH /api/admin/assignments/{assignment_id}` now append audit records in their transaction.
- No AI, extraction, priority, override, or language-preference endpoint was added in this phase.

## Verification performed

- Backend: `.venv/bin/pytest -q` — **64 passed**, with one Starlette/httpx deprecation warning. Includes audit role checks, filtering, pagination, read-only behavior and audit-failure rollback.
- Frontend: `npm test` — **86 passed**; `npm run lint`, `npm run typecheck`, and `npm run format:check` passed. New audit UI tests cover event display, search and error retry. Hindi navigation coverage is not comprehensively tested.
- `npm run build` — passed; Rollup emitted dependency annotation warnings.
- `alembic upgrade head` and `alembic check` — passed on SQLite.
- Live HTTP smoke through the Vite proxy: admin login, synthetic doctor suspension/reactivation and corresponding audit lookup passed; database health passed. No browser-based full clinical workflow or AI demonstration was tested.

## Running locally

From the repository root:

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env  # only if you do not already have a configuration
.venv/bin/alembic upgrade head
CAREBRIDGE_DEMO_PASSWORD='DemoOnly!2026A' .venv/bin/python -m app.cli.seed_demo  # fresh SQLite database only
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

In a second terminal:

```bash
cd frontend
npm ci
npm run dev -- --host 0.0.0.0 --port 5173
```

The seed command refuses a database with existing users; for a new database and reset instructions see [docs/demo.md](docs/demo.md). Frontend: http://localhost:5173, backend: http://localhost:8000, API documentation: http://localhost:8000/docs. Local-only demo admin is `admin@demo.example.org` with the password specified when seeding.

To demonstrate the implemented audit slice, sign in as admin, use the live doctor-management panel to change a synthetic account's active status or a care assignment, then visit **Audit Logs**. The requested AI/priority demonstration is unavailable.
