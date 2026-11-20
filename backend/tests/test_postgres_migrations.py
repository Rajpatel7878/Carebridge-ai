"""Opt-in migration integration test; only an empty dedicated CI database is accepted."""
import os

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url

from app.core.config import BACKEND_DIR, normalize_database_url


def test_postgresql_fresh_and_existing_upgrade() -> None:
    url = os.getenv('CAREBRIDGE_TEST_POSTGRES_URL', '').strip()
    if not url:
        pytest.skip('CAREBRIDGE_TEST_POSTGRES_URL not configured')
    url = normalize_database_url(url)
    parsed = make_url(url)
    if parsed.get_backend_name() != 'postgresql' or parsed.database != 'carebridge_ci_test':
        pytest.fail('Refusing to run: expected the dedicated carebridge_ci_test PostgreSQL database')
    engine = create_engine(url, pool_pre_ping=True)
    try:
        if inspect(engine).get_table_names():
            pytest.fail('Refusing to migrate a nonempty integration-test database')
        cfg = Config(str(BACKEND_DIR / 'alembic.ini'))
        cfg.set_main_option('script_location', str(BACKEND_DIR / 'alembic'))
        cfg.set_main_option('sqlalchemy.url', url.replace('%', '%%'))
        command.upgrade(cfg, '0004_doctor_portal_models')
        with engine.connect() as conn:
            assert conn.scalar(text('SELECT version_num FROM alembic_version')) == '0004_doctor_portal_models'
        command.upgrade(cfg, 'head')
        with engine.connect() as conn:
            assert conn.scalar(text('SELECT version_num FROM alembic_version')) == '0007_priority_assessments'
        assert {'users', 'medical_reports', 'audit_logs', 'report_analyses', 'priority_assessments'} <= set(inspect(engine).get_table_names())
        command.check(cfg)
    finally:
        engine.dispose()
