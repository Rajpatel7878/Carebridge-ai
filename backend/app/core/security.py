"""Cryptographic primitives: Argon2id password hashing, JWT management, cookies, and CSRF."""

from datetime import UTC, datetime, timedelta
import hashlib
import re
import secrets
from typing import Any, Literal
import uuid

from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from fastapi import Response
import jwt
from jwt import InvalidTokenError

from app.core.config import Settings

# OWASP-aligned Argon2id configuration using the official argon2-cffi library.
_password_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,  # 64 MiB
    parallelism=4,
    hash_len=32,
    salt_len=16,
    type=Type.ID,
)

# Pre-computed dummy Argon2id hash used when an account email is missing so login
# performs equivalent work and reduces timing-based account enumeration.
_DUMMY_PASSWORD_HASH = _password_hasher.hash(secrets.token_urlsafe(32))

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128
_UPPERCASE_RE = re.compile(r"[A-Z]")
_LOWERCASE_RE = re.compile(r"[a-z]")
_DIGIT_RE = re.compile(r"[0-9]")
_SPECIAL_RE = re.compile(r"[^A-Za-z0-9\s]")


def validate_password_strength(password: str) -> str:
    """Validate password complexity requirements and return password unchanged."""
    if len(password) < PASSWORD_MIN_LENGTH:
        raise ValueError(
            f"Password must be at least {PASSWORD_MIN_LENGTH} characters long."
        )
    if len(password) > PASSWORD_MAX_LENGTH:
        raise ValueError(
            f"Password must not exceed {PASSWORD_MAX_LENGTH} characters."
        )
    if not _UPPERCASE_RE.search(password):
        raise ValueError("Password must include at least one uppercase letter.")
    if not _LOWERCASE_RE.search(password):
        raise ValueError("Password must include at least one lowercase letter.")
    if not _DIGIT_RE.search(password):
        raise ValueError("Password must include at least one number.")
    if not _SPECIAL_RE.search(password):
        raise ValueError(
            "Password must include at least one special character (e.g., !@#$%^&*)."
        )
    return password


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password using Argon2id."""
    return _password_hasher.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> tuple[bool, bool]:
    """Verify a plaintext password against a stored Argon2id hash.

    Returns ``(is_valid, needs_rehash)``.
    """
    try:
        _password_hasher.verify(hashed_password, plain_password)
        return True, _password_hasher.check_needs_rehash(hashed_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False, False


def verify_dummy_password(plain_password: str) -> None:
    """Execute constant-path Argon2id verification when a user record does not exist."""
    try:
        _password_hasher.verify(_DUMMY_PASSWORD_HASH, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return


def hash_token(raw_token: str) -> str:
    """Compute a deterministic SHA-256 hex digest for storing refresh tokens safely."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_csrf_token() -> str:
    """Generate a cryptographically random CSRF double-submit token."""
    return secrets.token_urlsafe(32)


def verify_csrf_tokens(cookie_token: str | None, header_token: str | None) -> bool:
    """Compare CSRF cookie and header tokens in constant time."""
    if not cookie_token or not header_token:
        return False
    return secrets.compare_digest(cookie_token, header_token)


def create_access_token(
    *,
    user_id: str,
    role: str,
    token_version: int,
    settings: Settings,
) -> tuple[str, int]:
    """Create a signed short-lived JWT access token.

    Returns ``(encoded_token, expires_in_seconds)``.
    """
    now = datetime.now(UTC)
    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expires_at = now + expires_delta
    payload: dict[str, Any] = {
        "sub": user_id,
        "role": role,
        "ver": token_version,
        "type": "access",
        "jti": str(uuid.uuid4()),
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    encoded = jwt.encode(
        payload,
        settings.signing_secret,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded, int(expires_delta.total_seconds())


def create_refresh_token(
    *,
    user_id: str,
    token_id: str,
    family_id: str,
    is_persistent: bool,
    settings: Settings,
) -> tuple[str, datetime, int | None]:
    """Create a signed refresh JWT paired with a database rotation record.

    Returns ``(encoded_token, expires_at, cookie_max_age)``.
    """
    now = datetime.now(UTC)
    if is_persistent:
        expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        cookie_max_age: int | None = int(expires_delta.total_seconds())
    else:
        expires_delta = timedelta(hours=settings.SESSION_REFRESH_EXPIRE_HOURS)
        cookie_max_age = None

    expires_at = now + expires_delta
    payload: dict[str, Any] = {
        "sub": user_id,
        "fam": family_id,
        "type": "refresh",
        "jti": token_id,
        "nonce": secrets.token_urlsafe(16),
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    encoded = jwt.encode(
        payload,
        settings.signing_secret,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded, expires_at, cookie_max_age


def decode_token(
    token: str,
    *,
    expected_type: Literal["access", "refresh"],
    settings: Settings,
) -> dict[str, Any]:
    """Decode and strictly validate a signed JWT for the expected token type."""
    payload: dict[str, Any] = jwt.decode(
        token,
        settings.signing_secret,
        algorithms=[settings.JWT_ALGORITHM],
        issuer=settings.JWT_ISSUER,
        audience=settings.JWT_AUDIENCE,
        options={
            "require": ["sub", "exp", "iat", "iss", "aud", "jti", "type"],
        },
    )
    if payload.get("type") != expected_type:
        raise InvalidTokenError("Unexpected token type.")
    sub = payload.get("sub")
    jti = payload.get("jti")
    if not isinstance(sub, str) or not sub or not isinstance(jti, str) or not jti:
        raise InvalidTokenError("Malformed token identity claims.")
    return payload


def set_auth_cookies(
    response: Response,
    *,
    access_token: str,
    access_max_age: int,
    refresh_token: str,
    refresh_max_age: int | None,
    csrf_token: str,
    settings: Settings,
) -> None:
    """Attach HttpOnly session cookies and a readable CSRF cookie to a response."""
    secure = settings.resolved_cookie_secure
    samesite = settings.COOKIE_SAMESITE
    domain = settings.COOKIE_DOMAIN or None

    response.set_cookie(
        key=settings.ACCESS_COOKIE_NAME,
        value=access_token,
        max_age=access_max_age,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/",
        domain=domain,
    )

    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=refresh_max_age,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path=settings.refresh_cookie_path,
        domain=domain,
    )

    # CSRF cookie lifetime tracks the longest active cookie so mutating requests and
    # /api/auth/refresh can echo X-CSRF-Token cleanly without localStorage.
    csrf_max_age = (
        refresh_max_age
        if refresh_max_age is not None
        else settings.SESSION_REFRESH_EXPIRE_HOURS * 3600
    )
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=csrf_token,
        max_age=csrf_max_age,
        httponly=False,
        secure=secure,
        samesite=samesite,
        path="/",
        domain=domain,
    )


def clear_auth_cookies(response: Response, *, settings: Settings) -> None:
    """Expire and remove all authentication and CSRF cookies on a response."""
    secure = settings.resolved_cookie_secure
    samesite = settings.COOKIE_SAMESITE
    domain = settings.COOKIE_DOMAIN or None

    response.delete_cookie(
        key=settings.ACCESS_COOKIE_NAME,
        path="/",
        domain=domain,
        secure=secure,
        httponly=True,
        samesite=samesite,
    )
    response.delete_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        path=settings.refresh_cookie_path,
        domain=domain,
        secure=secure,
        httponly=True,
        samesite=samesite,
    )
    response.delete_cookie(
        key=settings.CSRF_COOKIE_NAME,
        path="/",
        domain=domain,
        secure=secure,
        httponly=False,
        samesite=samesite,
    )
