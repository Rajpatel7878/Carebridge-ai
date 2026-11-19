"""Authentication endpoints: registration, login, token rotation, logout, and profile."""

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.api.deps.auth import (
    CurrentUser,
    enforce_cookie_csrf,
    extract_bearer_token,
)
from app.core.config import Settings, get_settings
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.rate_limit import auth_rate_limiter, get_client_ip
from app.core.security import clear_auth_cookies, set_auth_cookies
from app.database.session import get_db
from app.schemas.auth import (
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    RegisterResponse,
    SessionResponse,
    UserPublic,
)
from app.services.auth_service import (
    authenticate_user,
    issue_session_tokens,
    register_public_user,
    revoke_session_on_logout,
    rotate_refresh_session,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new CareBridge AI account",
)
def register(
    payload: RegisterRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> RegisterResponse:
    """Register a new user safely (defaults to PATIENT; never permits public ADMIN)."""
    if settings.RATE_LIMIT_ENABLED:
        client_ip = get_client_ip(request)
        auth_rate_limiter.enforce(
            f"register:ip:{client_ip}",
            limit=settings.REGISTER_RATE_LIMIT_IP_ATTEMPTS,
            window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS,
            message="Too many registration attempts. Please wait a moment and try again.",
        )

    user, requires_approval = register_public_user(db, payload)
    if requires_approval:
        message = (
            "Account created with PATIENT access. Your DOCTOR role request has been "
            "recorded and requires administrator verification before clinician access "
            "is granted."
        )
    else:
        message = "Account registered successfully. You can now sign in."

    return RegisterResponse(
        user=UserPublic.model_validate(user),
        message=message,
        requires_role_approval=requires_approval,
    )


@router.post(
    "/login",
    response_model=SessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate and start a session",
)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> SessionResponse:
    """Verify email/password and set HttpOnly access + rotating refresh cookies."""
    if settings.RATE_LIMIT_ENABLED:
        client_ip = get_client_ip(request)
        auth_rate_limiter.enforce(
            f"login:ip:{client_ip}",
            limit=settings.LOGIN_RATE_LIMIT_IP_ATTEMPTS,
            window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS,
            message="Too many login attempts from this address. Please try again shortly.",
        )
        auth_rate_limiter.enforce(
            f"login:email:{payload.email}",
            limit=settings.LOGIN_RATE_LIMIT_ATTEMPTS,
            window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS,
            message="Too many login attempts for this account. Please try again shortly.",
        )

    user = authenticate_user(db, email=payload.email, password=payload.password)
    session = issue_session_tokens(
        db,
        user,
        is_persistent=payload.remember_session,
        settings=settings,
    )

    set_auth_cookies(
        response,
        access_token=session.access_token,
        access_max_age=session.access_expires_in,
        refresh_token=session.refresh_token,
        refresh_max_age=session.refresh_cookie_max_age,
        csrf_token=session.csrf_token,
        settings=settings,
    )

    return SessionResponse(
        user=UserPublic.model_validate(user),
        access_token_expires_in=session.access_expires_in,
        session_type="persistent" if session.is_persistent else "session",
        message="Signed in successfully.",
    )


@router.post(
    "/refresh",
    response_model=SessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Rotate refresh token and issue a new access token",
)
def refresh_session(
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> SessionResponse:
    """Validate and rotate the HttpOnly refresh cookie with CSRF and replay checks."""
    raw_refresh_token = request.cookies.get(settings.REFRESH_COOKIE_NAME)
    if not raw_refresh_token:
        raise UnauthorizedException(
            "No active refresh session found. Please sign in.",
            code="missing_refresh_token",
        )

    enforce_cookie_csrf(request, settings)

    try:
        session = rotate_refresh_session(db, raw_refresh_token, settings=settings)
    except (UnauthorizedException, ForbiddenException) as exc:
        error_response = JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": exc.code, "message": exc.message}},
            headers=exc.headers,
        )
        clear_auth_cookies(error_response, settings=settings)
        return error_response  # type: ignore[return-value]

    set_auth_cookies(
        response,
        access_token=session.access_token,
        access_max_age=session.access_expires_in,
        refresh_token=session.refresh_token,
        refresh_max_age=session.refresh_cookie_max_age,
        csrf_token=session.csrf_token,
        settings=settings,
    )

    return SessionResponse(
        user=UserPublic.model_validate(session.user),
        access_token_expires_in=session.access_expires_in,
        session_type="persistent" if session.is_persistent else "session",
        message="Session refreshed successfully.",
    )


@router.post(
    "/logout",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Invalidate current session and clear session cookies",
)
def logout(
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> MessageResponse:
    """Revoke server-side refresh tokens, invalidate active session version, and clear cookies."""
    bearer_token = extract_bearer_token(request)
    cookie_access_token = request.cookies.get(settings.ACCESS_COOKIE_NAME)
    cookie_refresh_token = request.cookies.get(settings.REFRESH_COOKIE_NAME)

    if bearer_token is None and (cookie_access_token or cookie_refresh_token):
        enforce_cookie_csrf(request, settings)

    revoked = revoke_session_on_logout(
        db,
        raw_access_token=bearer_token or cookie_access_token,
        raw_refresh_token=cookie_refresh_token,
        settings=settings,
    )
    clear_auth_cookies(response, settings=settings)

    if revoked:
        return MessageResponse(
            message=(
                "Signed out successfully. Refresh token revoked and active session invalidated."
            )
        )
    return MessageResponse(
        message="Signed out. No active session was present; cookies cleared."
    )


@router.get(
    "/me",
    response_model=UserPublic,
    status_code=status.HTTP_200_OK,
    summary="Retrieve authenticated user's profile",
)
def read_current_user(current_user: CurrentUser) -> UserPublic:
    """Return the authenticated user's safe profile data."""
    return UserPublic.model_validate(current_user)
