# Final core features report

**Status: incomplete.** The report-analysis path and simulated fallback have been added to the existing patient and doctor portals. Automated priority, full audit coverage, OCR and complete bilingual coverage remain unfinished. Do not use real patient data or rely on the prototype for care decisions.

## Feature status

| Feature | Status | Verification and limitations |
|---|---|---|
| Gemini integration | **PARTIALLY IMPLEMENTED** | Backend uses `google-genai` 3.6.1, configurable `GEMINI_MODEL` (default `gemini-2.5-flash`), timeout and Pydantic JSON validation. External processing requires explicit per-request patient consent. Unsupported observations are filtered unless their quoted source and constituent fields occur in the extracted text. Provider failures return a sanitized simulated result. SDK compatibility was checked locally and [Google's model list](https://ai.google.dev/gemini-api/docs/models?hl=en) lists the configured model. **No real Gemini request or account-level model availability was verified**; network access to Google was unavailable. No automatic provider retries or dedicated analysis rate limiter are implemented. A manual retry is available. AI-generated explanations can still be wrong and require professional review. |
| PDF text extraction | **PARTIALLY IMPLEMENTED** | `pypdf` extracts text from unencrypted text-based PDFs (20 pages and 50,000 characters maximum). A synthetic PDF extraction test passed. PDFs with no text or unreadable PDFs produce a safe failure; page decompression/resource limits have not been independently security-audited. Extraction is performed on external-analysis requests when a key is configured. |
| Image extraction / OCR | **NOT IMPLEMENTED** | JPG/JPEG/PNG can still be privately uploaded and downloaded, but image OCR and scanned-PDF OCR are unavailable; processing clearly reports this. |
| Mock AI | **SIMULATED** | Explicit simulated mode, missing provider key, or provider error produces provider `MOCK` and processing mode `SIMULATED`, with a visible label and no invented patient findings. No separate fictional sample interpretation is generated. |
| Explainable operational prioritization | **NOT IMPLEMENTED** | No rules engine, queue, override, history or priority analytics. Existing clinician-authored risk records are not automated workflow prioritization. |
| Admin audit logging | **PARTIALLY IMPLEMENTED** | Existing live admin user provisioning, account/verification changes, assignment creation/revocation/reassignment are logged transactionally and viewable through the admin-only filtered audit page. Failed attempts, sensitive reads, administrative appointment/referral changes and priority overrides are not covered. |
| English translation coverage | **PARTIALLY IMPLEMENTED** | Most UI is English, but not all text is in a centralized dictionary. |
| Hindi translation coverage | **PARTIALLY IMPLEMENTED** | Public site and dashboard navigation have translations. Many portal forms, analysis controls, statuses, errors and audit content remain English; preference restoration and persistence are incomplete across roles. No complete translation-coverage test exists. |

Existing upload magic-byte/extension/size checks and private storage are reused. Authorized patients may initiate processing; only the owner and actively assigned doctors may view the analysis. Original report download and clinician review history remain separate. AI is not a medical device or a diagnosis; professional review is required. For emergencies contact local emergency services.

## Database and APIs

- Added migration `0006_report_analyses`, an append-only history of report processing attempts including provider, mode, status, per-request consent, result, safe failure reason and timestamp. Applied and checked on local SQLite; PostgreSQL was not available for migration testing.
- Added `POST /api/patient/reports/{report_id}/analyses`: `mode` is `SIMULATED` or `EXTERNAL`; external mode requires `external_consent: true`. No patient report is sent externally without consent.
- Added `GET /api/patient/reports/{report_id}/analyses` and `GET /api/doctor/reports/{report_id}/analyses` with pagination and ownership/active-assignment checks.
- The same POST may be used for manual retry; previous attempts remain stored. No background queue, structured failed-provider taxonomy, deletion/retention management, in-app analysis notification or rate limiter was added.

## Tests and quality checks

- Backend: **67 passed** (`.venv/bin/pytest -q`). Includes mock fallback, missing consent, ownership and doctor-assignment restrictions, PDF extraction, unavailable image OCR, invalid provider output, source-quote filtering, and existing audit/auth workflows. Provider timeout/quota failures were not individually exercised against the real SDK or network.
- Frontend: **88 passed** (`npm test`); lint, TypeScript check, formatting check and production build passed. Rollup emitted dependency annotation warnings.
- SQLite: `alembic upgrade head` and `alembic check` passed; the migration test exercises upgrade/downgrade. No PostgreSQL test.
- Live HTTP smoke via the frontend proxy: health checks, synthetic patient login, simulated report processing, explicit-consent rejection, and assigned-doctor access passed. A browser-based full end-to-end demonstration and a real Gemini call were **not** verified.

## Running locally

From the repository root:

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env  # only if no existing configuration
.venv/bin/alembic upgrade head
CAREBRIDGE_DEMO_PASSWORD='DemoOnly!2026A' .venv/bin/python -m app.cli.seed_demo  # fresh SQLite only
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

In another terminal:

```bash
cd frontend
npm ci
npm run dev -- --host 0.0.0.0 --port 5173
```

Frontend: http://localhost:5173; backend: http://localhost:8000; API docs: http://localhost:8000/docs; health: http://localhost:8000/api/health. Seed only a fresh development SQLite database; see [docs/demo.md](docs/demo.md) for reset instructions and sample credentials. Set a newly rotated `GEMINI_API_KEY` only in the backend environment and change `GEMINI_MODEL` if necessary. Never commit credentials or use real patient reports.

## Available demonstration

1. Sign in as `patient1@demo.example.org` using the password supplied during seeding. Open a synthetic PDF report under My Health Reports and select **Run simulated analysis**. The result is labelled simulated and contains no patient-specific findings.
2. Sign out and sign in as `doctor1@demo.example.org`. Open the assigned patient's report; the simulated analysis appears alongside the existing review workflow. Record a review and use the existing referral and follow-up forms if desired.
3. Sign in as `admin@demo.example.org`, perform a live account or assignment change, then inspect **Audit Logs**.
4. Switch the navigation language to Hindi; note that many page contents remain English. Automated priority and a real Gemini demonstration are not available in the verified demo.
