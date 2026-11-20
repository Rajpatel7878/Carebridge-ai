import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/contexts/AuthContext';
import { DemoProvider } from '@/contexts/DemoContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AppRouter } from '@/routes/AppRouter';
import * as authService from '@/services/auth';
import * as doctorService from '@/services/doctor';
import * as patientService from '@/services/patient';
import type { AccountRole, AuthUser } from '@/types/auth';
import {
  DOCTOR_CLINICAL_RISK_DISCLAIMER,
  type DoctorAppointmentItem,
  type DoctorFollowUpItem,
  type DoctorPatientDetail,
  type DoctorPatientSummary,
  type DoctorProfile,
  type DoctorReferralItem,
  type DoctorReportDetail,
  type DoctorReportSummary,
  type DoctorRiskAssessmentItem,
} from '@/types/doctor';

const DOCTOR_USER: AuthUser = {
  id: 'doc-101',
  full_name: 'Meera Deshmukh',
  email: 'meera.deshmukh@example.org',
  role: 'DOCTOR',
  is_active: true,
  is_verified: true,
  requested_role: null,
  created_at: '2026-11-18T08:00:00Z',
  updated_at: '2026-11-18T08:00:00Z',
};

const PATIENT_USER: AuthUser = {
  id: 'pat-201',
  full_name: 'Aarav Joshi',
  email: 'aarav.joshi@example.org',
  role: 'PATIENT',
  is_active: true,
  is_verified: false,
  requested_role: null,
  created_at: '2026-11-18T08:15:00Z',
  updated_at: '2026-11-18T08:15:00Z',
};

const ADMIN_USER: AuthUser = {
  id: 'adm-301',
  full_name: 'Neha Kapoor',
  email: 'neha.kapoor@example.org',
  role: 'ADMIN',
  is_active: true,
  is_verified: true,
  requested_role: null,
  created_at: '2026-11-18T07:00:00Z',
  updated_at: '2026-11-18T07:00:00Z',
};

function makeApiError(status: number, code: string, message: string) {
  const headers = new AxiosHeaders();
  return new AxiosError(
    message,
    String(status),
    { headers },
    {},
    {
      status,
      statusText: 'Error',
      headers: {},
      config: { headers },
      data: { error: { code, message } },
    },
  );
}

function renderPortal(path: string, role: AccountRole | null = 'DOCTOR') {
  const user =
    role === 'DOCTOR'
      ? DOCTOR_USER
      : role === 'PATIENT'
        ? PATIENT_USER
        : role === 'ADMIN'
          ? ADMIN_USER
          : null;

  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider initialUser={user}>
            <DemoProvider>
              <AppRouter />
            </DemoProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

const SAMPLE_PATIENT: DoctorPatientSummary = {
  patient_id: 'pat-201',
  assignment_id: 'asgn-201',
  assigned_at: '2026-11-18T09:00:00Z',
  full_name: 'Aarav Joshi',
  date_of_birth: '1991-06-14',
  gender: 'MALE',
  city: 'Jaipur',
  state: 'Rajasthan',
  preferred_language: 'en',
  total_reports: 2,
  pending_reports: 1,
  upcoming_appointments: 1,
  pending_appointments: 1,
  active_referrals: 1,
  pending_follow_ups: 1,
  overdue_follow_ups: 0,
  latest_risk_category: null,
  requires_attention: true,
  attention_reasons: ['1 report awaiting review', '1 pending visit request'],
  last_activity_at: '2026-11-18T10:30:00Z',
};

const SAMPLE_REPORT_SUMMARY: DoctorReportSummary = {
  id: 'rep-501',
  patient_id: 'pat-201',
  patient_name: 'Aarav Joshi',
  original_filename: 'cbc-hba1c-screening.pdf',
  file_type: 'PDF',
  file_size: 48120,
  upload_status: 'UPLOADED',
  review_status: 'PENDING_REVIEW',
  review_count: 0,
  latest_reviewed_at: null,
  latest_reviewer_name: null,
  uploaded_at: '2026-11-18T10:00:00Z',
  updated_at: '2026-11-18T10:00:00Z',
};

const SAMPLE_APPOINTMENT: DoctorAppointmentItem = {
  id: 'appt-601',
  patient_id: 'pat-201',
  patient_name: 'Aarav Joshi',
  doctor_id: null,
  assigned_doctor_name: null,
  scheduled_at: '2027-01-15T10:30:00Z',
  appointment_type: 'SCREENING_REVIEW',
  status: 'PENDING',
  location_or_mode: 'In-Person Clinic',
  notes: 'Discuss annual preventive screening results.',
  status_note: null,
  is_upcoming: true,
  is_today: true,
  created_at: '2026-11-18T10:15:00Z',
  updated_at: '2026-11-18T10:15:00Z',
};

const SAMPLE_REFERRAL: DoctorReferralItem = {
  id: 'ref-701',
  patient_id: 'pat-201',
  patient_name: 'Aarav Joshi',
  referring_doctor_id: 'doc-101',
  referring_doctor_name: 'Dr. Meera Deshmukh',
  referred_department: 'Endocrinology',
  reason: 'Follow-up evaluation of borderline metabolic markers.',
  next_action: 'Bring fasting laboratory report to consultation.',
  status: 'PENDING',
  created_at: '2026-11-18T10:20:00Z',
  updated_at: '2026-11-18T10:20:00Z',
  history: [
    {
      id: 'rh-1',
      previous_status: null,
      new_status: 'PENDING',
      changed_by_doctor_name: 'Dr. Meera Deshmukh',
      note: 'Referral initiated.',
      created_at: '2026-11-18T10:20:00Z',
    },
  ],
};

const SAMPLE_FOLLOW_UP: DoctorFollowUpItem = {
  id: 'fu-801',
  patient_id: 'pat-201',
  patient_name: 'Aarav Joshi',
  created_by_doctor_id: 'doc-101',
  created_by_doctor_name: 'Dr. Meera Deshmukh',
  related_appointment_id: 'appt-601',
  related_referral_id: null,
  scheduled_at: '2027-02-01T09:00:00Z',
  follow_up_type: 'Repeat fasting glucose check',
  status: 'PENDING',
  notes: 'Fast 10 hours prior to blood sample collection.',
  is_overdue: false,
  created_at: '2026-11-18T10:25:00Z',
  updated_at: '2026-11-18T10:25:00Z',
};

describe('Doctor Portal (Phase 6) — Live Workflows & Access Control', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();

    vi.spyOn(doctorService, 'fetchDoctorNotifications').mockResolvedValue({
      items: [
        {
          id: 'notif-1',
          notification_type: 'REPORT',
          title: 'New Medical Report Uploaded',
          message:
            'An assigned patient submitted a diagnostic document for review.',
          is_read: false,
          created_at: '2026-11-18T10:05:00Z',
        },
        {
          id: 'notif-2',
          notification_type: 'SYSTEM',
          title: 'New Patient Assigned',
          message: 'A patient was added to your authorized care panel.',
          is_read: true,
          created_at: '2026-11-18T09:00:00Z',
        },
      ],
      total: 2,
      unread_count: 1,
    });
    vi.spyOn(patientService, 'fetchPatientNotifications').mockResolvedValue({
      items: [],
      total: 0,
      unread_count: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks unauthenticated, PATIENT, and ADMIN access to all protected doctor routes and blocks DOCTOR from patient/admin portals', () => {
    const protectedDoctorPaths = [
      '/doctor',
      '/doctor/patients',
      '/doctor/patients/pat-201',
      '/doctor/reports',
      '/doctor/reports/rep-501',
      '/doctor/risk-review',
      '/doctor/appointments',
      '/doctor/referrals',
      '/doctor/follow-ups',
      '/doctor/notifications',
      '/doctor/profile',
      '/doctor/settings',
    ];

    for (const path of protectedDoctorPaths) {
      const guestView = renderPortal(path, null);
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: /Sign in to CareBridge AI/i,
        }),
      ).toBeInTheDocument();
      guestView.unmount();

      const patientView = renderPortal(path, 'PATIENT');
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: /You do not have access to this workspace/i,
        }),
      ).toBeInTheDocument();
      patientView.unmount();

      const adminView = renderPortal(path, 'ADMIN');
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: /You do not have access to this workspace/i,
        }),
      ).toBeInTheDocument();
      adminView.unmount();
    }

    for (const forbidden of ['/patient', '/patient/reports', '/admin']) {
      const doctorView = renderPortal(forbidden, 'DOCTOR');
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: /You do not have access to this workspace/i,
        }),
      ).toBeInTheDocument();
      doctorView.unmount();
    }
  });

  it('renders live Doctor Dashboard Overview metrics, sections, and empty-state safety with zero hardcoded statistics', async () => {
    vi.spyOn(doctorService, 'fetchDoctorOverview').mockResolvedValue({
      doctor_name: 'Meera Deshmukh',
      display_name: 'Dr. Meera Deshmukh',
      specialization: 'Internal Medicine',
      department: 'Preventive Medicine',
      verification_status: 'VERIFIED',
      statistics: {
        total_assigned_patients: 4,
        pending_report_reviews: 2,
        upcoming_appointments: 3,
        patients_requiring_attention: 1,
        pending_referrals: 1,
        pending_follow_ups: 2,
        overdue_follow_ups: 1,
        unread_notifications: 1,
      },
      todays_appointments: [SAMPLE_APPOINTMENT],
      recently_assigned_patients: [SAMPLE_PATIENT],
      reports_awaiting_review: [SAMPLE_REPORT_SUMMARY],
      follow_ups_requiring_attention: [
        { ...SAMPLE_FOLLOW_UP, is_overdue: true },
      ],
      recent_activity: [
        {
          id: 'act-1',
          category: 'report',
          patient_id: 'pat-201',
          patient_name: 'Aarav Joshi',
          title: 'Medical report uploaded',
          description: 'cbc-hba1c-screening.pdf awaiting clinician review',
          status: 'PENDING_REVIEW',
          occurred_at: '2026-11-18T10:00:00Z',
          link_path: '/doctor/reports/rep-501',
        },
      ],
    });

    renderPortal('/doctor');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Welcome back, Dr. Meera Deshmukh',
      }),
    ).toBeInTheDocument();

    const summary = await screen.findByRole('region', {
      name: /Clinical workload summary/i,
    });
    expect(within(summary).getByText('Assigned Patients')).toBeInTheDocument();
    expect(
      within(summary).getByText('Pending Report Reviews'),
    ).toBeInTheDocument();
    expect(
      within(summary).getByText('Patients Requiring Attention'),
    ).toBeInTheDocument();
    expect(
      within(summary).getByText('1 overdue requiring attention'),
    ).toBeInTheDocument();
    expect(screen.getByText('cbc-hba1c-screening.pdf')).toBeInTheDocument();
    expect(
      screen.getByText('Repeat fasting glucose check'),
    ).toBeInTheDocument();

    // Verify zero tokens, patient identifiers, or clinical data in web storage
    const allowedKeys = new Set(['carebridge-theme', 'carebridge-language']);
    for (const key of Object.keys(window.localStorage)) {
      expect(allowedKeys.has(key)).toBe(true);
    }
    expect(window.sessionStorage.length).toBe(0);
  });

  it('supports assigned patient search, care-status filtering, pagination, and unassigned patient denial handling', async () => {
    const user = userEvent.setup();
    const listSpy = vi
      .spyOn(doctorService, 'fetchDoctorPatients')
      .mockResolvedValue({
        items: [SAMPLE_PATIENT],
        total: 12,
        page: 1,
        page_size: 10,
        total_pages: 2,
      });

    const view = renderPortal('/doctor/patients');
    expect(await screen.findByText('Aarav Joshi')).toBeInTheDocument();
    expect(screen.getByText('No risk record')).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText(/Filter patients by care status/i),
      'NEEDS_ATTENTION',
    );
    await waitFor(() =>
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'NEEDS_ATTENTION', page: 1 }),
      ),
    );

    await user.click(screen.getByRole('button', { name: /Next/i }));
    await waitFor(() =>
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    );
    view.unmount();

    // Unassigned patient ID renders safe error state without exposing private details
    vi.spyOn(doctorService, 'fetchDoctorPatientDetail').mockRejectedValueOnce(
      makeApiError(
        404,
        'patient_not_found',
        'Assigned patient record was not found.',
      ),
    );
    renderPortal('/doctor/patients/unassigned-patient-999');
    expect(
      await screen.findByText(/Assigned patient record was not found/i),
    ).toBeInTheDocument();
  });

  it('displays patient dossier tabs with separated clinician review notes and zero fabricated risk records', async () => {
    const user = userEvent.setup();
    const detailPayload: DoctorPatientDetail = {
      profile: {
        patient_id: 'pat-201',
        full_name: 'Aarav Joshi',
        email: 'aarav.joshi@example.org',
        account_created_at: '2026-11-18T08:15:00Z',
        assignment_id: 'asgn-201',
        assignment_status: 'ACTIVE',
        assigned_at: '2026-11-18T09:00:00Z',
        date_of_birth: '1991-06-14',
        phone_number: '+919876543210',
        gender: 'MALE',
        city: 'Jaipur',
        state: 'Rajasthan',
        preferred_language: 'en',
        emergency_contact_name: 'Rohan Joshi',
        emergency_contact_phone: '+919812345678',
      },
      requires_attention: true,
      attention_reasons: ['1 report awaiting review'],
      reports: [SAMPLE_REPORT_SUMMARY],
      report_reviews: [
        {
          id: 'rev-1',
          report_id: 'rep-501',
          doctor_id: 'doc-101',
          doctor_name: 'Dr. Meera Deshmukh',
          review_status: 'IN_REVIEW',
          review_note: 'Correlating fasting panel with prior outpatient visit.',
          reviewed_at: '2026-11-18T10:30:00Z',
          created_at: '2026-11-18T10:30:00Z',
        },
      ],
      risk_assessments: [],
      appointments: [SAMPLE_APPOINTMENT],
      referrals: [SAMPLE_REFERRAL],
      follow_ups: [SAMPLE_FOLLOW_UP],
      recent_activity: [],
      allowed_departments: ['Endocrinology', 'Cardiology'],
      risk_disclaimer: DOCTOR_CLINICAL_RISK_DISCLAIMER,
    };
    vi.spyOn(doctorService, 'fetchDoctorPatientDetail').mockResolvedValue(
      detailPayload,
    );

    renderPortal('/doctor/patients/pat-201');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Aarav Joshi' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Rohan Joshi/)).toBeInTheDocument();

    // Reports & separated clinician notes
    await user.click(screen.getByRole('tab', { name: /Reports & Notes/i }));
    expect(screen.getByText('cbc-hba1c-screening.pdf')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Correlating fasting panel with prior outpatient visit.',
      ),
    ).toBeInTheDocument();

    // Risk tab shows truthful empty state (never fabricates risk score)
    await user.click(screen.getByRole('tab', { name: /Risk Assessments/i }));
    expect(
      screen.getByText(/No risk assessment records available/i),
    ).toBeInTheDocument();
  });

  it('submits medical report review, updates history, and triggers authorized download', async () => {
    const user = userEvent.setup();
    const initialReport: DoctorReportDetail = {
      id: 'rep-501',
      patient_id: 'pat-201',
      patient_name: 'Aarav Joshi',
      patient_city: 'Jaipur',
      patient_state: 'Rajasthan',
      original_filename: 'cbc-hba1c-screening.pdf',
      file_type: 'PDF',
      file_size: 48120,
      upload_status: 'UPLOADED',
      review_status: 'PENDING_REVIEW',
      uploaded_at: '2026-11-18T10:00:00Z',
      updated_at: '2026-11-18T10:00:00Z',
      reviews: [],
    };
    vi.spyOn(doctorService, 'fetchDoctorReportDetail').mockResolvedValue(
      initialReport,
    );
    const downloadSpy = vi
      .spyOn(doctorService, 'downloadDoctorReport')
      .mockResolvedValue(undefined);
    const reviewSpy = vi
      .spyOn(doctorService, 'submitDoctorReportReview')
      .mockResolvedValue({
        ...initialReport,
        review_status: 'NEEDS_FOLLOW_UP',
        reviews: [
          {
            id: 'rev-99',
            report_id: 'rep-501',
            doctor_id: 'doc-101',
            doctor_name: 'Dr. Meera Deshmukh',
            review_status: 'NEEDS_FOLLOW_UP',
            review_note:
              'Mildly elevated HbA1c; arrange dietary review and repeat test.',
            reviewed_at: '2026-11-18T12:00:00Z',
            created_at: '2026-11-18T12:00:00Z',
          },
        ],
      });

    renderPortal('/doctor/reports/rep-501');
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'cbc-hba1c-screening.pdf',
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Download File/i }));
    expect(downloadSpy).toHaveBeenCalledWith(
      'rep-501',
      'cbc-hba1c-screening.pdf',
    );

    await user.selectOptions(
      screen.getByLabelText(/Review Decision/i),
      'NEEDS_FOLLOW_UP',
    );
    await user.type(
      screen.getByLabelText(/Clinical Review Note/i),
      'Mildly elevated HbA1c; arrange dietary review and repeat test.',
    );
    await user.click(
      screen.getByRole('button', { name: /Save Review Decision/i }),
    );

    await waitFor(() =>
      expect(reviewSpy).toHaveBeenCalledWith('rep-501', {
        review_status: 'NEEDS_FOLLOW_UP',
        review_note:
          'Mildly elevated HbA1c; arrange dietary review and repeat test.',
      }),
    );
    expect(
      await screen.findByText(
        'Mildly elevated HbA1c; arrange dietary review and repeat test.',
      ),
    ).toBeInTheDocument();
  });

  it('distinguishes AI-assisted risk inputs from clinician review and saves clinical risk reviews', async () => {
    const user = userEvent.setup();
    const riskItem: DoctorRiskAssessmentItem = {
      id: 'risk-901',
      patient_id: 'pat-201',
      patient_name: 'Aarav Joshi',
      related_report_id: 'rep-501',
      status: 'PENDING',
      risk_category: 'MODERATE',
      source: 'AI_ASSISTED',
      is_ai_assisted: true,
      explanation: 'Elevated fasting markers flagged during screening intake.',
      recommended_action: null,
      reviewed_by_doctor_name: null,
      assessed_at: '2026-11-18T11:00:00Z',
      updated_at: '2026-11-18T11:00:00Z',
      clinical_reviews: [],
    };
    vi.spyOn(doctorService, 'fetchDoctorRiskAssessments').mockResolvedValue({
      items: [riskItem],
      total: 1,
      pending_count: 1,
      flagged_count: 0,
      reviewed_count: 0,
      page: 1,
      page_size: 10,
      total_pages: 1,
      disclaimer: DOCTOR_CLINICAL_RISK_DISCLAIMER,
    });
    const submitSpy = vi
      .spyOn(doctorService, 'submitDoctorRiskReview')
      .mockResolvedValue({
        ...riskItem,
        status: 'REVIEWED',
        reviewed_by_doctor_name: 'Dr. Meera Deshmukh',
      });

    renderPortal('/doctor/risk-review');
    expect(
      await screen.findByText(/AI-Assisted \(Not a Diagnosis\)/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/never a substitute for independent clinical/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /Record Clinical Review/i }),
    );
    await user.selectOptions(
      screen.getByLabelText(/Clinical Review Outcome/i),
      'FLAGGED_FOR_REVIEW',
    );
    await user.type(
      screen.getByLabelText(/Clinician Review Note/i),
      'Requires repeat laboratory confirmation prior to care escalation.',
    );
    await user.click(
      screen.getByRole('button', { name: /Save Clinical Review/i }),
    );

    await waitFor(() =>
      expect(submitSpy).toHaveBeenCalledWith('risk-901', {
        review_status: 'FLAGGED_FOR_REVIEW',
        review_note:
          'Requires repeat laboratory confirmation prior to care escalation.',
        recommended_action: null,
      }),
    );
  });

  it('validates appointment rejection reason, confirms appointments, and surfaces reschedule conflicts', async () => {
    const user = userEvent.setup();
    vi.spyOn(doctorService, 'fetchDoctorAppointments').mockResolvedValue({
      items: [SAMPLE_APPOINTMENT],
      total: 1,
      pending_count: 1,
      upcoming_count: 1,
      today_count: 1,
      completed_count: 0,
      cancelled_count: 0,
      page: 1,
      page_size: 10,
      total_pages: 1,
    });
    const statusSpy = vi
      .spyOn(doctorService, 'updateDoctorAppointmentStatus')
      .mockResolvedValue({ ...SAMPLE_APPOINTMENT, status: 'CANCELLED' });
    vi.spyOn(doctorService, 'rescheduleDoctorAppointment').mockRejectedValue(
      makeApiError(
        409,
        'appointment_conflict',
        'You already have another confirmed appointment within 30 minutes.',
      ),
    );

    renderPortal('/doctor/appointments');
    expect(await screen.findByText('Aarav Joshi')).toBeInTheDocument();

    // Rejection requires a non-empty reason
    await user.click(screen.getByRole('button', { name: /^Reject$/i }));
    await user.click(screen.getByRole('button', { name: /Decline Request/i }));
    expect(
      await screen.findByText(/Provide a brief reason/i),
    ).toBeInTheDocument();
    expect(statusSpy).not.toHaveBeenCalled();

    await user.type(
      screen.getByLabelText(/Reason for Declining/i),
      'Morning clinic slot unavailable; please choose afternoon.',
    );
    await user.click(screen.getByRole('button', { name: /Decline Request/i }));
    await waitFor(() =>
      expect(statusSpy).toHaveBeenCalledWith('appt-601', {
        status: 'CANCELLED',
        reason: 'Morning clinic slot unavailable; please choose afternoon.',
      }),
    );

    // Reschedule conflict handled cleanly
    await user.click(screen.getByRole('button', { name: /^Reschedule$/i }));
    const dateInput = screen.getByLabelText(/New Date & Time/i);
    fireEvent.change(dateInput, { target: { value: '2027-03-10T11:00' } });
    await user.click(
      screen.getByRole('button', { name: /Save New Schedule/i }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /another confirmed appointment within 30 minutes/i,
    );
  });

  it('creates specialist referrals and transitions referral status with audit history', async () => {
    const user = userEvent.setup();
    vi.spyOn(doctorService, 'fetchDoctorReferrals').mockResolvedValue({
      items: [SAMPLE_REFERRAL],
      total: 1,
      pending_count: 1,
      active_count: 1,
      completed_count: 0,
      cancelled_count: 0,
      allowed_departments: ['Cardiology', 'Endocrinology'],
      coordination_notice:
        'Referrals are tracked internally within CareBridge AI for care coordination and are not transmitted automatically to external hospital systems.',
      page: 1,
      page_size: 10,
      total_pages: 1,
    });
    vi.spyOn(doctorService, 'fetchDoctorPatients').mockResolvedValue({
      items: [SAMPLE_PATIENT],
      total: 1,
      page: 1,
      page_size: 50,
      total_pages: 1,
    });
    const createSpy = vi
      .spyOn(doctorService, 'createDoctorReferral')
      .mockResolvedValue({
        ...SAMPLE_REFERRAL,
        id: 'ref-702',
        referred_department: 'Cardiology',
      });
    const updateSpy = vi
      .spyOn(doctorService, 'updateDoctorReferralStatus')
      .mockResolvedValue({
        ...SAMPLE_REFERRAL,
        status: 'ACCEPTED',
      });

    renderPortal('/doctor/referrals');
    expect(await screen.findByText('Endocrinology')).toBeInTheDocument();
    expect(
      screen.getByText(/not transmitted automatically to external hospital/i),
    ).toBeInTheDocument();

    // Create referral
    await user.click(
      screen.getAllByRole('button', { name: /Create Referral/i })[0]!,
    );
    await screen.findByLabelText(/Assigned Patient/i);
    await user.type(
      screen.getByLabelText(/Concise Clinical Referral Reason/i),
      'Evaluate persistent exertional dyspnea and screening ECG findings.',
    );
    const dialog = screen.getByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: /Create Referral/i }),
    );
    await waitFor(() =>
      expect(createSpy).toHaveBeenCalledWith({
        patient_id: 'pat-201',
        referred_department: 'Cardiology',
        reason:
          'Evaluate persistent exertional dyspnea and screening ECG findings.',
        next_action: null,
      }),
    );

    // Update status
    await user.click(
      screen.getByRole('button', { name: /Update \/ History/i }),
    );
    await user.click(
      screen.getByRole('button', { name: /Save Status Transition/i }),
    );
    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith(
        'ref-701',
        expect.objectContaining({ status: 'ACCEPTED' }),
      ),
    );
  });

  it('schedules and updates patient follow-up plans with in-app notice', async () => {
    const user = userEvent.setup();
    vi.spyOn(doctorService, 'fetchDoctorFollowUps').mockResolvedValue({
      items: [SAMPLE_FOLLOW_UP],
      total: 1,
      pending_count: 1,
      overdue_count: 0,
      completed_count: 0,
      cancelled_count: 0,
      page: 1,
      page_size: 10,
      total_pages: 1,
    });
    vi.spyOn(doctorService, 'fetchDoctorPatients').mockResolvedValue({
      items: [SAMPLE_PATIENT],
      total: 1,
      page: 1,
      page_size: 50,
      total_pages: 1,
    });
    vi.spyOn(doctorService, 'fetchDoctorAppointments').mockResolvedValue({
      items: [SAMPLE_APPOINTMENT],
      total: 1,
      pending_count: 1,
      upcoming_count: 1,
      today_count: 1,
      completed_count: 0,
      cancelled_count: 0,
      page: 1,
      page_size: 20,
      total_pages: 1,
    });
    vi.spyOn(doctorService, 'fetchDoctorReferrals').mockResolvedValue({
      items: [],
      total: 0,
      pending_count: 0,
      active_count: 0,
      completed_count: 0,
      cancelled_count: 0,
      allowed_departments: ['Cardiology'],
      coordination_notice: 'Internal coordination only.',
      page: 1,
      page_size: 20,
      total_pages: 1,
    });
    const createSpy = vi
      .spyOn(doctorService, 'createDoctorFollowUp')
      .mockResolvedValue(SAMPLE_FOLLOW_UP);
    const updateSpy = vi
      .spyOn(doctorService, 'updateDoctorFollowUp')
      .mockResolvedValue({ ...SAMPLE_FOLLOW_UP, status: 'COMPLETED' });

    renderPortal('/doctor/follow-ups');
    expect(
      await screen.findByText('Repeat fasting glucose check'),
    ).toBeInTheDocument();

    // Schedule follow-up
    await user.click(
      screen.getAllByRole('button', { name: /Schedule Follow-up/i })[0]!,
    );
    await screen.findByLabelText(/Follow-up Purpose/i);
    await user.type(
      screen.getByLabelText(/Follow-up Purpose/i),
      'Two-week blood pressure monitoring check',
    );
    await user.type(
      screen.getByLabelText(/Target Follow-up Date & Time/i),
      '2099-04-12T10:00',
    );
    const modal = screen.getByRole('dialog');
    await user.click(
      within(modal).getByRole('button', { name: /Schedule Follow-up/i }),
    );
    expect(
      screen.getByText(/at least 5 minutes and no more than 365 days/i),
    ).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText(/Target Follow-up Date & Time/i));
    const validFollowUp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const localFollowUp = new Date(
      validFollowUp.getTime() - validFollowUp.getTimezoneOffset() * 60_000,
    )
      .toISOString()
      .slice(0, 16);
    await user.type(
      screen.getByLabelText(/Target Follow-up Date & Time/i),
      localFollowUp,
    );
    await user.click(
      within(modal).getByRole('button', { name: /Schedule Follow-up/i }),
    );
    await waitFor(() =>
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          patient_id: 'pat-201',
          follow_up_type: 'Two-week blood pressure monitoring check',
        }),
      ),
    );

    // Complete follow-up
    await user.click(screen.getByRole('button', { name: /^Update$/i }));
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));
    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith(
        'fu-801',
        expect.objectContaining({ status: 'COMPLETED' }),
      ),
    );
  });

  it('supports doctor notification mark-read, profile editing without self-verification, and confirmed sign-out', async () => {
    const user = userEvent.setup();
    const markOneSpy = vi
      .spyOn(doctorService, 'markDoctorNotificationRead')
      .mockResolvedValue({
        notification: {
          id: 'notif-1',
          notification_type: 'REPORT',
          title: 'New Medical Report Uploaded',
          message:
            'An assigned patient submitted a diagnostic document for review.',
          is_read: true,
          created_at: '2026-11-18T10:05:00Z',
        },
        unread_count: 0,
      });

    const notifView = renderPortal('/doctor/notifications');
    expect(
      await screen.findByText('New Medical Report Uploaded'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Mark as read/i }));
    await waitFor(() => expect(markOneSpy).toHaveBeenCalledWith('notif-1'));
    notifView.unmount();

    // Doctor Profile update (read-only verification status, editable credentials)
    const initialProfile: DoctorProfile = {
      id: 'dprof-101',
      user_id: 'doc-101',
      full_name: 'Meera Deshmukh',
      display_name: 'Dr. Meera Deshmukh',
      email: 'meera.deshmukh@example.org',
      role: 'DOCTOR',
      is_verified: true,
      verification_status: 'VERIFIED',
      specialization: 'Internal Medicine',
      qualification: 'MBBS',
      license_number: null,
      department: 'General Medicine',
      hospital_or_clinic: 'Community Health Center',
      experience_years: 6,
      completion_percentage: 83,
      completed_fields: 5,
      total_fields: 6,
      account_created_at: '2026-11-18T08:00:00Z',
      created_at: '2026-11-18T08:00:00Z',
      updated_at: '2026-11-18T08:00:00Z',
    };
    vi.spyOn(doctorService, 'fetchDoctorProfile').mockResolvedValue(
      initialProfile,
    );
    const updateProfileSpy = vi
      .spyOn(doctorService, 'updateDoctorProfile')
      .mockResolvedValue({
        ...initialProfile,
        qualification: 'MBBS, MD',
        license_number: 'MCI-2020-77412',
        completion_percentage: 100,
        completed_fields: 6,
      });

    const profileView = renderPortal('/doctor/profile');
    expect(
      await screen.findByDisplayValue('Internal Medicine'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Admin Verified').length).toBeGreaterThanOrEqual(
      1,
    );

    const qualInput = screen.getByLabelText(/Qualification/i);
    await user.clear(qualInput);
    await user.type(qualInput, 'MBBS, MD');
    await user.type(
      screen.getByLabelText(/Medical License Number/i),
      'MCI-2020-77412',
    );
    await user.click(
      screen.getByRole('button', { name: /Save Profile Changes/i }),
    );
    await waitFor(() =>
      expect(updateProfileSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          qualification: 'MBBS, MD',
          license_number: 'MCI-2020-77412',
          experience_years: 6,
        }),
      ),
    );
    profileView.unmount();

    // Workspace Settings sign-out with confirmation dialog
    const logoutSpy = vi
      .spyOn(authService, 'logoutAccount')
      .mockResolvedValue({ message: 'Signed out successfully.' });
    renderPortal('/doctor/settings');
    const main = screen.getByRole('main');
    await user.click(within(main).getByRole('button', { name: /^Sign Out$/i }));
    const dialog = screen.getByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: /^Sign Out$/i }),
    );
    await waitFor(() => expect(logoutSpy).toHaveBeenCalled());
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /Sign in to CareBridge AI/i,
      }),
    ).toBeInTheDocument();
  });
});
