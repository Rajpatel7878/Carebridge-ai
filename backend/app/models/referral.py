"""Specialist / facility referral ORM model (read-only for patients)."""

from enum import StrEnum
import uuid

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin
from app.models.user import User


class ReferralStatus(StrEnum):
    """Permitted lifecycle states for a care referral."""

    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Referral(Base, TimestampMixin):
    """Represents a clinician-initiated referral tracked by the owning patient."""

    __tablename__ = "referrals"
    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING', 'ACCEPTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED')",
            name="valid_status",
        ),
        CheckConstraint(
            "length(trim(referred_department)) >= 2",
            name="non_empty_department",
        ),
        Index("ix_referrals_patient_id", "patient_id"),
        Index("ix_referrals_referring_doctor_id", "referring_doctor_id"),
        Index("ix_referrals_patient_created", "patient_id", "created_at"),
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
    referring_doctor_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
    )
    referred_department: Mapped[str] = mapped_column(String(120), nullable=False)
    reason: Mapped[str | None] = mapped_column(
        String(400),
        nullable=True,
        default=None,
    )
    next_action: Mapped[str | None] = mapped_column(
        String(300),
        nullable=True,
        default=None,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=ReferralStatus.PENDING.value,
        server_default=text("'PENDING'"),
    )

    referring_doctor: Mapped[User | None] = relationship(
        "User", foreign_keys=[referring_doctor_id], lazy="joined"
    )
