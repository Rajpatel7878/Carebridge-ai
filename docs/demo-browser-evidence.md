# Synthetic clean-database browser evidence

**WORKING** for the listed path only. A fresh SQLite database and private upload directory were migrated and seeded, then one uninterrupted Playwright/Chromium session completed these stages:

```text
PASS public landing
PASS patient login
PASS Hindi switch
PASS synthetic image upload
PASS consent, local OCR and labelled simulation
PASS doctor login with persisted Hindi
PASS assigned doctor report review
PASS operational priority with explanation
PASS referral
PASS follow-up
PASS administrator login
PASS administrative assignment
PASS administrator audit verification
PASS English switch and reload persistence
Uncaught browser page errors: 0
HTTP errors by endpoint: {"401 /api/auth/me":4}
```

The HTTP 401s are unauthenticated session bootstrap requests; they are disclosed rather than counted as successes. No screenshots or report contents were saved. A first attempt stopped at an open modal, after which the script was corrected and the entire journey was restarted on a second fresh database. This is not evidence of full translation, clinical validity, real Gemini processing, every responsive layout, all links, or all security boundaries. See `FINAL_COMPLETION_REPORT.md` for exact commands and limitations.
