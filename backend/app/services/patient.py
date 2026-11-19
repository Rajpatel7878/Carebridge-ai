"""Patient portal service layer enforcing strict ownership and data integrity.

Every database query filters explicitly on ``patient.id`` obtained from the
authenticated JWT session — client-supplied identifiers are never trusted to
cross patient boundaries. Non-owned record lookups raise ``404 Not Found`` so
other patients' record IDs cannot be enumerated.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.exceptions import BadRequestException, NotFoundException
from app.models.appointment import Appointment, AppointmentStatus, AppointmentType
from app.models.follow_up import FollowUp, FollowUpStatus
from app.models.medical_report import (
    MedicalReport,
    ReportFileType,
    ReportReviewStatus,
    ReportUploadStatus,
)
from app.models.notification import Notification, NotificationType
from app.models.patient_profile import GenderOption, PatientProfile, PreferredLanguage
from app.models.referral import Referral, ReferralStatus
from app.models.risk_assessment import (
    RiskAssessment,
    RiskAssessmentSource,
    RiskAssessmentStatus,
    RiskCategory,
)
from app.models.user import User
from app.schemas.patient import (
    RISK_COORDINATION_DISCLAIMER,
    AppointmentCreateRequest,
    AppointmentListResponse,
    AppointmentResponse,
    FollowUpListResponse,
    FollowUpResponse,
    JourneyStageResponse,
    MedicalReportListResponse,
    MedicalReportResponse,
    NotificationListResponse,
    NotificationMarkAllReadResponse,
    NotificationMarkReadResponse,
    NotificationResponse,
    PatientActivityItem,
    PatientOverviewMetrics,
    PatientOverviewResponse,
    PatientProfileResponse,
    PatientProfileUpdateRequest,
    ReferralListResponse,
    ReferralResponse,
    RiskAssessmentListResponse,
    RiskAssessmentResponse,
)
from app.services.file_storage import (
    delete_stored_report_quietly,
    read_and_store_report_file,
    resolve_existing_report_path,
)
from app.services.notifications import notify_assigned_doctors_for_patient

_APPOINTMENT_TYPE_LABELS: dict[str, str] = {
    AppointmentType.SCREENING_REVIEW.value: "Screening Review",
    AppointmentType.GENERAL_CONSULTATION.value: "General Consultation",
    AppointmentType.FOLLOW_UP_VISIT.value: "Follow-up Visit",
    AppointmentType.REFERRAL_CONSULTATION.value: "Referral Consultation",
    AppointmentType.PREVENTIVE_CHECKUP.value: "Preventive Checkup",
}


def _as_utc(dt: datetime) -> datetime:
    """Normalize a database datetime (including SQLite naive values) to UTC."""
    if dt.tzinfo is None or dt.utcoffset() is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _humanize_appointment_type(value: str) -> str:
    return _APPOINTMENT_TYPE_LABELS.get(
        value, value.replace("_", " ").strip().title()
    )


def create_in_app_notification(
    db: Session,
    *,
    user_id: str,
    title: str,
    message: str,
    notification_type: NotificationType,
) -> Notification:
    """Queue an in-app notification in the caller's transaction."""
    record = Notification(
        user_id=user_id,
        title=title[:160],
        message=message[:500],
        notification_type=notification_type.value,
        is_read=False,
    )
    db.add(record)
    return record


# ---------------------------------------------------------------------------
# Patient Profile (1:1 per patient)
# ---------------------------------------------------------------------------


def _compute_profile_completion(profile: PatientProfile) -> tuple[int, int, int]:
    """Return ``(percentage, completed_fields, total_fields)``.

    Includes account essentials (full_name, email, preferred_language) plus the
    7 optional patient profile fields = 10 fields total. Optional fields are
    never mandatory to use the portal.
    """
    checks = [
        True,  # full_name (present on User)
        True,  # email (present on User)
        bool(profile.preferred_language),
        profile.date_of_birth is not None,
        bool(profile.phone_number),
        bool(profile.gender),
        bool(profile.city),
        bool(profile.state),
        bool(profile.emergency_contact_name),
        bool(profile.emergency_contact_phone),
    ]
    completed = sum(1 for item in checks if item)
    total = len(checks)
    percentage = round((completed / total) * 100)
    return percentage, completed, total


def get_or_create_patient_profile(db: Session, *, patient: User) -> PatientProfile:
    """Return the patient's unique profile, creating a minimal default if absent."""
    profile = db.scalar(
        select(PatientProfile).where(PatientProfile.user_id == patient.id)
    )
    if profile is not None:
        return profile

    profile = PatientProfile(
        user_id=patient.id,
        preferred_language=PreferredLanguage.ENGLISH.value,
    )
    db.add(profile)
    try:
        db.commit()
        db.refresh(profile)
        return profile
    except IntegrityError:
        # Handle concurrent first-read race cleanly while enforcing unique user_id.
        db.rollback()
        existing = db.scalar(
            select(PatientProfile).where(PatientProfile.user_id == patient.id)
        )
        if existing is not None:
            return existing
        raise


def _to_profile_response(profile: PatientProfile, patient: User) -> PatientProfileResponse:
    pct, completed, total = _compute_profile_completion(profile)
    return PatientProfileResponse(
        id=profile.id,
        user_id=patient.id,
        full_name=patient.full_name,
        email=patient.email,
        role=patient.role,
        is_verified=patient.is_verified,
        account_created_at=_as_utc(patient.created_at),
        date_of_birth=profile.date_of_birth,
        phone_number=profile.phone_number,
        gender=GenderOption(profile.gender) if profile.gender else None,
        city=profile.city,
        state=profile.state,
        preferred_language=PreferredLanguage(profile.preferred_language),
        emergency_contact_name=profile.emergency_contact_name,
        emergency_contact_phone=profile.emergency_contact_phone,
        completion_percentage=pct,
        completed_fields=completed,
        total_fields=total,
        created_at=_as_utc(profile.created_at),
        updated_at=_as_utc(profile.updated_at),
    )


def get_patient_profile(db: Session, *, patient: User) -> PatientProfileResponse:
    profile = get_or_create_patient_profile(db, patient=patient)
    return _to_profile_response(profile, patient)


def update_patient_profile(
    db: Session,
    *,
    patient: User,
    payload: PatientProfileUpdateRequest,
) -> PatientProfileResponse:
    profile = get_or_create_patient_profile(db, patient=patient)
    profile.date_of_birth = payload.date_of_birth
    profile.phone_number = payload.phone_number
    profile.gender = payload.gender.value if payload.gender is not None else None
    profile.city = payload.city
    profile.state = payload.state
    profile.preferred_language = payload.preferred_language.value
    profile.emergency_contact_name = payload.emergency_contact_name
    profile.emergency_contact_phone = payload.emergency_contact_phone
    profile.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(profile)
    return _to_profile_response(profile, patient)


# ---------------------------------------------------------------------------
# Medical Reports
# ---------------------------------------------------------------------------


def _to_report_response(report: MedicalReport) -> MedicalReportResponse:
    return MedicalReportResponse(
        id=report.id,
        original_filename=report.original_filename,
        file_type=ReportFileType(report.file_type),
        file_size=report.file_size,
        upload_status=ReportUploadStatus(report.upload_status),
        review_status=ReportReviewStatus(report.review_status),
        uploaded_at=_as_utc(report.uploaded_at),
        updated_at=_as_utc(report.updated_at),
    )


async def upload_patient_report(
    db: Session,
    *,
    patient: User,
    upload: UploadFile,
    settings: Settings,
) -> MedicalReportResponse:
    stored = await read_and_store_report_file(upload, settings=settings)

    report = MedicalReport(
        patient_id=patient.id,
        original_filename=stored.original_filename,
        stored_filename=stored.stored_filename,
        file_type=stored.file_type.value,
        file_size=stored.file_size,
        upload_status=ReportUploadStatus.UPLOADED.value,
        review_status=ReportReviewStatus.PENDING_REVIEW.value,
    )
    db.add(report)
    create_in_app_notification(
        db,
        user_id=patient.id,
        title="Health report uploaded",
        message=(
            f"Your {stored.file_type.value} report ({stored.original_filename}) was "
            "stored securely and marked pending review."
        ),
        notification_type=NotificationType.REPORT,
    )
    notify_assigned_doctors_for_patient(
        db,
        patient_id=patient.id,
        title="New patient report submitted",
        message=(
            f"{patient.full_name} uploaded a new {stored.file_type.value} medical "
            "report awaiting clinical review."
        ),
        notification_type=NotificationType.REPORT,
    )
    try:
        db.commit()
        db.refresh(report)
    except Exception:
        db.rollback()
        delete_stored_report_quietly(stored.stored_filename, settings=settings)
        raise

    return _to_report_response(report)


def list_patient_reports(
    db: Session,
    *,
    patient: User,
    settings: Settings,
    file_type: ReportFileType | None = None,
    review_status: ReportReviewStatus | None = None,
    search: str | None = None,
) -> MedicalReportListResponse:
    stmt = select(MedicalReport).where(MedicalReport.patient_id == patient.id)
    if file_type is not None:
        stmt = stmt.where(MedicalReport.file_type == file_type.value)
    if review_status is not None:
        stmt = stmt.where(MedicalReport.review_status == review_status.value)
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(MedicalReport.original_filename.ilike(pattern))

    stmt = stmt.order_by(MedicalReport.uploaded_at.desc(), MedicalReport.id.desc())
    reports = list(db.scalars(stmt).all())
    return MedicalReportListResponse(
        items=[_to_report_response(item) for item in reports],
        total=len(reports),
        max_upload_mb=settings.MAX_REPORT_UPLOAD_MB,
        allowed_file_types=[
            ReportFileType.PDF,
            ReportFileType.PNG,
            ReportFileType.JPG,
        ],
    )


def _get_owned_report_or_404(
    db: Session, *, patient: User, report_id: str
) -> MedicalReport:
    report = db.scalar(
        select(MedicalReport).where(
            MedicalReport.id == report_id,
            MedicalReport.patient_id == patient.id,
        )
    )
    if report is None:
        raise NotFoundException(
            "Medical report not found.",
            code="report_not_found",
        )
    return report


def get_patient_report(
    db: Session, *, patient: User, report_id: str
) -> MedicalReportResponse:
    report = _get_owned_report_or_404(db, patient=patient, report_id=report_id)
    return _to_report_response(report)


def get_patient_report_for_download(
    db: Session,
    *,
    patient: User,
    report_id: str,
    settings: Settings,
) -> tuple[MedicalReport, Path]:
    report = _get_owned_report_or_404(db, patient=patient, report_id=report_id)
    if report.upload_status != ReportUploadStatus.UPLOADED.value:
        raise NotFoundException(
            "This medical report is not available for download.",
            code="report_file_unavailable",
        )
    path = resolve_existing_report_path(report.stored_filename, settings=settings)
    return report, path


# ---------------------------------------------------------------------------
# Read-only Risk Assessments (no AI/risk generation in Phase 5)
# ---------------------------------------------------------------------------


def list_patient_risk_assessments(
    db: Session,
    *,
    patient: User,
) -> RiskAssessmentListResponse:
    stmt = (
        select(RiskAssessment)
        .where(RiskAssessment.patient_id == patient.id)
        .order_by(RiskAssessment.assessed_at.desc(), RiskAssessment.id.desc())
    )
    records = list(db.scalars(stmt).all())
    items = [
        RiskAssessmentResponse(
            id=item.id,
            related_report_id=item.related_report_id,
            status=RiskAssessmentStatus(item.status),
            risk_category=(
                RiskCategory(item.risk_category) if item.risk_category else None
            ),
            source=(
                RiskAssessmentSource(item.source) if item.source else None
            ),
            explanation=item.explanation,
            reviewing_professional_name=(
                item.reviewing_doctor.full_name
                if item.reviewing_doctor is not None
                else None
            ),
            recommended_action=item.recommended_action,
            assessed_at=_as_utc(item.assessed_at),
            updated_at=_as_utc(item.updated_at),
        )
        for item in records
    ]
    return RiskAssessmentListResponse(
        items=items,
        total=len(items),
        disclaimer=RISK_COORDINATION_DISCLAIMER,
    )


# ---------------------------------------------------------------------------
# Appointments
# ---------------------------------------------------------------------------


def _is_upcoming_appointment(appt: Appointment, now: datetime) -> bool:
    return appt.status in {
        AppointmentStatus.PENDING.value,
        AppointmentStatus.CONFIRMED.value,
    } and _as_utc(appt.scheduled_at) >= now


def _to_appointment_response(
    appt: Appointment, *, now: datetime
) -> AppointmentResponse:
    return AppointmentResponse(
        id=appt.id,
        scheduled_at=_as_utc(appt.scheduled_at),
        appointment_type=appt.appointment_type,
        status=AppointmentStatus(appt.status),
        location_or_mode=appt.location_or_mode,
        notes=appt.notes,
        status_note=appt.status_note,
        assigned_doctor_name=appt.doctor.full_name if appt.doctor is not None else None,
        is_upcoming=_is_upcoming_appointment(appt, now),
        created_at=_as_utc(appt.created_at),
        updated_at=_as_utc(appt.updated_at),
    )


def list_patient_appointments(
    db: Session,
    *,
    patient: User,
    status_filter: AppointmentStatus | None = None,
) -> AppointmentListResponse:
    now = datetime.now(timezone.utc)
    stmt = select(Appointment).where(Appointment.patient_id == patient.id)
    if status_filter is not None:
        stmt = stmt.where(Appointment.status == status_filter.value)
    stmt = stmt.order_by(Appointment.scheduled_at.asc(), Appointment.id.desc())
    records = list(db.scalars(stmt).all())

    responses = [_to_appointment_response(item, now=now) for item in records]
    upcoming = [item for item in responses if item.is_upcoming]
    past = sorted(
        [item for item in responses if not item.is_upcoming],
        key=lambda item: item.scheduled_at,
        reverse=True,
    )
    ordered = [*upcoming, *past]
    return AppointmentListResponse(
        items=ordered,
        total=len(ordered),
        upcoming_count=len(upcoming),
        past_count=len(past),
    )


def _get_owned_appointment_or_404(
    db: Session, *, patient: User, appointment_id: str
) -> Appointment:
    appt = db.scalar(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.patient_id == patient.id,
        )
    )
    if appt is None:
        raise NotFoundException(
            "Appointment not found.",
            code="appointment_not_found",
        )
    return appt


def get_patient_appointment(
    db: Session, *, patient: User, appointment_id: str
) -> AppointmentResponse:
    appt = _get_owned_appointment_or_404(
        db, patient=patient, appointment_id=appointment_id
    )
    return _to_appointment_response(appt, now=datetime.now(timezone.utc))


def request_patient_appointment(
    db: Session,
    *,
    patient: User,
    payload: AppointmentCreateRequest,
) -> AppointmentResponse:
    """Create a patient appointment request with status=PENDING and doctor_id=None."""
    appt = Appointment(
        patient_id=patient.id,
        doctor_id=None,  # Patients cannot self-assign to arbitrary doctors.
        scheduled_at=payload.scheduled_at,
        appointment_type=payload.appointment_type.value,
        status=AppointmentStatus.PENDING.value,
        location_or_mode=payload.location_or_mode,
        notes=payload.notes,
    )
    db.add(appt)
    friendly_type = _humanize_appointment_type(payload.appointment_type.value)
    formatted_slot = payload.scheduled_at.strftime("%b %d, %Y at %H:%M UTC")
    create_in_app_notification(
        db,
        user_id=patient.id,
        title="Appointment request submitted",
        message=(
            f"Your {friendly_type} request for {formatted_slot} has been logged as "
            "pending care-team confirmation."
        ),
        notification_type=NotificationType.APPOINTMENT,
    )
    notify_assigned_doctors_for_patient(
        db,
        patient_id=patient.id,
        title="New appointment request",
        message=(
            f"{patient.full_name} submitted a {friendly_type} request for "
            f"{formatted_slot}."
        ),
        notification_type=NotificationType.APPOINTMENT,
    )
    db.commit()
    db.refresh(appt)
    return _to_appointment_response(appt, now=datetime.now(timezone.utc))


def cancel_patient_appointment(
    db: Session,
    *,
    patient: User,
    appointment_id: str,
) -> AppointmentResponse:
    """Allow a patient to cancel their own PENDING or CONFIRMED appointment only."""
    appt = _get_owned_appointment_or_404(
        db, patient=patient, appointment_id=appointment_id
    )
    if appt.status not in {
        AppointmentStatus.PENDING.value,
        AppointmentStatus.CONFIRMED.value,
    }:
        raise BadRequestException(
            f"Cannot cancel an appointment that is already {appt.status.lower()}.",
            code="invalid_status_transition",
        )
    appt.status = AppointmentStatus.CANCELLED.value
    appt.updated_at = datetime.now(timezone.utc)
    create_in_app_notification(
        db,
        user_id=patient.id,
        title="Appointment cancelled",
        message=(
            f"Your {_humanize_appointment_type(appt.appointment_type)} appointment "
            "request has been cancelled."
        ),
        notification_type=NotificationType.APPOINTMENT,
    )
    notify_assigned_doctors_for_patient(
        db,
        patient_id=patient.id,
        title="Patient cancelled appointment",
        message=(
            f"{patient.full_name} cancelled a "
            f"{_humanize_appointment_type(appt.appointment_type)} scheduled for "
            f"{_as_utc(appt.scheduled_at).strftime('%b %d, %Y at %H:%M UTC')}."
        ),
        notification_type=NotificationType.APPOINTMENT,
        specific_doctor_id=appt.doctor_id,
    )
    db.commit()
    db.refresh(appt)
    return _to_appointment_response(appt, now=datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Referrals (Read-only for patients)
# ---------------------------------------------------------------------------


def _to_referral_response(referral: Referral) -> ReferralResponse:
    return ReferralResponse(
        id=referral.id,
        referred_department=referral.referred_department,
        referring_doctor_name=(
            referral.referring_doctor.full_name
            if referral.referring_doctor is not None
            else None
        ),
        reason=referral.reason,
        next_action=referral.next_action,
        status=ReferralStatus(referral.status),
        created_at=_as_utc(referral.created_at),
        updated_at=_as_utc(referral.updated_at),
    )


def list_patient_referrals(
    db: Session,
    *,
    patient: User,
    status_filter: ReferralStatus | None = None,
) -> ReferralListResponse:
    stmt = select(Referral).where(Referral.patient_id == patient.id)
    if status_filter is not None:
        stmt = stmt.where(Referral.status == status_filter.value)
    stmt = stmt.order_by(Referral.created_at.desc(), Referral.id.desc())
    records = list(db.scalars(stmt).all())
    items = [_to_referral_response(item) for item in records]
    active_statuses = {
        ReferralStatus.PENDING,
        ReferralStatus.ACCEPTED,
        ReferralStatus.SCHEDULED,
    }
    active_count = sum(1 for item in items if item.status in active_statuses)
    return ReferralListResponse(
        items=items,
        total=len(items),
        active_count=active_count,
    )


def get_patient_referral(
    db: Session, *, patient: User, referral_id: str
) -> ReferralResponse:
    referral = db.scalar(
        select(Referral).where(
            Referral.id == referral_id,
            Referral.patient_id == patient.id,
        )
    )
    if referral is None:
        raise NotFoundException(
            "Referral record not found.",
            code="referral_not_found",
        )
    return _to_referral_response(referral)


# ---------------------------------------------------------------------------
# Follow-ups
# ---------------------------------------------------------------------------


def _to_follow_up_response(
    follow_up: FollowUp, *, now: datetime
) -> FollowUpResponse:
    scheduled_utc = _as_utc(follow_up.scheduled_at)
    is_overdue = (
        follow_up.status == FollowUpStatus.PENDING.value and scheduled_utc < now
    ) or follow_up.status == FollowUpStatus.MISSED.value
    return FollowUpResponse(
        id=follow_up.id,
        related_appointment_id=follow_up.related_appointment_id,
        related_referral_id=follow_up.related_referral_id,
        scheduled_at=scheduled_utc,
        follow_up_type=follow_up.follow_up_type,
        status=FollowUpStatus(follow_up.status),
        notes=follow_up.notes,
        is_overdue=is_overdue,
        created_at=_as_utc(follow_up.created_at),
        updated_at=_as_utc(follow_up.updated_at),
    )


def list_patient_follow_ups(
    db: Session,
    *,
    patient: User,
    status_filter: FollowUpStatus | None = None,
) -> FollowUpListResponse:
    now = datetime.now(timezone.utc)
    stmt = select(FollowUp).where(FollowUp.patient_id == patient.id)
    if status_filter is not None:
        stmt = stmt.where(FollowUp.status == status_filter.value)
    stmt = stmt.order_by(FollowUp.scheduled_at.asc(), FollowUp.id.desc())
    records = list(db.scalars(stmt).all())
    items = [_to_follow_up_response(item, now=now) for item in records]

    overdue_count = sum(1 for item in items if item.is_overdue)
    upcoming_count = sum(
        1
        for item in items
        if item.status == FollowUpStatus.PENDING and not item.is_overdue
    )
    completed_count = sum(
        1 for item in items if item.status == FollowUpStatus.COMPLETED
    )

    return FollowUpListResponse(
        items=items,
        total=len(items),
        upcoming_count=upcoming_count,
        overdue_count=overdue_count,
        completed_count=completed_count,
    )


def _get_owned_follow_up_or_404(
    db: Session, *, patient: User, follow_up_id: str
) -> FollowUp:
    record = db.scalar(
        select(FollowUp).where(
            FollowUp.id == follow_up_id,
            FollowUp.patient_id == patient.id,
        )
    )
    if record is None:
        raise NotFoundException(
            "Follow-up record not found.",
            code="follow_up_not_found",
        )
    return record


def get_patient_follow_up(
    db: Session, *, patient: User, follow_up_id: str
) -> FollowUpResponse:
    record = _get_owned_follow_up_or_404(
        db, patient=patient, follow_up_id=follow_up_id
    )
    return _to_follow_up_response(record, now=datetime.now(timezone.utc))


def complete_patient_follow_up(
    db: Session,
    *,
    patient: User,
    follow_up_id: str,
) -> FollowUpResponse:
    """Transition an owned PENDING follow-up to COMPLETED with validation."""
    record = _get_owned_follow_up_or_404(
        db, patient=patient, follow_up_id=follow_up_id
    )
    if record.status != FollowUpStatus.PENDING.value:
        raise BadRequestException(
            f"Only pending follow-ups can be marked completed (current status: {record.status.lower()}).",
            code="invalid_status_transition",
        )
    now = datetime.now(timezone.utc)
    record.status = FollowUpStatus.COMPLETED.value
    record.updated_at = now
    create_in_app_notification(
        db,
        user_id=patient.id,
        title="Follow-up marked completed",
        message=f"You marked '{record.follow_up_type}' as completed.",
        notification_type=NotificationType.FOLLOW_UP,
    )
    notify_assigned_doctors_for_patient(
        db,
        patient_id=patient.id,
        title="Patient follow-up completed",
        message=f"{patient.full_name} marked a scheduled follow-up task as completed.",
        notification_type=NotificationType.FOLLOW_UP,
        specific_doctor_id=record.created_by_doctor_id,
    )
    db.commit()
    db.refresh(record)
    return _to_follow_up_response(record, now=now)


# ---------------------------------------------------------------------------
# In-App Notifications
# ---------------------------------------------------------------------------


def _count_unread_notifications(db: Session, *, user_id: str) -> int:
    count = db.scalar(
        select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
    )
    return int(count or 0)


def _to_notification_response(record: Notification) -> NotificationResponse:
    return NotificationResponse(
        id=record.id,
        title=record.title,
        message=record.message,
        notification_type=NotificationType(record.notification_type),
        is_read=record.is_read,
        created_at=_as_utc(record.created_at),
    )


def list_patient_notifications(
    db: Session,
    *,
    patient: User,
    unread_only: bool = False,
) -> NotificationListResponse:
    stmt = select(Notification).where(Notification.user_id == patient.id)
    if unread_only:
        stmt = stmt.where(Notification.is_read.is_(False))
    stmt = stmt.order_by(Notification.created_at.desc(), Notification.id.desc())
    records = list(db.scalars(stmt).all())
    unread_count = _count_unread_notifications(db, user_id=patient.id)
    return NotificationListResponse(
        items=[_to_notification_response(item) for item in records],
        total=len(records),
        unread_count=unread_count,
    )


def mark_patient_notification_read(
    db: Session,
    *,
    patient: User,
    notification_id: str,
) -> NotificationMarkReadResponse:
    record = db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == patient.id,
        )
    )
    if record is None:
        raise NotFoundException(
            "Notification not found.",
            code="notification_not_found",
        )
    if not record.is_read:
        record.is_read = True
        db.commit()
        db.refresh(record)
    unread_count = _count_unread_notifications(db, user_id=patient.id)
    return NotificationMarkReadResponse(
        notification=_to_notification_response(record),
        unread_count=unread_count,
    )


def mark_all_patient_notifications_read(
    db: Session,
    *,
    patient: User,
) -> NotificationMarkAllReadResponse:
    result = db.execute(
        update(Notification)
        .where(
            Notification.user_id == patient.id,
            Notification.is_read.is_(False),
        )
        .values(is_read=True)
    )
    db.commit()
    marked_count = int(result.rowcount or 0)
    return NotificationMarkAllReadResponse(
        marked_count=marked_count,
        unread_count=0,
    )


# ---------------------------------------------------------------------------
# Patient Dashboard Overview (100% database-driven, zero fabricated outcomes)
# ---------------------------------------------------------------------------


def _build_health_journey(
    *,
    reports: list[MedicalReport],
    referrals: list[Referral],
    appointments: list[Appointment],
    follow_ups: list[FollowUp],
) -> list[JourneyStageResponse]:
    """Compute the 6-stage Health Journey strictly from real database records."""
    total_reports = len(reports)
    reviewed_reports = sum(
        1 for item in reports if item.review_status == ReportReviewStatus.REVIEWED.value
    )
    in_review_reports = sum(
        1
        for item in reports
        if item.review_status == ReportReviewStatus.IN_REVIEW.value
    )
    non_cancelled_referrals = [
        item for item in referrals if item.status != ReferralStatus.CANCELLED.value
    ]
    completed_referrals = [
        item for item in referrals if item.status == ReferralStatus.COMPLETED.value
    ]
    non_cancelled_appts = [
        item
        for item in appointments
        if item.status != AppointmentStatus.CANCELLED.value
    ]
    completed_appts = [
        item
        for item in appointments
        if item.status == AppointmentStatus.COMPLETED.value
    ]
    non_cancelled_follow_ups = [
        item for item in follow_ups if item.status != FollowUpStatus.CANCELLED.value
    ]
    completed_follow_ups = [
        item for item in follow_ups if item.status == FollowUpStatus.COMPLETED.value
    ]

    stages: list[JourneyStageResponse] = [
        JourneyStageResponse(
            key="screening",
            label="Screening",
            status="completed",
            detail="Patient portal active and ready for screening coordination.",
        ),
        JourneyStageResponse(
            key="report_submitted",
            label="Report Submitted",
            status="completed" if total_reports > 0 else "current",
            detail=(
                f"{total_reports} health {'report' if total_reports == 1 else 'reports'} uploaded."
                if total_reports > 0
                else "Upload a PDF, PNG, or JPG report to begin review."
            ),
        ),
        JourneyStageResponse(
            key="review",
            label="Review",
            status=(
                "completed"
                if reviewed_reports > 0
                else "current"
                if total_reports > 0 or in_review_reports > 0
                else "upcoming"
            ),
            detail=(
                f"{reviewed_reports} {'report' if reviewed_reports == 1 else 'reports'} reviewed."
                if reviewed_reports > 0
                else f"{total_reports} {'report' if total_reports == 1 else 'reports'} awaiting clinical review."
                if total_reports > 0
                else "Begins once a health report is submitted."
            ),
        ),
        JourneyStageResponse(
            key="referral",
            label="Referral",
            status=(
                "completed"
                if len(completed_referrals) > 0
                else "current"
                if len(non_cancelled_referrals) > 0
                else "upcoming"
            ),
            detail=(
                f"{len(completed_referrals)} referral completed."
                if len(completed_referrals) > 0
                else f"{len(non_cancelled_referrals)} active {'referral' if len(non_cancelled_referrals) == 1 else 'referrals'} in progress."
                if len(non_cancelled_referrals) > 0
                else "No specialist referral recorded yet."
            ),
        ),
        JourneyStageResponse(
            key="appointment",
            label="Appointment",
            status=(
                "completed"
                if len(completed_appts) > 0
                else "current"
                if len(non_cancelled_appts) > 0
                else "upcoming"
            ),
            detail=(
                f"{len(completed_appts)} {'visit' if len(completed_appts) == 1 else 'visits'} completed."
                if len(completed_appts) > 0
                else f"{len(non_cancelled_appts)} scheduled or requested {'visit' if len(non_cancelled_appts) == 1 else 'visits'}."
                if len(non_cancelled_appts) > 0
                else "No appointment scheduled yet."
            ),
        ),
        JourneyStageResponse(
            key="follow_up",
            label="Follow-up",
            status=(
                "completed"
                if len(non_cancelled_follow_ups) > 0
                and len(completed_follow_ups) == len(non_cancelled_follow_ups)
                else "current"
                if len(non_cancelled_follow_ups) > 0
                else "upcoming"
            ),
            detail=(
                f"All {len(completed_follow_ups)} follow-up tasks completed."
                if len(non_cancelled_follow_ups) > 0
                and len(completed_follow_ups) == len(non_cancelled_follow_ups)
                else f"{len(non_cancelled_follow_ups) - len(completed_follow_ups)} follow-up {'task' if (len(non_cancelled_follow_ups) - len(completed_follow_ups)) == 1 else 'tasks'} active."
                if len(non_cancelled_follow_ups) > 0
                else "No follow-up tasks assigned yet."
            ),
        ),
    ]
    return stages


def get_patient_overview(db: Session, *, patient: User) -> PatientOverviewResponse:
    """Assemble live overview counts, recent activity, and health journey."""
    now = datetime.now(timezone.utc)
    profile = get_or_create_patient_profile(db, patient=patient)
    pct, completed_fields, total_fields = _compute_profile_completion(profile)

    reports = list(
        db.scalars(
            select(MedicalReport)
            .where(MedicalReport.patient_id == patient.id)
            .order_by(MedicalReport.uploaded_at.desc())
        ).all()
    )
    appointments = list(
        db.scalars(
            select(Appointment)
            .where(Appointment.patient_id == patient.id)
            .order_by(Appointment.updated_at.desc())
        ).all()
    )
    referrals = list(
        db.scalars(
            select(Referral)
            .where(Referral.patient_id == patient.id)
            .order_by(Referral.updated_at.desc())
        ).all()
    )
    follow_ups = list(
        db.scalars(
            select(FollowUp)
            .where(FollowUp.patient_id == patient.id)
            .order_by(FollowUp.updated_at.desc())
        ).all()
    )
    unread_notifications = _count_unread_notifications(db, user_id=patient.id)

    pending_review_reports = sum(
        1
        for item in reports
        if item.review_status
        in {
            ReportReviewStatus.PENDING_REVIEW.value,
            ReportReviewStatus.IN_REVIEW.value,
            ReportReviewStatus.NEEDS_FOLLOW_UP.value,
        }
    )
    upcoming_appointments = sum(
        1 for item in appointments if _is_upcoming_appointment(item, now)
    )
    pending_referrals = sum(
        1
        for item in referrals
        if item.status
        in {
            ReferralStatus.PENDING.value,
            ReferralStatus.ACCEPTED.value,
            ReferralStatus.SCHEDULED.value,
        }
    )
    overdue_follow_ups = sum(
        1
        for item in follow_ups
        if (
            item.status == FollowUpStatus.PENDING.value
            and _as_utc(item.scheduled_at) < now
        )
        or item.status == FollowUpStatus.MISSED.value
    )
    attention_follow_ups = sum(
        1
        for item in follow_ups
        if item.status in {FollowUpStatus.PENDING.value, FollowUpStatus.MISSED.value}
    )

    activity: list[PatientActivityItem] = []
    for report in reports[:6]:
        activity.append(
            PatientActivityItem(
                id=f"report-{report.id}",
                category="report",
                title=f"Uploaded report: {report.original_filename}",
                description=f"{report.file_type} document · Review status: {report.review_status.replace('_', ' ').title()}",
                status=report.review_status,
                occurred_at=_as_utc(report.uploaded_at),
                link_path="/patient/reports",
            )
        )
    for appt in appointments[:6]:
        slot = _as_utc(appt.scheduled_at).strftime("%b %d, %Y · %H:%M UTC")
        activity.append(
            PatientActivityItem(
                id=f"appointment-{appt.id}",
                category="appointment",
                title=f"Appointment: {_humanize_appointment_type(appt.appointment_type)}",
                description=f"Scheduled for {slot}"
                + (f" · {appt.location_or_mode}" if appt.location_or_mode else ""),
                status=appt.status,
                occurred_at=_as_utc(appt.updated_at),
                link_path="/patient/appointments",
            )
        )
    for referral in referrals[:6]:
        activity.append(
            PatientActivityItem(
                id=f"referral-{referral.id}",
                category="referral",
                title=f"Referral to {referral.referred_department}",
                description=referral.reason
                or f"Current referral status: {referral.status.title()}",
                status=referral.status,
                occurred_at=_as_utc(referral.updated_at),
                link_path="/patient/referrals",
            )
        )
    for follow_up in follow_ups[:6]:
        due = _as_utc(follow_up.scheduled_at).strftime("%b %d, %Y")
        activity.append(
            PatientActivityItem(
                id=f"followup-{follow_up.id}",
                category="follow_up",
                title=f"Follow-up: {follow_up.follow_up_type}",
                description=f"Target date {due} · Status: {follow_up.status.title()}",
                status=follow_up.status,
                occurred_at=_as_utc(follow_up.updated_at),
                link_path="/patient/follow-ups",
            )
        )

    activity.sort(key=lambda item: item.occurred_at, reverse=True)
    recent_activity = activity[:8]

    journey = _build_health_journey(
        reports=reports,
        referrals=referrals,
        appointments=appointments,
        follow_ups=follow_ups,
    )

    return PatientOverviewResponse(
        patient_name=patient.full_name,
        preferred_language=PreferredLanguage(profile.preferred_language),
        metrics=PatientOverviewMetrics(
            profile_completion_percentage=pct,
            profile_completed_fields=completed_fields,
            profile_total_fields=total_fields,
            total_reports=len(reports),
            pending_review_reports=pending_review_reports,
            upcoming_appointments=upcoming_appointments,
            pending_referrals=pending_referrals,
            attention_follow_ups=attention_follow_ups,
            overdue_follow_ups=overdue_follow_ups,
            unread_notifications=unread_notifications,
        ),
        journey=journey,
        recent_activity=recent_activity,
    )
