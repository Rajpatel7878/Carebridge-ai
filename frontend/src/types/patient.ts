import type { BadgeVariant } from '@/components/common/Badge';

export type PreferredLanguageCode = 'en' | 'hi';

export type PatientGender =
  'FEMALE' | 'MALE' | 'NON_BINARY' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export type ReportFileType = 'PDF' | 'PNG' | 'JPG';
export type ReportUploadStatus = 'UPLOADED' | 'FAILED';
export type ReportReviewStatus = 'PENDING_REVIEW' | 'IN_REVIEW' | 'REVIEWED';

export type RiskAssessmentStatus = 'PENDING' | 'REVIEWED' | 'ARCHIVED';
export type RiskCategoryCode = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type AppointmentStatusCode =
  'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export type AppointmentTypeCode =
  | 'SCREENING_REVIEW'
  | 'GENERAL_CONSULTATION'
  | 'FOLLOW_UP_VISIT'
  | 'REFERRAL_CONSULTATION'
  | 'PREVENTIVE_CHECKUP';

export type AppointmentVisitMode =
  'In-Person Clinic' | 'Teleconsultation' | 'Community Screening Center';

export type ReferralStatusCode =
  'PENDING' | 'ACCEPTED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export type FollowUpStatusCode =
  'PENDING' | 'COMPLETED' | 'MISSED' | 'CANCELLED';

export type NotificationTypeCode =
  'REPORT' | 'APPOINTMENT' | 'REFERRAL' | 'FOLLOW_UP' | 'PROFILE' | 'SYSTEM';

export interface PatientProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  is_verified: boolean;
  account_created_at: string;
  date_of_birth: string | null;
  phone_number: string | null;
  gender: PatientGender | null;
  city: string | null;
  state: string | null;
  preferred_language: PreferredLanguageCode;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  completion_percentage: number;
  completed_fields: number;
  total_fields: number;
  created_at: string;
  updated_at: string;
}

export interface PatientProfileUpdatePayload {
  date_of_birth: string | null;
  phone_number: string | null;
  gender: PatientGender | null;
  city: string | null;
  state: string | null;
  preferred_language: PreferredLanguageCode;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

export interface PatientMedicalReport {
  id: string;
  original_filename: string;
  file_type: ReportFileType;
  file_size: number;
  upload_status: ReportUploadStatus;
  review_status: ReportReviewStatus;
  uploaded_at: string;
  updated_at: string;
}

export interface PatientMedicalReportListResponse {
  items: PatientMedicalReport[];
  total: number;
  max_upload_mb: number;
  allowed_file_types: ReportFileType[];
}

export interface PatientRiskAssessment {
  id: string;
  related_report_id: string | null;
  status: RiskAssessmentStatus;
  risk_category: RiskCategoryCode | null;
  explanation: string | null;
  reviewing_professional_name: string | null;
  recommended_action: string | null;
  assessed_at: string;
  updated_at: string;
}

export interface PatientRiskAssessmentListResponse {
  items: PatientRiskAssessment[];
  total: number;
  disclaimer: string;
}

export interface PatientAppointment {
  id: string;
  scheduled_at: string;
  appointment_type: string;
  status: AppointmentStatusCode;
  location_or_mode: string | null;
  notes: string | null;
  assigned_doctor_name: string | null;
  is_upcoming: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatientAppointmentListResponse {
  items: PatientAppointment[];
  total: number;
  upcoming_count: number;
  past_count: number;
}

export interface AppointmentRequestPayload {
  scheduled_at: string;
  appointment_type: AppointmentTypeCode;
  location_or_mode: AppointmentVisitMode;
  notes?: string | null;
}

export interface PatientReferral {
  id: string;
  referred_department: string;
  referring_doctor_name: string | null;
  reason: string | null;
  next_action: string | null;
  status: ReferralStatusCode;
  created_at: string;
  updated_at: string;
}

export interface PatientReferralListResponse {
  items: PatientReferral[];
  total: number;
  active_count: number;
}

export interface PatientFollowUp {
  id: string;
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

export interface PatientFollowUpListResponse {
  items: PatientFollowUp[];
  total: number;
  upcoming_count: number;
  overdue_count: number;
  completed_count: number;
}

export interface PatientNotification {
  id: string;
  title: string;
  message: string;
  notification_type: NotificationTypeCode;
  is_read: boolean;
  created_at: string;
}

export interface PatientNotificationListResponse {
  items: PatientNotification[];
  total: number;
  unread_count: number;
}

export interface PatientNotificationMarkReadResponse {
  notification: PatientNotification;
  unread_count: number;
}

export interface PatientNotificationMarkAllReadResponse {
  marked_count: number;
  unread_count: number;
}

export interface PatientJourneyStage {
  key:
    | 'screening'
    | 'report_submitted'
    | 'review'
    | 'referral'
    | 'appointment'
    | 'follow_up';
  label: string;
  status: 'completed' | 'current' | 'upcoming';
  detail: string;
}

export interface PatientActivityItem {
  id: string;
  category: 'report' | 'appointment' | 'referral' | 'follow_up';
  title: string;
  description: string;
  status: string;
  occurred_at: string;
  link_path: string;
}

export interface PatientOverviewMetrics {
  profile_completion_percentage: number;
  profile_completed_fields: number;
  profile_total_fields: number;
  total_reports: number;
  pending_review_reports: number;
  upcoming_appointments: number;
  pending_referrals: number;
  attention_follow_ups: number;
  overdue_follow_ups: number;
  unread_notifications: number;
}

export interface PatientOverviewResponse {
  patient_name: string;
  preferred_language: PreferredLanguageCode;
  metrics: PatientOverviewMetrics;
  journey: PatientJourneyStage[];
  recent_activity: PatientActivityItem[];
}

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentTypeCode, string> = {
  SCREENING_REVIEW: 'Screening Review',
  GENERAL_CONSULTATION: 'General Consultation',
  FOLLOW_UP_VISIT: 'Follow-up Visit',
  REFERRAL_CONSULTATION: 'Referral Consultation',
  PREVENTIVE_CHECKUP: 'Preventive Checkup',
};

export function formatAppointmentType(value: string): string {
  if (value in APPOINTMENT_TYPE_LABELS) {
    return APPOINTMENT_TYPE_LABELS[value as AppointmentTypeCode];
  }
  return value
    .toLowerCase()
    .split('_')
    .map((part) => (part[0] ? part[0].toUpperCase() + part.slice(1) : ''))
    .join(' ');
}

export const REPORT_REVIEW_BADGES: Record<
  ReportReviewStatus,
  { label: string; variant: BadgeVariant }
> = {
  PENDING_REVIEW: { label: 'Pending Review', variant: 'warning' },
  IN_REVIEW: { label: 'In Review', variant: 'primary' },
  REVIEWED: { label: 'Reviewed', variant: 'success' },
};

export const APPOINTMENT_STATUS_BADGES: Record<
  AppointmentStatusCode,
  { label: string; variant: BadgeVariant }
> = {
  PENDING: { label: 'Pending Confirmation', variant: 'warning' },
  CONFIRMED: { label: 'Confirmed', variant: 'primary' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'neutral' },
};

export const REFERRAL_STATUS_BADGES: Record<
  ReferralStatusCode,
  { label: string; variant: BadgeVariant }
> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  ACCEPTED: { label: 'Accepted', variant: 'teal' },
  SCHEDULED: { label: 'Scheduled', variant: 'primary' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'neutral' },
};

export const FOLLOW_UP_STATUS_BADGES: Record<
  FollowUpStatusCode,
  { label: string; variant: BadgeVariant }
> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  MISSED: { label: 'Missed', variant: 'critical' },
  CANCELLED: { label: 'Cancelled', variant: 'neutral' },
};

export const RISK_CATEGORY_BADGES: Record<
  RiskCategoryCode,
  { label: string; variant: BadgeVariant }
> = {
  LOW: { label: 'Low Priority', variant: 'success' },
  MODERATE: { label: 'Moderate Priority', variant: 'warning' },
  HIGH: { label: 'High Priority', variant: 'critical' },
  CRITICAL: { label: 'Urgent Priority', variant: 'critical' },
};

export const NOTIFICATION_ROUTE_MAP: Record<NotificationTypeCode, string> = {
  REPORT: '/patient/reports',
  APPOINTMENT: '/patient/appointments',
  REFERRAL: '/patient/referrals',
  FOLLOW_UP: '/patient/follow-ups',
  PROFILE: '/patient/profile',
  SYSTEM: '/patient/notifications',
};

export const RISK_COORDINATION_DISCLAIMER =
  'Risk information is intended to support healthcare coordination and does not replace professional medical advice or diagnosis.';
