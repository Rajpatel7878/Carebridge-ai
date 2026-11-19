"""Professional clinical review ORM model for authorized risk assessments."""

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

from app.database.base import Base
from app.models.user import User


class ClinicalReviewStatus(StrEnum):
    """Permitted clinician review decisions on risk assessment records."""

    REVIEWED = "REVIEWED"
    FLAGGED_FOR_REVIEW = "FLAGGED_FOR_REVIEW"
    FOLLOW_UP_REQUIRED = "FOLLOW_UP_REQUIRED"
    ARCHIVED = "ARCHIVED"


class ClinicalReview(Base):
    """Records a doctor's professional interpretation of an assessment record.

    Maintained strictly separate from automated/AI outputs so professional
    clinical judgement is always clearly attributable and auditable. No
    automated risk scores or diagnoses are generated in Phase 6.
    """

    __tablename__ = "clinical_reviews"
    __table_args__ = (
        CheckConstraint(
            "review_status IN "
            "('REVIEWED', 'FLAGGED_FOR_REVIEW', 'FOLLOW_UP_REQUIRED', 'ARCHIVED')",
            name="valid_clinical_review_status",
        ),
        Index("ix_clinical_reviews_patient_id", "patient_id"),
        Index("ix_clinical_reviews_doctor_id", "doctor_id"),
        Index("ix_clinical_reviews_related_assessment_id", "related_assessment_id"),
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
    related_assessment_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("risk_assessments.id", ondelete="CASCADE"),
        nullable=True,
        default=None,
    )
    review_status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
    )
    review_note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default=None,
    )
    recommended_action: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        default=None,
    )
    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    doctor: Mapped[User | None] = relationship(
        "User", foreign_keys=[doctor_id], lazy="joined"
    )
