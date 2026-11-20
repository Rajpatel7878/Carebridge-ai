"""SQLAlchemy ORM model registry for CareBridge AI.

Importing this package registers all mapped models with ``Base.metadata`` so
Alembic migrations can detect schema changes reliably.
"""

from app.models.audit_log import AuditLog
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
from app.models.notification import Notification, NotificationType
from app.models.patient_doctor_assignment import (
    AssignmentStatus,
    PatientDoctorAssignment,
)
from app.models.patient_profile import GenderOption, PatientProfile, PreferredLanguage
from app.models.referral import Referral, ReferralStatus
from app.models.referral_history import ReferralHistory
from app.models.refresh_token import RefreshToken
from app.models.priority_assessment import PriorityAssessment
from app.models.report_analysis import ReportAnalysis
from app.models.report_review import DoctorReportReviewStatus, ReportReview
from app.models.risk_assessment import (
    RiskAssessment,
    RiskAssessmentSource,
    RiskAssessmentStatus,
    RiskCategory,
)
from app.models.user import User, UserRole

__all__ = [
    "Appointment",
    "AppointmentStatus",
    "AppointmentType",
    "AssignmentStatus",
    "ClinicalReview",
    "ClinicalReviewStatus",
    "DoctorProfile",
    "DoctorReportReviewStatus",
    "DoctorVerificationStatus",
    "FollowUp",
    "FollowUpStatus",
    "GenderOption",
    "MedicalReport",
    "Notification",
    "NotificationType",
    "PatientDoctorAssignment",
    "PatientProfile",
    "PreferredLanguage",
    "Referral",
    "ReferralHistory",
    "ReferralStatus",
    "RefreshToken",
    "ReportFileType",
    "ReportReview",
    "ReportReviewStatus",
    "ReportUploadStatus",
    "RiskAssessment",
    "RiskAssessmentSource",
    "RiskAssessmentStatus",
    "RiskCategory",
    "User",
    "UserRole",
]
