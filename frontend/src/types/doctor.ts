import type { BadgeVariant } from '@/components/common/Badge';
import type {
  AppointmentStatusCode,
  AppointmentVisitMode,
  FollowUpStatusCode,
  NotificationTypeCode,
  PatientGender,
  PatientNotification,
  PreferredLanguageCode,
  ReferralStatusCode,
  ReportFileType,
  ReportReviewStatus,
  ReportUploadStatus,
  RiskAssessmentStatus,
  RiskCategoryCode,
} from '@/types/patient';

export type DoctorVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type AssignmentStatusCode = 'ACTIVE' | 'REVOKED' | 'REASSIGNED';

export type DoctorReportReviewDecision =
  'PENDING' | 'IN_REVIEW' | 'REVIEWED' | 'NEEDS_FOLLOW_UP';

export type ClinicalReviewStatusCode =
  'REVIEWED' | 'FLAGGED_FOR_REVIEW' | 'FOLLOW_UP_REQUIRED' | 'ARCHIVED';

export type RiskAssessmentSourceCode =
  'SCREENING_INTAKE' | 'CLINICAL_REVIEW' | 'AI_ASSISTED';

export type DoctorPatientStatusFilter =
  | 'ALL'
  | 'NEEDS_ATTENTION'
  | 'PENDING_REPORTS'
  | 'PENDING_APPOINTMENTS'
  | 'OVERDUE_FOLLOW_UP'
  | 'UP_TO_DATE';

export type DoctorAppointmentScope =
  'ALL' | 'PENDING' | 'UPCOMING' | 'TODAY' | 'COMPLETED' | 'CANCELLED';

export type DoctorFollowUpScope =
  'ALL' | 'PENDING' | 'OVERDUE' | 'COMPLETED' | 'CANCELLED';

// ---------------------------------------------------------------------------
// Doctor Profile
// ---------------------------------------------------------------------------

export interface DoctorProfile {
  id: string;
  user_id: string;
  full_name: string;
  display_name: string;
  email: string;
  role: string;
  is_verified: boolean;
  verification_status: DoctorVerificationStatus;
  specialization: string | null;
  qualification: string | null;
  license_number: string | null;
  department: string | null;
  hospital_or_clinic: string | null;
  experience_years: number | null;
  completion_percentage: number;
  completed_fields: number;
  total_fields: number;
  account_created_at: string;
  created_at: string;
  updated_at: string;
}

export interface DoctorProfileUpdatePayload {
  specialization: string | null;
  qualification: string | null;
  license_number: string | null;
  department: string | null;
  hospital_or_clinic: string | null;
  experience_years: number | null;
}

// ---------------------------------------------------------------------------
// Admin Patient–Doctor Assignments
// ---------------------------------------------------------------------------

export interface CareAssignment {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_email: string;
  doctor_id: string;
  doctor_name: string;
  doctor_email: string;
  assigned_by_id: string | null;
  assigned_by_name: string | null;
  status: AssignmentStatusCode;
  notes: string | null;
  assigned_at: string;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CareAssignmentListResponse {
  items: CareAssignment[];
  total: number;
  active_count: number;
}

export interface CareAssignmentCreatePayload {
  patient_id: string;
  doctor_id: string;
  notes?: string | null;
  replace_existing_active?: boolean;
}

export interface CareAssignmentUpdatePayload {
  status: 'REVOKED' | 'REASSIGNED';
  new_doctor_id?: string | null;
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Patient Management & Detail
// ---------------------------------------------------------------------------

export interface DoctorPatientSummary {
  patient_id: string;
  assignment_id: string;
  assigned_at: string;
  full_name: string;
  date_of_birth: string | null;
  gender: PatientGender | null;
  city: string | null;
  state: string | null;
  preferred_language: PreferredLanguageCode;
  total_reports: number;
  pending_reports: number;
  upcoming_appointments: number;
  pending_appointments: number;
  active_referrals: number;
  pending_follow_ups: number;
  overdue_follow_ups: number;
  latest_risk_category: RiskCategoryCode | null;
  requires_attention: boolean;
  attention_reasons: string[];
  last_activity_at: string | null;
}

export interface DoctorPatientListResponse {
  items: DoctorPatientSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DoctorPatientProfileSection {
  patient_id: string;
  full_name: string;
  email: string;
  account_created_at: string;
  assignment_id: string;
  assignment_status: AssignmentStatusCode;
  assigned_at: string;
  date_of_birth: string | null;
  phone_number: string | null;
  gender: PatientGender | null;
  city: string | null;
  state: string | null;
  preferred_language: PreferredLanguageCode;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

// ---------------------------------------------------------------------------
// Medical Report Review
// ---------------------------------------------------------------------------

export interface ReportReviewHistoryItem {
  id: string;
  report_id: string;
  doctor_id: string | null;
  doctor_name: string | null;
  review_status: DoctorReportReviewDecision;
  review_note: string | null;
  reviewed_at: string;
  created_at: string;
}

export interface DoctorReportSummary {
  id: string;
  patient_id: string;
  patient_name: string;
  original_filename: string;
  file_type: ReportFileType;
  file_size: number;
  upload_status: ReportUploadStatus;
  review_status: ReportReviewStatus;
  review_count: number;
  latest_reviewed_at: string | null;
  latest_reviewer_name: string | null;
  uploaded_at: string;
  updated_at: string;
}

export interface DoctorReportDetail {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_city: string | null;
  patient_state: string | null;
  original_filename: string;
  file_type: ReportFileType;
  file_size: number;
  upload_status: ReportUploadStatus;
  review_status: ReportReviewStatus;
  uploaded_at: string;
  updated_at: string;
  reviews: ReportReviewHistoryItem[];
}

export interface DoctorReportListResponse {
  items: DoctorReportSummary[];
  total: number;
  pending_count: number;
  in_review_count: number;
  needs_follow_up_count: number;
  reviewed_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ReportReviewCreatePayload {
  review_status: DoctorReportReviewDecision;
  review_note?: string | null;
}

// ---------------------------------------------------------------------------
// Risk Assessment & Clinical Review
// ---------------------------------------------------------------------------

export interface ClinicalReviewItem {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  doctor_name: string | null;
  related_assessment_id: string | null;
  review_status: ClinicalReviewStatusCode;
  review_note: string | null;
  recommended_action: string | null;
  reviewed_at: string;
  created_at: string;
}

export interface DoctorRiskAssessmentItem {
  id: string;
  patient_id: string;
  patient_name: string;
  related_report_id: string | null;
  status: RiskAssessmentStatus;
  risk_category: RiskCategoryCode | null;
  source: RiskAssessmentSourceCode | null;
  is_ai_assisted: boolean;
  explanation: string | null;
  recommended_action: string | null;
  reviewed_by_doctor_name: string | null;
  assessed_at: string;
  updated_at: string;
  clinical_reviews: ClinicalReviewItem[];
}

export interface DoctorRiskAssessmentListResponse {
  items: DoctorRiskAssessmentItem[];
  total: number;
  pending_count: number;
  flagged_count: number;
  reviewed_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  disclaimer: string;
}

export interface ClinicalReviewCreatePayload {
  review_status: ClinicalReviewStatusCode;
  review_note: string;
  recommended_action?: string | null;
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

export interface DoctorAppointmentItem {
  id: string;
  patient_id: string;
  patient_name: string;
  doctor_id: string | null;
  assigned_doctor_name: string | null;
  scheduled_at: string;
  appointment_type: string;
  status: AppointmentStatusCode;
  location_or_mode: string | null;
  notes: string | null;
  status_note: string | null;
  is_upcoming: boolean;
  is_today: boolean;
  created_at: string;
  updated_at: string;
}

export interface DoctorAppointmentListResponse {
  items: DoctorAppointmentItem[];
  total: number;
  pending_count: number;
  upcoming_count: number;
  today_count: number;
  completed_count: number;
  cancelled_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DoctorAppointmentStatusPayload {
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  reason?: string | null;
}

export interface DoctorAppointmentReschedulePayload {
  scheduled_at: string;
  location_or_mode?: AppointmentVisitMode | null;
  reason?: string | null;
}

// ---------------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------------

export interface ReferralHistoryEntry {
  id: string;
  previous_status: ReferralStatusCode | null;
  new_status: ReferralStatusCode;
  changed_by_doctor_name: string | null;
  note: string | null;
  created_at: string;
}

export interface DoctorReferralItem {
  id: string;
  patient_id: string;
  patient_name: string;
  referring_doctor_id: string | null;
  referring_doctor_name: string | null;
  referred_department: string;
  reason: string | null;
  next_action: string | null;
  status: ReferralStatusCode;
  created_at: string;
  updated_at: string;
  history: ReferralHistoryEntry[];
}

export interface DoctorReferralListResponse {
  items: DoctorReferralItem[];
  total: number;
  pending_count: number;
  active_count: number;
  completed_count: number;
  cancelled_count: number;
  allowed_departments: string[];
  coordination_notice: string;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DoctorReferralCreatePayload {
  patient_id: string;
  referred_department: string;
  reason: string;
  next_action?: string | null;
}

export interface DoctorReferralStatusPayload {
  status: ReferralStatusCode;
  next_action?: string | null;
  note?: string | null;
}

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------

export interface DoctorFollowUpItem {
  id: string;
  patient_id: string;
  patient_name: string;
  created_by_doctor_id: string | null;
  created_by_doctor_name: string | null;
  related_appointment_id: string | null;
  related_referral_id: string | null;
  scheduled_at: string;
  follow_up_type: string;
  status: FollowUpStatusCode;
  notes: string | null;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
}

export interface DoctorFollowUpListResponse {
  items: DoctorFollowUpItem[];
  total: number;
  pending_count: number;
  overdue_count: number;
  completed_count: number;
  cancelled_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DoctorFollowUpCreatePayload {
  patient_id: string;
  follow_up_type: string;
  scheduled_at: string;
  related_appointment_id?: string | null;
  related_referral_id?: string | null;
  notes?: string | null;
}

export interface DoctorFollowUpUpdatePayload {
  status?: FollowUpStatusCode;
  scheduled_at?: string;
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Activity, Patient Dossier & Dashboard Overview
// ---------------------------------------------------------------------------

export interface DoctorActivityItem {
  id: string;
  category:
    | 'assignment'
    | 'report'
    | 'review'
    | 'risk'
    | 'appointment'
    | 'referral'
    | 'follow_up';
  patient_id: string;
  patient_name: string;
  title: string;
  description: string;
  status: string;
  occurred_at: string;
  link_path: string;
}

export interface DoctorPatientDetail {
  profile: DoctorPatientProfileSection;
  requires_attention: boolean;
  attention_reasons: string[];
  reports: DoctorReportSummary[];
  report_reviews: ReportReviewHistoryItem[];
  risk_assessments: DoctorRiskAssessmentItem[];
  appointments: DoctorAppointmentItem[];
  referrals: DoctorReferralItem[];
  follow_ups: DoctorFollowUpItem[];
  recent_activity: DoctorActivityItem[];
  allowed_departments: string[];
  risk_disclaimer: string;
}

export interface DoctorOverviewStatistics {
  total_assigned_patients: number;
  pending_report_reviews: number;
  upcoming_appointments: number;
  patients_requiring_attention: number;
  pending_referrals: number;
  pending_follow_ups: number;
  overdue_follow_ups: number;
  unread_notifications: number;
}

export interface DoctorOverviewResponse {
  doctor_name: string;
  display_name: string;
  specialization: string | null;
  department: string | null;
  verification_status: DoctorVerificationStatus;
  statistics: DoctorOverviewStatistics;
  todays_appointments: DoctorAppointmentItem[];
  recently_assigned_patients: DoctorPatientSummary[];
  reports_awaiting_review: DoctorReportSummary[];
  follow_ups_requiring_attention: DoctorFollowUpItem[];
  recent_activity: DoctorActivityItem[];
}

export type DoctorNotification = PatientNotification;

// ---------------------------------------------------------------------------
// Presentation Maps & Helpers
// ---------------------------------------------------------------------------

export function formatDoctorDisplayName(fullName: string): string {
  const cleaned = fullName.trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'Dr. Clinician';
  if (/^dr\.\s+/i.test(cleaned)) {
    return `Dr. ${cleaned.replace(/^dr\.\s+/i, '')}`;
  }
  if (/^dr\s+/i.test(cleaned)) {
    return `Dr. ${cleaned.replace(/^dr\s+/i, '')}`;
  }
  return `Dr. ${cleaned}`;
}

export const DOCTOR_VERIFICATION_BADGES: Record<
  DoctorVerificationStatus,
  { label: string; variant: BadgeVariant }
> = {
  VERIFIED: { label: 'Admin Verified', variant: 'success' },
  PENDING: { label: 'Pending Admin Verification', variant: 'warning' },
  REJECTED: { label: 'Verification Declined', variant: 'critical' },
};

export const DOCTOR_REVIEW_DECISION_BADGES: Record<
  DoctorReportReviewDecision,
  { label: string; variant: BadgeVariant }
> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  IN_REVIEW: { label: 'In Review', variant: 'primary' },
  REVIEWED: { label: 'Reviewed', variant: 'success' },
  NEEDS_FOLLOW_UP: { label: 'Needs Follow-up', variant: 'critical' },
};

export const CLINICAL_REVIEW_STATUS_BADGES: Record<
  ClinicalReviewStatusCode,
  { label: string; variant: BadgeVariant }
> = {
  REVIEWED: { label: 'Clinically Reviewed', variant: 'success' },
  FLAGGED_FOR_REVIEW: {
    label: 'Flagged for Additional Review',
    variant: 'warning',
  },
  FOLLOW_UP_REQUIRED: { label: 'Follow-up Required', variant: 'critical' },
  ARCHIVED: { label: 'Archived', variant: 'neutral' },
};

export const RISK_SOURCE_BADGES: Record<
  RiskAssessmentSourceCode,
  { label: string; variant: BadgeVariant }
> = {
  SCREENING_INTAKE: { label: 'Screening Intake Record', variant: 'teal' },
  CLINICAL_REVIEW: { label: 'Clinician Recorded', variant: 'primary' },
  AI_ASSISTED: {
    label: 'AI-Assisted (Not a Diagnosis)',
    variant: 'warning',
  },
};

export const REFERRAL_NEXT_STATUSES: Record<
  ReferralStatusCode,
  ReferralStatusCode[]
> = {
  PENDING: ['ACCEPTED', 'SCHEDULED', 'CANCELLED'],
  ACCEPTED: ['SCHEDULED', 'COMPLETED', 'CANCELLED'],
  SCHEDULED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const DOCTOR_NOTIFICATION_ROUTE_MAP: Record<
  NotificationTypeCode,
  string
> = {
  REPORT: '/doctor/reports',
  APPOINTMENT: '/doctor/appointments',
  REFERRAL: '/doctor/referrals',
  FOLLOW_UP: '/doctor/follow-ups',
  PROFILE: '/doctor/profile',
  SYSTEM: '/doctor/patients',
};

export const DEFAULT_REFERRAL_DEPARTMENTS: string[] = [
  'Cardiology',
  'Endocrinology',
  'Internal Medicine',
  'Nephrology',
  'Neurology',
  'Pulmonology',
  'Oncology Screening',
  'Ophthalmology',
  'Orthopedics',
  'Obstetrics & Gynecology',
  'Mental Health & Counseling',
  'Community Preventive Clinic',
  'General Surgery',
  'Diagnostic Radiology',
];

export const RISK_STATUS_BADGES: Record<
  RiskAssessmentStatus,
  { label: string; variant: BadgeVariant }
> = {
  PENDING: { label: 'Pending Review', variant: 'warning' },
  REVIEWED: { label: 'Clinically Reviewed', variant: 'success' },
  ARCHIVED: { label: 'Archived', variant: 'neutral' },
};

export const PATIENT_GENDER_LABELS: Record<PatientGender, string> = {
  FEMALE: 'Female',
  MALE: 'Male',
  NON_BINARY: 'Non-binary',
  OTHER: 'Other',
  PREFER_NOT_TO_SAY: 'Prefer not to say',
};

export const PATIENT_LANGUAGE_LABELS: Record<PreferredLanguageCode, string> = {
  en: 'English',
  hi: 'Hindi (हिन्दी)',
};

export const DOCTOR_VISIT_MODE_OPTIONS: AppointmentVisitMode[] = [
  'In-Person Clinic',
  'Teleconsultation',
  'Community Screening Center',
];

export const DOCTOR_CLINICAL_RISK_DISCLAIMER =
  'Risk records support care coordination only and are never a substitute for independent clinical examination or professional diagnosis. Automated or AI-assisted entries, when present, are labeled separately from clinician reviews.';
