# CareBridge AI: current prototype and synthetic demo

**The master build is not complete.** The patient and doctor portals use the backend; the administrator overview and analytics show database-backed aggregate counts with 7/30/90-day filters and CSV export. Other administrator views still contain explicitly labelled fictional preview data; the doctor page also contains live account and assignment panels. Do not use real patient information.

**Partial:** Local image and PDF OCR, PDF text extraction and consent-based Gemini integration are implemented but a real Gemini call has not been verified. Simulated analysis produces no medical findings. Automatic priority recalculation, complete admin audit coverage, complete live administrator pages, and the full requested demonstration remain unimplemented. English/Hindi support is partial. Appointments and referrals are internal prototype records; no external hospital, email, SMS or scheduling integration is active. There is no clinical validation. Reporting shows all-time totals and selected-period record distributions, not inferred population prevalence or unique-patient risk counts.

CareBridge AI is a prototype for demonstrating coordinated healthcare workflows. It is not a medical device, does not provide a confirmed diagnosis, and does not replace a qualified healthcare professional. For emergencies, contact local emergency services.

## Run locally and seed a fresh synthetic database

Requirements: Python 3.11+, Node.js 20.19+ or 22.12+, and npm. From the repository root:

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/pip install --force-reinstall --no-deps opencv-python-headless==5.1.0.95
cp .env.example .env
.venv/bin/alembic upgrade head
CAREBRIDGE_DEMO_PASSWORD='DemoOnly!2026A' .venv/bin/python -m app.cli.seed_demo
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

In a second terminal:

```bash
cd frontend
npm ci
npm run dev -- --host 0.0.0.0 --port 5173
```

The seed command refuses any database with existing users, and is restricted to development SQLite. It creates one admin, three verified doctors, ten fictional patients, three synthetic PDF placeholders, five internal appointments, referrals and follow-ups, notifications, and care assignments. It does **not** create AI analyses, risk assessments, or audit events. Set your own strong `CAREBRIDGE_DEMO_PASSWORD` instead of the sample password. These credentials are for local demonstrations only and must never be used in production.

| Role | Email | Password if using the command above |
|---|---|---|
| Administrator | `admin@demo.example.org` | `DemoOnly!2026A` |
| Doctor | `doctor1@demo.example.org` | `DemoOnly!2026A` |
| Patient | `patient1@demo.example.org` | `DemoOnly!2026A` |

To reset without deleting existing data, choose a **new** SQLite filename and upload directory, export both variables in the backend shell, then run migrations and the seed command again. Keep the same variables set when starting Uvicorn:

```bash
export DATABASE_URL='sqlite:///./fresh_demo.db'
export UPLOAD_STORAGE_DIR='./uploads/fresh_demo'
.venv/bin/alembic upgrade head
CAREBRIDGE_DEMO_PASSWORD='DemoOnly!2026A' .venv/bin/python -m app.cli.seed_demo
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Embedded HTTPS preview login

When the application runs inside a cross-site HTTPS preview frame, the backend must issue cookies that the frame can send. Start that preview's backend with `COOKIE_SAMESITE=none COOKIE_SECURE=true` in its environment. The Vite frontend must proxy `/api` to that backend; do not set a frontend API URL to localhost. Keep the default `lax` setting for ordinary same-site deployments. Browser privacy policies that block all third-party cookies may still require opening the preview in a separate tab. Do not disable CSRF protection.

Frontend: http://localhost:5173 · API: http://localhost:8000 · API documentation: http://localhost:8000/docs · health: http://localhost:8000/api/health.

## Available demonstration journey

1. Open the landing page and sign in as the synthetic patient. Review the dashboard and upload a synthetic PDF/PNG/JPG.
2. Sign out and sign in as `doctor1`. Open the assigned patient or report, record a review, create a referral or follow-up, and confirm a pending appointment.
3. Sign back in as the patient and view the updated coordination records and in-app notifications.
4. Sign in as the administrator. Open the live overview or analytics, change the reporting period and export aggregate CSV. The doctor page includes live user provisioning/approval and assignment panels; other portions are labelled fictional previews.
5. Open a patient report and choose **Run simulated analysis**. The assigned doctor can view that result. External processing requires explicit consent and a separately configured backend key; a real Gemini call has not been verified. An operational priority queue is available in the doctor Risk Review page; recalculation is manual and it is not a diagnosis.

Administrator audit logging now records live account and care-assignment changes; see [core features implementation report](../CORE_FEATURES_IMPLEMENTATION_REPORT.md) for scope and limitations.

Current operational priority scope and remaining limitations are documented in [FINAL_COMPLETION_REPORT.md](../FINAL_COMPLETION_REPORT.md).
