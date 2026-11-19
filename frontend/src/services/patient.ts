import { apiClient } from '@/services/api';
import type {
  AppointmentRequestPayload,
  AppointmentStatusCode,
  FollowUpStatusCode,
  PatientAppointment,
  PatientAppointmentListResponse,
  PatientFollowUp,
  PatientFollowUpListResponse,
  PatientMedicalReport,
  PatientMedicalReportListResponse,
  PatientNotificationListResponse,
  PatientNotificationMarkAllReadResponse,
  PatientNotificationMarkReadResponse,
  PatientOverviewResponse,
  PatientProfile,
  PatientProfileUpdatePayload,
  PatientReferral,
  PatientReferralListResponse,
  PatientRiskAssessmentListResponse,
  ReferralStatusCode,
  ReportFileType,
  ReportReviewStatus,
} from '@/types/patient';

// ---------------------------------------------------------------------------
// Dashboard Overview
// ---------------------------------------------------------------------------

export async function fetchPatientOverview(): Promise<PatientOverviewResponse> {
  const { data } =
    await apiClient.get<PatientOverviewResponse>('/patient/overview');
  return data;
}

// ---------------------------------------------------------------------------
// Patient Profile
// ---------------------------------------------------------------------------

export async function fetchPatientProfile(): Promise<PatientProfile> {
  const { data } = await apiClient.get<PatientProfile>('/patient/profile');
  return data;
}

export async function updatePatientProfile(
  payload: PatientProfileUpdatePayload,
): Promise<PatientProfile> {
  const { data } = await apiClient.put<PatientProfile>(
    '/patient/profile',
    payload,
  );
  return data;
}

// ---------------------------------------------------------------------------
// Medical Reports (Private Upload, List, Detail, Authorized Download)
// ---------------------------------------------------------------------------

export interface ReportFilterParams {
  file_type?: ReportFileType;
  review_status?: ReportReviewStatus;
  search?: string;
}

export async function fetchPatientReports(
  params?: ReportFilterParams,
): Promise<PatientMedicalReportListResponse> {
  const query: Record<string, string> = {};
  if (params?.file_type) query.file_type = params.file_type;
  if (params?.review_status) query.review_status = params.review_status;
  if (params?.search?.trim()) query.search = params.search.trim();

  const { data } = await apiClient.get<PatientMedicalReportListResponse>(
    '/patient/reports',
    { params: query },
  );
  return data;
}

export async function fetchPatientReportDetail(
  reportId: string,
): Promise<PatientMedicalReport> {
  const { data } = await apiClient.get<PatientMedicalReport>(
    `/patient/reports/${encodeURIComponent(reportId)}`,
  );
  return data;
}

export async function uploadPatientReport(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<PatientMedicalReport> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post<PatientMedicalReport>(
    '/patient/reports',
    formData,
    {
      timeout: 60_000,
      headers: {
        // Let the browser attach the exact multipart boundary automatically
        'Content-Type': undefined,
      },
      onUploadProgress: (event) => {
        if (!onProgress) return;
        if (event.total && event.total > 0) {
          const pct = Math.min(
            100,
            Math.max(0, Math.round((event.loaded / event.total) * 100)),
          );
          onProgress(pct);
        }
      },
    },
  );
  return data;
}

export async function downloadPatientReport(
  reportId: string,
  fallbackFilename: string,
): Promise<void> {
  const response = await apiClient.get<Blob>(
    `/patient/reports/${encodeURIComponent(reportId)}/download`,
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
        // Keep safe fallback filename if header encoding is malformed
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
// Read-only Risk Assessments
// ---------------------------------------------------------------------------

export async function fetchPatientRiskAssessments(): Promise<PatientRiskAssessmentListResponse> {
  const { data } = await apiClient.get<PatientRiskAssessmentListResponse>(
    '/patient/risk-assessments',
  );
  return data;
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

export async function fetchPatientAppointments(
  status?: AppointmentStatusCode,
): Promise<PatientAppointmentListResponse> {
  const { data } = await apiClient.get<PatientAppointmentListResponse>(
    '/patient/appointments',
    { params: status ? { status } : undefined },
  );
  return data;
}

export async function fetchPatientAppointmentDetail(
  appointmentId: string,
): Promise<PatientAppointment> {
  const { data } = await apiClient.get<PatientAppointment>(
    `/patient/appointments/${encodeURIComponent(appointmentId)}`,
  );
  return data;
}

export async function requestPatientAppointment(
  payload: AppointmentRequestPayload,
): Promise<PatientAppointment> {
  const { data } = await apiClient.post<PatientAppointment>(
    '/patient/appointments/request',
    payload,
  );
  return data;
}

export async function cancelPatientAppointment(
  appointmentId: string,
): Promise<PatientAppointment> {
  const { data } = await apiClient.patch<PatientAppointment>(
    `/patient/appointments/${encodeURIComponent(appointmentId)}/cancel`,
    {},
  );
  return data;
}

// ---------------------------------------------------------------------------
// Referrals (Read-only for patients)
// ---------------------------------------------------------------------------

export async function fetchPatientReferrals(
  status?: ReferralStatusCode,
): Promise<PatientReferralListResponse> {
  const { data } = await apiClient.get<PatientReferralListResponse>(
    '/patient/referrals',
    { params: status ? { status } : undefined },
  );
  return data;
}

export async function fetchPatientReferralDetail(
  referralId: string,
): Promise<PatientReferral> {
  const { data } = await apiClient.get<PatientReferral>(
    `/patient/referrals/${encodeURIComponent(referralId)}`,
  );
  return data;
}

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------

export async function fetchPatientFollowUps(
  status?: FollowUpStatusCode,
): Promise<PatientFollowUpListResponse> {
  const { data } = await apiClient.get<PatientFollowUpListResponse>(
    '/patient/follow-ups',
    { params: status ? { status } : undefined },
  );
  return data;
}

export async function fetchPatientFollowUpDetail(
  followUpId: string,
): Promise<PatientFollowUp> {
  const { data } = await apiClient.get<PatientFollowUp>(
    `/patient/follow-ups/${encodeURIComponent(followUpId)}`,
  );
  return data;
}

export async function completePatientFollowUp(
  followUpId: string,
): Promise<PatientFollowUp> {
  const { data } = await apiClient.patch<PatientFollowUp>(
    `/patient/follow-ups/${encodeURIComponent(followUpId)}/complete`,
    {},
  );
  return data;
}

// ---------------------------------------------------------------------------
// In-App Notifications
// ---------------------------------------------------------------------------

export async function fetchPatientNotifications(
  unreadOnly = false,
): Promise<PatientNotificationListResponse> {
  const { data } = await apiClient.get<PatientNotificationListResponse>(
    '/patient/notifications',
    { params: unreadOnly ? { unread_only: true } : undefined },
  );
  return data;
}

export async function markPatientNotificationRead(
  notificationId: string,
): Promise<PatientNotificationMarkReadResponse> {
  const { data } = await apiClient.patch<PatientNotificationMarkReadResponse>(
    `/patient/notifications/${encodeURIComponent(notificationId)}/read`,
    {},
  );
  return data;
}

export async function markAllPatientNotificationsRead(): Promise<PatientNotificationMarkAllReadResponse> {
  const { data } =
    await apiClient.patch<PatientNotificationMarkAllReadResponse>(
      '/patient/notifications/read-all',
      {},
    );
  return data;
}
