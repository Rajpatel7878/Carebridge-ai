"""Authorized patient-to-doctor care assignment ORM model."""

from datetime import datetime
from enum import StrEnum
import uuid

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin
from app.models.user import User


class AssignmentStatus(StrEnum):
    """Lifecycle states of a patient-doctor care assignment."""

    ACTIVE = "ACTIVE"
    REVOKED = "REVOKED"
    REASSIGNED = "REASSIGNED"


class PatientDoctorAssignment(Base, TimestampMixin):
    """Links a PATIENT account to an authorized DOCTOR account.

    Assignments may only be created, revoked, or reassigned through authorized
    administrative workflows — never by doctor or patient self-assignment.
    """

    __tablename__ = "patient_doctor_assignments"
    __table_args__ = (
        CheckConstraint(
            "status IN ('ACTIVE', 'REVOKED', 'REASSIGNED')",
            name="valid_assignment_status",
        ),
        CheckConstraint(
            "patient_id != doctor_id",
            name="distinct_patient_doctor",
        ),
        Index("ix_patient_doctor_assignments_patient_id", "patient_id"),
        Index("ix_patient_doctor_assignments_doctor_id", "doctor_id"),
        Index("ix_patient_doctor_assignments_assigned_by", "assigned_by"),
        Index(
            "ix_patient_doctor_assignments_doctor_status",
            "doctor_id",
            "status",
        ),
        Index(
            "ix_patient_doctor_assignments_patient_status",
            "patient_id",
            "status",
        ),
        Index(
            "uq_active_patient_doctor_assignment",
            "patient_id",
            "doctor_id",
            unique=True,
            sqlite_where=text("status = 'ACTIVE'"),
            postgresql_where=text("status = 'ACTIVE'"),
        ),
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
    doctor_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    assigned_by: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=AssignmentStatus.ACTIVE.value,
        server_default=text("'ACTIVE'"),
    )
    notes: Mapped[str | None] = mapped_column(
        String(300),
        nullable=True,
        default=None,
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )

    patient: Mapped[User] = relationship("User", foreign_keys=[patient_id], lazy="joined")
    doctor: Mapped[User] = relationship("User", foreign_keys=[doctor_id], lazy="joined")
    assigner: Mapped[User | None] = relationship(
        "User", foreign_keys=[assigned_by], lazy="joined"
    )
