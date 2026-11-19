"""User ORM model and role definitions for authentication and RBAC."""

from enum import StrEnum
from typing import TYPE_CHECKING
import uuid

from sqlalchemy import Boolean, CheckConstraint, Index, Integer, String, false, text, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.refresh_token import RefreshToken


class UserRole(StrEnum):
    """Supported platform authorization roles."""

    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    ADMIN = "ADMIN"


class User(Base, TimestampMixin):
    """Registered platform user account with role-based access attributes."""

    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role IN ('PATIENT', 'DOCTOR', 'ADMIN')",
            name="valid_user_role",
        ),
        CheckConstraint(
            "requested_role IS NULL OR requested_role IN ('DOCTOR')",
            name="valid_requested_role",
        ),
        CheckConstraint(
            "length(trim(full_name)) >= 2",
            name="full_name_min_length",
        ),
        CheckConstraint(
            "length(trim(email)) >= 3",
            name="email_non_empty",
        ),
        CheckConstraint(
            "token_version >= 0",
            name="token_version_non_negative",
        ),
        Index("ix_users_email", "email", unique=True),
        Index("ix_users_role", "role"),
        Index("ix_users_is_active", "is_active"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=UserRole.PATIENT.value,
        server_default=text("'PATIENT'"),
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=true(),
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=false(),
    )
    requested_role: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        default=None,
    )
    token_version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    @property
    def role_enum(self) -> UserRole:
        """Return the user's role as a strongly typed ``UserRole`` enum."""
        return UserRole(self.role)

    def __repr__(self) -> str:
        return f"<User id={self.id!r} role={self.role!r} is_active={self.is_active!r}>"
