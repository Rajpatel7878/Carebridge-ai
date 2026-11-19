"""Medical report clinician review history ORM model."""

from datetime import datetime
from enum import StrEnum
import uuid

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin
from app.models.user import User


class DoctorReportReviewStatus(StrEnum):
    """Permitted clinician review decisions recorded on uploaded reports."""

    PENDING = "PENDING"
    IN_REVIEW = "IN_REVIEW"
    REVIEWED = "REVIEWED"
    NEEDS_FOLLOW_UP = "NEEDS_FOLLOW_UP"


class ReportReview(Base, TimestampMixin):
    """Immutable audit entry documenting a doctor's review of a patient report.

    New reviews append rows rather than overwriting prior reviews so the full
    clinical review trail is preserved. ``review_note`` is restricted to
    authorized clinical workflows and omitted from notification previews/logs.
    """

    __tablename__ = "report_reviews"
    __table_args__ = (
        CheckConstraint(
            "review_status IN ('PENDING', 'IN_REVIEW', 'REVIEWED', 'NEEDS_FOLLOW_UP')",
            name="valid_report_review_status",
        ),
        Index("ix_report_reviews_report_id", "report_id"),
        Index("ix_report_reviews_doctor_id", "doctor_id"),
        Index("ix_report_reviews_report_reviewed_at", "report_id", "reviewed_at"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    report_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("medical_reports.id", ondelete="CASCADE"),
        nullable=False,
    )
    doctor_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
    )
    review_status: Mapped[str] = mapped_column(
        String(24),
        nullable=False,
    )
    review_note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default=None,
    )
    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    doctor: Mapped[User | None] = relationship(
        "User", foreign_keys=[doctor_id], lazy="joined"
    )
