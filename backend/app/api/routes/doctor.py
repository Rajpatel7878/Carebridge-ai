"""Authorized Doctor Portal API routes (``/api/doctor/*``).

Security invariants:
- Every handler enforces active ``DOCTOR`` authentication via ``DoctorUser``
  (including automatic CSRF protection on cookie-authenticated mutations).
- Every patient-scoped operation independently verifies an ``ACTIVE`` care
  assignment in ``app.services.doctor``; client-supplied IDs are never trusted.
- Report downloads stream privately with strict security headers and never
  expose internal file paths or storage keys.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps.auth import DoctorUser
from app.core.config import Settings, get_settings
from app.database.session import get_db
from app.models.appointment import AppointmentStatus
from app.models.follow_up import FollowUpStatus
from app.models.medical_report import ReportFileType, ReportReviewStatus
from app.models.referral import ReferralStatus
from app.models.risk_assessment import RiskAssessmentStatus, RiskCategory
from app.schemas.doctor import (
    ClinicalReviewCreateRequest,
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
    DoctorPatientDetailResponse,
    DoctorPatientListResponse,
    DoctorPatientStatusFilter,
    DoctorProfileResponse,
    DoctorProfileUpdateRequest,
    DoctorReferralCreateRequest,
    DoctorReferralItem,
    DoctorReferralListResponse,
    DoctorReferralStatusUpdateRequest,
    DoctorReportDetailResponse,
    DoctorReportListResponse,
    DoctorRiskAssessmentItem,
    DoctorRiskAssessmentListResponse,
    ReportReviewCreateRequest,
)
from app.schemas.patient import (
    NotificationListResponse,
    NotificationMarkAllReadResponse,
    NotificationMarkReadResponse,
)
from app.services.doctor import (
    create_doctor_follow_up,
    create_doctor_referral,
    create_doctor_report_review,
    create_doctor_risk_review,
    get_doctor_appointment,
    get_doctor_overview,
    get_doctor_patient_detail,
    get_doctor_profile,
    get_doctor_report_detail,
    get_doctor_report_for_download,
    list_doctor_appointments,
    list_doctor_follow_ups,
    list_doctor_notifications,
    list_doctor_patients,
    list_doctor_referrals,
    list_doctor_reports,
    list_doctor_risk_assessments,
    mark_all_doctor_notifications_read,
    mark_doctor_notification_read,
    reschedule_doctor_appointment,
    update_doctor_appointment_status,
    update_doctor_follow_up,
    update_doctor_profile,
    update_doctor_referral_status,
)
from app.services.file_storage import (
    build_safe_content_disposition,
    get_report_media_type,
)

router = APIRouter(prefix="/doctor", tags=["Doctor Portal"])


# ---------------------------------------------------------------------------
# Dashboard Overview
# ---------------------------------------------------------------------------


@router.get(
    "/overview",
    response_model=DoctorOverviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve live doctor dashboard statistics and worklists",
)
def read_overview(
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
) -> DoctorOverviewResponse:
    return get_doctor_overview(db, doctor=doctor)


# ---------------------------------------------------------------------------
# Doctor Profile (1:1 per doctor; verification status admin-controlled)
# ---------------------------------------------------------------------------


@router.get(
    "/profile",
    response_model=DoctorProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve authenticated doctor's profile",
)
def read_profile(
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
) -> DoctorProfileResponse:
    return get_doctor_profile(db, doctor=doctor)


@router.put(
    "/profile",
    response_model=DoctorProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Update permitted fields on authenticated doctor's profile",
)
def put_profile(
    payload: DoctorProfileUpdateRequest,
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
) -> DoctorProfileResponse:
    return update_doctor_profile(db, doctor=doctor, payload=payload)


# ---------------------------------------------------------------------------
# Assigned Patient Management & Patient Detail
# ---------------------------------------------------------------------------


@router.get(
    "/patients",
    response_model=DoctorPatientListResponse,
    status_code=status.HTTP_200_OK,
    summary="List, search, and filter assigned patients",
)
def read_patients(
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
    search: str | None = Query(default=None, max_length=120),
    status_filter: DoctorPatientStatusFilter = Query(
        default=DoctorPatientStatusFilter.ALL,
        alias="status",
    ),
    page: int = Query(default=1, ge=1, le=1000),
    page_size: int = Query(default=10, ge=1, le=50),
) -> DoctorPatientListResponse:
    return list_doctor_patients(
        db,
        doctor=doctor,
        search=search,
        status_filter=status_filter,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/patients/{patient_id}",
    response_model=DoctorPatientDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve comprehensive authorized care dossier for an assigned patient",
)
def read_patient_detail(
    patient_id: str,
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
) -> DoctorPatientDetailResponse:
    return get_doctor_patient_detail(db, doctor=doctor, patient_id=patient_id)


# ---------------------------------------------------------------------------
# Medical Report Review & Secure Download
# ---------------------------------------------------------------------------


@router.get(
    "/reports",
    response_model=DoctorReportListResponse,
    status_code=status.HTTP_200_OK,
    summary="List uploaded medical reports from authorized patients",
)
def read_reports(
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
    patient_id: str | None = Query(default=None, max_length=36),
    review_status: ReportReviewStatus | None = Query(default=None),
    file_type: ReportFileType | None = Query(default=None),
    search: str | None = Query(default=None, max_length=120),
    page: int = Query(default=1, ge=1, le=1000),
    page_size: int = Query(default=10, ge=1, le=50),
) -> DoctorReportListResponse:
    return list_doctor_reports(
        db,
        doctor=doctor,
        patient_id=patient_id,
        review_status=review_status,
        file_type=file_type,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/reports/{report_id}",
    response_model=DoctorReportDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve report details and clinical review history",
)
def read_report_detail(
    report_id: str,
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
) -> DoctorReportDetailResponse:
    return get_doctor_report_detail(db, doctor=doctor, report_id=report_id)


@router.post(
    "/reports/{report_id}/review",
    response_model=DoctorReportDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a clinical review on an authorized patient's report",
)
def post_report_review(
    report_id: str,
    payload: ReportReviewCreateRequest,
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
) -> DoctorReportDetailResponse:
    return create_doctor_report_review(
        db,
        doctor=doctor,
        report_id=report_id,
        payload=payload,
    )


@router.get(
    "/reports/{report_id}/download",
    status_code=status.HTTP_200_OK,
    summary="Securely download an authorized patient's medical report",
)
def download_report(
    report_id: str,
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> FileResponse:
    report, file_path = get_doctor_report_for_download(
        db,
        doctor=doctor,
        report_id=report_id,
        settings=settings,
    )
    return FileResponse(
        path=file_path,
        media_type=get_report_media_type(report.file_type),
        headers={
            "Content-Disposition": build_safe_content_disposition(
                report.original_filename
            ),
            "Cache-Control": "no-store, private",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; sandbox",
        },
    )


# ---------------------------------------------------------------------------
# Risk Assessment Review (no automated risk calculation or AI in Phase 6)
# ---------------------------------------------------------------------------


@router.get(
    "/risk-assessments",
    response_model=DoctorRiskAssessmentListResponse,
    status_code=status.HTTP_200_OK,
    summary="List available risk assessment records for authorized patients",
)
def read_risk_assessments(
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
    patient_id: str | None = Query(default=None, max_length=36),
    status_filter: RiskAssessmentStatus | None = Query(
        default=None,
        alias="status",
    ),
    risk_category: RiskCategory | None = Query(default=None),
    page: int = Query(default=1, ge=1, le=1000),
    page_size: int = Query(default=10, ge=1, le=50),
) -> DoctorRiskAssessmentListResponse:
    return list_doctor_risk_assessments(
        db,
        doctor=doctor,
        patient_id=patient_id,
        status_filter=status_filter,
        risk_category=risk_category,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/risk-assessments/{assessment_id}/review",
    response_model=DoctorRiskAssessmentItem,
    status_code=status.HTTP_201_CREATED,
    summary="Record a professional clinician review for a risk assessment",
)
def post_risk_assessment_review(
    assessment_id: str,
    payload: ClinicalReviewCreateRequest,
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
) -> DoctorRiskAssessmentItem:
    return create_doctor_risk_review(
        db,
        doctor=doctor,
        assessment_id=assessment_id,
        payload=payload,
    )


# ---------------------------------------------------------------------------
# Appointment Management
# ---------------------------------------------------------------------------


@router.get(
    "/appointments",
    response_model=DoctorAppointmentListResponse,
    status_code=status.HTTP_200_OK,
    summary="List appointments and pending requests for authorized patients",
)
def read_appointments(
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
    scope: DoctorAppointmentScope = Query(default=DoctorAppointmentScope.ALL),
    status_filter: AppointmentStatus | None = Query(default=None, alias="status"),
    patient_id: str | None = Query(default=None, max_length=36),
    search: str | None = Query(default=None, max_length=120),
    page: int = Query(default=1, ge=1, le=1000),
    page_size: int = Query(default=10, ge=1, le=50),
) -> DoctorAppointmentListResponse:
    return list_doctor_appointments(
        db,
        doctor=doctor,
        scope=scope,
        status_filter=status_filter,
        patient_id=patient_id,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/appointments/{appointment_id}",
    response_model=DoctorAppointmentItem,
    status_code=status.HTTP_200_OK,
    summary="Retrieve details of an authorized appointment",
)
def read_appointment_detail(
    appointment_id: str,
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
) -> DoctorAppointmentItem:
    return get_doctor_appointment(
        db, doctor=doctor, appointment_id=appointment_id
    )


@router.patch(
    "/appointments/{appointment_id}/status",
    response_model=DoctorAppointmentItem,
    status_code=status.HTTP_200_OK,
    summary="Confirm, reject, cancel, or complete an authorized appointment",
)
def patch_appointment_status(
    appointment_id: str,
    payload: DoctorAppointmentStatusRequest,
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
) -> DoctorAppointmentItem:
    return update_doctor_appointment_status(
        db,
        doctor=doctor,
        appointment_id=appointment_id,
        payload=payload,
    )


@router.patch(
    "/appointments/{appointment_id}/reschedule",
    response_model=DoctorAppointmentItem,
    status_code=status.HTTP_200_OK,
    summary="Reschedule an eligible pending or confirmed appointment",
)
def patch_appointment_reschedule(
    appointment_id: str,
    payload: DoctorAppointmentRescheduleRequest,
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
) -> DoctorAppointmentItem:
    return reschedule_doctor_appointment(
        db,
        doctor=doctor,
        appointment_id=appointment_id,
        payload=payload,
    )


# ---------------------------------------------------------------------------
# Referral Management
# ---------------------------------------------------------------------------


@router.get(
    "/referrals",
    response_model=DoctorReferralListResponse,
    status_code=status.HTTP_200_OK,
    summary="List referrals for authorized patients",
)
def read_referrals(
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
    status_filter: ReferralStatus | None = Query(default=None, alias="status"),
    department: str | None = Query(default=None, max_length=120),
    patient_id: str | None = Query(default=None, max_length=36),
    search: str | None = Query(default=None, max_length=120),
    page: int = Query(default=1, ge=1, le=1000),
    page_size: int = Query(default=10, ge=1, le=50),
) -> DoctorReferralListResponse:
    return list_doctor_referrals(
        db,
        doctor=doctor,
        status_filter=status_filter,
        department=department,
        patient_id=patient_id,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/referrals",
    response_model=DoctorReferralItem,
    status_code=status.HTTP_201_CREATED,
    summary="Create a department referral for an authorized patient",
)
def post_referral(
    payload: DoctorReferralCreateRequest,
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
) -> DoctorReferralItem:
    return create_doctor_referral(db, doctor=doctor, payload=payload)


@router.patch(
    "/referrals/{referral_id}/status",
    response_model=DoctorReferralItem,
    status_code=status.HTTP_200_OK,
    summary="Update status of an authorized referral",
)
def patch_referral_status(
    referral_id: str,
    payload: DoctorReferralStatusUpdateRequest,
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
) -> DoctorReferralItem:
    return update_doctor_referral_status(
        db,
        doctor=doctor,
        referral_id=referral_id,
        payload=payload,
    )


# ---------------------------------------------------------------------------
# Follow-up Management
# ---------------------------------------------------------------------------


@router.get(
    "/follow-ups",
    response_model=DoctorFollowUpListResponse,
    status_code=status.HTTP_200_OK,
    summary="List follow-up milestones for authorized patients",
)
def read_follow_ups(
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
    scope: DoctorFollowUpScope = Query(default=DoctorFollowUpScope.ALL),
    status_filter: FollowUpStatus | None = Query(default=None, alias="status"),
    patient_id: str | None = Query(default=None, max_length=36),
    search: str | None = Query(default=None, max_length=120),
    page: int = Query(default=1, ge=1, le=1000),
    page_size: int = Query(default=10, ge=1, le=50),
) -> DoctorFollowUpListResponse:
    return list_doctor_follow_ups(
        db,
        doctor=doctor,
        scope=scope,
        status_filter=status_filter,
        patient_id=patient_id,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/follow-ups",
    response_model=DoctorFollowUpItem,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule a follow-up milestone for an authorized patient",
)
def post_follow_up(
    payload: DoctorFollowUpCreateRequest,
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
) -> DoctorFollowUpItem:
    return create_doctor_follow_up(db, doctor=doctor, payload=payload)


@router.patch(
    "/follow-ups/{follow_up_id}",
    response_model=DoctorFollowUpItem,
    status_code=status.HTTP_200_OK,
    summary="Update status, schedule, or notes on an authorized follow-up",
)
def patch_follow_up(
    follow_up_id: str,
    payload: DoctorFollowUpUpdateRequest,
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
) -> DoctorFollowUpItem:
    return update_doctor_follow_up(
        db,
        doctor=doctor,
        follow_up_id=follow_up_id,
        payload=payload,
    )


# ---------------------------------------------------------------------------
# Doctor In-App Notifications
# ---------------------------------------------------------------------------


@router.get(
    "/notifications",
    response_model=NotificationListResponse,
    status_code=status.HTTP_200_OK,
    summary="List in-app notifications belonging to the authenticated doctor",
)
def read_notifications(
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
    unread_only: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> NotificationListResponse:
    return list_doctor_notifications(
        db,
        doctor=doctor,
        unread_only=unread_only,
        limit=limit,
        offset=offset,
    )


@router.patch(
    "/notifications/read-all",
    response_model=NotificationMarkAllReadResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark all unread notifications as read for the authenticated doctor",
)
def patch_all_notifications_read(
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
) -> NotificationMarkAllReadResponse:
    return mark_all_doctor_notifications_read(db, doctor=doctor)


@router.patch(
    "/notifications/{notification_id}/read",
    response_model=NotificationMarkReadResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark an owned doctor notification as read",
)
def patch_notification_read(
    notification_id: str,
    doctor: DoctorUser,
    db: Annotated[Session, Depends(get_db)],
) -> NotificationMarkReadResponse:
    return mark_doctor_notification_read(
        db,
        doctor=doctor,
        notification_id=notification_id,
    )
