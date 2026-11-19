"""Read-only extensible risk assessment ORM model.

NOTE (Phase 5 Boundary): Automated risk scoring, AI medical extraction, and
clinical risk generation are intentionally NOT implemented in Phase 5. This
table provides the minimal extensible persistence contract so authorized
records created by future clinician/AI review workflows can be surfaced safely
to the owning patient without fabricating any placeholder scores or diagnoses.
"""

from datetime import datetime
from enum import StrEnum
import uuid

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin
from app.models.user import User


class RiskAssessmentStatus(StrEnum):
    """Authorized workflow status of a risk assessment record."""

    PENDING = "PENDING"
    REVIEWED = "REVIEWED"
    ARCHIVED = "ARCHIVED"


class RiskCategory(StrEnum):
    """High-level care-coordination risk categories (never auto-generated in Phase 5)."""

    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RiskAssessment(Base, TimestampMixin):
    """Authorized risk assessment record scoped strictly to a single patient."""

    __tablename__ = "risk_assessments"
    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING', 'REVIEWED', 'ARCHIVED')",
            name="valid_status",
        ),
        CheckConstraint(
            "risk_category IS NULL OR risk_category IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')",
            name="valid_risk_category",
        ),
        Index("ix_risk_assessments_patient_id", "patient_id"),
        Index("ix_risk_assessments_patient_assessed", "patient_id", "assessed_at"),
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
    related_report_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("medical_reports.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
    )
    reviewed_by_doctor_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
    )
    status: Mapped[str] = mapped_column(
        String(24),
        nullable=False,
        default=RiskAssessmentStatus.REVIEWED.value,
        server_default=text("'REVIEWED'"),
    )
    risk_category: Mapped[str | None] = mapped_column(
        String(24),
        nullable=True,
        default=None,
    )
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    recommended_action: Mapped[str | None] = mapped_column(
        Text, nullable=True, default=None
    )
    assessed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    reviewing_doctor: Mapped[User | None] = relationship(
        "User", foreign_keys=[reviewed_by_doctor_id], lazy="joined"
    )
