"""Medical report ORM model storing safe metadata for private patient uploads."""

from datetime import datetime
from enum import StrEnum
import uuid

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class ReportFileType(StrEnum):
    """Permitted server-verified medical report file formats."""

    PDF = "PDF"
    PNG = "PNG"
    JPG = "JPG"


class ReportUploadStatus(StrEnum):
    """Lifecycle states of a medical report upload."""

    UPLOADED = "UPLOADED"
    FAILED = "FAILED"


class ReportReviewStatus(StrEnum):
    """Clinical review coordination state (no AI extraction in Phases 5–6)."""

    PENDING_REVIEW = "PENDING_REVIEW"
    IN_REVIEW = "IN_REVIEW"
    REVIEWED = "REVIEWED"
    NEEDS_FOLLOW_UP = "NEEDS_FOLLOW_UP"


class MedicalReport(Base):
    """Metadata record for an uploaded patient medical report.

    ``stored_filename`` is a server-generated opaque key inside the private
    uploads directory and MUST NEVER be exposed in client-facing API responses.
    """

    __tablename__ = "medical_reports"
    __table_args__ = (
        CheckConstraint(
            "file_type IN ('PDF', 'PNG', 'JPG')",
            name="valid_file_type",
        ),
        CheckConstraint(
            "file_size > 0",
            name="positive_file_size",
        ),
        CheckConstraint(
            "upload_status IN ('UPLOADED', 'FAILED')",
            name="valid_upload_status",
        ),
        CheckConstraint(
            "review_status IN ('PENDING_REVIEW', 'IN_REVIEW', 'REVIEWED', 'NEEDS_FOLLOW_UP')",
            name="valid_review_status",
        ),
        Index("ix_medical_reports_patient_id", "patient_id"),
        Index("ix_medical_reports_patient_uploaded", "patient_id", "uploaded_at"),
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
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(
        String(120),
        unique=True,
        nullable=False,
    )
    file_type: Mapped[str] = mapped_column(String(16), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    upload_status: Mapped[str] = mapped_column(
        String(24),
        nullable=False,
        default=ReportUploadStatus.UPLOADED.value,
        server_default=text("'UPLOADED'"),
    )
    review_status: Mapped[str] = mapped_column(
        String(24),
        nullable=False,
        default=ReportReviewStatus.PENDING_REVIEW.value,
        server_default=text("'PENDING_REVIEW'"),
    )
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
