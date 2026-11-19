"""Pydantic v2 request and response contracts for the Phase 5 Patient Portal.

All request models set ``extra="forbid"`` so client-supplied ``patient_id``,
``doctor_id``, ``role``, ``status``, or unknown fields are rejected outright.
Response models never expose ``stored_filename``, disk paths, password hashes,
or private clinician email addresses.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.appointment import AppointmentStatus, AppointmentType
from app.models.follow_up import FollowUpStatus
from app.models.medical_report import (
    ReportFileType,
    ReportReviewStatus,
    ReportUploadStatus,
)
from app.models.notification import NotificationType
from app.models.patient_profile import GenderOption, PreferredLanguage
from app.models.referral import ReferralStatus
from app.models.risk_assessment import (
    RiskAssessmentSource,
    RiskAssessmentStatus,
    RiskCategory,
)

_PHONE_RE = re.compile(r"^\+?[0-9][0-9 ()\-]{5,24}$")
_SAFE_LOCATION_MODES: frozenset[str] = frozenset(
    {
        "In-Person Clinic",
        "Teleconsultation",
        "Community Screening Center",
    }
)

RISK_COORDINATION_DISCLAIMER = (
    "Risk information is intended to support healthcare coordination and does not "
    "replace professional medical advice or diagnosis."
)


def _clean_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = " ".join(value.strip().split())
    return cleaned if cleaned else None


# ---------------------------------------------------------------------------
# Patient Profile
# ---------------------------------------------------------------------------


class PatientProfileUpdateRequest(BaseModel):
    """Permitted patient-editable profile fields (all optional except language)."""

    model_config = ConfigDict(extra="forbid")

    date_of_birth: date | None = None
    phone_number: str | None = Field(default=None, max_length=30)
    gender: GenderOption | None = None
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    preferred_language: PreferredLanguage = Field(default=PreferredLanguage.ENGLISH)
    emergency_contact_name: str | None = Field(default=None, max_length=150)
    emergency_contact_phone: str | None = Field(default=None, max_length=30)

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, value: date | None) -> date | None:
        if value is None:
            return None
        today = datetime.now(timezone.utc).date()
        if value > today:
            raise ValueError("Date of birth cannot be in the future.")
        if value.year < 1900:
            raise ValueError("Please enter a valid date of birth (1900 or later).")
        return value

    @field_validator("gender", mode="before")
    @classmethod
    def normalize_gender(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("phone_number", "emergency_contact_phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        cleaned = _clean_optional_text(value)
        if cleaned is None:
            return None
        if not _PHONE_RE.fullmatch(cleaned):
            raise ValueError(
                "Enter a valid phone number using digits, spaces, hyphens, or a leading +."
            )
        digit_count = sum(ch.isdigit() for ch in cleaned)
        if digit_count < 7 or digit_count > 15:
            raise ValueError("Phone number must contain between 7 and 15 digits.")
        return cleaned

    @field_validator("city", "state", "emergency_contact_name")
    @classmethod
    def validate_optional_text(cls, value: str | None) -> str | None:
        cleaned = _clean_optional_text(value)
        if cleaned is not None and len(cleaned) < 2:
            raise ValueError("Must be at least 2 characters when provided.")
        return cleaned


class PatientProfileResponse(BaseModel):
    """Patient profile combined with safe, read-only account attributes."""

    id: str
    user_id: str
    full_name: str
    email: str
    role: str
    is_verified: bool
    account_created_at: datetime
    date_of_birth: date | None
    phone_number: str | None
    gender: GenderOption | None
    city: str | None
    state: str | None
    preferred_language: PreferredLanguage
    emergency_contact_name: str | None
    emergency_contact_phone: str | None
    completion_percentage: int
    completed_fields: int
    total_fields: int
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Medical Reports
# ---------------------------------------------------------------------------


class MedicalReportResponse(BaseModel):
    """Safe patient-facing report metadata (never includes ``stored_filename``)."""

    id: str
    original_filename: str
    file_type: ReportFileType
    file_size: int
    upload_status: ReportUploadStatus
    review_status: ReportReviewStatus
    uploaded_at: datetime
    updated_at: datetime


class MedicalReportListResponse(BaseModel):
    """List of medical reports belonging strictly to the authenticated patient."""

    items: list[MedicalReportResponse]
    total: int
    max_upload_mb: int
    allowed_file_types: list[ReportFileType]


# ---------------------------------------------------------------------------
# Read-only Risk Assessments
# ---------------------------------------------------------------------------


class RiskAssessmentResponse(BaseModel):
    """Authorized read-only risk assessment entry for the owning patient."""

    id: str
    related_report_id: str | None
    status: RiskAssessmentStatus
    risk_category: RiskCategory | None
    source: RiskAssessmentSource | None = None
    explanation: str | None
    reviewing_professional_name: str | None
    recommended_action: str | None
    assessed_at: datetime
    updated_at: datetime


class RiskAssessmentListResponse(BaseModel):
    """Patient risk assessment feed paired with the clinical disclaimer."""

    items: list[RiskAssessmentResponse]
    total: int
    disclaimer: str = RISK_COORDINATION_DISCLAIMER


# ---------------------------------------------------------------------------
# Appointments
# ---------------------------------------------------------------------------


class AppointmentCreateRequest(BaseModel):
    """Payload for submitting a patient appointment request (always PENDING)."""

    model_config = ConfigDict(extra="forbid")

    scheduled_at: datetime
    appointment_type: AppointmentType
    location_or_mode: str | None = Field(default="In-Person Clinic", max_length=120)
    notes: str | None = Field(default=None, max_length=500)

    @field_validator("scheduled_at")
    @classmethod
    def validate_scheduled_at(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError(
                "Preferred appointment date and time must include a timezone."
            )
        utc_value = value.astimezone(timezone.utc)
        now = datetime.now(timezone.utc)
        if utc_value <= now + timedelta(minutes=5):
            raise ValueError(
                "Please choose a future appointment time at least a few minutes from now."
            )
        if utc_value > now + timedelta(days=365):
            raise ValueError(
                "Appointments can be requested up to 12 months in advance."
            )
        return utc_value

    @field_validator("location_or_mode")
    @classmethod
    def validate_location_or_mode(cls, value: str | None) -> str | None:
        cleaned = _clean_optional_text(value)
        if cleaned is None:
            return None
        if cleaned not in _SAFE_LOCATION_MODES:
            allowed = ", ".join(sorted(_SAFE_LOCATION_MODES))
            raise ValueError(f"Visit mode must be one of: {allowed}.")
        return cleaned

    @field_validator("notes")
    @classmethod
    def validate_notes(cls, value: str | None) -> str | None:
        return _clean_optional_text(value)


class AppointmentResponse(BaseModel):
    """Patient-safe appointment representation (no private clinician emails)."""

    id: str
    scheduled_at: datetime
    appointment_type: str
    status: AppointmentStatus
    location_or_mode: str | None
    notes: str | None
    status_note: str | None = None
    assigned_doctor_name: str | None
    is_upcoming: bool
    created_at: datetime
    updated_at: datetime


class AppointmentListResponse(BaseModel):
    """Appointments owned by the authenticated patient."""

    items: list[AppointmentResponse]
    total: int
    upcoming_count: int
    past_count: int


# ---------------------------------------------------------------------------
# Referrals (Read-only for patients)
# ---------------------------------------------------------------------------


class ReferralResponse(BaseModel):
    """Patient-safe specialist/department referral record."""

    id: str
    referred_department: str
    referring_doctor_name: str | None
    reason: str | None
    next_action: str | None
    status: ReferralStatus
    created_at: datetime
    updated_at: datetime


class ReferralListResponse(BaseModel):
    """Referrals owned by the authenticated patient."""

    items: list[ReferralResponse]
    total: int
    active_count: int


# ---------------------------------------------------------------------------
# Follow-ups
# ---------------------------------------------------------------------------


class FollowUpResponse(BaseModel):
    """Patient-safe care follow-up task with computed overdue indicator."""

    id: str
    related_appointment_id: str | None
    related_referral_id: str | None
    scheduled_at: datetime
    follow_up_type: str
    status: FollowUpStatus
    notes: str | None
    is_overdue: bool
    created_at: datetime
    updated_at: datetime


class FollowUpListResponse(BaseModel):
    """Follow-ups owned by the authenticated patient."""

    items: list[FollowUpResponse]
    total: int
    upcoming_count: int
    overdue_count: int
    completed_count: int


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------


class NotificationResponse(BaseModel):
    """In-app notification belonging strictly to the authenticated user."""

    id: str
    title: str
    message: str
    notification_type: NotificationType
    is_read: bool
    created_at: datetime


class NotificationListResponse(BaseModel):
    """List of patient notifications with real unread count."""

    items: list[NotificationResponse]
    total: int
    unread_count: int


class NotificationMarkReadResponse(BaseModel):
    """Updated notification and remaining unread count."""

    notification: NotificationResponse
    unread_count: int


class NotificationMarkAllReadResponse(BaseModel):
    """Summary returned when marking all notifications as read."""

    marked_count: int
    unread_count: int


# ---------------------------------------------------------------------------
# Patient Dashboard Overview
# ---------------------------------------------------------------------------


class JourneyStageResponse(BaseModel):
    """Truthful status of one step in the 6-stage Patient Health Journey."""

    key: Literal[
        "screening",
        "report_submitted",
        "review",
        "referral",
        "appointment",
        "follow_up",
    ]
    label: str
    status: Literal["completed", "current", "upcoming"]
    detail: str


class PatientActivityItem(BaseModel):
    """Single recent activity entry derived solely from real patient records."""

    id: str
    category: Literal["report", "appointment", "referral", "follow_up"]
    title: str
    description: str
    status: str
    occurred_at: datetime
    link_path: str


class PatientOverviewMetrics(BaseModel):
    """Top-level real counters for the patient dashboard overview."""

    profile_completion_percentage: int
    profile_completed_fields: int
    profile_total_fields: int
    total_reports: int
    pending_review_reports: int
    upcoming_appointments: int
    pending_referrals: int
    attention_follow_ups: int
    overdue_follow_ups: int
    unread_notifications: int


class PatientOverviewResponse(BaseModel):
    """Aggregated real backend payload for ``/patient``."""

    patient_name: str
    preferred_language: PreferredLanguage
    metrics: PatientOverviewMetrics
    journey: list[JourneyStageResponse]
    recent_activity: list[PatientActivityItem]
