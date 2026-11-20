"""Application configuration and environment management."""

from functools import lru_cache
import json
import logging
from pathlib import Path
import secrets
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("carebridge.config")

BACKEND_DIR = Path(__file__).resolve().parents[2]
ROOT_DIR = BACKEND_DIR.parent
DEFAULT_SQLITE_PATH = BACKEND_DIR / "carebridge_dev.db"
DEFAULT_UPLOAD_DIR = BACKEND_DIR / "uploads" / "medical_reports"

ALLOWED_JWT_ALGORITHMS = frozenset({"HS256", "HS384", "HS512"})
INSECURE_SECRET_PLACEHOLDERS = frozenset(
    {
        "changeme",
        "change-me",
        "secret",
        "secret_key",
        "your-secret-key",
        "replace-me",
        "replace-with-strong-secret",
        "password",
    }
)

# Generated once per process strictly as a non-hardcoded fallback for local
# development/test when SECRET_KEY is not supplied in .env.
_EPHEMERAL_DEV_SECRET = secrets.token_urlsafe(48)
_WARNED_EPHEMERAL_SECRET = False


def normalize_database_url(raw_url: str, fallback_sqlite_path: Path = DEFAULT_SQLITE_PATH) -> str:
    """Normalize configured DATABASE_URL or fall back to local SQLite."""
    cleaned = raw_url.strip()
    if not cleaned:
        return f"sqlite:///{fallback_sqlite_path.as_posix()}"
    if cleaned.startswith("postgres://"):
        return cleaned.replace("postgres://", "postgresql+psycopg://", 1)
    if cleaned.startswith("postgresql://"):
        return cleaned.replace("postgresql://", "postgresql+psycopg://", 1)
    return cleaned


class Settings(BaseSettings):
    """Typed application settings loaded from environment variables and .env files."""

    model_config = SettingsConfigDict(
        env_file=(str(BACKEND_DIR / ".env"), str(ROOT_DIR / ".env")),
        env_file_encoding="utf-8",
        case_sensitive=False,
        env_ignore_empty=True,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "CareBridge AI"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    API_PREFIX: str = "/api"

    # Database (empty falls back to local SQLite for development)
    DATABASE_URL: str = Field(default="", repr=False)

    # Security, JWT & Session Cookies
    SECRET_KEY: str = Field(default="", repr=False)
    JWT_ALGORITHM: str = "HS256"
    JWT_ISSUER: str = "carebridge-ai"
    JWT_AUDIENCE: str = "carebridge-ai-web"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, ge=1, le=1440)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, ge=1, le=90)
    SESSION_REFRESH_EXPIRE_HOURS: int = Field(default=12, ge=1, le=168)

    ACCESS_COOKIE_NAME: str = "cb_access_token"
    REFRESH_COOKIE_NAME: str = "cb_refresh_token"
    CSRF_COOKIE_NAME: str = "cb_csrf_token"
    CSRF_HEADER_NAME: str = "X-CSRF-Token"
    COOKIE_SAMESITE: Literal["lax", "strict", "none"] = "lax"
    COOKIE_SECURE: bool | None = None
    COOKIE_DOMAIN: str | None = None

    # Authentication rate limiting (per-process sliding window)
    RATE_LIMIT_ENABLED: bool = True
    LOGIN_RATE_LIMIT_ATTEMPTS: int = Field(default=5, ge=1, le=1000)
    LOGIN_RATE_LIMIT_IP_ATTEMPTS: int = Field(default=15, ge=1, le=1000)
    REGISTER_RATE_LIMIT_IP_ATTEMPTS: int = Field(default=10, ge=1, le=1000)
    RATE_LIMIT_WINDOW_SECONDS: int = Field(default=60, ge=1, le=3600)

    # Secure private storage for uploaded patient medical reports (never served publicly)
    UPLOAD_STORAGE_DIR: str = ""
    MAX_REPORT_UPLOAD_MB: int = Field(default=10, ge=1, le=50)

    # AI Integration (reserved for later phases)
    GEMINI_API_KEY: str = Field(default="", repr=False)
    GEMINI_MODEL: str = Field(default="gemini-2.5-flash", min_length=1, max_length=100)
    GEMINI_TIMEOUT_SECONDS: int = Field(default=30, ge=5, le=120)

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    CORS_ORIGIN_REGEX: str | None = None

    @model_validator(mode="after")
    def validate_security_settings(self) -> "Settings":
        """Enforce safe JWT algorithm and strict production secret requirements."""
        if self.JWT_ALGORITHM not in ALLOWED_JWT_ALGORITHMS:
            raise ValueError(
                f"JWT_ALGORITHM must be one of {sorted(ALLOWED_JWT_ALGORITHMS)}."
            )

        env_name = self.ENVIRONMENT.strip().lower()
        secret = self.SECRET_KEY.strip()
        is_local_env = env_name in {"development", "dev", "test", "testing", "local"}

        if secret and secret.lower() in INSECURE_SECRET_PLACEHOLDERS:
            raise ValueError("SECRET_KEY cannot use an insecure placeholder value.")

        if not is_local_env:
            if len(secret) < 32:
                raise ValueError(
                    "SECRET_KEY must be set to a strong random string of at least "
                    "32 characters outside local development/test environments."
                )
        elif secret and len(secret) < 32:
            raise ValueError(
                "Configured SECRET_KEY must be at least 32 characters long."
            )

        if not is_local_env:
            if self.DEBUG:
                raise ValueError("DEBUG must be disabled outside local development/test.")
            if not self.DATABASE_URL.strip() or self.database_dialect != "postgresql":
                raise ValueError("DATABASE_URL must point to PostgreSQL outside local development/test.")
            if not self.UPLOAD_STORAGE_DIR.strip() or not Path(self.UPLOAD_STORAGE_DIR).is_absolute():
                raise ValueError("UPLOAD_STORAGE_DIR must be an explicit absolute private persistent-storage path outside local development/test.")
            if self.COOKIE_SECURE is False:
                raise ValueError("COOKIE_SECURE cannot be disabled outside local development/test.")
            if self.CORS_ORIGIN_REGEX:
                raise ValueError("CORS_ORIGIN_REGEX is not permitted outside local development/test; list exact HTTPS origins.")
            try:
                origins = self.cors_origins_list
                for origin in origins:
                    parsed = urlsplit(origin)
                    if (parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password
                        or parsed.path or parsed.query or parsed.fragment or "*" in origin
                        or parsed.hostname.lower() in {"localhost", "127.0.0.1", "::1"}):
                        raise ValueError("Invalid origin")
                    _ = parsed.port  # ensure a malformed port is rejected
            except (ValueError, TypeError, json.JSONDecodeError) as exc:
                raise ValueError("CORS_ORIGINS must contain only exact HTTPS origins outside local development/test.") from exc
            if not origins:
                raise ValueError("CORS_ORIGINS must contain at least one exact HTTPS origin outside local development/test.")

        return self

    @property
    def is_production(self) -> bool:
        """Return True when running in a non-local environment (e.g., production/staging)."""
        return self.ENVIRONMENT.strip().lower() not in {
            "development",
            "dev",
            "test",
            "testing",
            "local",
        }

    @property
    def signing_secret(self) -> str:
        """Return configured SECRET_KEY or an ephemeral random key in local dev/test."""
        global _WARNED_EPHEMERAL_SECRET
        configured = self.SECRET_KEY.strip()
        if configured:
            return configured
        if self.is_production:
            raise RuntimeError("SECRET_KEY is required in production environments.")
        if not _WARNED_EPHEMERAL_SECRET and self.ENVIRONMENT.strip().lower() not in {
            "test",
            "testing",
        }:
            logger.warning(
                "SECRET_KEY is not set; generated an ephemeral random signing key "
                "for local development. Set SECRET_KEY in backend/.env so sessions "
                "persist across server restarts."
            )
            _WARNED_EPHEMERAL_SECRET = True
        return _EPHEMERAL_DEV_SECRET

    @property
    def resolved_cookie_secure(self) -> bool:
        """Use Secure cookies automatically in production or when SameSite=None."""
        if self.COOKIE_SAMESITE == "none":
            return True
        if self.COOKIE_SECURE is not None:
            return self.COOKIE_SECURE
        return self.is_production

    @property
    def refresh_cookie_path(self) -> str:
        """Restrict refresh-token cookie transmission exclusively to auth endpoints."""
        prefix = self.API_PREFIX.rstrip("/")
        return f"{prefix}/auth"

    @property
    def is_sqlite_fallback(self) -> bool:
        """Return True when no DATABASE_URL was provided and SQLite fallback is used."""
        return not bool(self.DATABASE_URL.strip())

    @property
    def resolved_database_url(self) -> str:
        """Return a SQLAlchemy-compatible database URL (PostgreSQL or SQLite fallback)."""
        return normalize_database_url(self.DATABASE_URL)

    @property
    def database_dialect(self) -> str:
        """Return the primary SQLAlchemy dialect name ('postgresql', 'sqlite', etc.)."""
        return self.resolved_database_url.split(":", 1)[0].split("+", 1)[0]

    @property
    def is_postgres_configured(self) -> bool:
        """Return True when DATABASE_URL points to a PostgreSQL instance."""
        return self.database_dialect == "postgresql"

    @property
    def resolved_upload_dir(self) -> Path:
        """Return the resolved private directory for patient report uploads."""
        configured = self.UPLOAD_STORAGE_DIR.strip()
        if not configured:
            return DEFAULT_UPLOAD_DIR.resolve()
        candidate = Path(configured).expanduser()
        if not candidate.is_absolute():
            candidate = BACKEND_DIR / candidate
        return candidate.resolve()

    @property
    def max_report_upload_bytes(self) -> int:
        """Return the maximum permitted medical report upload size in bytes."""
        return self.MAX_REPORT_UPLOAD_MB * 1024 * 1024

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS_ORIGINS from either a JSON list or a comma-separated string."""
        raw = self.CORS_ORIGINS.strip()
        if not raw:
            return []
        if raw.startswith("["):
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [str(origin).strip() for origin in parsed if str(origin).strip()]
        return [origin.strip() for origin in raw.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings instance."""
    return Settings()
