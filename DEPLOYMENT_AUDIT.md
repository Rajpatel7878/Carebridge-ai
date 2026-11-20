# Deployment architecture audit

**Status: PARTIALLY IMPLEMENTED.** The system is a healthcare workflow prototype, not clinically validated and not approved for real patient data.

## Existing architecture

- React 19/Vite 7/TypeScript SPA; Vite proxies `/api` in development. Existing Nginx container provides same-origin `/api` proxy and SPA fallback.
- FastAPI/Pydantic/SQLAlchemy backend, Alembic migrations 0001–0007, psycopg 3 PostgreSQL driver; SQLite is used in development/tests. Sessions use Argon2 password hashing, signed JWTs in HttpOnly cookies, refresh rotation and double-submit CSRF. Backend enforces roles, ownership and assignment.
- Reports are signature- and size-checked and stored privately on a local filesystem, addressed through authorized routes; OCR uses RapidOCR/ONNX, PyMuPDF and Pillow. Google Gemini is backend-only, opt-in, with simulated fallback.
- Dockerfiles and development Compose exist. The backend Dockerfile currently performs migrations at every startup. Health and database connectivity endpoints exist. A synthetic browser workflow and extensive backend/frontend tests exist.

## Critical blockers identified

1. Production settings permit an empty database URL (SQLite fallback), unsafe DEBUG, localhost/wildcard CORS, a non-secure cookie override and an implicit ephemeral upload path. A strong secret is already required outside local environments. Enforce safe configuration without weakening local tests.
2. Report originals require a private persistent filesystem; ephemeral hosting will lose files. Object storage is not implemented. Do not claim durable storage until a volume, backups and restore test are in place.
3. Cross-origin frontend/API deployment breaks the existing `document.cookie` CSRF double-submit design. Preserve same-origin `/api` proxy instead of presenting a separate-domain Vite URL as sufficient.
4. Automatic schema migrations at container startup are unsafe for an unreviewed production release. Separate the migration step from the service startup and retain explicit local Compose behavior.
5. No public deployment, cloud account, managed PostgreSQL, TLS configuration, storage or real Gemini request has been verified. No production services may be created or paid for without authorization.
6. This prototype lacks full audit coverage, validated clinical safety, comprehensive translation, durable privacy/security/compliance operations and a distributed rate limiter. It is not ready for real patient data.

## Medium and lower priority

- Per-process rate limiting is neither distributed nor proxy-aware; production needs a trusted ingress rate limiter. OCR is synchronous and resource-intensive. Migrations need real PostgreSQL testing and backup/restore procedures. Cookie policy and CORS must match HTTPS origin. Avoid logging report text, tokens and database URLs.
- Provide CI (including real PostgreSQL migration job), explicit environment inventory, health/readiness and operator guide. Existing `VITE_API_BASE_URL` is public configuration, never a secret. Preview localhost addresses are development-only.

## Files assessed for changes

`backend/app/core/config.py`, `backend/app/main.py`, health/tests, `backend/Dockerfile`, `docker-compose.yml`, production Compose override, frontend Nginx/Docker, environment examples, CI workflow and deployment/security/database/environment/readiness guides. Preserve existing migrations, patient/doctor/admin code and preview.
