# Database deployment

**Status: PREPARED**, PostgreSQL runtime **UNVERIFIED**. Production must set a managed PostgreSQL `DATABASE_URL`; SQLite fallback is rejected outside local/test. Use a private network, TLS with provider CA verification (`sslmode=verify-full` and an appropriate root certificate), restricted least-privilege accounts and secret management. Verify connection settings against the provider, and never paste credentials in logs, command history or source control.

SQLAlchemy uses pre-ping, 5 pooled connections plus 10 overflow per backend process and 1800-second recycle. Size this against database connection limits and replica count; an external connection pool may require appropriate session/transaction compatibility. Alembic uses a separate NullPool.

## Controlled migration

Take and verify a restorable backup before any release. Test upgrades against an isolated sanitized clone at the actual existing revision; ensure application compatibility and obtain approval for irreversible changes. Stop/coordinate writers if needed, then run **one** reviewed release job, not each replica:

```sh
docker compose -f docker-compose.production.yml run --rm --no-deps backend alembic current
docker compose -f docker-compose.production.yml run --rm --no-deps backend alembic upgrade head
docker compose -f docker-compose.production.yml run --rm --no-deps backend alembic check
```

The production Compose commands require configured backend environment even for migration. These commands alter the target database; do not run them on production without approval. No production migration has been executed. `0001`–`0007` remain intact.

CI includes an opt-in PostgreSQL test that refuses a database other than an empty dedicated `carebridge_ci_test`, upgrades to revision 0004 and then head, checks tables and schema drift. This is a fresh/intermediate-schema test, not proof of safety for existing customer data; it has not run here because PostgreSQL/Docker are unavailable. Fresh SQLite upgrade and `alembic check` passed locally; SQLite is not PostgreSQL evidence.

## Backups and rollback

Configure encrypted provider point-in-time recovery and scheduled backups, restricted access and retention; back up report files together with the database to a coordinated recovery point. Practice restore to an isolated environment and verify records and authorized report retrieval. Document RPO/RTO and test them before production. Roll back application only when schema-compatible; otherwise follow an approved, rehearsed restore plan. Alembic downgrades can lose data and are not a substitute for verified backups. No backup/restore has been performed or verified.
