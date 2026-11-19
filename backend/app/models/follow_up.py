"""Patient follow-up task ORM model."""

from datetime import datetime
from enum import StrEnum
import uuid

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin
from app.models.user import User


class FollowUpStatus(StrEnum):
    """Permitted lifecycle states for a patient follow-up."""

    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    MISSED = "MISSED"
    CANCELLED = "CANCELLED"


class FollowUp(Base, TimestampMixin):
    """Represents a scheduled patient care follow-up milestone."""

    __tablename__ = "follow_ups"
    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING', 'COMPLETED', 'MISSED', 'CANCELLED')",
            name="valid_status",
        ),
        CheckConstraint(
            "length(trim(follow_up_type)) >= 2",
            name="non_empty_follow_up_type",
        ),
        Index("ix_follow_ups_patient_id", "patient_id"),
        Index("ix_follow_ups_created_by_doctor_id", "created_by_doctor_id"),
        Index("ix_follow_ups_patient_scheduled", "patient_id", "scheduled_at"),
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
    created_by_doctor_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
    )
    related_appointment_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("appointments.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
    )
    related_referral_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("referrals.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
    )
    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    follow_up_type: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=FollowUpStatus.PENDING.value,
        server_default=text("'PENDING'"),
    )
    notes: Mapped[str | None] = mapped_column(
        String(400),
        nullable=True,
        default=None,
    )

    patient: Mapped[User] = relationship(
        "User", foreign_keys=[patient_id], lazy="joined"
    )
    created_by_doctor: Mapped[User | None] = relationship(
        "User", foreign_keys=[created_by_doctor_id], lazy="joined"
    )
