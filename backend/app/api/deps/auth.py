"""FastAPI authentication, CSRF verification, and role-based access control dependencies."""

from collections.abc import Callable
from typing import Annotated, Literal

from fastapi import Depends, Request
from jwt import ExpiredSignatureError, InvalidTokenError
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_token, verify_csrf_tokens
from app.database.session import get_db
from app.models.user import User, UserRole

SAFE_HTTP_METHODS = frozenset({"GET", "HEAD", "OPTIONS", "TRACE"})


def extract_bearer_token(request: Request) -> str | None:
    """Extract a Bearer JWT from the Authorization header when provided."""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    scheme, _, credentials = auth_header.partition(" ")
    if scheme.lower() != "bearer" or not credentials.strip():
        raise UnauthorizedException(
            "Invalid authorization header format.",
            code="invalid_auth_header",
        )
    return credentials.strip()


def enforce_cookie_csrf(request: Request, settings: Settings) -> None:
    """Validate double-submit CSRF token for cookie-authenticated state-changing requests."""
    if request.method.upper() in SAFE_HTTP_METHODS:
        return
    csrf_cookie = request.cookies.get(settings.CSRF_COOKIE_NAME)
    csrf_header = request.headers.get(settings.CSRF_HEADER_NAME)
    if not verify_csrf_tokens(csrf_cookie, csrf_header):
        raise ForbiddenException(
            "CSRF token missing or invalid.",
            code="csrf_validation_failed",
        )


def _extract_access_token(
    request: Request, settings: Settings
) -> tuple[str, Literal["bearer", "cookie"]]:
    """Resolve an access token from Authorization Bearer header or HttpOnly cookie."""
    bearer = extract_bearer_token(request)
    if bearer:
        return bearer, "bearer"

    cookie_token = request.cookies.get(settings.ACCESS_COOKIE_NAME)
    if cookie_token:
        return cookie_token, "cookie"

    raise UnauthorizedException(
        "Authentication required. Please sign in to continue.",
        code="not_authenticated",
    )


def get_current_user(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> User:
    """Validate the access JWT, enforce CSRF for cookie writes, and return the User."""
    token, source = _extract_access_token(request, settings)

    if source == "cookie":
        enforce_cookie_csrf(request, settings)

    try:
        claims = decode_token(token, expected_type="access", settings=settings)
    except ExpiredSignatureError as exc:
        raise UnauthorizedException(
            "Access token has expired.",
            code="token_expired",
        ) from exc
    except InvalidTokenError as exc:
        raise UnauthorizedException(
            "Invalid authentication credentials.",
            code="invalid_token",
        ) from exc

    user_id = str(claims["sub"])
    user = db.get(User, user_id)
    if user is None:
        raise UnauthorizedException(
            "Invalid authentication credentials.",
            code="invalid_token",
        )

    if claims.get("ver") != user.token_version or claims.get("role") != user.role:
        raise UnauthorizedException(
            "Session is no longer current. Please sign in again.",
            code="session_invalidated",
        )

    return user


def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Require an authenticated user whose account is currently active."""
    if not current_user.is_active:
        raise ForbiddenException(
            "This account is inactive. Please contact an administrator.",
            code="account_inactive",
        )
    return current_user


def require_roles(*allowed_roles: UserRole) -> Callable[..., User]:
    """Create a reusable FastAPI dependency enforcing one of ``allowed_roles``."""
    allowed_set = frozenset(allowed_roles)

    def _role_checker(
        current_user: Annotated[User, Depends(get_current_active_user)],
    ) -> User:
        if current_user.role_enum not in allowed_set:
            raise ForbiddenException(
                "You do not have permission to access this resource.",
                code="insufficient_role",
            )
        return current_user

    return _role_checker


require_patient = require_roles(UserRole.PATIENT)
require_doctor = require_roles(UserRole.DOCTOR)
require_admin = require_roles(UserRole.ADMIN)

CurrentUser = Annotated[User, Depends(get_current_active_user)]
PatientUser = Annotated[User, Depends(require_patient)]
DoctorUser = Annotated[User, Depends(require_doctor)]
AdminUser = Annotated[User, Depends(require_admin)]
