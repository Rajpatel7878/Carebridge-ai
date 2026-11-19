"""Doctor profile ORM model (strictly one-to-one with a DOCTOR user)."""

from enum import StrEnum
import uuid

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    String,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin
from app.models.user import User


class DoctorVerificationStatus(StrEnum):
    """Administrator-controlled clinician verification states.

    Doctors cannot modify their own ``verification_status`` through self-service
    profile endpoints.
    """

    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class DoctorProfile(Base, TimestampMixin):
    """Stores professional clinician details scoped 1:1 to a DOCTOR account.

    ``license_number`` is strictly access-controlled and must never be exposed
    in public, patient-facing, or cross-clinician API responses.
    """

    __tablename__ = "doctor_profiles"
    __table_args__ = (
        CheckConstraint(
            "verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')",
            name="valid_verification_status",
        ),
        CheckConstraint(
            "experience_years IS NULL OR (experience_years >= 0 AND experience_years <= 70)",
            name="valid_experience_years",
        ),
        Index("ix_doctor_profiles_user_id", "user_id", unique=True),
        Index("ix_doctor_profiles_verification_status", "verification_status"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    specialization: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
        default=None,
    )
    qualification: Mapped[str | None] = mapped_column(
        String(160),
        nullable=True,
        default=None,
    )
    license_number: Mapped[str | None] = mapped_column(
        String(80),
        nullable=True,
        default=None,
    )
    department: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
        default=None,
    )
    hospital_or_clinic: Mapped[str | None] = mapped_column(
        String(160),
        nullable=True,
        default=None,
    )
    experience_years: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        default=None,
    )
    verification_status: Mapped[str] = mapped_column(
        String(24),
        nullable=False,
        default=DoctorVerificationStatus.PENDING.value,
        server_default=text("'PENDING'"),
    )

    user: Mapped[User] = relationship("User", foreign_keys=[user_id], lazy="joined")
