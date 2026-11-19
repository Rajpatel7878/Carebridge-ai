"""Centralized exception handling for uniform, non-leaky API error responses."""

import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import AppException

logger = logging.getLogger("carebridge.errors")

SENSITIVE_FIELD_NAMES = frozenset(
    {"password", "confirm_password", "current_password", "new_password", "token", "secret"}
)


def _error_payload(code: str, message: str, details: Any | None = None) -> dict[str, Any]:
    error: dict[str, Any] = {"code": code, "message": message}
    if details is not None:
        error["details"] = details
    return {"error": error}


def _sanitize_validation_errors(raw_errors: list[Any]) -> list[dict[str, Any]]:
    """Convert Pydantic validation errors into safe JSON-serializable items.

    Strips raw input values for sensitive fields (passwords, tokens, secrets) and
    omits internal Python exception objects from error contexts.
    """
    sanitized: list[dict[str, Any]] = []
    for err in raw_errors:
        if not isinstance(err, dict):
            continue
        loc = [str(part) for part in err.get("loc", ())]
        msg = str(err.get("msg", "Invalid value."))
        # Strip Pydantic's "Value error, " prefix for clean client-facing messages.
        if msg.startswith("Value error, "):
            msg = msg.removeprefix("Value error, ")
        item: dict[str, Any] = {
            "field": ".".join(part for part in loc if part != "body") or "request",
            "loc": loc,
            "message": msg,
            "type": str(err.get("type", "validation_error")),
        }
        # Never reflect sensitive field values back in responses.
        if not any(part.lower() in SENSITIVE_FIELD_NAMES for part in loc):
            raw_input = err.get("input")
            if isinstance(raw_input, (str, int, float, bool)) and len(str(raw_input)) <= 120:
                item["input"] = raw_input
        sanitized.append(item)
    return sanitized


def register_exception_handlers(app: FastAPI) -> None:
    """Attach centralized exception handlers to the FastAPI application."""

    @app.exception_handler(AppException)
    async def handle_app_exception(_request: Request, exc: AppException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_payload(exc.code, exc.message, exc.details),
            headers=exc.headers,
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(
        _request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_payload(f"http_{exc.status_code}", str(exc.detail)),
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        details = _sanitize_validation_errors(list(exc.errors()))
        first_message = (
            details[0]["message"] if details else "Request validation failed."
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content=_error_payload(
                "validation_error",
                first_message,
                details=details,
            ),
        )

    @app.exception_handler(SQLAlchemyError)
    async def handle_database_error(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        logger.error(
            "Database error during %s %s: %s",
            request.method,
            request.url.path,
            exc.__class__.__name__,
        )
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=_error_payload(
                "database_error",
                "A database error occurred while processing the request.",
            ),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        logger.error(
            "Unhandled exception during %s %s: %s",
            request.method,
            request.url.path,
            exc.__class__.__name__,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_payload(
                "internal_server_error",
                "An unexpected internal server error occurred.",
            ),
        )
