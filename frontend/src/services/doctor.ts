import { apiClient } from '@/services/api';
import type {
  AssignmentStatusCode,
  CareAssignment,
  CareAssignmentCreatePayload,
  CareAssignmentListResponse,
  CareAssignmentUpdatePayload,
  ClinicalReviewCreatePayload,
  DoctorAppointmentItem,
  DoctorAppointmentListResponse,
  DoctorAppointmentReschedulePayload,
  DoctorAppointmentScope,
  DoctorAppointmentStatusPayload,
  DoctorFollowUpCreatePayload,
  DoctorFollowUpItem,
  DoctorFollowUpListResponse,
  DoctorFollowUpScope,
  DoctorFollowUpUpdatePayload,
  DoctorOverviewResponse,
  DoctorPatientDetail,
  DoctorPatientListResponse,
  DoctorPatientStatusFilter,
  DoctorProfile,
  DoctorProfileUpdatePayload,
  DoctorReferralCreatePayload,
  DoctorReferralItem,
  DoctorReferralListResponse,
  DoctorReferralStatusPayload,
  DoctorReportDetail,
  DoctorReportListResponse,
  DoctorRiskAssessmentItem,
  DoctorRiskAssessmentListResponse,
  ReportReviewCreatePayload,
} from '@/types/doctor';
import type {
  AppointmentStatusCode,
  FollowUpStatusCode,
  PatientNotificationListResponse,
  PatientNotificationMarkAllReadResponse,
  PatientNotificationMarkReadResponse,
  ReferralStatusCode,
  ReportFileType,
  ReportReviewStatus,
  RiskAssessmentStatus,
  RiskCategoryCode,
} from '@/types/patient';

// ---------------------------------------------------------------------------
// Doctor Dashboard Overview & Clinician Profile
// ---------------------------------------------------------------------------

export async function fetchDoctorOverview(): Promise<DoctorOverviewResponse> {
  const { data } =
    await apiClient.get<DoctorOverviewResponse>('/doctor/overview');
  return data;
}

export async function fetchDoctorProfile(): Promise<DoctorProfile> {
  const { data } = await apiClient.get<DoctorProfile>('/doctor/profile');
  return data;
}

export async function updateDoctorProfile(
  payload: DoctorProfileUpdatePayload,
): Promise<DoctorProfile> {
  const { data } = await apiClient.put<DoctorProfile>(
    '/doctor/profile',
    payload,
  );
  return data;
}

// ---------------------------------------------------------------------------
// Assigned Patients & Comprehensive Patient Detail
// ---------------------------------------------------------------------------

export interface DoctorPatientQueryParams {
  search?: string;
  status?: DoctorPatientStatusFilter;
  page?: number;
  page_size?: number;
}

export async function fetchDoctorPatients(
  params?: DoctorPatientQueryParams,
): Promise<DoctorPatientListResponse> {
  const query: Record<string, string | number> = {};
  if (params?.search?.trim()) query.search = params.search.trim();
  if (params?.status && params.status !== 'ALL') query.status = params.status;
  if (params?.page) query.page = params.page;
  if (params?.page_size) query.page_size = params.page_size;

  const { data } = await apiClient.get<DoctorPatientListResponse>(
    '/doctor/patients',
    { params: query },
  );
  return data;
}

export async function fetchDoctorPatientDetail(
  patientId: string,
): Promise<DoctorPatientDetail> {
  const { data } = await apiClient.get<DoctorPatientDetail>(
    `/doctor/patients/${encodeURIComponent(patientId)}`,
  );
  return data;
}

// ---------------------------------------------------------------------------
// Medical Report Review & Authorized Download
// ---------------------------------------------------------------------------

export interface DoctorReportQueryParams {
  patient_id?: string;
  review_status?: ReportReviewStatus;
  file_type?: ReportFileType;
  search?: string;
  page?: number;
  page_size?: number;
}

export async function fetchDoctorReports(
  params?: DoctorReportQueryParams,
): Promise<DoctorReportListResponse> {
  const query: Record<string, string | number> = {};
  if (params?.patient_id) query.patient_id = params.patient_id;
  if (params?.review_status) query.review_status = params.review_status;
  if (params?.file_type) query.file_type = params.file_type;
  if (params?.search?.trim()) query.search = params.search.trim();
  if (params?.page) query.page = params.page;
  if (params?.page_size) query.page_size = params.page_size;

  const { data } = await apiClient.get<DoctorReportListResponse>(
    '/doctor/reports',
    { params: query },
  );
  return data;
}

export async function fetchDoctorReportDetail(
  reportId: string,
): Promise<DoctorReportDetail> {
  const { data } = await apiClient.get<DoctorReportDetail>(
    `/doctor/reports/${encodeURIComponent(reportId)}`,
  );
  return data;
}

export async function submitDoctorReportReview(
  reportId: string,
  payload: ReportReviewCreatePayload,
): Promise<DoctorReportDetail> {
  const { data } = await apiClient.post<DoctorReportDetail>(
    `/doctor/reports/${encodeURIComponent(reportId)}/review`,
    payload,
  );
  return data;
}

export async function downloadDoctorReport(
  reportId: string,
  fallbackFilename: string,
): Promise<void> {
  const response = await apiClient.get<Blob>(
    `/doctor/reports/${encodeURIComponent(reportId)}/download`,
    {
      responseType: 'blob',
      timeout: 60_000,
    },
  );

  let filename = fallbackFilename || 'medical-report';
  const disposition = response.headers['content-disposition'];
  if (typeof disposition === 'string') {
    const utf8Match = /filename\*=UTF-8''([^;\r\n]+)/i.exec(disposition);
    const asciiMatch = /filename="([^"]+)"/i.exec(disposition);
    if (utf8Match?.[1]) {
      try {
        filename = decodeURIComponent(utf8Match[1]);
      } catch {
        // Keep safe fallback filename
      }
    } else if (asciiMatch?.[1]) {
      filename = asciiMatch[1];
    }
  }

  const blobUrl = URL.createObjectURL(response.data);
  try {
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }
}

// ---------------------------------------------------------------------------
// Risk Assessment & Clinical Review
// ---------------------------------------------------------------------------

export interface DoctorRiskQueryParams {
  patient_id?: string;
  status?: RiskAssessmentStatus;
  risk_category?: RiskCategoryCode;
  page?: number;
  page_size?: number;
}

export async function fetchDoctorRiskAssessments(
  params?: DoctorRiskQueryParams,
): Promise<DoctorRiskAssessmentListResponse> {
  const query: Record<string, string | number> = {};
  if (params?.patient_id) query.patient_id = params.patient_id;
  if (params?.status) query.status = params.status;
  if (params?.risk_category) query.risk_category = params.risk_category;
  if (params?.page) query.page = params.page;
  if (params?.page_size) query.page_size = params.page_size;

  const { data } = await apiClient.get<DoctorRiskAssessmentListResponse>(
    '/doctor/risk-assessments',
    { params: query },
  );
  return data;
}

export async function submitDoctorRiskReview(
  assessmentId: string,
  payload: ClinicalReviewCreatePayload,
): Promise<DoctorRiskAssessmentItem> {
  const { data } = await apiClient.post<DoctorRiskAssessmentItem>(
    `/doctor/risk-assessments/${encodeURIComponent(assessmentId)}/review`,
    payload,
  );
  return data;
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

export interface DoctorAppointmentQueryParams {
  scope?: DoctorAppointmentScope;
  status?: AppointmentStatusCode;
  patient_id?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export async function fetchDoctorAppointments(
  params?: DoctorAppointmentQueryParams,
): Promise<DoctorAppointmentListResponse> {
  const query: Record<string, string | number> = {};
  if (params?.scope && params.scope !== 'ALL') query.scope = params.scope;
  if (params?.status) query.status = params.status;
  if (params?.patient_id) query.patient_id = params.patient_id;
  if (params?.search?.trim()) query.search = params.search.trim();
  if (params?.page) query.page = params.page;
  if (params?.page_size) query.page_size = params.page_size;

  const { data } = await apiClient.get<DoctorAppointmentListResponse>(
    '/doctor/appointments',
    { params: query },
  );
  return data;
}

export async function fetchDoctorAppointmentDetail(
  appointmentId: string,
): Promise<DoctorAppointmentItem> {
  const { data } = await apiClient.get<DoctorAppointmentItem>(
    `/doctor/appointments/${encodeURIComponent(appointmentId)}`,
  );
  return data;
}

export async function updateDoctorAppointmentStatus(
  appointmentId: string,
  payload: DoctorAppointmentStatusPayload,
): Promise<DoctorAppointmentItem> {
  const { data } = await apiClient.patch<DoctorAppointmentItem>(
    `/doctor/appointments/${encodeURIComponent(appointmentId)}/status`,
    payload,
  );
  return data;
}

export async function rescheduleDoctorAppointment(
  appointmentId: string,
  payload: DoctorAppointmentReschedulePayload,
): Promise<DoctorAppointmentItem> {
  const { data } = await apiClient.patch<DoctorAppointmentItem>(
    `/doctor/appointments/${encodeURIComponent(appointmentId)}/reschedule`,
    payload,
  );
  return data;
}

// ---------------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------------

export interface DoctorReferralQueryParams {
  status?: ReferralStatusCode;
  department?: string;
  patient_id?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export async function fetchDoctorReferrals(
  params?: DoctorReferralQueryParams,
): Promise<DoctorReferralListResponse> {
  const query: Record<string, string | number> = {};
  if (params?.status) query.status = params.status;
  if (params?.department?.trim()) query.department = params.department.trim();
  if (params?.patient_id) query.patient_id = params.patient_id;
  if (params?.search?.trim()) query.search = params.search.trim();
  if (params?.page) query.page = params.page;
  if (params?.page_size) query.page_size = params.page_size;

  const { data } = await apiClient.get<DoctorReferralListResponse>(
    '/doctor/referrals',
    { params: query },
  );
  return data;
}

export async function createDoctorReferral(
  payload: DoctorReferralCreatePayload,
): Promise<DoctorReferralItem> {
  const { data } = await apiClient.post<DoctorReferralItem>(
    '/doctor/referrals',
    payload,
  );
  return data;
}

export async function updateDoctorReferralStatus(
  referralId: string,
  payload: DoctorReferralStatusPayload,
): Promise<DoctorReferralItem> {
  const { data } = await apiClient.patch<DoctorReferralItem>(
    `/doctor/referrals/${encodeURIComponent(referralId)}/status`,
    payload,
  );
  return data;
}

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------

export interface DoctorFollowUpQueryParams {
  scope?: DoctorFollowUpScope;
  status?: FollowUpStatusCode;
  patient_id?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export async function fetchDoctorFollowUps(
  params?: DoctorFollowUpQueryParams,
): Promise<DoctorFollowUpListResponse> {
  const query: Record<string, string | number> = {};
  if (params?.scope && params.scope !== 'ALL') query.scope = params.scope;
  if (params?.status) query.status = params.status;
  if (params?.patient_id) query.patient_id = params.patient_id;
  if (params?.search?.trim()) query.search = params.search.trim();
  if (params?.page) query.page = params.page;
  if (params?.page_size) query.page_size = params.page_size;

  const { data } = await apiClient.get<DoctorFollowUpListResponse>(
    '/doctor/follow-ups',
    { params: query },
  );
  return data;
}

export async function createDoctorFollowUp(
  payload: DoctorFollowUpCreatePayload,
): Promise<DoctorFollowUpItem> {
  const { data } = await apiClient.post<DoctorFollowUpItem>(
    '/doctor/follow-ups',
    payload,
  );
  return data;
}

export async function updateDoctorFollowUp(
  followUpId: string,
  payload: DoctorFollowUpUpdatePayload,
): Promise<DoctorFollowUpItem> {
  const { data } = await apiClient.patch<DoctorFollowUpItem>(
    `/doctor/follow-ups/${encodeURIComponent(followUpId)}`,
    payload,
  );
  return data;
}

// ---------------------------------------------------------------------------
// Doctor In-App Notifications
// ---------------------------------------------------------------------------

export async function fetchDoctorNotifications(
  unreadOnly = false,
): Promise<PatientNotificationListResponse> {
  const { data } = await apiClient.get<PatientNotificationListResponse>(
    '/doctor/notifications',
    { params: unreadOnly ? { unread_only: true } : undefined },
  );
  return data;
}

export async function markDoctorNotificationRead(
  notificationId: string,
): Promise<PatientNotificationMarkReadResponse> {
  const { data } = await apiClient.patch<PatientNotificationMarkReadResponse>(
    `/doctor/notifications/${encodeURIComponent(notificationId)}/read`,
    {},
  );
  return data;
}

export async function markAllDoctorNotificationsRead(): Promise<PatientNotificationMarkAllReadResponse> {
  const { data } =
    await apiClient.patch<PatientNotificationMarkAllReadResponse>(
      '/doctor/notifications/read-all',
      {},
    );
  return data;
}

// ---------------------------------------------------------------------------
// Admin Patient–Doctor Assignment Governance
// ---------------------------------------------------------------------------

export async function fetchAdminAssignments(params?: {
  doctor_id?: string;
  patient_id?: string;
  status?: AssignmentStatusCode;
}): Promise<CareAssignmentListResponse> {
  const { data } = await apiClient.get<CareAssignmentListResponse>(
    '/admin/assignments',
    { params },
  );
  return data;
}

export async function createAdminAssignment(
  payload: CareAssignmentCreatePayload,
): Promise<CareAssignment> {
  const { data } = await apiClient.post<CareAssignment>(
    '/admin/assignments',
    payload,
  );
  return data;
}

export async function updateAdminAssignment(
  assignmentId: string,
  payload: CareAssignmentUpdatePayload,
): Promise<CareAssignment> {
  const { data } = await apiClient.patch<CareAssignment>(
    `/admin/assignments/${encodeURIComponent(assignmentId)}`,
    payload,
  );
  return data;
}
