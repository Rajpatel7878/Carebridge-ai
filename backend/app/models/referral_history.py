"""Referral lifecycle audit history ORM model."""

from datetime import datetime
import uuid

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.user import User


class ReferralHistory(Base):
    """Records each authorized referral creation and status transition."""

    __tablename__ = "referral_history"
    __table_args__ = (
        CheckConstraint(
            "previous_status IS NULL OR previous_status IN "
            "('PENDING', 'ACCEPTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED')",
            name="valid_previous_status",
        ),
        CheckConstraint(
            "new_status IN ('PENDING', 'ACCEPTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED')",
            name="valid_new_status",
        ),
        Index("ix_referral_history_referral_id", "referral_id"),
        Index("ix_referral_history_changed_by_doctor_id", "changed_by_doctor_id"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    referral_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("referrals.id", ondelete="CASCADE"),
        nullable=False,
    )
    changed_by_doctor_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
    )
    previous_status: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        default=None,
    )
    new_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    note: Mapped[str | None] = mapped_column(
        String(400),
        nullable=True,
        default=None,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    changed_by_doctor: Mapped[User | None] = relationship(
        "User", foreign_keys=[changed_by_doctor_id], lazy="joined"
    )
