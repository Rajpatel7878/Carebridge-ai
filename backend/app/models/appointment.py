"""Patient appointment and appointment-request ORM model."""

from datetime import datetime
from enum import StrEnum
import uuid

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin
from app.models.user import User


class AppointmentStatus(StrEnum):
    """Permitted lifecycle states for a patient appointment."""

    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class AppointmentType(StrEnum):
    """Structured appointment request categories."""

    SCREENING_REVIEW = "SCREENING_REVIEW"
    GENERAL_CONSULTATION = "GENERAL_CONSULTATION"
    FOLLOW_UP_VISIT = "FOLLOW_UP_VISIT"
    REFERRAL_CONSULTATION = "REFERRAL_CONSULTATION"
    PREVENTIVE_CHECKUP = "PREVENTIVE_CHECKUP"


class Appointment(Base, TimestampMixin):
    """Represents a scheduled visit or patient-submitted PENDING visit request."""

    __tablename__ = "appointments"
    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED')",
            name="valid_status",
        ),
        CheckConstraint(
            "length(trim(appointment_type)) >= 2",
            name="non_empty_appointment_type",
        ),
        Index("ix_appointments_patient_id", "patient_id"),
        Index("ix_appointments_doctor_id", "doctor_id"),
        Index("ix_appointments_patient_scheduled", "patient_id", "scheduled_at"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    patient_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    doctor_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
    )
    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    appointment_type: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=AppointmentStatus.PENDING.value,
        server_default=text("'PENDING'"),
    )
    location_or_mode: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
        default=None,
    )
    notes: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        default=None,
    )
    status_note: Mapped[str | None] = mapped_column(
        String(400),
        nullable=True,
        default=None,
    )

    patient: Mapped[User] = relationship(
        "User", foreign_keys=[patient_id], lazy="joined"
    )
    doctor: Mapped[User | None] = relationship(
        "User", foreign_keys=[doctor_id], lazy="joined"
    )
