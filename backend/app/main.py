"""CareBridge AI — FastAPI application entry point."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from app.database.session import check_database_connection

from app.api.router import api_router
from app.core.config import get_settings
from app.database.session import engine
from app.middleware.error_handler import register_exception_handlers


def _configure_logging(debug: bool) -> None:
    logging.basicConfig(
        level=logging.DEBUG if debug else logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Manage startup and graceful shutdown of shared application resources."""
    yield
    engine.dispose()


def create_app() -> FastAPI:
    """Construct and configure the CareBridge AI FastAPI application."""
    settings = get_settings()
    _configure_logging(settings.DEBUG)

    application = FastAPI(
        title=settings.APP_NAME,
        description=(
            "From Early Screening to Timely Care — One Intelligent Platform. "
            "Developed by Team ALPHA for the Future Health Challenge (Population Health)."
        ),
        version=settings.APP_VERSION,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_origin_regex=settings.CORS_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Accept",
            "Authorization",
            "Content-Type",
            settings.CSRF_HEADER_NAME,
        ],
    )

    @application.middleware("http")
    async def attach_security_headers(request: Request, call_next) -> Response:  # type: ignore[no-untyped-def]
        response: Response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault(
            "Referrer-Policy", "strict-origin-when-cross-origin"
        )
        if request.url.path.startswith(f"{settings.API_PREFIX}/"):
            response.headers.setdefault("Cache-Control", "no-store")
        return response

    @application.get("/health", include_in_schema=False)
    def liveness() -> dict[str, str]:
        return {"status": "healthy"}

    @application.get("/ready", include_in_schema=False)
    def readiness() -> Response:
        try:
            check_database_connection()
        except SQLAlchemyError:
            return JSONResponse(status_code=503, content={"status": "unavailable"})
        return JSONResponse(content={"status": "ready"})

    register_exception_handlers(application)
    application.include_router(api_router, prefix=settings.API_PREFIX)

    return application


app = create_app()
