# Deployment guide

**Status: PREPARED; deployment BLOCKED.** No cloud resources, public URL, DNS, production migration, provider request or paid service has been created or verified. This is a prototype for synthetic data, not a clinically validated or privacy-compliant system.

## Topology

TLS ingress at one HTTPS origin → loopback Nginx frontend → internal FastAPI `/api` → managed PostgreSQL + private persistent report volume; optional consent-gated Gemini outbound. Nginx provides SPA fallback. `docker-compose.production.yml` is a candidate for a single hardened host, not a production certification or HA setup. It exposes only loopback port 8080; an independently configured TLS ingress, firewall, monitoring and backups are required. Do not publish backend or PostgreSQL ports. Make `/health` and `/ready` available only to internal probes; readiness checks DB, not storage/provider/schema correctness. Protect admin routes via backend RBAC and avoid public exposure of infrastructure consoles.

## Release sequence (requires approval)

1. Review changes, CI, clinical/privacy/security readiness, and costs; approve hosting, DNS and any destructive action. Establish a secret manager, private managed Postgres with TLS, HTTPS ingress, persistent encrypted private storage, backup/restore, trusted edge rate limiting, log scrubbing and alerting.
2. Set environment in a secure host/provider mechanism as in `PRODUCTION_ENVIRONMENT.md`; configure `/api` same-origin proxy. Keep DB and upload volume private. Confirm volume is writable by the non-root backend user, private to it, encrypted, backed up, and survives replacement. A local named volume is not multi-host or automatically backed up; never scale replicas across hosts without a suitable shared private storage implementation. Object storage is not implemented.
3. Build reviewed images and run the separate migration release job in `DATABASE_DEPLOYMENT.md` after a verified backup and explicit authorization. Do not run development Compose against production. Then start reviewed services with `docker compose -f docker-compose.production.yml up -d --build`; migration is not automatic in this file.
4. Verify actual HTTPS host, route refresh, liveness/readiness internally, synthetic patient registration/login/reload, CSRF, ownership denial, upload/OCR, consented analysis, doctor approval/assignment, clinician workflow and administrator authorization/audit. Confirm no sensitive data in logs. Real Gemini is verified only by an actual consented successful request with an authorized key, with no patient data.
5. Monitor error rates, resource usage, disk capacity, database connections, backups and audit events. Rehearse incident response and coordinated restore. Do not claim deployment or readiness until verified.

OCR runtime uses PyMuPDF/RapidOCR and headless OpenCV; the image reinstalls headless OpenCV after dependencies due to a dependency collision. Container build, host TLS integration and runtime have not been tested in this environment. OCR is resource-intensive and has limitations documented in `FINAL_COMPLETION_REPORT.md`. The current per-process limiter is not appropriate as sole public protection.
