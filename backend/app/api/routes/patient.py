"""Authenticated, PATIENT-scoped API routes for the Phase 5 Patient Portal.

Every endpoint enforces ``PatientUser`` (valid access JWT + active account +
``role == PATIENT`` + double-submit CSRF on unsafe cookie requests) and derives
patient ownership strictly from the authenticated user on the server.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps.auth import PatientUser
from app.core.config import Settings, get_settings
from app.database.session import get_db
from app.models.appointment import AppointmentStatus
from app.models.follow_up import FollowUpStatus
from app.models.medical_report import ReportFileType, ReportReviewStatus
from app.models.referral import ReferralStatus
from app.schemas.patient import (
    AppointmentCreateRequest,
    AppointmentListResponse,
    AppointmentResponse,
    FollowUpListResponse,
    FollowUpResponse,
    MedicalReportListResponse,
    MedicalReportResponse,
    NotificationListResponse,
    NotificationMarkAllReadResponse,
    NotificationMarkReadResponse,
    PatientOverviewResponse,
    PatientProfileResponse,
    PatientProfileUpdateRequest,
    ReferralListResponse,
    ReferralResponse,
    RiskAssessmentListResponse,
)
from app.services.file_storage import (
    build_safe_content_disposition,
    get_report_media_type,
)
from app.services.patient import (
    cancel_patient_appointment,
    complete_patient_follow_up,
    get_patient_appointment,
    get_patient_follow_up,
    get_patient_overview,
    get_patient_profile,
    get_patient_referral,
    get_patient_report,
    get_patient_report_for_download,
    list_patient_appointments,
    list_patient_follow_ups,
    list_patient_notifications,
    list_patient_referrals,
    list_patient_reports,
    list_patient_risk_assessments,
    mark_all_patient_notifications_read,
    mark_patient_notification_read,
    request_patient_appointment,
    update_patient_profile,
    upload_patient_report,
)

router = APIRouter(prefix="/patient", tags=["Patient Portal"])

DbSession = Annotated[Session, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_settings)]


# ---------------------------------------------------------------------------
# Dashboard Overview
# ---------------------------------------------------------------------------


@router.get(
    "/overview",
    response_model=PatientOverviewResponse,
    summary="Retrieve live Patient Dashboard overview, metrics, and health journey",
)
def read_patient_overview(
    patient: PatientUser,
    db: DbSession,
) -> PatientOverviewResponse:
    return get_patient_overview(db, patient=patient)


# ---------------------------------------------------------------------------
# Patient Profile
# ---------------------------------------------------------------------------


@router.get(
    "/profile",
    response_model=PatientProfileResponse,
    summary="Retrieve the authenticated patient's own profile",
)
def read_patient_profile(
    patient: PatientUser,
    db: DbSession,
) -> PatientProfileResponse:
    return get_patient_profile(db, patient=patient)


@router.put(
    "/profile",
    response_model=PatientProfileResponse,
    summary="Update the authenticated patient's own profile",
)
def put_patient_profile(
    payload: PatientProfileUpdateRequest,
    patient: PatientUser,
    db: DbSession,
) -> PatientProfileResponse:
    return update_patient_profile(db, patient=patient, payload=payload)


# ---------------------------------------------------------------------------
# Medical Reports (Secure private upload, listing, detail, download)
# ---------------------------------------------------------------------------


@router.post(
    "/reports",
    response_model=MedicalReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a PDF, PNG, or JPG medical report to private storage",
)
async def create_patient_report(
    patient: PatientUser,
    db: DbSession,
    settings: AppSettings,
    file: Annotated[UploadFile, File(description="PDF, PNG, or JPG report up to 10 MB")],
) -> MedicalReportResponse:
    return await upload_patient_report(
        db,
        patient=patient,
        upload=file,
        settings=settings,
    )


@router.get(
    "/reports",
    response_model=MedicalReportListResponse,
    summary="List the authenticated patient's uploaded medical reports",
)
def read_patient_reports(
    patient: PatientUser,
    db: DbSession,
    settings: AppSettings,
    file_type: Annotated[ReportFileType | None, Query()] = None,
    review_status: Annotated[ReportReviewStatus | None, Query()] = None,
    search: Annotated[str | None, Query(max_length=120)] = None,
) -> MedicalReportListResponse:
    return list_patient_reports(
        db,
        patient=patient,
        settings=settings,
        file_type=file_type,
        review_status=review_status,
        search=search,
    )


@router.get(
    "/reports/{report_id}",
    response_model=MedicalReportResponse,
    summary="Retrieve metadata for a single patient-owned medical report",
)
def read_patient_report(
    report_id: str,
    patient: PatientUser,
    db: DbSession,
) -> MedicalReportResponse:
    return get_patient_report(db, patient=patient, report_id=report_id)


@router.get(
    "/reports/{report_id}/download",
    summary="Download an owned medical report through an authorized private stream",
)
def download_patient_report(
    report_id: str,
    patient: PatientUser,
    db: DbSession,
    settings: AppSettings,
) -> FileResponse:
    report, file_path = get_patient_report_for_download(
        db,
        patient=patient,
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
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store, private",
            "Content-Security-Policy": "default-src 'none'; sandbox",
        },
    )


# ---------------------------------------------------------------------------
# Risk Assessments (Read-only; no automated risk generation in Phase 5)
# ---------------------------------------------------------------------------


@router.get(
    "/risk-assessments",
    response_model=RiskAssessmentListResponse,
    summary="Retrieve authorized risk assessments for the authenticated patient",
)
def read_patient_risk_assessments(
    patient: PatientUser,
    db: DbSession,
) -> RiskAssessmentListResponse:
    return list_patient_risk_assessments(db, patient=patient)


# ---------------------------------------------------------------------------
# Appointments
# ---------------------------------------------------------------------------


@router.get(
    "/appointments",
    response_model=AppointmentListResponse,
    summary="List the authenticated patient's upcoming and past appointments",
)
def read_patient_appointments(
    patient: PatientUser,
    db: DbSession,
    status_filter: Annotated[
        AppointmentStatus | None, Query(alias="status")
    ] = None,
) -> AppointmentListResponse:
    return list_patient_appointments(
        db, patient=patient, status_filter=status_filter
    )


@router.post(
    "/appointments/request",
    response_model=AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a PENDING appointment request for the authenticated patient",
)
def create_patient_appointment_request(
    payload: AppointmentCreateRequest,
    patient: PatientUser,
    db: DbSession,
) -> AppointmentResponse:
    return request_patient_appointment(db, patient=patient, payload=payload)


@router.get(
    "/appointments/{appointment_id}",
    response_model=AppointmentResponse,
    summary="Retrieve details for a single patient-owned appointment",
)
def read_patient_appointment(
    appointment_id: str,
    patient: PatientUser,
    db: DbSession,
) -> AppointmentResponse:
    return get_patient_appointment(
        db, patient=patient, appointment_id=appointment_id
    )


@router.patch(
    "/appointments/{appointment_id}/cancel",
    response_model=AppointmentResponse,
    summary="Cancel a patient-owned PENDING or CONFIRMED appointment",
)
def patch_cancel_patient_appointment(
    appointment_id: str,
    patient: PatientUser,
    db: DbSession,
) -> AppointmentResponse:
    return cancel_patient_appointment(
        db, patient=patient, appointment_id=appointment_id
    )


# ---------------------------------------------------------------------------
# Referrals (Read-only for patients)
# ---------------------------------------------------------------------------


@router.get(
    "/referrals",
    response_model=ReferralListResponse,
    summary="List specialist and department referrals for the authenticated patient",
)
def read_patient_referrals(
    patient: PatientUser,
    db: DbSession,
    status_filter: Annotated[ReferralStatus | None, Query(alias="status")] = None,
) -> ReferralListResponse:
    return list_patient_referrals(db, patient=patient, status_filter=status_filter)


@router.get(
    "/referrals/{referral_id}",
    response_model=ReferralResponse,
    summary="Retrieve details for a single patient-owned referral",
)
def read_patient_referral(
    referral_id: str,
    patient: PatientUser,
    db: DbSession,
) -> ReferralResponse:
    return get_patient_referral(db, patient=patient, referral_id=referral_id)


# ---------------------------------------------------------------------------
# Follow-ups
# ---------------------------------------------------------------------------


@router.get(
    "/follow-ups",
    response_model=FollowUpListResponse,
    summary="List follow-up tasks for the authenticated patient",
)
def read_patient_follow_ups(
    patient: PatientUser,
    db: DbSession,
    status_filter: Annotated[FollowUpStatus | None, Query(alias="status")] = None,
) -> FollowUpListResponse:
    return list_patient_follow_ups(db, patient=patient, status_filter=status_filter)


@router.get(
    "/follow-ups/{follow_up_id}",
    response_model=FollowUpResponse,
    summary="Retrieve details for a single patient-owned follow-up",
)
def read_patient_follow_up(
    follow_up_id: str,
    patient: PatientUser,
    db: DbSession,
) -> FollowUpResponse:
    return get_patient_follow_up(db, patient=patient, follow_up_id=follow_up_id)


@router.patch(
    "/follow-ups/{follow_up_id}/complete",
    response_model=FollowUpResponse,
    summary="Mark a patient-owned PENDING follow-up task as COMPLETED",
)
def patch_complete_patient_follow_up(
    follow_up_id: str,
    patient: PatientUser,
    db: DbSession,
) -> FollowUpResponse:
    return complete_patient_follow_up(
        db, patient=patient, follow_up_id=follow_up_id
    )


# ---------------------------------------------------------------------------
# In-App Notifications
# ---------------------------------------------------------------------------


@router.get(
    "/notifications",
    response_model=NotificationListResponse,
    summary="List in-app notifications for the authenticated patient",
)
def read_patient_notifications(
    patient: PatientUser,
    db: DbSession,
    unread_only: Annotated[bool, Query()] = False,
) -> NotificationListResponse:
    return list_patient_notifications(
        db, patient=patient, unread_only=unread_only
    )


@router.patch(
    "/notifications/read-all",
    response_model=NotificationMarkAllReadResponse,
    summary="Mark all unread in-app notifications as read for the authenticated patient",
)
def patch_mark_all_notifications_read(
    patient: PatientUser,
    db: DbSession,
) -> NotificationMarkAllReadResponse:
    return mark_all_patient_notifications_read(db, patient=patient)


@router.patch(
    "/notifications/{notification_id}/read",
    response_model=NotificationMarkReadResponse,
    summary="Mark a single patient-owned notification as read",
)
def patch_mark_notification_read(
    notification_id: str,
    patient: PatientUser,
    db: DbSession,
) -> NotificationMarkReadResponse:
    return mark_patient_notification_read(
        db, patient=patient, notification_id=notification_id
    )
