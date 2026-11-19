"""Centralized domain and application exception hierarchy."""

from typing import Any


class AppException(Exception):
    """Base application exception translated into a structured JSON response."""

    def __init__(
        self,
        message: str,
        *,
        status_code: int = 500,
        code: str = "internal_error",
        details: Any | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details
        self.headers = headers


class BadRequestException(AppException):
    """Raised when a client request violates business or input constraints."""

    def __init__(
        self,
        message: str,
        *,
        code: str = "bad_request",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            message,
            status_code=400,
            code=code,
            details=details,
        )


class UnauthorizedException(AppException):
    """Raised when authentication credentials are missing, expired, or invalid."""

    def __init__(
        self,
        message: str = "Authentication required.",
        *,
        code: str = "unauthorized",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            message,
            status_code=401,
            code=code,
            details=details,
            headers={"WWW-Authenticate": "Bearer"},
        )


class ForbiddenException(AppException):
    """Raised when an authenticated user lacks permission for a resource or action."""

    def __init__(
        self,
        message: str = "You do not have permission to perform this action.",
        *,
        code: str = "forbidden",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            message,
            status_code=403,
            code=code,
            details=details,
        )


class NotFoundException(AppException):
    """Raised when a requested resource cannot be found."""

    def __init__(self, message: str = "Resource not found.", *, details: Any | None = None) -> None:
        super().__init__(
            message,
            status_code=404,
            code="not_found",
            details=details,
        )


class ConflictException(AppException):
    """Raised when an operation conflicts with existing resource state."""

    def __init__(
        self,
        message: str = "Resource conflict.",
        *,
        code: str = "conflict",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            message,
            status_code=409,
            code=code,
            details=details,
        )


class RateLimitException(AppException):
    """Raised when a client exceeds a configured request rate limit."""

    def __init__(
        self,
        message: str = "Too many requests. Please wait and try again.",
        *,
        retry_after_seconds: int = 60,
    ) -> None:
        super().__init__(
            message,
            status_code=429,
            code="rate_limit_exceeded",
            headers={"Retry-After": str(max(1, retry_after_seconds))},
        )


class ServiceUnavailableException(AppException):
    """Raised when a dependent service (such as the database) is unavailable."""

    def __init__(
        self,
        message: str = "Service temporarily unavailable.",
        *,
        details: Any | None = None,
    ) -> None:
        super().__init__(
            message,
            status_code=503,
            code="service_unavailable",
            details=details,
        )
