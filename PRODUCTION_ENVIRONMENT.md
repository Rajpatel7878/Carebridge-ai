# Production environment

**Status: PREPARED.** Supply secrets via host/provider secret manager, not committed files, frontend variables, shell history or build arguments. Compose variable interpolation may expose environment values to privileged host administrators; use a hardened host or provider-native secret injection.

| Variable | Required / purpose |
|---|---|
| `ENVIRONMENT=production` | Rejects unsafe settings and enables Secure cookies. |
| `SECRET_KEY` | Required random secret at least 32 characters; generate and store privately. |
| `DATABASE_URL` | Required PostgreSQL URL, including provider-verified TLS parameters. Never SQLite in production. |
| `CORS_ORIGINS` | Exact HTTPS origin(s), comma-separated or JSON array, no path, wildcard, or localhost. Use the same public origin as the frontend. |
| `UPLOAD_STORAGE_DIR` | Required absolute private persistent path. Compose sets `/var/lib/carebridge/uploads`. |
| `DEBUG=false`, `COOKIE_SECURE=true`, `COOKIE_SAMESITE=lax` | HTTPS same-origin deployment. Cross-site iframe preview uses `none` with Secure; do not use preview policy blindly in production. |
| `GEMINI_API_KEY` | Optional backend-only secret; absent means simulated path. Provider call requires explicit consent. |
| `GEMINI_MODEL` | Configurable backend model. Actual account availability unverified. |
| `VITE_API_BASE_URL=/api` | Public build-time frontend value, not a secret. Browser API and CSRF cookie must be same-origin. |

Do not use `ADMIN_PASSWORD` persistently. Bootstrap an administrator through the existing CLI through a secure short-lived mechanism and remove credentials immediately. Rate limits and upload/OCR limits have existing defaults; plan ingress rate limiting and request limits separately. Review all env examples and settings for remaining tunables. Existing development Compose is not production infrastructure.
