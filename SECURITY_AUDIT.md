# Security audit

**Status: PARTIALLY IMPLEMENTED.** Prototype controls are not a security assessment or a compliance certification. Do not use real patient data before independent review and operational safeguards.

## Controls and changes

- Signed JWT access and rotating refresh cookies are HttpOnly; Argon2 passwords, backend authorization for ownership and assigned doctors, CSRF double-submit, clinician approval, no public admin registration. Synthetic authorization tests pass; this is not a penetration test.
- Production now rejects DEBUG, SQLite/empty database URL, implicit/relative upload path, insecure cookie override, CORS regex, wildcard and non-HTTPS or localhost origins. Strong nondefault secret already required. Database URL is excluded from settings repr. `/api/` responses carry `Cache-Control: no-store`; existing content type, framing, referrer and permissions headers remain.
- Uploads have randomized keys, private non-static storage, extension/signature and size checks, bounded OCR, and authenticated ownership/assignment download checks. Infrastructure must enforce private access, encryption, durability and malware handling; no malware scanner is implemented.
- Central handlers do not return stack traces for unexpected/DB errors. Validation errors can still include nonsensitive inputs; treat all application and ingress logs as sensitive, configure access logs to avoid query strings and bodies, and review retention/access. Do not log reports, cookies or connection strings.
- Consent is required before external AI processing; simulated output is marked. Vendor agreement, residency, retention and consent wording need independent approval. Audit trail is partial; not all reads and events are recorded. Rate limiting is per-process and direct-peer IP; add a distributed trusted-edge limit before public access, avoiding spoofable forwarded headers.

## Secrets

A previously supplied Gemini credential must be considered compromised: owner should revoke/rotate it at the provider and separately rotate any dependent credentials. Revocation is **UNVERIFIED**; we did not use, print or revoke it. Git inspection: one reachable commit, 242 tracked files at HEAD, no matches for a limited set of high-confidence Google key, GitHub token and private-key patterns. This is not proof no secrets exist; untracked/ignored files, other patterns, remote history, logs and external exposure require a proper secret scanner and investigation. No history rewrite was performed.

## Before real use

Independent threat modeling, penetration testing, privacy and legal review; comprehensive audit events with protected retention, backup and incident response; strong administrator provisioning/MFA, centralized rate limiting, malware scanning, encryption and key management, operational monitoring, and reviewed data deletion/retention and vendor controls are **BLOCKED** or **UNVERIFIED**. No real medical data should be processed in this state.
