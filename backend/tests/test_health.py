"""Phase 1 foundation tests: health checks, configuration, error handling, and database."""

from pathlib import Path
from unittest.mock import patch

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.core.config import BACKEND_DIR, Settings, normalize_database_url
from app.core.exceptions import NotFoundException
from app.database.session import build_engine, get_db
from app.main import create_app


def test_health_endpoint_returns_expected_contract(client: TestClient) -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "application": "CareBridge AI",
        "version": "1.0.0",
    }


def test_database_health_with_sqlite_fallback(
    client: TestClient, tmp_path: Path
) -> None:
    temp_engine = build_engine(f"sqlite:///{(tmp_path / 'test.db').as_posix()}")
    try:
        with patch("app.database.session.engine", temp_engine):
            response = client.get("/api/health/database")

        assert response.status_code == 200
        assert response.json() == {
            "status": "healthy",
            "database": "connected",
            "dialect": "sqlite",
            "mode": "sqlite_fallback",
        }
    finally:
        temp_engine.dispose()


def test_database_health_when_postgresql_configured_and_healthy(
    client: TestClient,
) -> None:
    pg_settings = Settings(
        DATABASE_URL="postgresql+psycopg://user:pass@localhost:5432/carebridge_ai"
    )
    with (
        patch("app.api.routes.health.get_settings", return_value=pg_settings),
        patch("app.api.routes.health.check_database_connection", return_value=None),
    ):
        response = client.get("/api/health/database")

    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "database": "connected",
        "dialect": "postgresql",
        "mode": "configured",
    }


def test_database_health_returns_503_when_postgresql_unreachable(
    client: TestClient,
) -> None:
    pg_settings = Settings(
        DATABASE_URL="postgresql+psycopg://user:pass@localhost:5432/carebridge_ai"
    )
    with (
        patch("app.api.routes.health.get_settings", return_value=pg_settings),
        patch(
            "app.api.routes.health.check_database_connection",
            side_effect=OperationalError("SELECT 1", {}, Exception("connection refused")),
        ),
    ):
        response = client.get("/api/health/database")

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "unhealthy"
    assert body["database"] == "disconnected"
    assert body["dialect"] == "postgresql"
    assert body["mode"] == "configured"
    assert "pass" not in str(body)


def test_database_url_normalization(tmp_path: Path) -> None:
    fallback = tmp_path / "fallback.db"
    assert normalize_database_url("", fallback) == f"sqlite:///{fallback.as_posix()}"
    assert (
        normalize_database_url("postgres://u:p@db:5432/app", fallback)
        == "postgresql+psycopg://u:p@db:5432/app"
    )
    assert (
        normalize_database_url("postgresql://u:p@db:5432/app", fallback)
        == "postgresql+psycopg://u:p@db:5432/app"
    )
    assert (
        normalize_database_url("postgresql+psycopg://u:p@db:5432/app", fallback)
        == "postgresql+psycopg://u:p@db:5432/app"
    )


def test_cors_origins_parsing() -> None:
    csv_settings = Settings(CORS_ORIGINS="http://localhost:5173, http://localhost:3000")
    assert csv_settings.cors_origins_list == [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    json_settings = Settings(CORS_ORIGINS='["https://carebridge.example.com"]')
    assert json_settings.cors_origins_list == ["https://carebridge.example.com"]


def test_centralized_error_handling() -> None:
    app = create_app()

    @app.get("/api/_test-not-found")
    def raise_not_found() -> None:
        raise NotFoundException("Sample item not found.")

    with TestClient(app) as local_client:
        missing_route = local_client.get("/api/does-not-exist")
        assert missing_route.status_code == 404
        assert missing_route.json()["error"]["code"] == "http_404"

        domain_error = local_client.get("/api/_test-not-found")
        assert domain_error.status_code == 404
        assert domain_error.json() == {
            "error": {
                "code": "not_found",
                "message": "Sample item not found.",
            }
        }


def test_get_db_session_lifecycle(tmp_path: Path) -> None:
    temp_engine = build_engine(f"sqlite:///{(tmp_path / 'session.db').as_posix()}")
    try:
        gen = get_db()
        session = next(gen)
        session.bind = temp_engine
        result = session.execute(text("SELECT 1")).scalar_one()
        assert result == 1
        try:
            next(gen)
        except StopIteration:
            pass
    finally:
        temp_engine.dispose()


def test_alembic_baseline_migration_upgrade_and_downgrade(tmp_path: Path) -> None:
    db_url = f"sqlite:///{(tmp_path / 'alembic_test.db').as_posix()}"
    alembic_cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)

    command.upgrade(alembic_cfg, "head")

    verify_engine = build_engine(db_url)
    try:
        from sqlalchemy import inspect as sa_inspect

        tables = set(sa_inspect(verify_engine).get_table_names())
        assert {
            "alembic_version",
            "users",
            "refresh_tokens",
            "patient_profiles",
            "medical_reports",
            "risk_assessments",
            "appointments",
            "referrals",
            "follow_ups",
            "notifications",
            "doctor_profiles",
            "patient_doctor_assignments",
            "report_reviews",
            "clinical_reviews",
            "referral_history",
        }.issubset(tables)
        with verify_engine.connect() as conn:
            version = conn.execute(
                text("SELECT version_num FROM alembic_version")
            ).scalar_one()
        assert version == "0004_doctor_portal_models"
    finally:
        verify_engine.dispose()

    command.downgrade(alembic_cfg, "base")
    command.upgrade(alembic_cfg, "head")
