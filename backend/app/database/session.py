"""SQLAlchemy engine construction, session factory, and connectivity verification."""

from collections.abc import Generator
from typing import Any

from sqlalchemy import Engine, create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


def build_engine(database_url: str, *, debug: bool = False) -> Engine:
    """Create a SQLAlchemy Engine configured for PostgreSQL or local SQLite fallback."""
    engine_kwargs: dict[str, Any] = {
        "echo": debug,
        "pool_pre_ping": True,
    }

    if database_url.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}
    else:
        engine_kwargs["pool_size"] = 5
        engine_kwargs["max_overflow"] = 10
        engine_kwargs["pool_recycle"] = 1800

    created_engine = create_engine(database_url, **engine_kwargs)

    if database_url.startswith("sqlite"):

        @event.listens_for(created_engine, "connect")
        def _enable_sqlite_foreign_keys(dbapi_connection: Any, _record: Any) -> None:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return created_engine


_settings = get_settings()
engine: Engine = build_engine(_settings.resolved_database_url, debug=_settings.DEBUG)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    class_=Session,
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a scoped SQLAlchemy database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection(target_engine: Engine | None = None) -> None:
    """Execute a lightweight probe query to verify live database connectivity."""
    active_engine = target_engine or engine
    with active_engine.connect() as connection:
        connection.execute(text("SELECT 1"))
