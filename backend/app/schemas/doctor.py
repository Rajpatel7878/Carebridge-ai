"""Pydantic v2 request and response contracts for the Phase 6 Doctor Portal.

Security invariants:
- Every request schema enforces ``extra="forbid"`` to reject tampered fields
  (e.g., ``verification_status``, ``doctor_id``, ``role``, ``is_verified``).
- ``license_number`` appears exclusively on ``DoctorProfileResponse`` (the
  authenticated doctor's own self-view) and never on public or patient models.
- Internal report storage filenames and disk paths are never serialized.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from enum import StrEnum
import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.appointment import AppointmentStatus
from app.models.clinical_review import ClinicalReviewStatus
from app.models.doctor_profile import DoctorVerificationStatus
from app.models.follow_up import FollowUpStatus
from app.models.medical_report import (
    ReportFileType,
    ReportReviewStatus,
    ReportUploadStatus,
)
from app.models.patient_doctor_assignment import AssignmentStatus
from app.models.patient_profile import GenderOption, PreferredLanguage
from app.models.referral import ReferralStatus
from app.models.report_review import DoctorReportReviewStatus
from app.models.risk_assessment import (
    RiskAssessmentSource,
    RiskAssessmentStatus,
    RiskCategory,
)

_LICENSE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 /\-.]{2,79}$")

ALLOWED_APPOINTMENT_MODES: tuple[str, ...] = (
    "In-Person Clinic",
    "Teleconsultation",
    "Community Screening Center",
)

ALLOWED_REFERRAL_DEPARTMENTS: tuple[str, ...] = (
    "Cardiology",
    "Endocrinology",
    "Internal Medicine",
    "Nephrology",
    "Neurology",
    "Pulmonology",
    "Oncology Screening",
    "Ophthalmology",
    "Orthopedics",
    "Obstetrics & Gynecology",
    "Mental Health & Counseling",
    "Community Preventive Clinic",
    "General Surgery",
    "Diagnostic Radiology",
)

DOCTOR_CLINICAL_RISK_DISCLAIMER = (
    "Risk records support care coordination only and are never a substitute for "
    "independent clinical examination or professional diagnosis. Automated or "
    "AI-assisted entries, when present, are labeled separately from clinician reviews."
)

IN_PLATFORM_REFERRAL_NOTICE = (
    "Referrals are tracked inside CareBridge AI for care coordination only and are "
    "not automatically transmitted to external hospital systems."
)


def _clean_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = " ".join(value.strip().split())
    return cleaned if cleaned else None


def _clean_multiline_note(value: str | None) -> str | None:
    if value is None:
        return None
    lines = [" ".join(line.strip().split()) for line in value.strip().splitlines()]
    cleaned = "\n".join(line for line in lines if line)
    return cleaned if cleaned else None


def _validate_future_utc(
    value: datetime,
    *,
    min_lead_minutes: int = 5,
    max_days: int = 365,
    label: str = "Scheduled date and time",
) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError(f"{label} must include a timezone.")
    utc_value = value.astimezone(timezone.utc)
    now = datetime.now(timezone.utc)
    if utc_value <= now + timedelta(minutes=min_lead_minutes):
        raise ValueError(f"{label} must be in the future.")
    if utc_value > now + timedelta(days=max_days):
        raise ValueError(f"{label} must be within the next {max_days} days.")
    return utc_value


# ---------------------------------------------------------------------------
# Doctor Profile (1:1 per doctor; self-verification forbidden)
# ---------------------------------------------------------------------------


class DoctorProfileUpdateRequest(BaseModel):
    """Permitted doctor-editable profile fields (no verification_status/role)."""

    model_config = ConfigDict(extra="forbid")

    specialization: str | None = Field(default=None, max_length=120)
    qualification: str | None = Field(default=None, max_length=160)
    license_number: str | None = Field(default=None, max_length=80)
    department: str | None = Field(default=None, max_length=120)
    hospital_or_clinic: str | None = Field(default=None, max_length=160)
    experience_years: int | None = Field(default=None, ge=0, le=70)

    @field_validator(
        "specialization",
        "qualification",
        "department",
        "hospital_or_clinic",
    )
    @classmethod
    def validate_profile_text(cls, value: str | None) -> str | None:
        cleaned = _clean_optional_text(value)
        if cleaned is not None and len(cleaned) < 2:
            raise ValueError("Must be at least 2 characters when provided.")
        return cleaned

    @field_validator("license_number")
    @classmethod
    def validate_license_number(cls, value: str | None) -> str | None:
        cleaned = _clean_optional_text(value)
        if cleaned is None:
            return None
        if not _LICENSE_RE.fullmatch(cleaned):
            raise ValueError(
                "Enter a valid license identifier (3–80 alphanumeric characters, spaces, slashes, dots, or hyphens)."
            )
        return cleaned


class DoctorProfileResponse(BaseModel):
    """Doctor's own profile including private, access-controlled license_number."""

    id: str
    user_id: str
    full_name: str
    display_name: str
    email: str
    role: str
    is_verified: bool
    verification_status: DoctorVerificationStatus
    specialization: str | None
    qualification: str | None
    license_number: str | None
    department: str | None
    hospital_or_clinic: str | None
    experience_years: int | None
    completion_percentage: int
    completed_fields: int
    total_fields: int
    account_created_at: datetime
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Administrator Patient–Doctor Care Assignments
# ---------------------------------------------------------------------------


class AssignmentCreateRequest(BaseModel):
    """Payload for an authorized administrator assigning a patient to a doctor."""

    model_config = ConfigDict(extra="forbid")

    patient_id: str = Field(..., min_length=1, max_length=36)
    doctor_id: str = Field(..., min_length=1, max_length=36)
    notes: str | None = Field(default=None, max_length=300)
    replace_existing_active: bool = Field(default=False)

    @field_validator("notes")
    @classmethod
    def validate_notes(cls, value: str | None) -> str | None:
        return _clean_optional_text(value)


class AssignmentUpdateRequest(BaseModel):
    """Payload for revoking or reassigning an existing care assignment."""

    model_config = ConfigDict(extra="forbid")

    status: Literal[AssignmentStatus.REVOKED, AssignmentStatus.REASSIGNED]
    new_doctor_id: str | None = Field(default=None, min_length=1, max_length=36)
    notes: str | None = Field(default=None, max_length=300)

    @field_validator("notes")
    @classmethod
    def validate_notes(cls, value: str | None) -> str | None:
        return _clean_optional_text(value)

    @model_validator(mode="after")
    def validate_reassignment_target(self) -> "AssignmentUpdateRequest":
        if self.status == AssignmentStatus.REASSIGNED and not self.new_doctor_id:
            raise ValueError(
                "new_doctor_id is required when reassigning a patient to another doctor."
            )
        if self.status == AssignmentStatus.REVOKED and self.new_doctor_id is not None:
            raise ValueError(
                "new_doctor_id must not be set when revoking an assignment."
            )
        return self


class AssignmentResponse(BaseModel):
    """Safe administrative view of a patient-doctor assignment."""

    id: str
    patient_id: str
    patient_name: str
    patient_email: str
    doctor_id: str
    doctor_name: str
    doctor_email: str
    assigned_by_id: str | None
    assigned_by_name: str | None
    status: AssignmentStatus
    notes: str | None
    assigned_at: datetime
    revoked_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AssignmentListResponse(BaseModel):
    """Paginated administrative list of patient-doctor assignments."""

    items: list[AssignmentResponse]
    total: int
    active_count: int


# ---------------------------------------------------------------------------
# Patient Management & Comprehensive Patient Detail View
# ---------------------------------------------------------------------------


class DoctorPatientStatusFilter(StrEnum):
    """Clinical coordination filters for a doctor's assigned patient roster."""

    ALL = "ALL"
    NEEDS_ATTENTION = "NEEDS_ATTENTION"
    PENDING_REPORTS = "PENDING_REPORTS"
    PENDING_APPOINTMENTS = "PENDING_APPOINTMENTS"
    OVERDUE_FOLLOW_UP = "OVERDUE_FOLLOW_UP"
    UP_TO_DATE = "UP_TO_DATE"


class DoctorPatientSummary(BaseModel):
    """Row representation for an assigned patient in the doctor portal."""

    patient_id: str
    assignment_id: str
    assigned_at: datetime
    full_name: str
    date_of_birth: date | None
    gender: GenderOption | None
    city: str | None
    state: str | None
    preferred_language: PreferredLanguage
    total_reports: int
    pending_reports: int
    upcoming_appointments: int
    pending_appointments: int
    active_referrals: int
    pending_follow_ups: int
    overdue_follow_ups: int
    latest_risk_category: RiskCategory | None
    requires_attention: bool
    attention_reasons: list[str]
    last_activity_at: datetime | None


class DoctorPatientListResponse(BaseModel):
    """Paginated list of authorized assigned patients."""

    items: list[DoctorPatientSummary]
    total: int
    page: int
    page_size: int
    total_pages: int


class DoctorPatientProfileSection(BaseModel):
    """Authorized patient profile fields separated cleanly from clinical notes."""

    patient_id: str
    full_name: str
    email: str
    account_created_at: datetime
    assignment_id: str
    assignment_status: AssignmentStatus
    assigned_at: datetime
    date_of_birth: date | None
    phone_number: str | None
    gender: GenderOption | None
    city: str | None
    state: str | None
    preferred_language: PreferredLanguage
    emergency_contact_name: str | None
    emergency_contact_phone: str | None


# ---------------------------------------------------------------------------
# Medical Report Review
# ---------------------------------------------------------------------------


class ReportReviewCreateRequest(BaseModel):
    """Validated clinician report review submission."""

    model_config = ConfigDict(extra="forbid")

    review_status: DoctorReportReviewStatus
    review_note: str | None = Field(default=None, max_length=1500)

    @field_validator("review_note")
    @classmethod
    def validate_note(cls, value: str | None) -> str | None:
        cleaned = _clean_multiline_note(value)
        if cleaned is not None and len(cleaned) < 3:
            raise ValueError(
                "Review note must be at least 3 characters when provided."
            )
        return cleaned

    @model_validator(mode="after")
    def require_note_for_follow_up_flag(self) -> "ReportReviewCreateRequest":
        if (
            self.review_status == DoctorReportReviewStatus.NEEDS_FOLLOW_UP
            and not self.review_note
        ):
            raise ValueError(
                "Please include a concise clinical note when marking a report as Needs Follow-up."
            )
        return self


class ReportReviewHistoryItem(BaseModel):
    """Single immutable review entry in a medical report's clinical history."""

    id: str
    report_id: str
    doctor_id: str | None
    doctor_name: str | None
    review_status: DoctorReportReviewStatus
    review_note: str | None
    reviewed_at: datetime
    created_at: datetime


class DoctorReportSummary(BaseModel):
    """Doctor-facing report metadata (never exposes stored_filename/paths)."""

    id: str
    patient_id: str
    patient_name: str
    original_filename: str
    file_type: ReportFileType
    file_size: int
    upload_status: ReportUploadStatus
    review_status: ReportReviewStatus
    review_count: int
    latest_reviewed_at: datetime | None
    latest_reviewer_name: str | None
    uploaded_at: datetime
    updated_at: datetime


class DoctorReportDetailResponse(BaseModel):
    """Full report metadata paired with protected clinical review history."""

    id: str
    patient_id: str
    patient_name: str
    patient_city: str | None
    patient_state: str | None
    original_filename: str
    file_type: ReportFileType
    file_size: int
    upload_status: ReportUploadStatus
    review_status: ReportReviewStatus
    uploaded_at: datetime
    updated_at: datetime
    reviews: list[ReportReviewHistoryItem]


class DoctorReportListResponse(BaseModel):
    """Paginated list of reports belonging to the doctor's assigned patients."""

    items: list[DoctorReportSummary]
    total: int
    pending_count: int
    in_review_count: int
    needs_follow_up_count: int
    reviewed_count: int
    page: int
    page_size: int
    total_pages: int


# ---------------------------------------------------------------------------
# Risk Assessment & Clinical Review (no risk calculation / no AI in Phase 6)
# ---------------------------------------------------------------------------


class ClinicalReviewCreateRequest(BaseModel):
    """Validated clinician review of an existing risk assessment record."""

    model_config = ConfigDict(extra="forbid")

    review_status: ClinicalReviewStatus
    review_note: str = Field(..., min_length=3, max_length=1500)
    recommended_action: str | None = Field(default=None, max_length=500)

    @field_validator("review_note")
    @classmethod
    def validate_review_note(cls, value: str) -> str:
        cleaned = _clean_multiline_note(value)
        if not cleaned or len(cleaned) < 3:
            raise ValueError("Review note must be at least 3 characters.")
        return cleaned

    @field_validator("recommended_action")
    @classmethod
    def validate_recommended_action(cls, value: str | None) -> str | None:
        cleaned = _clean_optional_text(value)
        if cleaned is not None and len(cleaned) < 3:
            raise ValueError(
                "Recommended action must be at least 3 characters when provided."
            )
        return cleaned


class ClinicalReviewResponse(BaseModel):
    """Professional clinician review record clearly attributed to the doctor."""

    id: str
    patient_id: str
    doctor_id: str | None
    doctor_name: str | None
    related_assessment_id: str | None
    review_status: ClinicalReviewStatus
    review_note: str | None
    recommended_action: str | None
    reviewed_at: datetime
    created_at: datetime


class DoctorRiskAssessmentItem(BaseModel):
    """Authorized risk assessment record with distinct source & clinical reviews."""

    id: str
    patient_id: str
    patient_name: str
    related_report_id: str | None
    status: RiskAssessmentStatus
    risk_category: RiskCategory | None
    source: RiskAssessmentSource | None
    is_ai_assisted: bool
    explanation: str | None
    recommended_action: str | None
    reviewed_by_doctor_name: str | None
    assessed_at: datetime
    updated_at: datetime
    clinical_reviews: list[ClinicalReviewResponse]


class DoctorRiskAssessmentListResponse(BaseModel):
    """Paginated risk assessment list for authorized patients."""

    items: list[DoctorRiskAssessmentItem]
    total: int
    pending_count: int
    flagged_count: int
    reviewed_count: int
    page: int
    page_size: int
    total_pages: int
    disclaimer: str = DOCTOR_CLINICAL_RISK_DISCLAIMER


# ---------------------------------------------------------------------------
# Appointment Management
# ---------------------------------------------------------------------------


class DoctorAppointmentScope(StrEnum):
    """View scopes for doctor appointment coordination."""

    ALL = "ALL"
    PENDING = "PENDING"
    UPCOMING = "UPCOMING"
    TODAY = "TODAY"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class DoctorAppointmentStatusRequest(BaseModel):
    """Validated status transition for an authorized appointment."""

    model_config = ConfigDict(extra="forbid")

    status: Literal[
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
    ]
    reason: str | None = Field(default=None, max_length=400)

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, value: str | None) -> str | None:
        cleaned = _clean_optional_text(value)
        if cleaned is not None and len(cleaned) < 3:
            raise ValueError("Reason must be at least 3 characters when provided.")
        return cleaned


class DoctorAppointmentRescheduleRequest(BaseModel):
    """Validated reschedule request with timezone-aware future timestamp."""

    model_config = ConfigDict(extra="forbid")

    scheduled_at: datetime
    location_or_mode: str | None = Field(default=None, max_length=120)
    reason: str | None = Field(default=None, max_length=400)

    @field_validator("scheduled_at")
    @classmethod
    def validate_scheduled_at(cls, value: datetime) -> datetime:
        return _validate_future_utc(
            value,
            min_lead_minutes=5,
            max_days=365,
            label="Rescheduled appointment date and time",
        )

    @field_validator("location_or_mode")
    @classmethod
    def validate_mode(cls, value: str | None) -> str | None:
        cleaned = _clean_optional_text(value)
        if cleaned is None:
            return None
        if cleaned not in ALLOWED_APPOINTMENT_MODES:
            allowed = ", ".join(ALLOWED_APPOINTMENT_MODES)
            raise ValueError(f"Visit mode must be one of: {allowed}.")
        return cleaned

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, value: str | None) -> str | None:
        cleaned = _clean_optional_text(value)
        if cleaned is not None and len(cleaned) < 3:
            raise ValueError("Reason must be at least 3 characters when provided.")
        return cleaned


class DoctorAppointmentItem(BaseModel):
    """Doctor-facing appointment record scoped to an assigned patient."""

    id: str
    patient_id: str
    patient_name: str
    doctor_id: str | None
    assigned_doctor_name: str | None
    scheduled_at: datetime
    appointment_type: str
    status: AppointmentStatus
    location_or_mode: str | None
    notes: str | None
    status_note: str | None
    is_upcoming: bool
    is_today: bool
    created_at: datetime
    updated_at: datetime


class DoctorAppointmentListResponse(BaseModel):
    """Paginated appointment list with lifecycle counts."""

    items: list[DoctorAppointmentItem]
    total: int
    pending_count: int
    upcoming_count: int
    today_count: int
    completed_count: int
    cancelled_count: int
    page: int
    page_size: int
    total_pages: int


# ---------------------------------------------------------------------------
# Referral Management
# ---------------------------------------------------------------------------


class DoctorReferralCreateRequest(BaseModel):
    """Validated referral creation payload for an authorized assigned patient."""

    model_config = ConfigDict(extra="forbid")

    patient_id: str = Field(..., min_length=1, max_length=36)
    referred_department: str = Field(..., min_length=2, max_length=120)
    reason: str = Field(..., min_length=5, max_length=400)
    next_action: str | None = Field(default=None, max_length=300)

    @field_validator("referred_department")
    @classmethod
    def validate_department(cls, value: str) -> str:
        cleaned = _clean_optional_text(value) or ""
        if cleaned not in ALLOWED_REFERRAL_DEPARTMENTS:
            raise ValueError("Select a supported specialty or care department.")
        return cleaned

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, value: str) -> str:
        cleaned = _clean_optional_text(value)
        if not cleaned or len(cleaned) < 5:
            raise ValueError("Referral reason must be at least 5 characters.")
        return cleaned

    @field_validator("next_action")
    @classmethod
    def validate_next_action(cls, value: str | None) -> str | None:
        cleaned = _clean_optional_text(value)
        if cleaned is not None and len(cleaned) < 3:
            raise ValueError(
                "Recommended next step must be at least 3 characters when provided."
            )
        return cleaned


class DoctorReferralStatusUpdateRequest(BaseModel):
    """Validated referral status transition payload."""

    model_config = ConfigDict(extra="forbid")

    status: ReferralStatus
    next_action: str | None = Field(default=None, max_length=300)
    note: str | None = Field(default=None, max_length=400)

    @field_validator("next_action", "note")
    @classmethod
    def validate_optional_fields(cls, value: str | None) -> str | None:
        cleaned = _clean_optional_text(value)
        if cleaned is not None and len(cleaned) < 3:
            raise ValueError("Must be at least 3 characters when provided.")
        return cleaned


class ReferralHistoryItem(BaseModel):
    """Single chronological event in a referral's lifecycle."""

    id: str
    previous_status: ReferralStatus | None
    new_status: ReferralStatus
    changed_by_doctor_name: str | None
    note: str | None
    created_at: datetime


class DoctorReferralItem(BaseModel):
    """Doctor-facing referral record including auditable status history."""

    id: str
    patient_id: str
    patient_name: str
    referring_doctor_id: str | None
    referring_doctor_name: str | None
    referred_department: str
    reason: str | None
    next_action: str | None
    status: ReferralStatus
    created_at: datetime
    updated_at: datetime
    history: list[ReferralHistoryItem]


class DoctorReferralListResponse(BaseModel):
    """Paginated referral list paired with allowed departments and scope notice."""

    items: list[DoctorReferralItem]
    total: int
    pending_count: int
    active_count: int
    completed_count: int
    cancelled_count: int
    allowed_departments: list[str]
    coordination_notice: str = IN_PLATFORM_REFERRAL_NOTICE
    page: int
    page_size: int
    total_pages: int


# ---------------------------------------------------------------------------
# Follow-up Management
# ---------------------------------------------------------------------------


class DoctorFollowUpScope(StrEnum):
    """View scopes for doctor follow-up coordination."""

    ALL = "ALL"
    PENDING = "PENDING"
    OVERDUE = "OVERDUE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class DoctorFollowUpCreateRequest(BaseModel):
    """Validated follow-up creation payload for an authorized assigned patient."""

    model_config = ConfigDict(extra="forbid")

    patient_id: str = Field(..., min_length=1, max_length=36)
    follow_up_type: str = Field(..., min_length=3, max_length=100)
    scheduled_at: datetime
    related_appointment_id: str | None = Field(default=None, max_length=36)
    related_referral_id: str | None = Field(default=None, max_length=36)
    notes: str | None = Field(default=None, max_length=400)

    @field_validator("follow_up_type")
    @classmethod
    def validate_follow_up_type(cls, value: str) -> str:
        cleaned = _clean_optional_text(value)
        if not cleaned or len(cleaned) < 3:
            raise ValueError("Follow-up type must be at least 3 characters.")
        return cleaned

    @field_validator("scheduled_at")
    @classmethod
    def validate_scheduled_at(cls, value: datetime) -> datetime:
        return _validate_future_utc(
            value,
            min_lead_minutes=5,
            max_days=365,
            label="Follow-up date and time",
        )

    @field_validator("related_appointment_id", "related_referral_id")
    @classmethod
    def normalize_optional_id(cls, value: str | None) -> str | None:
        return _clean_optional_text(value)

    @field_validator("notes")
    @classmethod
    def validate_notes(cls, value: str | None) -> str | None:
        return _clean_optional_text(value)


class DoctorFollowUpUpdateRequest(BaseModel):
    """Validated update payload for an existing follow-up milestone."""

    model_config = ConfigDict(extra="forbid")

    status: FollowUpStatus | None = None
    scheduled_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=400)

    @field_validator("scheduled_at")
    @classmethod
    def validate_scheduled_at(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        return _validate_future_utc(
            value,
            min_lead_minutes=5,
            max_days=365,
            label="Rescheduled follow-up date and time",
        )

    @field_validator("notes")
    @classmethod
    def validate_notes(cls, value: str | None) -> str | None:
        return _clean_optional_text(value)

    @model_validator(mode="after")
    def require_at_least_one_change(self) -> "DoctorFollowUpUpdateRequest":
        if (
            self.status is None
            and self.scheduled_at is None
            and "notes" not in self.model_fields_set
        ):
            raise ValueError(
                "Provide at least one field to update (status, scheduled_at, or notes)."
            )
        return self


class DoctorFollowUpItem(BaseModel):
    """Doctor-facing follow-up milestone with linked workflow references."""

    id: str
    patient_id: str
    patient_name: str
    created_by_doctor_id: str | None
    created_by_doctor_name: str | None
    related_appointment_id: str | None
    related_referral_id: str | None
    scheduled_at: datetime
    follow_up_type: str
    status: FollowUpStatus
    notes: str | None
    is_overdue: bool
    created_at: datetime
    updated_at: datetime


class DoctorFollowUpListResponse(BaseModel):
    """Paginated follow-up list with real status summary counts."""

    items: list[DoctorFollowUpItem]
    total: int
    pending_count: int
    overdue_count: int
    completed_count: int
    cancelled_count: int
    page: int
    page_size: int
    total_pages: int


# ---------------------------------------------------------------------------
# Shared Care Activity Timeline & Patient Detail Composite
# ---------------------------------------------------------------------------


class DoctorActivityItem(BaseModel):
    """Chronological clinical activity entry derived solely from real DB rows."""

    id: str
    category: Literal[
        "assignment",
        "report",
        "review",
        "risk",
        "appointment",
        "referral",
        "follow_up",
    ]
    patient_id: str
    patient_name: str
    title: str
    description: str
    status: str
    occurred_at: datetime
    link_path: str


class DoctorPatientDetailResponse(BaseModel):
    """Comprehensive authorized care view for ``GET /api/doctor/patients/{id}``."""

    profile: DoctorPatientProfileSection
    requires_attention: bool
    attention_reasons: list[str]
    reports: list[DoctorReportSummary]
    report_reviews: list[ReportReviewHistoryItem]
    risk_assessments: list[DoctorRiskAssessmentItem]
    appointments: list[DoctorAppointmentItem]
    referrals: list[DoctorReferralItem]
    follow_ups: list[DoctorFollowUpItem]
    recent_activity: list[DoctorActivityItem]
    allowed_departments: list[str]
    risk_disclaimer: str = DOCTOR_CLINICAL_RISK_DISCLAIMER


# ---------------------------------------------------------------------------
# Doctor Dashboard Overview
# ---------------------------------------------------------------------------


class DoctorOverviewStatistics(BaseModel):
    """Real database-calculated statistics for the doctor dashboard."""

    total_assigned_patients: int
    pending_report_reviews: int
    upcoming_appointments: int
    patients_requiring_attention: int
    pending_referrals: int
    pending_follow_ups: int
    overdue_follow_ups: int
    unread_notifications: int


class DoctorOverviewResponse(BaseModel):
    """Aggregated payload for ``GET /api/doctor/overview``."""

    doctor_name: str
    display_name: str
    specialization: str | None
    department: str | None
    verification_status: DoctorVerificationStatus
    statistics: DoctorOverviewStatistics
    todays_appointments: list[DoctorAppointmentItem]
    recently_assigned_patients: list[DoctorPatientSummary]
    reports_awaiting_review: list[DoctorReportSummary]
    follow_ups_requiring_attention: list[DoctorFollowUpItem]
    recent_activity: list[DoctorActivityItem]
