"""Doctor portal service layer enforcing assignment-scoped authorization.

Security invariants:
- Every patient-specific lookup and mutation verifies an ``ACTIVE`` row in
  ``patient_doctor_assignments`` linking ``doctor.id`` to the active ``PATIENT``
  user. Unauthorized or nonexistent IDs raise ``404 Not Found`` to prevent IDOR
  and cross-patient enumeration.
- Doctors can never self-verify (``verification_status`` is admin-controlled)
  and can never self-assign to patients.
- Multi-step mutations run inside single atomic database transactions.
- Sensitive review notes, license numbers, and storage paths are never logged
  or leaked in notification previews.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
import logging
import math
from pathlib import Path

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
)
from app.models.appointment import Appointment, AppointmentStatus, AppointmentType
from app.models.clinical_review import ClinicalReview, ClinicalReviewStatus
from app.models.doctor_profile import DoctorProfile, DoctorVerificationStatus
from app.models.follow_up import FollowUp, FollowUpStatus
from app.models.medical_report import (
    MedicalReport,
    ReportFileType,
    ReportReviewStatus,
    ReportUploadStatus,
)
from app.models.notification import NotificationType
from app.models.patient_doctor_assignment import (
    AssignmentStatus,
    PatientDoctorAssignment,
)
from app.models.patient_profile import GenderOption, PatientProfile, PreferredLanguage
from app.models.referral import Referral, ReferralStatus
from app.models.referral_history import ReferralHistory
from app.models.report_review import DoctorReportReviewStatus, ReportReview
from app.models.risk_assessment import (
    RiskAssessment,
    RiskAssessmentSource,
    RiskAssessmentStatus,
    RiskCategory,
)
from app.models.user import User, UserRole
from app.schemas.doctor import (
    ALLOWED_REFERRAL_DEPARTMENTS,
    DOCTOR_CLINICAL_RISK_DISCLAIMER,
    IN_PLATFORM_REFERRAL_NOTICE,
    AssignmentCreateRequest,
    AssignmentListResponse,
    AssignmentResponse,
    AssignmentUpdateRequest,
    ClinicalReviewCreateRequest,
    ClinicalReviewResponse,
    DoctorActivityItem,
    DoctorAppointmentItem,
    DoctorAppointmentListResponse,
    DoctorAppointmentRescheduleRequest,
    DoctorAppointmentScope,
    DoctorAppointmentStatusRequest,
    DoctorFollowUpCreateRequest,
    DoctorFollowUpItem,
    DoctorFollowUpListResponse,
    DoctorFollowUpScope,
    DoctorFollowUpUpdateRequest,
    DoctorOverviewResponse,
    DoctorOverviewStatistics,
    DoctorPatientDetailResponse,
    DoctorPatientListResponse,
    DoctorPatientProfileSection,
    DoctorPatientStatusFilter,
    DoctorPatientSummary,
    DoctorProfileResponse,
    DoctorProfileUpdateRequest,
    DoctorReferralCreateRequest,
    DoctorReferralItem,
    DoctorReferralListResponse,
    DoctorReferralStatusUpdateRequest,
    DoctorReportDetailResponse,
    DoctorReportListResponse,
    DoctorReportSummary,
    DoctorRiskAssessmentItem,
    DoctorRiskAssessmentListResponse,
    ReferralHistoryItem,
    ReportReviewCreateRequest,
    ReportReviewHistoryItem,
)
from app.schemas.patient import (
    NotificationListResponse,
    NotificationMarkAllReadResponse,
    NotificationMarkReadResponse,
)
from app.services.file_storage import resolve_existing_report_path
from app.services.notifications import (
    count_unread_notifications,
    create_in_app_notification,
    list_user_notifications,
    mark_all_user_notifications_read,
    mark_user_notification_read,
)

logger = logging.getLogger("carebridge.doctor")

# Minimum non-overlapping consultation window enforced for confirmed visits.
APPOINTMENT_CONFLICT_WINDOW = timedelta(minutes=30)

_APPOINTMENT_TYPE_LABELS: dict[str, str] = {
    AppointmentType.SCREENING_REVIEW.value: "Screening Review",
    AppointmentType.GENERAL_CONSULTATION.value: "General Consultation",
    AppointmentType.FOLLOW_UP_VISIT.value: "Follow-up Visit",
    AppointmentType.REFERRAL_CONSULTATION.value: "Referral Consultation",
    AppointmentType.PREVENTIVE_CHECKUP.value: "Preventive Checkup",
}

_DOCTOR_TO_REPORT_STATUS: dict[DoctorReportReviewStatus, ReportReviewStatus] = {
    DoctorReportReviewStatus.PENDING: ReportReviewStatus.PENDING_REVIEW,
    DoctorReportReviewStatus.IN_REVIEW: ReportReviewStatus.IN_REVIEW,
    DoctorReportReviewStatus.REVIEWED: ReportReviewStatus.REVIEWED,
    DoctorReportReviewStatus.NEEDS_FOLLOW_UP: ReportReviewStatus.NEEDS_FOLLOW_UP,
}

_PENDING_REPORT_STATUSES: frozenset[str] = frozenset(
    {
        ReportReviewStatus.PENDING_REVIEW.value,
        ReportReviewStatus.IN_REVIEW.value,
        ReportReviewStatus.NEEDS_FOLLOW_UP.value,
    }
)

_ALLOWED_APPOINTMENT_TRANSITIONS: dict[str, frozenset[str]] = {
    AppointmentStatus.PENDING.value: frozenset(
        {
            AppointmentStatus.CONFIRMED.value,
            AppointmentStatus.CANCELLED.value,
        }
    ),
    AppointmentStatus.CONFIRMED.value: frozenset(
        {
            AppointmentStatus.COMPLETED.value,
            AppointmentStatus.CANCELLED.value,
        }
    ),
    AppointmentStatus.COMPLETED.value: frozenset(),
    AppointmentStatus.CANCELLED.value: frozenset(),
}

_ALLOWED_REFERRAL_TRANSITIONS: dict[str, frozenset[str]] = {
    ReferralStatus.PENDING.value: frozenset(
        {
            ReferralStatus.ACCEPTED.value,
            ReferralStatus.SCHEDULED.value,
            ReferralStatus.CANCELLED.value,
        }
    ),
    ReferralStatus.ACCEPTED.value: frozenset(
        {
            ReferralStatus.SCHEDULED.value,
            ReferralStatus.COMPLETED.value,
            ReferralStatus.CANCELLED.value,
        }
    ),
    ReferralStatus.SCHEDULED.value: frozenset(
        {
            ReferralStatus.COMPLETED.value,
            ReferralStatus.CANCELLED.value,
        }
    ),
    ReferralStatus.COMPLETED.value: frozenset(),
    ReferralStatus.CANCELLED.value: frozenset(),
}

_ACTIVE_REFERRAL_STATUSES: frozenset[str] = frozenset(
    {
        ReferralStatus.PENDING.value,
        ReferralStatus.ACCEPTED.value,
        ReferralStatus.SCHEDULED.value,
    }
)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def format_doctor_display_name(full_name: str) -> str:
    """Return a clean ``Dr. [Name]`` display string without doubling ``Dr.``."""
    cleaned = " ".join(full_name.strip().split())
    if not cleaned:
        return "Dr. Clinician"
    lowered = cleaned.lower()
    if lowered.startswith("dr. "):
        return f"Dr. {cleaned[4:].strip()}"
    if lowered.startswith("dr "):
        return f"Dr. {cleaned[3:].strip()}"
    return f"Dr. {cleaned}"


def _humanize_appointment_type(value: str) -> str:
    return _APPOINTMENT_TYPE_LABELS.get(
        value, value.replace("_", " ").strip().title()
    )


def _paginate_slice(
    items: list,
    *,
    page: int,
    page_size: int,
) -> tuple[list, int, int]:
    total = len(items)
    total_pages = max(1, math.ceil(total / page_size)) if total > 0 else 1
    start = (page - 1) * page_size
    end = start + page_size
    return items[start:end], total, total_pages


def _compute_total_pages(total: int, page_size: int) -> int:
    return max(1, math.ceil(total / page_size)) if total > 0 else 1


# ---------------------------------------------------------------------------
# Doctor Profile (1:1 per doctor, admin-controlled verification)
# ---------------------------------------------------------------------------


def sync_doctor_profile_verification(
    db: Session,
    *,
    user: User,
    verification_status: DoctorVerificationStatus | None = None,
) -> None:
    """Synchronize a DOCTOR user's profile verification state (caller commits)."""
    if user.role != UserRole.DOCTOR.value:
        return
    resolved = verification_status or (
        DoctorVerificationStatus.VERIFIED
        if user.is_verified
        else DoctorVerificationStatus.PENDING
    )
    profile = db.scalar(
        select(DoctorProfile).where(DoctorProfile.user_id == user.id)
    )
    if profile is None:
        db.add(
            DoctorProfile(
                user_id=user.id,
                verification_status=resolved.value,
            )
        )
    else:
        profile.verification_status = resolved.value
        profile.updated_at = datetime.now(timezone.utc)


def get_or_create_doctor_profile(db: Session, *, doctor: User) -> DoctorProfile:
    """Return the doctor's unique 1:1 profile, initializing safely if absent."""
    profile = db.scalar(
        select(DoctorProfile).where(DoctorProfile.user_id == doctor.id)
    )
    if profile is not None:
        # Keep verification_status aligned when an admin has verified the user.
        if (
            doctor.is_verified
            and profile.verification_status == DoctorVerificationStatus.PENDING.value
        ):
            profile.verification_status = DoctorVerificationStatus.VERIFIED.value
            profile.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(profile)
        return profile

    initial_status = (
        DoctorVerificationStatus.VERIFIED.value
        if doctor.is_verified
        else DoctorVerificationStatus.PENDING.value
    )
    profile = DoctorProfile(
        user_id=doctor.id,
        verification_status=initial_status,
    )
    db.add(profile)
    try:
        db.commit()
        db.refresh(profile)
        return profile
    except IntegrityError:
        db.rollback()
        existing = db.scalar(
            select(DoctorProfile).where(DoctorProfile.user_id == doctor.id)
        )
        if existing is not None:
            return existing
        raise


def _compute_doctor_profile_completion(
    profile: DoctorProfile,
) -> tuple[int, int, int]:
    checks = [
        True,  # full_name
        True,  # email
        bool(profile.specialization),
        bool(profile.qualification),
        bool(profile.license_number),
        bool(profile.department),
        bool(profile.hospital_or_clinic),
        profile.experience_years is not None,
    ]
    completed = sum(1 for item in checks if item)
    total = len(checks)
    return round((completed / total) * 100), completed, total


def _to_doctor_profile_response(
    profile: DoctorProfile, doctor: User
) -> DoctorProfileResponse:
    pct, completed, total = _compute_doctor_profile_completion(profile)
    return DoctorProfileResponse(
        id=profile.id,
        user_id=doctor.id,
        full_name=doctor.full_name,
        display_name=format_doctor_display_name(doctor.full_name),
        email=doctor.email,
        role=doctor.role,
        is_verified=doctor.is_verified,
        verification_status=DoctorVerificationStatus(profile.verification_status),
        specialization=profile.specialization,
        qualification=profile.qualification,
        license_number=profile.license_number,
        department=profile.department,
        hospital_or_clinic=profile.hospital_or_clinic,
        experience_years=profile.experience_years,
        completion_percentage=pct,
        completed_fields=completed,
        total_fields=total,
        account_created_at=_as_utc(doctor.created_at),
        created_at=_as_utc(profile.created_at),
        updated_at=_as_utc(profile.updated_at),
    )


def get_doctor_profile(db: Session, *, doctor: User) -> DoctorProfileResponse:
    """Return the authenticated doctor's own profile."""
    profile = get_or_create_doctor_profile(db, doctor=doctor)
    return _to_doctor_profile_response(profile, doctor)


def update_doctor_profile(
    db: Session,
    *,
    doctor: User,
    payload: DoctorProfileUpdateRequest,
) -> DoctorProfileResponse:
    """Update permitted clinician profile fields (never verification_status)."""
    profile = get_or_create_doctor_profile(db, doctor=doctor)
    profile.specialization = payload.specialization
    profile.qualification = payload.qualification
    profile.license_number = payload.license_number
    profile.department = payload.department
    profile.hospital_or_clinic = payload.hospital_or_clinic
    profile.experience_years = payload.experience_years
    profile.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(profile)
    logger.info("Doctor id=%s updated clinician profile metadata", doctor.id)
    return _to_doctor_profile_response(profile, doctor)


# ---------------------------------------------------------------------------
# Patient–Doctor Assignment Governance & Authorization Guards
# ---------------------------------------------------------------------------


def _validate_assignable_patient_and_doctor(
    db: Session,
    *,
    patient_id: str,
    doctor_id: str,
) -> tuple[User, User]:
    if patient_id == doctor_id:
        raise BadRequestException(
            "Patient and doctor accounts must be distinct.",
            code="invalid_assignment_accounts",
        )

    patient = db.get(User, patient_id)
    if patient is None or patient.role != UserRole.PATIENT.value:
        raise BadRequestException(
            "Selected patient account does not exist or does not hold the PATIENT role.",
            code="invalid_patient_account",
        )
    if not patient.is_active:
        raise BadRequestException(
            "Cannot assign an inactive patient account.",
            code="inactive_patient_account",
        )

    doctor = db.get(User, doctor_id)
    if doctor is None or doctor.role != UserRole.DOCTOR.value:
        raise BadRequestException(
            "Selected doctor account does not exist or does not hold the DOCTOR role.",
            code="invalid_doctor_account",
        )
    if not doctor.is_active:
        raise BadRequestException(
            "Cannot assign patients to an inactive doctor account.",
            code="inactive_doctor_account",
        )

    return patient, doctor


def _to_assignment_response(
    assignment: PatientDoctorAssignment,
) -> AssignmentResponse:
    return AssignmentResponse(
        id=assignment.id,
        patient_id=assignment.patient_id,
        patient_name=assignment.patient.full_name,
        patient_email=assignment.patient.email,
        doctor_id=assignment.doctor_id,
        doctor_name=format_doctor_display_name(assignment.doctor.full_name),
        doctor_email=assignment.doctor.email,
        assigned_by_id=assignment.assigned_by,
        assigned_by_name=(
            assignment.assigner.full_name
            if assignment.assigner is not None
            else None
        ),
        status=AssignmentStatus(assignment.status),
        notes=assignment.notes,
        assigned_at=_as_utc(assignment.assigned_at),
        revoked_at=(
            _as_utc(assignment.revoked_at)
            if assignment.revoked_at is not None
            else None
        ),
        created_at=_as_utc(assignment.created_at),
        updated_at=_as_utc(assignment.updated_at),
    )


def list_assignments_for_admin(
    db: Session,
    *,
    doctor_id: str | None = None,
    patient_id: str | None = None,
    status_filter: AssignmentStatus | None = None,
    limit: int = 100,
    offset: int = 0,
) -> AssignmentListResponse:
    """List patient-doctor assignments for authorized administrator oversight."""
    conditions = []
    if doctor_id:
        conditions.append(PatientDoctorAssignment.doctor_id == doctor_id)
    if patient_id:
        conditions.append(PatientDoctorAssignment.patient_id == patient_id)
    if status_filter is not None:
        conditions.append(PatientDoctorAssignment.status == status_filter.value)

    total_stmt = select(func.count(PatientDoctorAssignment.id))
    active_stmt = select(func.count(PatientDoctorAssignment.id)).where(
        PatientDoctorAssignment.status == AssignmentStatus.ACTIVE.value
    )
    items_stmt = select(PatientDoctorAssignment).order_by(
        PatientDoctorAssignment.assigned_at.desc(),
        PatientDoctorAssignment.id.desc(),
    )
    if conditions:
        total_stmt = total_stmt.where(*conditions)
        items_stmt = items_stmt.where(*conditions)
    if doctor_id:
        active_stmt = active_stmt.where(
            PatientDoctorAssignment.doctor_id == doctor_id
        )
    if patient_id:
        active_stmt = active_stmt.where(
            PatientDoctorAssignment.patient_id == patient_id
        )

    total = int(db.scalar(total_stmt) or 0)
    active_count = int(db.scalar(active_stmt) or 0)
    records = list(db.scalars(items_stmt.offset(offset).limit(limit)).all())
    return AssignmentListResponse(
        items=[_to_assignment_response(item) for item in records],
        total=total,
        active_count=active_count,
    )


def create_assignment_by_admin(
    db: Session,
    *,
    admin: User,
    payload: AssignmentCreateRequest,
) -> AssignmentResponse:
    """Create a validated ACTIVE patient-doctor assignment (ADMIN workflow)."""
    patient, doctor = _validate_assignable_patient_and_doctor(
        db,
        patient_id=payload.patient_id,
        doctor_id=payload.doctor_id,
    )

    duplicate = db.scalar(
        select(PatientDoctorAssignment).where(
            PatientDoctorAssignment.patient_id == patient.id,
            PatientDoctorAssignment.doctor_id == doctor.id,
            PatientDoctorAssignment.status == AssignmentStatus.ACTIVE.value,
        )
    )
    if duplicate is not None:
        raise ConflictException(
            "An active care assignment between this patient and doctor already exists.",
            code="duplicate_assignment",
        )

    now = datetime.now(timezone.utc)
    if payload.replace_existing_active:
        prior_assignments = list(
            db.scalars(
                select(PatientDoctorAssignment).where(
                    PatientDoctorAssignment.patient_id == patient.id,
                    PatientDoctorAssignment.status == AssignmentStatus.ACTIVE.value,
                )
            ).all()
        )
        for prior in prior_assignments:
            prior.status = AssignmentStatus.REASSIGNED.value
            prior.revoked_at = now
            prior.updated_at = now

    assignment = PatientDoctorAssignment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        assigned_by=admin.id,
        status=AssignmentStatus.ACTIVE.value,
        notes=payload.notes,
        assigned_at=now,
    )
    db.add(assignment)

    doctor_display = format_doctor_display_name(doctor.full_name)
    create_in_app_notification(
        db,
        user_id=doctor.id,
        title="New patient assigned",
        message=(
            f"{patient.full_name} has been assigned to your care roster. "
            "Open My Patients to review authorized records."
        ),
        notification_type=NotificationType.SYSTEM,
    )
    create_in_app_notification(
        db,
        user_id=patient.id,
        title="Care clinician assigned",
        message=(
            f"{doctor_display} has been assigned to support your screening "
            "and follow-up care coordination."
        ),
        notification_type=NotificationType.SYSTEM,
    )

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictException(
            "An active care assignment between this patient and doctor already exists.",
            code="duplicate_assignment",
        ) from exc

    db.refresh(assignment)
    logger.info(
        "Admin id=%s created assignment id=%s doctor_id=%s patient_id=%s",
        admin.id,
        assignment.id,
        doctor.id,
        patient.id,
    )
    return _to_assignment_response(assignment)


def update_assignment_by_admin(
    db: Session,
    *,
    admin: User,
    assignment_id: str,
    payload: AssignmentUpdateRequest,
) -> AssignmentResponse:
    """Revoke or reassign an active patient-doctor assignment atomically."""
    assignment = db.get(PatientDoctorAssignment, assignment_id)
    if assignment is None:
        raise NotFoundException(
            "Care assignment not found.",
            code="assignment_not_found",
        )
    if assignment.status != AssignmentStatus.ACTIVE.value:
        raise BadRequestException(
            f"Only active assignments can be modified (current status: {assignment.status.lower()}).",
            code="invalid_assignment_transition",
        )

    now = datetime.now(timezone.utc)

    if payload.status == AssignmentStatus.REVOKED:
        assignment.status = AssignmentStatus.REVOKED.value
        assignment.revoked_at = now
        assignment.updated_at = now
        if payload.notes is not None:
            assignment.notes = payload.notes
        db.commit()
        db.refresh(assignment)
        logger.info(
            "Admin id=%s revoked assignment id=%s", admin.id, assignment.id
        )
        return _to_assignment_response(assignment)

    # Reassignment flow
    assert payload.new_doctor_id is not None
    if payload.new_doctor_id == assignment.doctor_id:
        raise BadRequestException(
            "Select a different doctor when reassigning a patient.",
            code="same_doctor_reassignment",
        )

    patient, new_doctor = _validate_assignable_patient_and_doctor(
        db,
        patient_id=assignment.patient_id,
        doctor_id=payload.new_doctor_id,
    )

    existing_new = db.scalar(
        select(PatientDoctorAssignment).where(
            PatientDoctorAssignment.patient_id == patient.id,
            PatientDoctorAssignment.doctor_id == new_doctor.id,
            PatientDoctorAssignment.status == AssignmentStatus.ACTIVE.value,
        )
    )
    if existing_new is not None:
        raise ConflictException(
            "The patient already has an active assignment with the selected doctor.",
            code="duplicate_assignment",
        )

    assignment.status = AssignmentStatus.REASSIGNED.value
    assignment.revoked_at = now
    assignment.updated_at = now

    replacement = PatientDoctorAssignment(
        patient_id=patient.id,
        doctor_id=new_doctor.id,
        assigned_by=admin.id,
        status=AssignmentStatus.ACTIVE.value,
        notes=payload.notes,
        assigned_at=now,
    )
    db.add(replacement)

    doctor_display = format_doctor_display_name(new_doctor.full_name)
    create_in_app_notification(
        db,
        user_id=new_doctor.id,
        title="New patient assigned",
        message=(
            f"{patient.full_name} has been assigned to your care roster. "
            "Open My Patients to review authorized records."
        ),
        notification_type=NotificationType.SYSTEM,
    )
    create_in_app_notification(
        db,
        user_id=patient.id,
        title="Care clinician updated",
        message=(
            f"Your care coordination has been assigned to {doctor_display}."
        ),
        notification_type=NotificationType.SYSTEM,
    )

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictException(
            "Could not complete reassignment due to a conflicting active assignment.",
            code="duplicate_assignment",
        ) from exc

    db.refresh(replacement)
    logger.info(
        "Admin id=%s reassigned assignment id=%s -> id=%s doctor_id=%s",
        admin.id,
        assignment.id,
        replacement.id,
        new_doctor.id,
    )
    return _to_assignment_response(replacement)


def _get_active_assignments_for_doctor(
    db: Session, *, doctor: User
) -> list[PatientDoctorAssignment]:
    """Return all ACTIVE assignments linking ``doctor`` to active PATIENT users."""
    stmt = (
        select(PatientDoctorAssignment)
        .join(User, User.id == PatientDoctorAssignment.patient_id)
        .where(
            PatientDoctorAssignment.doctor_id == doctor.id,
            PatientDoctorAssignment.status == AssignmentStatus.ACTIVE.value,
            User.role == UserRole.PATIENT.value,
            User.is_active.is_(True),
        )
        .order_by(
            PatientDoctorAssignment.assigned_at.desc(),
            PatientDoctorAssignment.id.desc(),
        )
    )
    return list(db.scalars(stmt).all())


def _get_authorized_patient_map(
    db: Session, *, doctor: User
) -> dict[str, tuple[User, PatientDoctorAssignment]]:
    assignments = _get_active_assignments_for_doctor(db, doctor=doctor)
    return {a.patient_id: (a.patient, a) for a in assignments}


def require_authorized_patient(
    db: Session,
    *,
    doctor: User,
    patient_id: str,
) -> tuple[User, PatientDoctorAssignment]:
    """Verify ``doctor`` holds an ACTIVE assignment to ``patient_id`` or raise 404."""
    assignment = db.scalar(
        select(PatientDoctorAssignment)
        .join(User, User.id == PatientDoctorAssignment.patient_id)
        .where(
            PatientDoctorAssignment.doctor_id == doctor.id,
            PatientDoctorAssignment.patient_id == patient_id,
            PatientDoctorAssignment.status == AssignmentStatus.ACTIVE.value,
            User.role == UserRole.PATIENT.value,
            User.is_active.is_(True),
        )
    )
    if assignment is None:
        raise NotFoundException(
            "Authorized patient record not found.",
            code="patient_not_found",
        )
    return assignment.patient, assignment


# ---------------------------------------------------------------------------
# Patient Summary Computation & Patient Management
# ---------------------------------------------------------------------------


def _is_upcoming_appointment(appt: Appointment, now: datetime) -> bool:
    return appt.status in {
        AppointmentStatus.PENDING.value,
        AppointmentStatus.CONFIRMED.value,
    } and _as_utc(appt.scheduled_at) >= now


def _is_today_utc(dt: datetime, now: datetime) -> bool:
    return _as_utc(dt).date() == now.date()


def _is_overdue_follow_up(record: FollowUp, now: datetime) -> bool:
    return (
        record.status == FollowUpStatus.PENDING.value
        and _as_utc(record.scheduled_at) < now
    ) or record.status == FollowUpStatus.MISSED.value


def _build_patient_summaries(
    db: Session,
    *,
    assignments: list[PatientDoctorAssignment],
    now: datetime,
) -> list[DoctorPatientSummary]:
    if not assignments:
        return []

    patient_ids = [item.patient_id for item in assignments]

    profiles_by_uid: dict[str, PatientProfile] = {
        p.user_id: p
        for p in db.scalars(
            select(PatientProfile).where(PatientProfile.user_id.in_(patient_ids))
        ).all()
    }

    reports_by_pid: dict[str, list[MedicalReport]] = defaultdict(list)
    for rep in db.scalars(
        select(MedicalReport)
        .where(MedicalReport.patient_id.in_(patient_ids))
        .order_by(MedicalReport.uploaded_at.desc())
    ).all():
        reports_by_pid[rep.patient_id].append(rep)

    appts_by_pid: dict[str, list[Appointment]] = defaultdict(list)
    for appt in db.scalars(
        select(Appointment)
        .where(Appointment.patient_id.in_(patient_ids))
        .order_by(Appointment.scheduled_at.desc())
    ).all():
        appts_by_pid[appt.patient_id].append(appt)

    referrals_by_pid: dict[str, list[Referral]] = defaultdict(list)
    for ref in db.scalars(
        select(Referral)
        .where(Referral.patient_id.in_(patient_ids))
        .order_by(Referral.updated_at.desc())
    ).all():
        referrals_by_pid[ref.patient_id].append(ref)

    follow_ups_by_pid: dict[str, list[FollowUp]] = defaultdict(list)
    for fu in db.scalars(
        select(FollowUp)
        .where(FollowUp.patient_id.in_(patient_ids))
        .order_by(FollowUp.scheduled_at.asc())
    ).all():
        follow_ups_by_pid[fu.patient_id].append(fu)

    risks_by_pid: dict[str, list[RiskAssessment]] = defaultdict(list)
    for ra in db.scalars(
        select(RiskAssessment)
        .where(RiskAssessment.patient_id.in_(patient_ids))
        .order_by(RiskAssessment.assessed_at.desc(), RiskAssessment.id.desc())
    ).all():
        risks_by_pid[ra.patient_id].append(ra)

    summaries: list[DoctorPatientSummary] = []
    for assignment in assignments:
        pid = assignment.patient_id
        patient = assignment.patient
        profile = profiles_by_uid.get(pid)
        p_reports = reports_by_pid.get(pid, [])
        p_appts = appts_by_pid.get(pid, [])
        p_referrals = referrals_by_pid.get(pid, [])
        p_follow_ups = follow_ups_by_pid.get(pid, [])
        p_risks = risks_by_pid.get(pid, [])

        pending_reports = sum(
            1 for r in p_reports if r.review_status in _PENDING_REPORT_STATUSES
        )
        upcoming_appointments = sum(
            1 for a in p_appts if _is_upcoming_appointment(a, now)
        )
        pending_appointments = sum(
            1
            for a in p_appts
            if a.status == AppointmentStatus.PENDING.value
            and _as_utc(a.scheduled_at) >= now
        )
        active_referrals = sum(
            1 for ref in p_referrals if ref.status in _ACTIVE_REFERRAL_STATUSES
        )
        overdue_follow_ups = sum(
            1 for fu in p_follow_ups if _is_overdue_follow_up(fu, now)
        )
        pending_follow_ups = sum(
            1
            for fu in p_follow_ups
            if fu.status in {FollowUpStatus.PENDING.value, FollowUpStatus.MISSED.value}
        )

        # Only expose an existing valid assessment record — never fabricate risk.
        active_risks = [
            ra
            for ra in p_risks
            if ra.status != RiskAssessmentStatus.ARCHIVED.value
        ]
        latest_risk = active_risks[0] if active_risks else None
        latest_risk_category = (
            RiskCategory(latest_risk.risk_category)
            if latest_risk and latest_risk.risk_category
            else None
        )

        attention_reasons: list[str] = []
        if pending_reports > 0:
            attention_reasons.append(
                f"{pending_reports} report{'s' if pending_reports != 1 else ''} awaiting review"
            )
        if pending_appointments > 0:
            attention_reasons.append(
                f"{pending_appointments} pending appointment request{'s' if pending_appointments != 1 else ''}"
            )
        if overdue_follow_ups > 0:
            attention_reasons.append(
                f"{overdue_follow_ups} overdue follow-up{'s' if overdue_follow_ups != 1 else ''}"
            )
        if any(
            ra.status == RiskAssessmentStatus.PENDING.value
            or ra.risk_category in {RiskCategory.HIGH.value, RiskCategory.CRITICAL.value}
            for ra in active_risks
        ):
            attention_reasons.append("Risk record awaiting or flagged for attention")

        timestamps: list[datetime] = [_as_utc(assignment.assigned_at)]
        if p_reports:
            timestamps.append(_as_utc(p_reports[0].uploaded_at))
        if p_appts:
            timestamps.extend(_as_utc(a.updated_at) for a in p_appts[:2])
        if p_referrals:
            timestamps.append(_as_utc(p_referrals[0].updated_at))
        if p_follow_ups:
            timestamps.extend(_as_utc(f.updated_at) for f in p_follow_ups[:2])

        summaries.append(
            DoctorPatientSummary(
                patient_id=pid,
                assignment_id=assignment.id,
                assigned_at=_as_utc(assignment.assigned_at),
                full_name=patient.full_name,
                date_of_birth=profile.date_of_birth if profile else None,
                gender=(
                    GenderOption(profile.gender)
                    if profile and profile.gender
                    else None
                ),
                city=profile.city if profile else None,
                state=profile.state if profile else None,
                preferred_language=(
                    PreferredLanguage(profile.preferred_language)
                    if profile
                    else PreferredLanguage.ENGLISH
                ),
                total_reports=len(p_reports),
                pending_reports=pending_reports,
                upcoming_appointments=upcoming_appointments,
                pending_appointments=pending_appointments,
                active_referrals=active_referrals,
                pending_follow_ups=pending_follow_ups,
                overdue_follow_ups=overdue_follow_ups,
                latest_risk_category=latest_risk_category,
                requires_attention=len(attention_reasons) > 0,
                attention_reasons=attention_reasons,
                last_activity_at=max(timestamps) if timestamps else None,
            )
        )

    return summaries


def list_doctor_patients(
    db: Session,
    *,
    doctor: User,
    search: str | None = None,
    status_filter: DoctorPatientStatusFilter = DoctorPatientStatusFilter.ALL,
    page: int = 1,
    page_size: int = 10,
) -> DoctorPatientListResponse:
    """List, search, filter, and paginate patients assigned to ``doctor``."""
    now = datetime.now(timezone.utc)
    assignments = _get_active_assignments_for_doctor(db, doctor=doctor)
    summaries = _build_patient_summaries(db, assignments=assignments, now=now)

    if search and search.strip():
        needle = search.strip().lower()
        summaries = [
            item
            for item in summaries
            if needle in item.full_name.lower()
            or (item.city and needle in item.city.lower())
            or (item.state and needle in item.state.lower())
        ]

    if status_filter == DoctorPatientStatusFilter.NEEDS_ATTENTION:
        summaries = [item for item in summaries if item.requires_attention]
    elif status_filter == DoctorPatientStatusFilter.PENDING_REPORTS:
        summaries = [item for item in summaries if item.pending_reports > 0]
    elif status_filter == DoctorPatientStatusFilter.PENDING_APPOINTMENTS:
        summaries = [item for item in summaries if item.pending_appointments > 0]
    elif status_filter == DoctorPatientStatusFilter.OVERDUE_FOLLOW_UP:
        summaries = [item for item in summaries if item.overdue_follow_ups > 0]
    elif status_filter == DoctorPatientStatusFilter.UP_TO_DATE:
        summaries = [item for item in summaries if not item.requires_attention]

    page_items, total, total_pages = _paginate_slice(
        summaries, page=page, page_size=page_size
    )
    return DoctorPatientListResponse(
        items=page_items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# ---------------------------------------------------------------------------
# Serializers for Reports, Risks, Appointments, Referrals, Follow-ups
# ---------------------------------------------------------------------------


def _to_report_review_item(review: ReportReview) -> ReportReviewHistoryItem:
    return ReportReviewHistoryItem(
        id=review.id,
        report_id=review.report_id,
        doctor_id=review.doctor_id,
        doctor_name=(
            format_doctor_display_name(review.doctor.full_name)
            if review.doctor is not None
            else None
        ),
        review_status=DoctorReportReviewStatus(review.review_status),
        review_note=review.review_note,
        reviewed_at=_as_utc(review.reviewed_at),
        created_at=_as_utc(review.created_at),
    )


def _to_report_summary(
    report: MedicalReport,
    *,
    patient_name: str,
    reviews: list[ReportReview],
) -> DoctorReportSummary:
    latest = reviews[0] if reviews else None
    return DoctorReportSummary(
        id=report.id,
        patient_id=report.patient_id,
        patient_name=patient_name,
        original_filename=report.original_filename,
        file_type=ReportFileType(report.file_type),
        file_size=report.file_size,
        upload_status=ReportUploadStatus(report.upload_status),
        review_status=ReportReviewStatus(report.review_status),
        review_count=len(reviews),
        latest_reviewed_at=_as_utc(latest.reviewed_at) if latest else None,
        latest_reviewer_name=(
            format_doctor_display_name(latest.doctor.full_name)
            if latest and latest.doctor is not None
            else None
        ),
        uploaded_at=_as_utc(report.uploaded_at),
        updated_at=_as_utc(report.updated_at),
    )


def _to_clinical_review_response(review: ClinicalReview) -> ClinicalReviewResponse:
    return ClinicalReviewResponse(
        id=review.id,
        patient_id=review.patient_id,
        doctor_id=review.doctor_id,
        doctor_name=(
            format_doctor_display_name(review.doctor.full_name)
            if review.doctor is not None
            else None
        ),
        related_assessment_id=review.related_assessment_id,
        review_status=ClinicalReviewStatus(review.review_status),
        review_note=review.review_note,
        recommended_action=review.recommended_action,
        reviewed_at=_as_utc(review.reviewed_at),
        created_at=_as_utc(review.created_at),
    )


def _to_doctor_risk_item(
    record: RiskAssessment,
    *,
    patient_name: str,
    clinical_reviews: list[ClinicalReview],
) -> DoctorRiskAssessmentItem:
    source_enum = (
        RiskAssessmentSource(record.source) if record.source else None
    )
    return DoctorRiskAssessmentItem(
        id=record.id,
        patient_id=record.patient_id,
        patient_name=patient_name,
        related_report_id=record.related_report_id,
        status=RiskAssessmentStatus(record.status),
        risk_category=(
            RiskCategory(record.risk_category) if record.risk_category else None
        ),
        source=source_enum,
        is_ai_assisted=source_enum == RiskAssessmentSource.AI_ASSISTED,
        explanation=record.explanation,
        recommended_action=record.recommended_action,
        reviewed_by_doctor_name=(
            format_doctor_display_name(record.reviewing_doctor.full_name)
            if record.reviewing_doctor is not None
            else None
        ),
        assessed_at=_as_utc(record.assessed_at),
        updated_at=_as_utc(record.updated_at),
        clinical_reviews=[
            _to_clinical_review_response(item) for item in clinical_reviews
        ],
    )


def _to_doctor_appointment_item(
    appt: Appointment,
    *,
    patient_name: str,
    now: datetime,
) -> DoctorAppointmentItem:
    return DoctorAppointmentItem(
        id=appt.id,
        patient_id=appt.patient_id,
        patient_name=patient_name,
        doctor_id=appt.doctor_id,
        assigned_doctor_name=(
            format_doctor_display_name(appt.doctor.full_name)
            if appt.doctor is not None
            else None
        ),
        scheduled_at=_as_utc(appt.scheduled_at),
        appointment_type=appt.appointment_type,
        status=AppointmentStatus(appt.status),
        location_or_mode=appt.location_or_mode,
        notes=appt.notes,
        status_note=appt.status_note,
        is_upcoming=_is_upcoming_appointment(appt, now),
        is_today=_is_today_utc(appt.scheduled_at, now)
        and appt.status != AppointmentStatus.CANCELLED.value,
        created_at=_as_utc(appt.created_at),
        updated_at=_as_utc(appt.updated_at),
    )


def _to_referral_history_item(entry: ReferralHistory) -> ReferralHistoryItem:
    return ReferralHistoryItem(
        id=entry.id,
        previous_status=(
            ReferralStatus(entry.previous_status)
            if entry.previous_status is not None
            else None
        ),
        new_status=ReferralStatus(entry.new_status),
        changed_by_doctor_name=(
            format_doctor_display_name(entry.changed_by_doctor.full_name)
            if entry.changed_by_doctor is not None
            else None
        ),
        note=entry.note,
        created_at=_as_utc(entry.created_at),
    )


def _to_doctor_referral_item(
    referral: Referral,
    *,
    patient_name: str,
    history: list[ReferralHistory],
) -> DoctorReferralItem:
    return DoctorReferralItem(
        id=referral.id,
        patient_id=referral.patient_id,
        patient_name=patient_name,
        referring_doctor_id=referral.referring_doctor_id,
        referring_doctor_name=(
            format_doctor_display_name(referral.referring_doctor.full_name)
            if referral.referring_doctor is not None
            else None
        ),
        referred_department=referral.referred_department,
        reason=referral.reason,
        next_action=referral.next_action,
        status=ReferralStatus(referral.status),
        created_at=_as_utc(referral.created_at),
        updated_at=_as_utc(referral.updated_at),
        history=[_to_referral_history_item(item) for item in history],
    )


def _to_doctor_follow_up_item(
    record: FollowUp,
    *,
    patient_name: str,
    now: datetime,
) -> DoctorFollowUpItem:
    return DoctorFollowUpItem(
        id=record.id,
        patient_id=record.patient_id,
        patient_name=patient_name,
        created_by_doctor_id=record.created_by_doctor_id,
        created_by_doctor_name=(
            format_doctor_display_name(record.created_by_doctor.full_name)
            if record.created_by_doctor is not None
            else None
        ),
        related_appointment_id=record.related_appointment_id,
        related_referral_id=record.related_referral_id,
        scheduled_at=_as_utc(record.scheduled_at),
        follow_up_type=record.follow_up_type,
        status=FollowUpStatus(record.status),
        notes=record.notes,
        is_overdue=_is_overdue_follow_up(record, now),
        created_at=_as_utc(record.created_at),
        updated_at=_as_utc(record.updated_at),
    )


def _build_activity_items(
    *,
    patient_names: dict[str, str],
    assignments: list[PatientDoctorAssignment],
    reports: list[MedicalReport],
    report_reviews: list[ReportReview],
    report_patient_ids: dict[str, str],
    appointments: list[Appointment],
    referrals: list[Referral],
    follow_ups: list[FollowUp],
    limit: int = 12,
) -> list[DoctorActivityItem]:
    entries: list[DoctorActivityItem] = []

    for assign in assignments[:8]:
        pname = patient_names.get(assign.patient_id, assign.patient.full_name)
        entries.append(
            DoctorActivityItem(
                id=f"assignment-{assign.id}",
                category="assignment",
                patient_id=assign.patient_id,
                patient_name=pname,
                title=f"Assigned to care roster: {pname}",
                description="Active patient-doctor care assignment authorized.",
                status=assign.status,
                occurred_at=_as_utc(assign.assigned_at),
                link_path=f"/doctor/patients/{assign.patient_id}",
            )
        )

    for report in reports[:8]:
        pname = patient_names.get(report.patient_id, "Patient")
        entries.append(
            DoctorActivityItem(
                id=f"report-{report.id}",
                category="report",
                patient_id=report.patient_id,
                patient_name=pname,
                title=f"Report uploaded by {pname}",
                description=(
                    f"{report.original_filename} ({report.file_type}) · "
                    f"{report.review_status.replace('_', ' ').title()}"
                ),
                status=report.review_status,
                occurred_at=_as_utc(report.uploaded_at),
                link_path=f"/doctor/reports/{report.id}",
            )
        )

    for review in report_reviews[:8]:
        pid = report_patient_ids.get(review.report_id)
        if not pid:
            continue
        pname = patient_names.get(pid, "Patient")
        entries.append(
            DoctorActivityItem(
                id=f"review-{review.id}",
                category="review",
                patient_id=pid,
                patient_name=pname,
                title=f"Report review recorded for {pname}",
                description=(
                    f"Marked {review.review_status.replace('_', ' ').title()}"
                    + (
                        f" by {format_doctor_display_name(review.doctor.full_name)}"
                        if review.doctor
                        else ""
                    )
                ),
                status=review.review_status,
                occurred_at=_as_utc(review.reviewed_at),
                link_path=f"/doctor/reports/{review.report_id}",
            )
        )

    for appt in appointments[:8]:
        pname = patient_names.get(appt.patient_id, "Patient")
        slot = _as_utc(appt.scheduled_at).strftime("%b %d, %Y · %H:%M UTC")
        entries.append(
            DoctorActivityItem(
                id=f"appointment-{appt.id}",
                category="appointment",
                patient_id=appt.patient_id,
                patient_name=pname,
                title=f"{_humanize_appointment_type(appt.appointment_type)} — {pname}",
                description=f"Scheduled {slot} · Status: {appt.status.title()}",
                status=appt.status,
                occurred_at=_as_utc(appt.updated_at),
                link_path="/doctor/appointments",
            )
        )

    for ref in referrals[:8]:
        pname = patient_names.get(ref.patient_id, "Patient")
        entries.append(
            DoctorActivityItem(
                id=f"referral-{ref.id}",
                category="referral",
                patient_id=ref.patient_id,
                patient_name=pname,
                title=f"Referral to {ref.referred_department} — {pname}",
                description=f"Current status: {ref.status.title()}",
                status=ref.status,
                occurred_at=_as_utc(ref.updated_at),
                link_path="/doctor/referrals",
            )
        )

    for fu in follow_ups[:8]:
        pname = patient_names.get(fu.patient_id, "Patient")
        due = _as_utc(fu.scheduled_at).strftime("%b %d, %Y")
        entries.append(
            DoctorActivityItem(
                id=f"followup-{fu.id}",
                category="follow_up",
                patient_id=fu.patient_id,
                patient_name=pname,
                title=f"Follow-up: {fu.follow_up_type} — {pname}",
                description=f"Due {due} · Status: {fu.status.title()}",
                status=fu.status,
                occurred_at=_as_utc(fu.updated_at),
                link_path="/doctor/follow-ups",
            )
        )

    entries.sort(key=lambda item: item.occurred_at, reverse=True)
    return entries[:limit]


# ---------------------------------------------------------------------------
# Comprehensive Patient Detail View
# ---------------------------------------------------------------------------


def get_doctor_patient_detail(
    db: Session,
    *,
    doctor: User,
    patient_id: str,
) -> DoctorPatientDetailResponse:
    """Return authorized clinical care dossier for an assigned patient."""
    now = datetime.now(timezone.utc)
    patient, assignment = require_authorized_patient(
        db, doctor=doctor, patient_id=patient_id
    )

    profile = db.scalar(
        select(PatientProfile).where(PatientProfile.user_id == patient.id)
    )
    summaries = _build_patient_summaries(db, assignments=[assignment], now=now)
    summary = summaries[0]

    reports = list(
        db.scalars(
            select(MedicalReport)
            .where(MedicalReport.patient_id == patient.id)
            .order_by(MedicalReport.uploaded_at.desc(), MedicalReport.id.desc())
        ).all()
    )
    report_ids = [r.id for r in reports]
    reviews_by_rid: dict[str, list[ReportReview]] = defaultdict(list)
    all_report_reviews: list[ReportReview] = []
    if report_ids:
        all_report_reviews = list(
            db.scalars(
                select(ReportReview)
                .where(ReportReview.report_id.in_(report_ids))
                .order_by(ReportReview.reviewed_at.desc(), ReportReview.id.desc())
            ).all()
        )
        for rev in all_report_reviews:
            reviews_by_rid[rev.report_id].append(rev)

    risk_records = list(
        db.scalars(
            select(RiskAssessment)
            .where(RiskAssessment.patient_id == patient.id)
            .order_by(RiskAssessment.assessed_at.desc(), RiskAssessment.id.desc())
        ).all()
    )
    risk_ids = [r.id for r in risk_records]
    clinical_reviews_by_aid: dict[str, list[ClinicalReview]] = defaultdict(list)
    if risk_ids:
        for cr in db.scalars(
            select(ClinicalReview)
            .where(ClinicalReview.related_assessment_id.in_(risk_ids))
            .order_by(ClinicalReview.reviewed_at.desc(), ClinicalReview.id.desc())
        ).all():
            if cr.related_assessment_id:
                clinical_reviews_by_aid[cr.related_assessment_id].append(cr)

    appointments = list(
        db.scalars(
            select(Appointment)
            .where(Appointment.patient_id == patient.id)
            .order_by(Appointment.scheduled_at.desc(), Appointment.id.desc())
        ).all()
    )

    referrals = list(
        db.scalars(
            select(Referral)
            .where(Referral.patient_id == patient.id)
            .order_by(Referral.created_at.desc(), Referral.id.desc())
        ).all()
    )
    ref_ids = [ref.id for ref in referrals]
    history_by_ref: dict[str, list[ReferralHistory]] = defaultdict(list)
    if ref_ids:
        for hist in db.scalars(
            select(ReferralHistory)
            .where(ReferralHistory.referral_id.in_(ref_ids))
            .order_by(ReferralHistory.created_at.desc(), ReferralHistory.id.desc())
        ).all():
            history_by_ref[hist.referral_id].append(hist)

    follow_ups = list(
        db.scalars(
            select(FollowUp)
            .where(FollowUp.patient_id == patient.id)
            .order_by(FollowUp.scheduled_at.asc(), FollowUp.id.desc())
        ).all()
    )

    profile_section = DoctorPatientProfileSection(
        patient_id=patient.id,
        full_name=patient.full_name,
        email=patient.email,
        account_created_at=_as_utc(patient.created_at),
        assignment_id=assignment.id,
        assignment_status=AssignmentStatus(assignment.status),
        assigned_at=_as_utc(assignment.assigned_at),
        date_of_birth=profile.date_of_birth if profile else None,
        phone_number=profile.phone_number if profile else None,
        gender=(
            GenderOption(profile.gender)
            if profile and profile.gender
            else None
        ),
        city=profile.city if profile else None,
        state=profile.state if profile else None,
        preferred_language=(
            PreferredLanguage(profile.preferred_language)
            if profile
            else PreferredLanguage.ENGLISH
        ),
        emergency_contact_name=(
            profile.emergency_contact_name if profile else None
        ),
        emergency_contact_phone=(
            profile.emergency_contact_phone if profile else None
        ),
    )

    recent_activity = _build_activity_items(
        patient_names={patient.id: patient.full_name},
        assignments=[assignment],
        reports=reports,
        report_reviews=all_report_reviews,
        report_patient_ids={r.id: patient.id for r in reports},
        appointments=appointments,
        referrals=referrals,
        follow_ups=follow_ups,
        limit=12,
    )

    return DoctorPatientDetailResponse(
        profile=profile_section,
        requires_attention=summary.requires_attention,
        attention_reasons=summary.attention_reasons,
        reports=[
            _to_report_summary(
                r,
                patient_name=patient.full_name,
                reviews=reviews_by_rid.get(r.id, []),
            )
            for r in reports
        ],
        report_reviews=[_to_report_review_item(rev) for rev in all_report_reviews],
        risk_assessments=[
            _to_doctor_risk_item(
                ra,
                patient_name=patient.full_name,
                clinical_reviews=clinical_reviews_by_aid.get(ra.id, []),
            )
            for ra in risk_records
        ],
        appointments=[
            _to_doctor_appointment_item(
                appt, patient_name=patient.full_name, now=now
            )
            for appt in appointments
        ],
        referrals=[
            _to_doctor_referral_item(
                ref,
                patient_name=patient.full_name,
                history=history_by_ref.get(ref.id, []),
            )
            for ref in referrals
        ],
        follow_ups=[
            _to_doctor_follow_up_item(
                fu, patient_name=patient.full_name, now=now
            )
            for fu in follow_ups
        ],
        recent_activity=recent_activity,
        allowed_departments=list(ALLOWED_REFERRAL_DEPARTMENTS),
        risk_disclaimer=DOCTOR_CLINICAL_RISK_DISCLAIMER,
    )


# ---------------------------------------------------------------------------
# Medical Report Review & Secure Download
# ---------------------------------------------------------------------------


def _get_authorized_report_or_404(
    db: Session,
    *,
    doctor: User,
    report_id: str,
) -> tuple[MedicalReport, User]:
    report = db.get(MedicalReport, report_id)
    if report is None:
        raise NotFoundException(
            "Medical report not found.",
            code="report_not_found",
        )
    try:
        patient, _ = require_authorized_patient(
            db, doctor=doctor, patient_id=report.patient_id
        )
    except NotFoundException as exc:
        raise NotFoundException(
            "Medical report not found.",
            code="report_not_found",
        ) from exc
    return report, patient


def list_doctor_reports(
    db: Session,
    *,
    doctor: User,
    patient_id: str | None = None,
    review_status: ReportReviewStatus | None = None,
    file_type: ReportFileType | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 10,
) -> DoctorReportListResponse:
    """List reports belonging strictly to the doctor's assigned patients."""
    authorized_map = _get_authorized_patient_map(db, doctor=doctor)
    if patient_id is not None and patient_id not in authorized_map:
        raise NotFoundException(
            "Authorized patient record not found.",
            code="patient_not_found",
        )

    if not authorized_map:
        return DoctorReportListResponse(
            items=[],
            total=0,
            pending_count=0,
            in_review_count=0,
            needs_follow_up_count=0,
            reviewed_count=0,
            page=page,
            page_size=page_size,
            total_pages=1,
        )

    scoped_pids = [patient_id] if patient_id else list(authorized_map.keys())
    all_reports = list(
        db.scalars(
            select(MedicalReport)
            .where(MedicalReport.patient_id.in_(scoped_pids))
            .order_by(MedicalReport.uploaded_at.desc(), MedicalReport.id.desc())
        ).all()
    )

    pending_count = sum(
        1
        for r in all_reports
        if r.review_status == ReportReviewStatus.PENDING_REVIEW.value
    )
    in_review_count = sum(
        1
        for r in all_reports
        if r.review_status == ReportReviewStatus.IN_REVIEW.value
    )
    needs_follow_up_count = sum(
        1
        for r in all_reports
        if r.review_status == ReportReviewStatus.NEEDS_FOLLOW_UP.value
    )
    reviewed_count = sum(
        1
        for r in all_reports
        if r.review_status == ReportReviewStatus.REVIEWED.value
    )

    filtered = all_reports
    if review_status is not None:
        filtered = [r for r in filtered if r.review_status == review_status.value]
    if file_type is not None:
        filtered = [r for r in filtered if r.file_type == file_type.value]
    if search and search.strip():
        needle = search.strip().lower()
        filtered = [
            r
            for r in filtered
            if needle in r.original_filename.lower()
            or needle in authorized_map[r.patient_id][0].full_name.lower()
        ]

    page_reports, total, total_pages = _paginate_slice(
        filtered, page=page, page_size=page_size
    )

    reviews_by_rid: dict[str, list[ReportReview]] = defaultdict(list)
    if page_reports:
        for rev in db.scalars(
            select(ReportReview)
            .where(ReportReview.report_id.in_([r.id for r in page_reports]))
            .order_by(ReportReview.reviewed_at.desc(), ReportReview.id.desc())
        ).all():
            reviews_by_rid[rev.report_id].append(rev)

    return DoctorReportListResponse(
        items=[
            _to_report_summary(
                r,
                patient_name=authorized_map[r.patient_id][0].full_name,
                reviews=reviews_by_rid.get(r.id, []),
            )
            for r in page_reports
        ],
        total=total,
        pending_count=pending_count,
        in_review_count=in_review_count,
        needs_follow_up_count=needs_follow_up_count,
        reviewed_count=reviewed_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


def get_doctor_report_detail(
    db: Session,
    *,
    doctor: User,
    report_id: str,
) -> DoctorReportDetailResponse:
    """Return full report details and preserved review history."""
    report, patient = _get_authorized_report_or_404(
        db, doctor=doctor, report_id=report_id
    )
    profile = db.scalar(
        select(PatientProfile).where(PatientProfile.user_id == patient.id)
    )
    reviews = list(
        db.scalars(
            select(ReportReview)
            .where(ReportReview.report_id == report.id)
            .order_by(ReportReview.reviewed_at.desc(), ReportReview.id.desc())
        ).all()
    )
    return DoctorReportDetailResponse(
        id=report.id,
        patient_id=patient.id,
        patient_name=patient.full_name,
        patient_city=profile.city if profile else None,
        patient_state=profile.state if profile else None,
        original_filename=report.original_filename,
        file_type=ReportFileType(report.file_type),
        file_size=report.file_size,
        upload_status=ReportUploadStatus(report.upload_status),
        review_status=ReportReviewStatus(report.review_status),
        uploaded_at=_as_utc(report.uploaded_at),
        updated_at=_as_utc(report.updated_at),
        reviews=[_to_report_review_item(item) for item in reviews],
    )


def create_doctor_report_review(
    db: Session,
    *,
    doctor: User,
    report_id: str,
    payload: ReportReviewCreateRequest,
) -> DoctorReportDetailResponse:
    """Append a new clinical review entry and update the report's review_status.

    Preserves all previous ``ReportReview`` entries and never overwrites or
    mutates the underlying uploaded file. Confidential ``review_note`` text is
    never included in patient notification previews or server logs.
    """
    report, patient = _get_authorized_report_or_404(
        db, doctor=doctor, report_id=report_id
    )
    if report.upload_status != ReportUploadStatus.UPLOADED.value:
        raise BadRequestException(
            "Cannot review a report whose upload did not complete.",
            code="report_not_reviewable",
        )

    now = datetime.now(timezone.utc)
    review_entry = ReportReview(
        report_id=report.id,
        doctor_id=doctor.id,
        review_status=payload.review_status.value,
        review_note=payload.review_note,
        reviewed_at=now,
    )
    db.add(review_entry)

    mapped_status = _DOCTOR_TO_REPORT_STATUS[payload.review_status]
    report.review_status = mapped_status.value
    report.updated_at = now

    status_phrases: dict[DoctorReportReviewStatus, str] = {
        DoctorReportReviewStatus.PENDING: "returned to pending review",
        DoctorReportReviewStatus.IN_REVIEW: "is currently under clinician review",
        DoctorReportReviewStatus.REVIEWED: "has been reviewed by your care clinician",
        DoctorReportReviewStatus.NEEDS_FOLLOW_UP: (
            "was reviewed and flagged for follow-up care coordination"
        ),
    }
    create_in_app_notification(
        db,
        user_id=patient.id,
        title="Medical report review updated",
        message=(
            f"One of your uploaded medical reports {status_phrases[payload.review_status]}. "
            "Open My Health Reports to check the updated status."
        ),
        notification_type=NotificationType.REPORT,
    )

    db.commit()
    logger.info(
        "Doctor id=%s recorded review id=%s on report_id=%s status=%s",
        doctor.id,
        review_entry.id,
        report.id,
        payload.review_status.value,
    )
    return get_doctor_report_detail(db, doctor=doctor, report_id=report.id)


def get_doctor_report_for_download(
    db: Session,
    *,
    doctor: User,
    report_id: str,
    settings: Settings,
) -> tuple[MedicalReport, Path]:
    """Verify assignment authorization and resolve private file path for download."""
    report, _ = _get_authorized_report_or_404(
        db, doctor=doctor, report_id=report_id
    )
    if report.upload_status != ReportUploadStatus.UPLOADED.value:
        raise NotFoundException(
            "This medical report is not available for download.",
            code="report_file_unavailable",
        )
    path = resolve_existing_report_path(report.stored_filename, settings=settings)
    return report, path


# ---------------------------------------------------------------------------
# Risk Assessment Review (no automated risk scoring or AI in Phase 6)
# ---------------------------------------------------------------------------


def list_doctor_risk_assessments(
    db: Session,
    *,
    doctor: User,
    patient_id: str | None = None,
    status_filter: RiskAssessmentStatus | None = None,
    risk_category: RiskCategory | None = None,
    page: int = 1,
    page_size: int = 10,
) -> DoctorRiskAssessmentListResponse:
    """List authorized risk assessment records for assigned patients."""
    authorized_map = _get_authorized_patient_map(db, doctor=doctor)
    if patient_id is not None and patient_id not in authorized_map:
        raise NotFoundException(
            "Authorized patient record not found.",
            code="patient_not_found",
        )

    if not authorized_map:
        return DoctorRiskAssessmentListResponse(
            items=[],
            total=0,
            pending_count=0,
            flagged_count=0,
            reviewed_count=0,
            page=page,
            page_size=page_size,
            total_pages=1,
            disclaimer=DOCTOR_CLINICAL_RISK_DISCLAIMER,
        )

    scoped_pids = [patient_id] if patient_id else list(authorized_map.keys())
    all_records = list(
        db.scalars(
            select(RiskAssessment)
            .where(RiskAssessment.patient_id.in_(scoped_pids))
            .order_by(RiskAssessment.assessed_at.desc(), RiskAssessment.id.desc())
        ).all()
    )

    reviews_by_aid: dict[str, list[ClinicalReview]] = defaultdict(list)
    if all_records:
        for cr in db.scalars(
            select(ClinicalReview)
            .where(
                ClinicalReview.related_assessment_id.in_(
                    [item.id for item in all_records]
                )
            )
            .order_by(ClinicalReview.reviewed_at.desc(), ClinicalReview.id.desc())
        ).all():
            if cr.related_assessment_id:
                reviews_by_aid[cr.related_assessment_id].append(cr)

    pending_count = sum(
        1
        for r in all_records
        if r.status == RiskAssessmentStatus.PENDING.value
    )
    reviewed_count = sum(
        1
        for r in all_records
        if r.status == RiskAssessmentStatus.REVIEWED.value
    )
    flagged_count = sum(
        1
        for r in all_records
        if reviews_by_aid.get(r.id)
        and reviews_by_aid[r.id][0].review_status
        in {
            ClinicalReviewStatus.FLAGGED_FOR_REVIEW.value,
            ClinicalReviewStatus.FOLLOW_UP_REQUIRED.value,
        }
    )

    filtered = all_records
    if status_filter is not None:
        filtered = [r for r in filtered if r.status == status_filter.value]
    if risk_category is not None:
        filtered = [r for r in filtered if r.risk_category == risk_category.value]

    page_records, total, total_pages = _paginate_slice(
        filtered, page=page, page_size=page_size
    )
    return DoctorRiskAssessmentListResponse(
        items=[
            _to_doctor_risk_item(
                item,
                patient_name=authorized_map[item.patient_id][0].full_name,
                clinical_reviews=reviews_by_aid.get(item.id, []),
            )
            for item in page_records
        ],
        total=total,
        pending_count=pending_count,
        flagged_count=flagged_count,
        reviewed_count=reviewed_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        disclaimer=DOCTOR_CLINICAL_RISK_DISCLAIMER,
    )


def create_doctor_risk_review(
    db: Session,
    *,
    doctor: User,
    assessment_id: str,
    payload: ClinicalReviewCreateRequest,
) -> DoctorRiskAssessmentItem:
    """Record a professional clinical review for an existing risk assessment."""
    assessment = db.get(RiskAssessment, assessment_id)
    if assessment is None:
        raise NotFoundException(
            "Risk assessment record not found.",
            code="risk_assessment_not_found",
        )
    try:
        patient, _ = require_authorized_patient(
            db, doctor=doctor, patient_id=assessment.patient_id
        )
    except NotFoundException as exc:
        raise NotFoundException(
            "Risk assessment record not found.",
            code="risk_assessment_not_found",
        ) from exc

    now = datetime.now(timezone.utc)
    review = ClinicalReview(
        patient_id=patient.id,
        doctor_id=doctor.id,
        related_assessment_id=assessment.id,
        review_status=payload.review_status.value,
        review_note=payload.review_note,
        recommended_action=payload.recommended_action,
        reviewed_at=now,
    )
    db.add(review)

    assessment.reviewed_by_doctor_id = doctor.id
    assessment.updated_at = now
    if payload.review_status == ClinicalReviewStatus.FLAGGED_FOR_REVIEW:
        assessment.status = RiskAssessmentStatus.PENDING.value
    elif payload.review_status == ClinicalReviewStatus.ARCHIVED:
        assessment.status = RiskAssessmentStatus.ARCHIVED.value
    else:
        assessment.status = RiskAssessmentStatus.REVIEWED.value

    if payload.recommended_action is not None:
        assessment.recommended_action = payload.recommended_action

    create_in_app_notification(
        db,
        user_id=patient.id,
        title="Risk coordination record updated",
        message=(
            "A clinician recorded a care coordination review on your risk overview. "
            "Open Risk Overview to check recommended next steps."
        ),
        notification_type=NotificationType.SYSTEM,
    )

    db.commit()
    db.refresh(assessment)

    reviews = list(
        db.scalars(
            select(ClinicalReview)
            .where(ClinicalReview.related_assessment_id == assessment.id)
            .order_by(ClinicalReview.reviewed_at.desc(), ClinicalReview.id.desc())
        ).all()
    )
    logger.info(
        "Doctor id=%s recorded clinical_review id=%s for assessment_id=%s status=%s",
        doctor.id,
        review.id,
        assessment.id,
        payload.review_status.value,
    )
    return _to_doctor_risk_item(
        assessment,
        patient_name=patient.full_name,
        clinical_reviews=reviews,
    )


# ---------------------------------------------------------------------------
# Appointment Management (with conflict & state-transition validation)
# ---------------------------------------------------------------------------


def _get_authorized_appointment_or_404(
    db: Session,
    *,
    doctor: User,
    appointment_id: str,
) -> tuple[Appointment, User]:
    appt = db.get(Appointment, appointment_id)
    if appt is None:
        raise NotFoundException(
            "Appointment not found.",
            code="appointment_not_found",
        )
    try:
        patient, _ = require_authorized_patient(
            db, doctor=doctor, patient_id=appt.patient_id
        )
    except NotFoundException as exc:
        raise NotFoundException(
            "Appointment not found.",
            code="appointment_not_found",
        ) from exc

    # If the appointment was already assigned to a different active doctor, block mutation/access.
    if appt.doctor_id is not None and appt.doctor_id != doctor.id:
        raise NotFoundException(
            "Appointment not found.",
            code="appointment_not_found",
        )
    return appt, patient


def _ensure_no_scheduling_conflict(
    db: Session,
    *,
    doctor_id: str,
    patient_id: str,
    target_slot: datetime,
    exclude_appointment_id: str,
) -> None:
    """Reject overlapping CONFIRMED appointments within ±30 minutes."""
    slot_utc = _as_utc(target_slot)
    candidates = list(
        db.scalars(
            select(Appointment).where(
                Appointment.id != exclude_appointment_id,
                Appointment.status == AppointmentStatus.CONFIRMED.value,
                or_(
                    Appointment.doctor_id == doctor_id,
                    Appointment.patient_id == patient_id,
                ),
            )
        ).all()
    )
    for existing in candidates:
        existing_utc = _as_utc(existing.scheduled_at)
        if abs((existing_utc - slot_utc).total_seconds()) < (
            APPOINTMENT_CONFLICT_WINDOW.total_seconds()
        ):
            formatted = existing_utc.strftime("%b %d, %Y at %H:%M UTC")
            if existing.doctor_id == doctor_id:
                raise ConflictException(
                    f"Scheduling conflict: you already have a confirmed appointment at {formatted} "
                    "(minimum 30-minute interval required).",
                    code="appointment_conflict",
                )
            raise ConflictException(
                f"Scheduling conflict: this patient already has a confirmed appointment at {formatted}.",
                code="appointment_conflict",
            )


def list_doctor_appointments(
    db: Session,
    *,
    doctor: User,
    scope: DoctorAppointmentScope = DoctorAppointmentScope.ALL,
    status_filter: AppointmentStatus | None = None,
    patient_id: str | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 10,
) -> DoctorAppointmentListResponse:
    """List appointments for assigned patients with counts and pagination."""
    now = datetime.now(timezone.utc)
    authorized_map = _get_authorized_patient_map(db, doctor=doctor)
    if patient_id is not None and patient_id not in authorized_map:
        raise NotFoundException(
            "Authorized patient record not found.",
            code="patient_not_found",
        )

    if not authorized_map:
        return DoctorAppointmentListResponse(
            items=[],
            total=0,
            pending_count=0,
            upcoming_count=0,
            today_count=0,
            completed_count=0,
            cancelled_count=0,
            page=page,
            page_size=page_size,
            total_pages=1,
        )

    scoped_pids = [patient_id] if patient_id else list(authorized_map.keys())
    records = list(
        db.scalars(
            select(Appointment)
            .where(
                Appointment.patient_id.in_(scoped_pids),
                or_(
                    Appointment.doctor_id.is_(None),
                    Appointment.doctor_id == doctor.id,
                ),
            )
            .order_by(Appointment.scheduled_at.asc(), Appointment.id.desc())
        ).all()
    )

    all_items = [
        _to_doctor_appointment_item(
            item,
            patient_name=authorized_map[item.patient_id][0].full_name,
            now=now,
        )
        for item in records
    ]

    pending_count = sum(
        1 for i in all_items if i.status == AppointmentStatus.PENDING
    )
    upcoming_count = sum(
        1
        for i in all_items
        if i.status == AppointmentStatus.CONFIRMED and i.is_upcoming
    )
    today_count = sum(1 for i in all_items if i.is_today)
    completed_count = sum(
        1 for i in all_items if i.status == AppointmentStatus.COMPLETED
    )
    cancelled_count = sum(
        1 for i in all_items if i.status == AppointmentStatus.CANCELLED
    )

    filtered = all_items
    if scope == DoctorAppointmentScope.PENDING:
        filtered = [i for i in filtered if i.status == AppointmentStatus.PENDING]
    elif scope == DoctorAppointmentScope.UPCOMING:
        filtered = [
            i
            for i in filtered
            if i.status == AppointmentStatus.CONFIRMED and i.is_upcoming
        ]
    elif scope == DoctorAppointmentScope.TODAY:
        filtered = [i for i in filtered if i.is_today]
    elif scope == DoctorAppointmentScope.COMPLETED:
        filtered = [i for i in filtered if i.status == AppointmentStatus.COMPLETED]
        filtered.sort(key=lambda item: item.scheduled_at, reverse=True)
    elif scope == DoctorAppointmentScope.CANCELLED:
        filtered = [i for i in filtered if i.status == AppointmentStatus.CANCELLED]
        filtered.sort(key=lambda item: item.scheduled_at, reverse=True)
    else:
        # Order active upcoming first, historical descending after.
        active_upcoming = [i for i in filtered if i.is_upcoming]
        historical = sorted(
            [i for i in filtered if not i.is_upcoming],
            key=lambda item: item.scheduled_at,
            reverse=True,
        )
        filtered = [*active_upcoming, *historical]

    if status_filter is not None:
        filtered = [i for i in filtered if i.status == status_filter]
    if search and search.strip():
        needle = search.strip().lower()
        filtered = [
            i
            for i in filtered
            if needle in i.patient_name.lower()
            or needle in _humanize_appointment_type(i.appointment_type).lower()
            or (i.location_or_mode and needle in i.location_or_mode.lower())
        ]

    page_items, total, total_pages = _paginate_slice(
        filtered, page=page, page_size=page_size
    )
    return DoctorAppointmentListResponse(
        items=page_items,
        total=total,
        pending_count=pending_count,
        upcoming_count=upcoming_count,
        today_count=today_count,
        completed_count=completed_count,
        cancelled_count=cancelled_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


def get_doctor_appointment(
    db: Session,
    *,
    doctor: User,
    appointment_id: str,
) -> DoctorAppointmentItem:
    """Return details for a single authorized appointment."""
    appt, patient = _get_authorized_appointment_or_404(
        db, doctor=doctor, appointment_id=appointment_id
    )
    return _to_doctor_appointment_item(
        appt, patient_name=patient.full_name, now=datetime.now(timezone.utc)
    )


def update_doctor_appointment_status(
    db: Session,
    *,
    doctor: User,
    appointment_id: str,
    payload: DoctorAppointmentStatusRequest,
) -> DoctorAppointmentItem:
    """Apply a validated appointment status transition with conflict checks."""
    appt, patient = _get_authorized_appointment_or_404(
        db, doctor=doctor, appointment_id=appointment_id
    )
    current = appt.status
    target = payload.status.value
    allowed = _ALLOWED_APPOINTMENT_TRANSITIONS.get(current, frozenset())
    if target not in allowed:
        raise BadRequestException(
            f"Cannot transition appointment from {current.lower()} to {target.lower()}.",
            code="invalid_status_transition",
        )

    now = datetime.now(timezone.utc)
    scheduled_utc = _as_utc(appt.scheduled_at)
    friendly_type = _humanize_appointment_type(appt.appointment_type)
    formatted_slot = scheduled_utc.strftime("%b %d, %Y at %H:%M UTC")
    doctor_display = format_doctor_display_name(doctor.full_name)

    if target == AppointmentStatus.CONFIRMED.value:
        if scheduled_utc <= now:
            raise BadRequestException(
                "Cannot confirm an appointment scheduled in the past. Please reschedule it to a future slot first.",
                code="past_appointment_slot",
            )
        _ensure_no_scheduling_conflict(
            db,
            doctor_id=doctor.id,
            patient_id=patient.id,
            target_slot=scheduled_utc,
            exclude_appointment_id=appt.id,
        )
        appt.doctor_id = doctor.id
        appt.status = AppointmentStatus.CONFIRMED.value
        if payload.reason:
            appt.status_note = payload.reason
        notif_title = "Appointment confirmed"
        notif_msg = (
            f"Your {friendly_type} on {formatted_slot} has been confirmed with {doctor_display}."
        )
    elif target == AppointmentStatus.CANCELLED.value:
        if current == AppointmentStatus.PENDING.value and not payload.reason:
            raise BadRequestException(
                "Please provide a concise reason when rejecting a pending appointment request.",
                code="rejection_reason_required",
            )
        if appt.doctor_id is None:
            appt.doctor_id = doctor.id
        appt.status = AppointmentStatus.CANCELLED.value
        if payload.reason:
            appt.status_note = payload.reason
        notif_title = (
            "Appointment request declined"
            if current == AppointmentStatus.PENDING.value
            else "Appointment cancelled"
        )
        notif_msg = (
            f"Your {friendly_type} scheduled for {formatted_slot} was updated by {doctor_display}. "
            "Open Appointments for scheduling details."
        )
    else:  # COMPLETED
        appt.doctor_id = appt.doctor_id or doctor.id
        appt.status = AppointmentStatus.COMPLETED.value
        if payload.reason:
            appt.status_note = payload.reason
        notif_title = "Appointment completed"
        notif_msg = (
            f"Your {friendly_type} with {doctor_display} has been marked completed."
        )

    appt.updated_at = now
    create_in_app_notification(
        db,
        user_id=patient.id,
        title=notif_title,
        message=notif_msg,
        notification_type=NotificationType.APPOINTMENT,
    )

    db.commit()
    db.refresh(appt)
    logger.info(
        "Doctor id=%s updated appointment_id=%s status %s -> %s",
        doctor.id,
        appt.id,
        current,
        target,
    )
    return _to_doctor_appointment_item(
        appt, patient_name=patient.full_name, now=now
    )


def reschedule_doctor_appointment(
    db: Session,
    *,
    doctor: User,
    appointment_id: str,
    payload: DoctorAppointmentRescheduleRequest,
) -> DoctorAppointmentItem:
    """Reschedule an eligible PENDING or CONFIRMED appointment safely.

    Never auto-confirms a PENDING appointment request; confirmation remains an
    explicit action via ``update_doctor_appointment_status``.
    """
    appt, patient = _get_authorized_appointment_or_404(
        db, doctor=doctor, appointment_id=appointment_id
    )
    if appt.status not in {
        AppointmentStatus.PENDING.value,
        AppointmentStatus.CONFIRMED.value,
    }:
        raise BadRequestException(
            f"Cannot reschedule an appointment that is {appt.status.lower()}.",
            code="invalid_status_transition",
        )

    _ensure_no_scheduling_conflict(
        db,
        doctor_id=doctor.id,
        patient_id=patient.id,
        target_slot=payload.scheduled_at,
        exclude_appointment_id=appt.id,
    )

    now = datetime.now(timezone.utc)
    appt.scheduled_at = payload.scheduled_at
    if payload.location_or_mode is not None:
        appt.location_or_mode = payload.location_or_mode
    if payload.reason is not None:
        appt.status_note = payload.reason
    appt.updated_at = now

    friendly_type = _humanize_appointment_type(appt.appointment_type)
    new_slot = payload.scheduled_at.strftime("%b %d, %Y at %H:%M UTC")
    create_in_app_notification(
        db,
        user_id=patient.id,
        title="Appointment rescheduled",
        message=(
            f"Your {friendly_type} was rescheduled to {new_slot} "
            f"(status: {appt.status.title()}). Open Appointments to view details."
        ),
        notification_type=NotificationType.APPOINTMENT,
    )

    db.commit()
    db.refresh(appt)
    logger.info(
        "Doctor id=%s rescheduled appointment_id=%s (status=%s)",
        doctor.id,
        appt.id,
        appt.status,
    )
    return _to_doctor_appointment_item(
        appt, patient_name=patient.full_name, now=now
    )


# ---------------------------------------------------------------------------
# Referral Management (with auditable status history)
# ---------------------------------------------------------------------------


def list_doctor_referrals(
    db: Session,
    *,
    doctor: User,
    status_filter: ReferralStatus | None = None,
    department: str | None = None,
    patient_id: str | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 10,
) -> DoctorReferralListResponse:
    """List referrals for assigned patients with counts and audit history."""
    authorized_map = _get_authorized_patient_map(db, doctor=doctor)
    if patient_id is not None and patient_id not in authorized_map:
        raise NotFoundException(
            "Authorized patient record not found.",
            code="patient_not_found",
        )

    if not authorized_map:
        return DoctorReferralListResponse(
            items=[],
            total=0,
            pending_count=0,
            active_count=0,
            completed_count=0,
            cancelled_count=0,
            allowed_departments=list(ALLOWED_REFERRAL_DEPARTMENTS),
            coordination_notice=IN_PLATFORM_REFERRAL_NOTICE,
            page=page,
            page_size=page_size,
            total_pages=1,
        )

    scoped_pids = [patient_id] if patient_id else list(authorized_map.keys())
    records = list(
        db.scalars(
            select(Referral)
            .where(Referral.patient_id.in_(scoped_pids))
            .order_by(Referral.created_at.desc(), Referral.id.desc())
        ).all()
    )

    pending_count = sum(
        1 for r in records if r.status == ReferralStatus.PENDING.value
    )
    active_count = sum(
        1 for r in records if r.status in _ACTIVE_REFERRAL_STATUSES
    )
    completed_count = sum(
        1 for r in records if r.status == ReferralStatus.COMPLETED.value
    )
    cancelled_count = sum(
        1 for r in records if r.status == ReferralStatus.CANCELLED.value
    )

    filtered = records
    if status_filter is not None:
        filtered = [r for r in filtered if r.status == status_filter.value]
    if department and department.strip():
        dept = department.strip()
        filtered = [r for r in filtered if r.referred_department == dept]
    if search and search.strip():
        needle = search.strip().lower()
        filtered = [
            r
            for r in filtered
            if needle in r.referred_department.lower()
            or needle in authorized_map[r.patient_id][0].full_name.lower()
            or (r.reason and needle in r.reason.lower())
        ]

    page_records, total, total_pages = _paginate_slice(
        filtered, page=page, page_size=page_size
    )

    history_by_ref: dict[str, list[ReferralHistory]] = defaultdict(list)
    if page_records:
        for entry in db.scalars(
            select(ReferralHistory)
            .where(
                ReferralHistory.referral_id.in_([r.id for r in page_records])
            )
            .order_by(ReferralHistory.created_at.desc(), ReferralHistory.id.desc())
        ).all():
            history_by_ref[entry.referral_id].append(entry)

    return DoctorReferralListResponse(
        items=[
            _to_doctor_referral_item(
                r,
                patient_name=authorized_map[r.patient_id][0].full_name,
                history=history_by_ref.get(r.id, []),
            )
            for r in page_records
        ],
        total=total,
        pending_count=pending_count,
        active_count=active_count,
        completed_count=completed_count,
        cancelled_count=cancelled_count,
        allowed_departments=list(ALLOWED_REFERRAL_DEPARTMENTS),
        coordination_notice=IN_PLATFORM_REFERRAL_NOTICE,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


def create_doctor_referral(
    db: Session,
    *,
    doctor: User,
    payload: DoctorReferralCreateRequest,
) -> DoctorReferralItem:
    """Create a PENDING referral for an assigned patient with audit history."""
    patient, _ = require_authorized_patient(
        db, doctor=doctor, patient_id=payload.patient_id
    )

    referral = Referral(
        patient_id=patient.id,
        referring_doctor_id=doctor.id,
        referred_department=payload.referred_department,
        reason=payload.reason,
        next_action=payload.next_action,
        status=ReferralStatus.PENDING.value,
    )
    db.add(referral)
    db.flush()

    history_entry = ReferralHistory(
        referral_id=referral.id,
        changed_by_doctor_id=doctor.id,
        previous_status=None,
        new_status=ReferralStatus.PENDING.value,
        note="Referral created in CareBridge AI.",
    )
    db.add(history_entry)

    doctor_display = format_doctor_display_name(doctor.full_name)
    create_in_app_notification(
        db,
        user_id=patient.id,
        title="New care referral recorded",
        message=(
            f"{doctor_display} created a referral to {referral.referred_department}. "
            "Open Referrals to track coordination steps."
        ),
        notification_type=NotificationType.REFERRAL,
    )

    db.commit()
    db.refresh(referral)
    db.refresh(history_entry)
    logger.info(
        "Doctor id=%s created referral_id=%s department=%s",
        doctor.id,
        referral.id,
        referral.referred_department,
    )
    return _to_doctor_referral_item(
        referral,
        patient_name=patient.full_name,
        history=[history_entry],
    )


def update_doctor_referral_status(
    db: Session,
    *,
    doctor: User,
    referral_id: str,
    payload: DoctorReferralStatusUpdateRequest,
) -> DoctorReferralItem:
    """Update a referral's status with strict transition validation & audit log."""
    referral = db.get(Referral, referral_id)
    if referral is None:
        raise NotFoundException(
            "Referral record not found.",
            code="referral_not_found",
        )
    try:
        patient, _ = require_authorized_patient(
            db, doctor=doctor, patient_id=referral.patient_id
        )
    except NotFoundException as exc:
        raise NotFoundException(
            "Referral record not found.",
            code="referral_not_found",
        ) from exc

    previous = referral.status
    target = payload.status.value
    allowed = _ALLOWED_REFERRAL_TRANSITIONS.get(previous, frozenset())
    if target not in allowed:
        raise BadRequestException(
            f"Cannot transition referral status from {previous.lower()} to {target.lower()}.",
            code="invalid_status_transition",
        )

    now = datetime.now(timezone.utc)
    referral.status = target
    if payload.next_action is not None:
        referral.next_action = payload.next_action
    referral.updated_at = now

    db.add(
        ReferralHistory(
            referral_id=referral.id,
            changed_by_doctor_id=doctor.id,
            previous_status=previous,
            new_status=target,
            note=payload.note,
        )
    )

    create_in_app_notification(
        db,
        user_id=patient.id,
        title="Referral status updated",
        message=(
            f"Your referral to {referral.referred_department} is now marked "
            f"{target.title()}. Open Referrals for details."
        ),
        notification_type=NotificationType.REFERRAL,
    )

    db.commit()
    db.refresh(referral)
    history = list(
        db.scalars(
            select(ReferralHistory)
            .where(ReferralHistory.referral_id == referral.id)
            .order_by(ReferralHistory.created_at.desc(), ReferralHistory.id.desc())
        ).all()
    )
    logger.info(
        "Doctor id=%s updated referral_id=%s status %s -> %s",
        doctor.id,
        referral.id,
        previous,
        target,
    )
    return _to_doctor_referral_item(
        referral, patient_name=patient.full_name, history=history
    )


# ---------------------------------------------------------------------------
# Follow-up Management (in-app only; no external SMS/email in Phase 6)
# ---------------------------------------------------------------------------


def _validate_follow_up_links(
    db: Session,
    *,
    patient_id: str,
    related_appointment_id: str | None,
    related_referral_id: str | None,
) -> None:
    if related_appointment_id is not None:
        appt = db.scalar(
            select(Appointment).where(
                Appointment.id == related_appointment_id,
                Appointment.patient_id == patient_id,
            )
        )
        if appt is None:
            raise BadRequestException(
                "Linked appointment was not found for this patient.",
                code="invalid_related_appointment",
            )
    if related_referral_id is not None:
        ref = db.scalar(
            select(Referral).where(
                Referral.id == related_referral_id,
                Referral.patient_id == patient_id,
            )
        )
        if ref is None:
            raise BadRequestException(
                "Linked referral was not found for this patient.",
                code="invalid_related_referral",
            )


def list_doctor_follow_ups(
    db: Session,
    *,
    doctor: User,
    scope: DoctorFollowUpScope = DoctorFollowUpScope.ALL,
    status_filter: FollowUpStatus | None = None,
    patient_id: str | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 10,
) -> DoctorFollowUpListResponse:
    """List follow-up tasks for assigned patients with overdue detection."""
    now = datetime.now(timezone.utc)
    authorized_map = _get_authorized_patient_map(db, doctor=doctor)
    if patient_id is not None and patient_id not in authorized_map:
        raise NotFoundException(
            "Authorized patient record not found.",
            code="patient_not_found",
        )

    if not authorized_map:
        return DoctorFollowUpListResponse(
            items=[],
            total=0,
            pending_count=0,
            overdue_count=0,
            completed_count=0,
            cancelled_count=0,
            page=page,
            page_size=page_size,
            total_pages=1,
        )

    scoped_pids = [patient_id] if patient_id else list(authorized_map.keys())
    records = list(
        db.scalars(
            select(FollowUp)
            .where(FollowUp.patient_id.in_(scoped_pids))
            .order_by(FollowUp.scheduled_at.asc(), FollowUp.id.desc())
        ).all()
    )

    all_items = [
        _to_doctor_follow_up_item(
            item,
            patient_name=authorized_map[item.patient_id][0].full_name,
            now=now,
        )
        for item in records
    ]

    overdue_count = sum(1 for i in all_items if i.is_overdue)
    pending_count = sum(
        1
        for i in all_items
        if i.status == FollowUpStatus.PENDING and not i.is_overdue
    )
    completed_count = sum(
        1 for i in all_items if i.status == FollowUpStatus.COMPLETED
    )
    cancelled_count = sum(
        1 for i in all_items if i.status == FollowUpStatus.CANCELLED
    )

    filtered = all_items
    if scope == DoctorFollowUpScope.PENDING:
        filtered = [
            i
            for i in filtered
            if i.status == FollowUpStatus.PENDING and not i.is_overdue
        ]
    elif scope == DoctorFollowUpScope.OVERDUE:
        filtered = [i for i in filtered if i.is_overdue]
    elif scope == DoctorFollowUpScope.COMPLETED:
        filtered = [i for i in filtered if i.status == FollowUpStatus.COMPLETED]
        filtered.sort(key=lambda item: item.scheduled_at, reverse=True)
    elif scope == DoctorFollowUpScope.CANCELLED:
        filtered = [i for i in filtered if i.status == FollowUpStatus.CANCELLED]
        filtered.sort(key=lambda item: item.scheduled_at, reverse=True)

    if status_filter is not None:
        filtered = [i for i in filtered if i.status == status_filter]
    if search and search.strip():
        needle = search.strip().lower()
        filtered = [
            i
            for i in filtered
            if needle in i.patient_name.lower()
            or needle in i.follow_up_type.lower()
            or (i.notes and needle in i.notes.lower())
        ]

    page_items, total, total_pages = _paginate_slice(
        filtered, page=page, page_size=page_size
    )
    return DoctorFollowUpListResponse(
        items=page_items,
        total=total,
        pending_count=pending_count,
        overdue_count=overdue_count,
        completed_count=completed_count,
        cancelled_count=cancelled_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


def create_doctor_follow_up(
    db: Session,
    *,
    doctor: User,
    payload: DoctorFollowUpCreateRequest,
) -> DoctorFollowUpItem:
    """Create a validated PENDING follow-up milestone for an assigned patient."""
    patient, _ = require_authorized_patient(
        db, doctor=doctor, patient_id=payload.patient_id
    )
    _validate_follow_up_links(
        db,
        patient_id=patient.id,
        related_appointment_id=payload.related_appointment_id,
        related_referral_id=payload.related_referral_id,
    )

    follow_up = FollowUp(
        patient_id=patient.id,
        created_by_doctor_id=doctor.id,
        related_appointment_id=payload.related_appointment_id,
        related_referral_id=payload.related_referral_id,
        scheduled_at=payload.scheduled_at,
        follow_up_type=payload.follow_up_type,
        status=FollowUpStatus.PENDING.value,
        notes=payload.notes,
    )
    db.add(follow_up)

    due_date = payload.scheduled_at.strftime("%b %d, %Y")
    doctor_display = format_doctor_display_name(doctor.full_name)
    create_in_app_notification(
        db,
        user_id=patient.id,
        title="New follow-up scheduled",
        message=(
            f"{doctor_display} scheduled a care follow-up for {due_date}. "
            "Open Follow-ups to view details."
        ),
        notification_type=NotificationType.FOLLOW_UP,
    )

    db.commit()
    db.refresh(follow_up)
    logger.info(
        "Doctor id=%s created follow_up_id=%s patient_id=%s",
        doctor.id,
        follow_up.id,
        patient.id,
    )
    return _to_doctor_follow_up_item(
        follow_up,
        patient_name=patient.full_name,
        now=datetime.now(timezone.utc),
    )


def update_doctor_follow_up(
    db: Session,
    *,
    doctor: User,
    follow_up_id: str,
    payload: DoctorFollowUpUpdateRequest,
) -> DoctorFollowUpItem:
    """Update status, due date, or notes for an authorized patient follow-up."""
    record = db.get(FollowUp, follow_up_id)
    if record is None:
        raise NotFoundException(
            "Follow-up record not found.",
            code="follow_up_not_found",
        )
    try:
        patient, _ = require_authorized_patient(
            db, doctor=doctor, patient_id=record.patient_id
        )
    except NotFoundException as exc:
        raise NotFoundException(
            "Follow-up record not found.",
            code="follow_up_not_found",
        ) from exc

    current = record.status
    if current in {
        FollowUpStatus.COMPLETED.value,
        FollowUpStatus.CANCELLED.value,
    }:
        raise BadRequestException(
            f"Cannot modify a follow-up that is already {current.lower()}.",
            code="invalid_status_transition",
        )

    if payload.status is not None:
        target = payload.status.value
        if (
            current == FollowUpStatus.MISSED.value
            and target == FollowUpStatus.PENDING.value
            and payload.scheduled_at is None
        ):
            raise BadRequestException(
                "Provide a new future scheduled date when reopening a missed follow-up.",
                code="reschedule_required",
            )
        record.status = target

    if payload.scheduled_at is not None:
        record.scheduled_at = payload.scheduled_at
    if "notes" in payload.model_fields_set:
        record.notes = payload.notes

    now = datetime.now(timezone.utc)
    record.updated_at = now

    if record.status == FollowUpStatus.MISSED.value:
        create_in_app_notification(
            db,
            user_id=patient.id,
            title="Follow-up requires attention",
            message=(
                "A scheduled follow-up was marked missed and requires care coordination. "
                "Open Follow-ups to check your next steps."
            ),
            notification_type=NotificationType.FOLLOW_UP,
        )
    else:
        due_text = _as_utc(record.scheduled_at).strftime("%b %d, %Y")
        create_in_app_notification(
            db,
            user_id=patient.id,
            title="Follow-up updated",
            message=(
                f"A care follow-up (target {due_text}) is now marked "
                f"{record.status.title()}. Open Follow-ups to review."
            ),
            notification_type=NotificationType.FOLLOW_UP,
        )

    db.commit()
    db.refresh(record)
    logger.info(
        "Doctor id=%s updated follow_up_id=%s status %s -> %s",
        doctor.id,
        record.id,
        current,
        record.status,
    )
    return _to_doctor_follow_up_item(
        record, patient_name=patient.full_name, now=now
    )


# ---------------------------------------------------------------------------
# Doctor In-App Notifications
# ---------------------------------------------------------------------------


def list_doctor_notifications(
    db: Session,
    *,
    doctor: User,
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> NotificationListResponse:
    return list_user_notifications(
        db,
        user_id=doctor.id,
        unread_only=unread_only,
        limit=limit,
        offset=offset,
    )


def mark_doctor_notification_read(
    db: Session,
    *,
    doctor: User,
    notification_id: str,
) -> NotificationMarkReadResponse:
    return mark_user_notification_read(
        db, user_id=doctor.id, notification_id=notification_id
    )


def mark_all_doctor_notifications_read(
    db: Session,
    *,
    doctor: User,
) -> NotificationMarkAllReadResponse:
    return mark_all_user_notifications_read(db, user_id=doctor.id)


# ---------------------------------------------------------------------------
# Doctor Dashboard Overview (100% live DB calculations, zero hardcoded stats)
# ---------------------------------------------------------------------------


def get_doctor_overview(db: Session, *, doctor: User) -> DoctorOverviewResponse:
    """Assemble live statistics, worklists, and activity for ``/doctor``."""
    now = datetime.now(timezone.utc)
    profile = get_or_create_doctor_profile(db, doctor=doctor)
    assignments = _get_active_assignments_for_doctor(db, doctor=doctor)

    if not assignments:
        unread = count_unread_notifications(db, user_id=doctor.id)
        return DoctorOverviewResponse(
            doctor_name=doctor.full_name,
            display_name=format_doctor_display_name(doctor.full_name),
            specialization=profile.specialization,
            department=profile.department,
            verification_status=DoctorVerificationStatus(
                profile.verification_status
            ),
            statistics=DoctorOverviewStatistics(
                total_assigned_patients=0,
                pending_report_reviews=0,
                upcoming_appointments=0,
                patients_requiring_attention=0,
                pending_referrals=0,
                pending_follow_ups=0,
                overdue_follow_ups=0,
                unread_notifications=unread,
            ),
            todays_appointments=[],
            recently_assigned_patients=[],
            reports_awaiting_review=[],
            follow_ups_requiring_attention=[],
            recent_activity=[],
        )

    patient_names = {a.patient_id: a.patient.full_name for a in assignments}
    patient_ids = list(patient_names.keys())
    patient_summaries = _build_patient_summaries(
        db, assignments=assignments, now=now
    )

    reports = list(
        db.scalars(
            select(MedicalReport)
            .where(MedicalReport.patient_id.in_(patient_ids))
            .order_by(MedicalReport.uploaded_at.desc(), MedicalReport.id.desc())
        ).all()
    )
    report_ids = [r.id for r in reports]
    report_reviews: list[ReportReview] = []
    reviews_by_rid: dict[str, list[ReportReview]] = defaultdict(list)
    if report_ids:
        report_reviews = list(
            db.scalars(
                select(ReportReview)
                .where(ReportReview.report_id.in_(report_ids))
                .order_by(ReportReview.reviewed_at.desc(), ReportReview.id.desc())
            ).all()
        )
        for rev in report_reviews:
            reviews_by_rid[rev.report_id].append(rev)

    appointments = list(
        db.scalars(
            select(Appointment)
            .where(
                Appointment.patient_id.in_(patient_ids),
                or_(
                    Appointment.doctor_id.is_(None),
                    Appointment.doctor_id == doctor.id,
                ),
            )
            .order_by(Appointment.scheduled_at.asc(), Appointment.id.desc())
        ).all()
    )

    referrals = list(
        db.scalars(
            select(Referral)
            .where(Referral.patient_id.in_(patient_ids))
            .order_by(Referral.updated_at.desc(), Referral.id.desc())
        ).all()
    )

    follow_ups = list(
        db.scalars(
            select(FollowUp)
            .where(FollowUp.patient_id.in_(patient_ids))
            .order_by(FollowUp.scheduled_at.asc(), FollowUp.id.desc())
        ).all()
    )

    pending_reports = [
        r for r in reports if r.review_status in _PENDING_REPORT_STATUSES
    ]
    upcoming_appts = [
        a for a in appointments if _is_upcoming_appointment(a, now)
    ]
    todays_appts = [
        _to_doctor_appointment_item(
            a, patient_name=patient_names[a.patient_id], now=now
        )
        for a in appointments
        if _is_today_utc(a.scheduled_at, now)
        and a.status != AppointmentStatus.CANCELLED.value
    ]
    pending_referrals_count = sum(
        1 for ref in referrals if ref.status in _ACTIVE_REFERRAL_STATUSES
    )

    follow_up_items = [
        _to_doctor_follow_up_item(
            fu, patient_name=patient_names[fu.patient_id], now=now
        )
        for fu in follow_ups
    ]
    pending_follow_up_items = [
        fu
        for fu in follow_up_items
        if fu.status in {FollowUpStatus.PENDING, FollowUpStatus.MISSED}
    ]
    overdue_follow_up_items = [fu for fu in follow_up_items if fu.is_overdue]
    # Surface overdue items first, then soonest upcoming follow-ups needing attention.
    attention_follow_ups = sorted(
        pending_follow_up_items,
        key=lambda item: (0 if item.is_overdue else 1, item.scheduled_at),
    )[:6]

    unread = count_unread_notifications(db, user_id=doctor.id)

    recent_activity = _build_activity_items(
        patient_names=patient_names,
        assignments=assignments,
        reports=reports,
        report_reviews=report_reviews,
        report_patient_ids={r.id: r.patient_id for r in reports},
        appointments=sorted(
            appointments, key=lambda a: _as_utc(a.updated_at), reverse=True
        ),
        referrals=referrals,
        follow_ups=sorted(
            follow_ups, key=lambda f: _as_utc(f.updated_at), reverse=True
        ),
        limit=8,
    )

    return DoctorOverviewResponse(
        doctor_name=doctor.full_name,
        display_name=format_doctor_display_name(doctor.full_name),
        specialization=profile.specialization,
        department=profile.department,
        verification_status=DoctorVerificationStatus(profile.verification_status),
        statistics=DoctorOverviewStatistics(
            total_assigned_patients=len(patient_summaries),
            pending_report_reviews=len(pending_reports),
            upcoming_appointments=len(upcoming_appts),
            patients_requiring_attention=sum(
                1 for item in patient_summaries if item.requires_attention
            ),
            pending_referrals=pending_referrals_count,
            pending_follow_ups=len(pending_follow_up_items),
            overdue_follow_ups=len(overdue_follow_up_items),
            unread_notifications=unread,
        ),
        todays_appointments=todays_appts[:6],
        recently_assigned_patients=patient_summaries[:6],
        reports_awaiting_review=[
            _to_report_summary(
                r,
                patient_name=patient_names[r.patient_id],
                reviews=reviews_by_rid.get(r.id, []),
            )
            for r in pending_reports[:6]
        ],
        follow_ups_requiring_attention=attention_follow_ups,
        recent_activity=recent_activity,
    )
