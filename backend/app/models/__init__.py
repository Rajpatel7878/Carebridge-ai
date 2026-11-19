"""SQLAlchemy ORM model registry for CareBridge AI.

Importing this package registers all mapped models with ``Base.metadata`` so
Alembic migrations can detect schema changes reliably.
"""

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
from app.models.refresh_token import RefreshToken
from app.models.risk_assessment import (
    RiskAssessment,
    RiskAssessmentStatus,
    RiskCategory,
)
from app.models.user import User, UserRole

__all__ = [
    "Appointment",
    "AppointmentStatus",
    "AppointmentType",
    "FollowUp",
    "FollowUpStatus",
    "GenderOption",
    "MedicalReport",
    "Notification",
    "NotificationType",
    "PatientProfile",
    "PreferredLanguage",
    "Referral",
    "ReferralStatus",
    "RefreshToken",
    "ReportFileType",
    "ReportReviewStatus",
    "ReportUploadStatus",
    "RiskAssessment",
    "RiskAssessmentStatus",
    "RiskCategory",
    "User",
    "UserRole",
]
