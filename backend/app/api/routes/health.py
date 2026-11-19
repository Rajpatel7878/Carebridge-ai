"""Application and database health check endpoints."""

import logging

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings
from app.database.session import check_database_connection
from app.schemas.health import DatabaseHealthResponse, HealthResponse

logger = logging.getLogger("carebridge.health")

router = APIRouter(prefix="/health", tags=["Health"])


@router.get(
    "",
    response_model=HealthResponse,
    summary="Application health check",
)
def get_health() -> HealthResponse:
    """Return service status, application name, and semantic version."""
    settings = get_settings()
    return HealthResponse(
        status="healthy",
        application=settings.APP_NAME,
        version=settings.APP_VERSION,
    )


@router.get(
    "/database",
    response_model=DatabaseHealthResponse,
    response_model_exclude_none=True,
    summary="Database connectivity check",
)
def get_database_health() -> DatabaseHealthResponse | JSONResponse:
    """Verify live database connectivity (PostgreSQL when configured, or SQLite fallback)."""
    settings = get_settings()
    dialect = settings.database_dialect
    mode = "sqlite_fallback" if settings.is_sqlite_fallback else "configured"

    try:
        check_database_connection()
    except SQLAlchemyError as exc:
        logger.warning(
            "Database connectivity check failed (dialect=%s, mode=%s): %s",
            dialect,
            mode,
            exc.__class__.__name__,
        )
        payload = DatabaseHealthResponse(
            status="unhealthy",
            database="disconnected",
            dialect=dialect,
            mode=mode,
            detail="Unable to connect to the configured database.",
        )
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=payload.model_dump(exclude_none=True),
        )

    return DatabaseHealthResponse(
        status="healthy",
        database="connected",
        dialect=dialect,
        mode=mode,
    )
