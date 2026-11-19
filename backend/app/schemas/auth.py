"""Pydantic request and response schemas for authentication and user administration."""

from datetime import datetime
import re
from typing import Literal

from email_validator import EmailNotValidError, validate_email
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.security import PASSWORD_MAX_LENGTH, validate_password_strength
from app.models.user import UserRole

_WHITESPACE_RE = re.compile(r"\s+")
_CONTROL_CHAR_RE = re.compile(r"[\x00-\x1f\x7f]")


def normalize_email_address(raw_email: str) -> str:
    """Validate email syntax and return a canonical lowercased email address."""
    candidate = raw_email.strip()
    if not candidate:
        raise ValueError("Email address is required.")
    if len(candidate) > 255:
        raise ValueError("Email address must not exceed 255 characters.")
    try:
        validated = validate_email(candidate, check_deliverability=False)
    except EmailNotValidError as exc:
        raise ValueError("Enter a valid email address.") from exc
    return validated.normalized.lower()


def normalize_full_name(raw_name: str) -> str:
    """Validate and normalize a person's display name."""
    if _CONTROL_CHAR_RE.search(raw_name):
        raise ValueError("Full name contains invalid characters.")
    collapsed = _WHITESPACE_RE.sub(" ", raw_name.strip())
    if len(collapsed) < 2:
        raise ValueError("Full name must be at least 2 characters long.")
    if len(collapsed) > 150:
        raise ValueError("Full name must not exceed 150 characters.")
    return collapsed


class UserPublic(BaseModel):
    """Safe, outward-facing representation of a user account (never exposes secrets)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str
    email: str
    role: UserRole
    is_active: bool
    is_verified: bool
    requested_role: Literal["DOCTOR"] | None = None
    created_at: datetime
    updated_at: datetime


class RegisterRequest(BaseModel):
    """Public self-registration payload."""

    model_config = ConfigDict(extra="forbid")

    full_name: str
    email: str
    password: str = Field(repr=False)
    confirm_password: str = Field(repr=False)
    role: str = Field(default=UserRole.PATIENT.value)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        return normalize_full_name(value)

    @field_validator("email")
    @classmethod
    def validate_email_field(cls, value: str) -> str:
        return normalize_email_address(value)

    @field_validator("password")
    @classmethod
    def validate_password_field(cls, value: str) -> str:
        return validate_password_strength(value)

    @field_validator("role")
    @classmethod
    def validate_role_field(cls, value: str) -> str:
        normalized = value.strip().upper()
        if not normalized:
            return UserRole.PATIENT.value
        if normalized not in {
            UserRole.PATIENT.value,
            UserRole.DOCTOR.value,
            UserRole.ADMIN.value,
        }:
            raise ValueError("Role must be PATIENT or DOCTOR.")
        return normalized

    @model_validator(mode="after")
    def verify_passwords_match(self) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


class RegisterResponse(BaseModel):
    """Response returned after successful public user registration."""

    user: UserPublic
    message: str
    requires_role_approval: bool = False


class LoginRequest(BaseModel):
    """Email and password authentication payload."""

    model_config = ConfigDict(extra="forbid")

    email: str
    password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH, repr=False)
    remember_session: bool = False

    @field_validator("email")
    @classmethod
    def validate_email_field(cls, value: str) -> str:
        return normalize_email_address(value)


class SessionResponse(BaseModel):
    """Authenticated session envelope returned on login and token refresh."""

    user: UserPublic
    access_token_expires_in: int
    session_type: Literal["session", "persistent"]
    message: str


class MessageResponse(BaseModel):
    """Generic safe confirmation payload."""

    message: str


class RoleWorkspaceResponse(BaseModel):
    """Authorized workspace confirmation and safe profile for role-scoped routes."""

    user: UserPublic
    workspace: UserRole
    permissions: list[str]


class AdminCreateUserRequest(BaseModel):
    """Administrator-only user provisioning payload (e.g., onboarding a Doctor)."""

    model_config = ConfigDict(extra="forbid")

    full_name: str
    email: str
    password: str = Field(repr=False)
    role: UserRole = UserRole.DOCTOR
    is_active: bool = True
    is_verified: bool = True

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        return normalize_full_name(value)

    @field_validator("email")
    @classmethod
    def validate_email_field(cls, value: str) -> str:
        return normalize_email_address(value)

    @field_validator("password")
    @classmethod
    def validate_password_field(cls, value: str) -> str:
        return validate_password_strength(value)


class AdminUpdateUserRequest(BaseModel):
    """Administrator-only update payload for user role, verification, and status."""

    model_config = ConfigDict(extra="forbid")

    role: UserRole | None = None
    is_active: bool | None = None
    is_verified: bool | None = None
    clear_requested_role: bool = False

    @model_validator(mode="after")
    def require_at_least_one_change(self) -> "AdminUpdateUserRequest":
        if (
            self.role is None
            and self.is_active is None
            and self.is_verified is None
            and not self.clear_requested_role
        ):
            raise ValueError("Provide at least one account attribute to update.")
        return self


class AdminUserListResponse(BaseModel):
    """Paginated/filtered list of user accounts for administrator management."""

    items: list[UserPublic]
    total: int
