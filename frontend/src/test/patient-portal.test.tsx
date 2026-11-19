import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
import * as patientService from '@/services/patient';
import type { AccountRole, AuthUser } from '@/types/auth';
import {
  RISK_COORDINATION_DISCLAIMER,
  type PatientAppointment,
  type PatientFollowUp,
  type PatientMedicalReport,
  type PatientNotification,
  type PatientProfile,
  type PatientReferral,
} from '@/types/patient';

const PATIENT_ROUTES = [
  '/patient',
  '/patient/profile',
  '/patient/reports',
  '/patient/risk',
  '/patient/appointments',
  '/patient/referrals',
  '/patient/follow-ups',
  '/patient/notifications',
  '/patient/settings',
] as const;

function makeUser(
  role: AccountRole,
  overrides: Partial<AuthUser> = {},
): AuthUser {
  return {
    id: `usr-${role.toLowerCase()}-1`,
    full_name:
      role === 'PATIENT'
        ? 'Asha Synthetic'
        : role === 'DOCTOR'
          ? 'Dr. Synthetic Clinician'
          : 'Synthetic Admin',
    email: `${role.toLowerCase()}.synthetic@example.org`,
    role,
    is_active: true,
    is_verified: true,
    requested_role: null,
    created_at: '2026-11-18T08:00:00Z',
    updated_at: '2026-11-18T08:00:00Z',
    ...overrides,
  };
}

function makeProfile(overrides: Partial<PatientProfile> = {}): PatientProfile {
  return {
    id: 'profile-101',
    user_id: 'usr-patient-1',
    full_name: 'Asha Synthetic',
    email: 'patient.synthetic@example.org',
    role: 'PATIENT',
    is_verified: true,
    account_created_at: '2026-11-18T08:00:00Z',
    date_of_birth: null,
    phone_number: null,
    gender: null,
    city: null,
    state: null,
    preferred_language: 'en',
    emergency_contact_name: null,
    emergency_contact_phone: null,
    completion_percentage: 30,
    completed_fields: 3,
    total_fields: 10,
    created_at: '2026-11-18T08:00:00Z',
    updated_at: '2026-11-18T08:00:00Z',
    ...overrides,
  };
}

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

function renderPortal(
  path: string,
  user: AuthUser | null = makeUser('PATIENT'),
) {
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

describe('Phase 5 — Patient Dashboard & Patient Portal Integration Suite', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.documentElement.classList.remove('dark');

    vi.spyOn(patientService, 'fetchPatientNotifications').mockResolvedValue({
      items: [],
      total: 0,
      unread_count: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(PATIENT_ROUTES)(
    'protects %s against unauthenticated visitors and non-PATIENT roles',
    (route) => {
      const anon = renderPortal(route, null);
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: /Sign in to CareBridge AI/i,
        }),
      ).toBeInTheDocument();
      anon.unmount();

      const doctor = renderPortal(route, makeUser('DOCTOR'));
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: /You do not have access to this workspace/i,
        }),
      ).toBeInTheDocument();
      doctor.unmount();

      const admin = renderPortal(route, makeUser('ADMIN'));
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: /You do not have access to this workspace/i,
        }),
      ).toBeInTheDocument();
      admin.unmount();
    },
  );

  it('renders Patient Overview with real metrics, 6-step journey, quick actions, empty state, and error recovery', async () => {
    const user = userEvent.setup();
    const overviewSpy = vi
      .spyOn(patientService, 'fetchPatientOverview')
      .mockRejectedValueOnce(
        makeApiError(503, 'service_unavailable', 'Temporary service outage.'),
      )
      .mockResolvedValueOnce({
        patient_name: 'Asha Synthetic',
        preferred_language: 'en',
        metrics: {
          profile_completion_percentage: 80,
          profile_completed_fields: 8,
          profile_total_fields: 10,
          total_reports: 2,
          pending_review_reports: 1,
          upcoming_appointments: 1,
          pending_referrals: 1,
          attention_follow_ups: 1,
          overdue_follow_ups: 0,
          unread_notifications: 2,
        },
        journey: [
          {
            key: 'screening',
            label: 'Screening',
            status: 'completed',
            detail: 'Portal active.',
          },
          {
            key: 'report_submitted',
            label: 'Report Submitted',
            status: 'completed',
            detail: '2 health reports uploaded.',
          },
          {
            key: 'review',
            label: 'Review',
            status: 'current',
            detail: '1 report awaiting review.',
          },
          {
            key: 'referral',
            label: 'Referral',
            status: 'current',
            detail: '1 active referral.',
          },
          {
            key: 'appointment',
            label: 'Appointment',
            status: 'current',
            detail: '1 scheduled visit.',
          },
          {
            key: 'follow_up',
            label: 'Follow-up',
            status: 'current',
            detail: '1 follow-up active.',
          },
        ],
        recent_activity: [
          {
            id: 'report-1',
            category: 'report',
            title: 'Uploaded report: synthetic_panel.pdf',
            description: 'PDF document · Review status: Pending Review',
            status: 'PENDING_REVIEW',
            occurred_at: '2026-11-18T11:30:00Z',
            link_path: '/patient/reports',
          },
        ],
      });

    renderPortal('/patient');

    // Error state surfaces cleanly and retries successfully
    expect(
      await screen.findByText(/Temporary service outage/i),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Welcome back, Asha Synthetic',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('1 pending review')).toBeInTheDocument();
    expect(
      screen.getByText('Uploaded report: synthetic_panel.pdf'),
    ).toBeInTheDocument();

    // All 6 Health Journey stages present
    for (const step of [
      'Screening',
      'Report Submitted',
      'Review',
      'Referral',
      'Appointment',
      'Follow-up',
    ]) {
      expect(screen.getByText(step)).toBeInTheDocument();
    }

    // All 5 required quick actions present
    for (const action of [
      'Upload Health Report',
      'View My Reports',
      'View Appointments',
      'Track Referrals',
      'Update Profile',
    ]) {
      expect(screen.getAllByText(action).length).toBeGreaterThan(0);
    }
    expect(overviewSpy).toHaveBeenCalledTimes(2);
  });

  it('validates and saves Patient Profile changes without exposing role edits or storing medical data locally', async () => {
    const user = userEvent.setup();
    vi.spyOn(patientService, 'fetchPatientProfile').mockResolvedValueOnce(
      makeProfile(),
    );
    const updateSpy = vi
      .spyOn(patientService, 'updatePatientProfile')
      .mockResolvedValueOnce(
        makeProfile({
          phone_number: '+91 98765 11111',
          gender: 'FEMALE',
          city: 'Pune',
          state: 'Maharashtra',
          preferred_language: 'hi',
          emergency_contact_name: 'Kiran Synthetic',
          emergency_contact_phone: '+91 98765 22222',
          completion_percentage: 90,
          completed_fields: 9,
        }),
      );

    renderPortal('/patient/profile');

    expect(await screen.findByDisplayValue('Asha Synthetic')).toBeDisabled();
    expect(
      screen.getByDisplayValue('patient.synthetic@example.org'),
    ).toBeDisabled();

    // Invalid phone rejected client-side before sending API request
    const phoneInput = screen.getByLabelText(/^Phone Number/i);
    await user.type(phoneInput, 'bad');
    await user.click(screen.getByRole('button', { name: /save profile/i }));
    expect(updateSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Fix fields and save successfully
    await user.clear(phoneInput);
    await user.type(phoneInput, '+91 98765 11111');
    await user.selectOptions(screen.getByLabelText(/^Gender/i), 'FEMALE');
    await user.type(screen.getByLabelText(/^City/i), 'Pune');
    await user.type(screen.getByLabelText(/^State/i), 'Maharashtra');
    await user.selectOptions(
      screen.getByLabelText(/^Preferred Language$/i),
      'hi',
    );
    await user.type(
      screen.getByLabelText(/^Emergency Contact Name/i),
      'Kiran Synthetic',
    );
    await user.type(
      screen.getByLabelText(/^Emergency Contact Phone/i),
      '+91 98765 22222',
    );
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
    expect(updateSpy).toHaveBeenCalledWith({
      date_of_birth: null,
      phone_number: '+91 98765 11111',
      gender: 'FEMALE',
      city: 'Pune',
      state: 'Maharashtra',
      preferred_language: 'hi',
      emergency_contact_name: 'Kiran Synthetic',
      emergency_contact_phone: '+91 98765 22222',
    });
    expect(await screen.findByText('90%')).toBeInTheDocument();

    // Verify localStorage holds ONLY non-sensitive UI language key — zero patient profile data
    const lsKeys = Object.keys(window.localStorage);
    expect(
      lsKeys.every(
        (k) => k === 'carebridge-language' || k === 'carebridge-theme',
      ),
    ).toBe(true);
    expect(Object.keys(window.sessionStorage)).toHaveLength(0);
  });

  it('handles Medical Reports upload validation, PDF upload, detail modal, and authorized download', async () => {
    const user = userEvent.setup();
    const uploadedReport: PatientMedicalReport = {
      id: 'rep-501',
      original_filename: 'synthetic_lipid_panel.pdf',
      file_type: 'PDF',
      file_size: 42_500,
      upload_status: 'UPLOADED',
      review_status: 'PENDING_REVIEW',
      uploaded_at: '2026-11-18T12:00:00Z',
      updated_at: '2026-11-18T12:00:00Z',
    };

    vi.spyOn(patientService, 'fetchPatientReports')
      .mockResolvedValueOnce({
        items: [],
        total: 0,
        max_upload_mb: 10,
        allowed_file_types: ['PDF', 'PNG', 'JPG'],
      })
      .mockResolvedValue({
        items: [uploadedReport],
        total: 1,
        max_upload_mb: 10,
        allowed_file_types: ['PDF', 'PNG', 'JPG'],
      });

    const uploadSpy = vi
      .spyOn(patientService, 'uploadPatientReport')
      .mockImplementation(async (_file, onProgress) => {
        onProgress?.(65);
        onProgress?.(100);
        return uploadedReport;
      });
    const detailSpy = vi
      .spyOn(patientService, 'fetchPatientReportDetail')
      .mockResolvedValue(uploadedReport);
    const downloadSpy = vi
      .spyOn(patientService, 'downloadPatientReport')
      .mockResolvedValue(undefined);

    renderPortal('/patient/reports');

    // Empty state shown initially
    expect(
      await screen.findByText(/No medical reports uploaded yet/i),
    ).toBeInTheDocument();

    const fileInput = screen.getByLabelText(/Choose medical report file/i);

    // Reject disallowed executable file client-side
    const exeFile = new File(['MZ-fake'], 'unsafe.exe', {
      type: 'application/octet-stream',
    });
    fireEvent.change(fileInput, { target: { files: [exeFile] } });
    expect(
      await screen.findByText(
        /Only PDF, PNG, and JPG medical reports are allowed/i,
      ),
    ).toBeInTheDocument();
    expect(uploadSpy).not.toHaveBeenCalled();

    // Upload valid synthetic PDF via drag-and-drop
    const pdfFile = new File(
      ['%PDF-1.4 synthetic %%EOF'],
      'synthetic_lipid_panel.pdf',
      {
        type: 'application/pdf',
      },
    );
    const dropzone = screen.getByRole('button', {
      name: /Drag and drop a PDF, PNG, or JPG medical report/i,
    });
    fireEvent.drop(dropzone, { dataTransfer: { files: [pdfFile] } });

    await waitFor(() => expect(uploadSpy).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText('synthetic_lipid_panel.pdf'),
    ).toBeInTheDocument();

    // Open details modal and trigger authorized download
    await user.click(screen.getByRole('button', { name: /^Details$/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(detailSpy).toHaveBeenCalledWith('rep-501');

    await user.click(screen.getByRole('button', { name: /Download File/i }));
    expect(downloadSpy).toHaveBeenCalledWith(
      'rep-501',
      'synthetic_lipid_panel.pdf',
    );
  });

  it('displays honest Risk Overview empty state and required clinical disclaimer without fake scores', async () => {
    vi.spyOn(
      patientService,
      'fetchPatientRiskAssessments',
    ).mockResolvedValueOnce({
      items: [],
      total: 0,
      disclaimer: RISK_COORDINATION_DISCLAIMER,
    });

    const emptyView = renderPortal('/patient/risk');
    expect(
      await screen.findByText('No risk assessment is available yet.'),
    ).toBeInTheDocument();
    expect(screen.getByText(RISK_COORDINATION_DISCLAIMER)).toBeInTheDocument();
    emptyView.unmount();

    // Authorized record view when backend returns one
    vi.spyOn(
      patientService,
      'fetchPatientRiskAssessments',
    ).mockResolvedValueOnce({
      items: [
        {
          id: 'risk-1',
          related_report_id: 'rep-501',
          status: 'REVIEWED',
          risk_category: 'MODERATE',
          explanation: 'Clinician follow-up recommended within two weeks.',
          reviewing_professional_name: 'Dr. Meera Synthetic',
          recommended_action: 'Schedule a follow-up visit in Appointments.',
          assessed_at: '2026-11-18T12:30:00Z',
          updated_at: '2026-11-18T12:30:00Z',
        },
      ],
      total: 1,
      disclaimer: RISK_COORDINATION_DISCLAIMER,
    });

    renderPortal('/patient/risk');
    expect(await screen.findByText('Moderate Priority')).toBeInTheDocument();
    expect(screen.getByText('Dr. Meera Synthetic')).toBeInTheDocument();
    expect(screen.getByText(RISK_COORDINATION_DISCLAIMER)).toBeInTheDocument();
  });

  it('requests a PENDING appointment and supports viewing details and cancellation', async () => {
    const user = userEvent.setup();
    const pendingAppt: PatientAppointment = {
      id: 'appt-901',
      scheduled_at: '2026-12-10T10:30:00Z',
      appointment_type: 'SCREENING_REVIEW',
      status: 'PENDING',
      location_or_mode: 'Teleconsultation',
      notes: 'Review uploaded synthetic report',
      assigned_doctor_name: null,
      is_upcoming: true,
      created_at: '2026-11-18T12:00:00Z',
      updated_at: '2026-11-18T12:00:00Z',
    };

    vi.spyOn(patientService, 'fetchPatientAppointments')
      .mockResolvedValueOnce({
        items: [],
        total: 0,
        upcoming_count: 0,
        past_count: 0,
      })
      .mockResolvedValueOnce({
        items: [pendingAppt],
        total: 1,
        upcoming_count: 1,
        past_count: 0,
      })
      .mockResolvedValue({
        items: [{ ...pendingAppt, status: 'CANCELLED', is_upcoming: false }],
        total: 1,
        upcoming_count: 0,
        past_count: 1,
      });

    const requestSpy = vi
      .spyOn(patientService, 'requestPatientAppointment')
      .mockResolvedValueOnce(pendingAppt);
    const cancelSpy = vi
      .spyOn(patientService, 'cancelPatientAppointment')
      .mockResolvedValueOnce({
        ...pendingAppt,
        status: 'CANCELLED',
        is_upcoming: false,
      });

    renderPortal('/patient/appointments');

    expect(
      await screen.findByText(/No upcoming appointments/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getAllByRole('button', { name: /Request Appointment/i })[0]!,
    );
    await user.selectOptions(
      screen.getByLabelText(/Preferred Visit Mode/i),
      'Teleconsultation',
    );
    await user.type(
      screen.getByLabelText(/Visit Note/i),
      'Review uploaded synthetic report',
    );
    await user.click(screen.getByRole('button', { name: /Submit Request/i }));

    await waitFor(() => expect(requestSpy).toHaveBeenCalledTimes(1));
    expect(requestSpy.mock.calls[0]?.[0]).toMatchObject({
      appointment_type: 'SCREENING_REVIEW',
      location_or_mode: 'Teleconsultation',
      notes: 'Review uploaded synthetic report',
    });

    expect(
      await screen.findByText(/Awaiting care-team assignment/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Pending Confirmation').length).toBeGreaterThan(
      1,
    );

    // Cancel appointment via confirmation modal
    await user.click(screen.getByRole('button', { name: /^Cancel$/i }));
    await user.click(
      screen.getByRole('button', { name: /^Cancel Appointment$/i }),
    );
    await waitFor(() => expect(cancelSpy).toHaveBeenCalledWith('appt-901'));
  });

  it('renders Referrals read-only timeline and Follow-up overdue/upcoming filtering', async () => {
    const user = userEvent.setup();
    const referral: PatientReferral = {
      id: 'ref-1',
      referred_department: 'Cardiology Clinic',
      referring_doctor_name: 'Dr. Meera Synthetic',
      reason: 'Post-screening preventive review',
      next_action: 'Check Appointments for your scheduled visit slot.',
      status: 'SCHEDULED',
      created_at: '2026-11-17T09:00:00Z',
      updated_at: '2026-11-18T09:00:00Z',
    };
    vi.spyOn(patientService, 'fetchPatientReferrals').mockResolvedValueOnce({
      items: [referral],
      total: 1,
      active_count: 1,
    });
    vi.spyOn(
      patientService,
      'fetchPatientReferralDetail',
    ).mockResolvedValueOnce(referral);

    const refView = renderPortal('/patient/referrals');
    expect(await screen.findByText('Cardiology Clinic')).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: /Referral status timeline/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /create referral/i }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /View Details/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    refView.unmount();

    // Follow-up overdue & upcoming tabs
    const overdueTask: PatientFollowUp = {
      id: 'fu-overdue',
      related_appointment_id: null,
      related_referral_id: 'ref-1',
      scheduled_at: '2026-11-15T09:00:00Z',
      follow_up_type: 'Morning Blood Pressure Check',
      status: 'PENDING',
      notes: 'Log 3 consecutive readings.',
      is_overdue: true,
      created_at: '2026-11-10T09:00:00Z',
      updated_at: '2026-11-10T09:00:00Z',
    };
    vi.spyOn(patientService, 'fetchPatientFollowUps').mockResolvedValueOnce({
      items: [overdueTask],
      total: 1,
      upcoming_count: 0,
      overdue_count: 1,
      completed_count: 0,
    });

    renderPortal('/patient/follow-ups');
    expect(
      await screen.findByText('Morning Blood Pressure Check'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Upcoming/i }));
    expect(screen.getByText(/No upcoming follow-ups/i)).toBeInTheDocument();
  });

  it('supports Notifications mark-read, mark-all-read, and Settings language/theme/logout with no fake delete button', async () => {
    const user = userEvent.setup();
    const notif1: PatientNotification = {
      id: 'n-1',
      title: 'Health report uploaded',
      message: 'Your PDF report was stored securely.',
      notification_type: 'REPORT',
      is_read: false,
      created_at: '2026-11-18T11:00:00Z',
    };
    const notif2: PatientNotification = {
      id: 'n-2',
      title: 'Appointment request submitted',
      message: 'Your Screening Review request is pending confirmation.',
      notification_type: 'APPOINTMENT',
      is_read: false,
      created_at: '2026-11-18T11:05:00Z',
    };

    vi.spyOn(patientService, 'fetchPatientNotifications').mockResolvedValue({
      items: [notif1, notif2],
      total: 2,
      unread_count: 2,
    });
    const markOneSpy = vi
      .spyOn(patientService, 'markPatientNotificationRead')
      .mockResolvedValueOnce({
        notification: { ...notif1, is_read: true },
        unread_count: 1,
      });
    const markAllSpy = vi
      .spyOn(patientService, 'markAllPatientNotificationsRead')
      .mockResolvedValueOnce({ marked_count: 1, unread_count: 0 });

    const notifView = renderPortal('/patient/notifications');
    expect(
      await screen.findByText('Health report uploaded'),
    ).toBeInTheDocument();
    expect(screen.getByText('2 unread')).toBeInTheDocument();

    await user.click(
      screen.getAllByRole('button', { name: /^Mark read$/i })[0]!,
    );
    await waitFor(() => expect(markOneSpy).toHaveBeenCalledWith('n-1'));
    expect(screen.getByText('1 unread')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Mark all as read/i }));
    await waitFor(() => expect(markAllSpy).toHaveBeenCalledTimes(1));
    notifView.unmount();

    // Settings page: theme + language save + locked role + zero fake delete button + real logout
    vi.spyOn(patientService, 'fetchPatientProfile').mockResolvedValueOnce(
      makeProfile(),
    );
    const saveLangSpy = vi
      .spyOn(patientService, 'updatePatientProfile')
      .mockResolvedValueOnce(makeProfile({ preferred_language: 'hi' }));
    const logoutSpy = vi
      .spyOn(authService, 'logoutAccount')
      .mockResolvedValueOnce({ message: 'Signed out successfully.' });

    renderPortal('/patient/settings');
    expect(await screen.findByText('Patient (Locked)')).toBeInTheDocument();
    expect(screen.queryByText(/delete account/i)).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /^Dark Mode Low-glare/i }),
    );
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    await user.selectOptions(
      screen.getByLabelText(/Preferred Language/i),
      'hi',
    );
    await user.click(screen.getByRole('button', { name: /Save Language/i }));
    await waitFor(() => expect(saveLangSpy).toHaveBeenCalledTimes(1));

    const signOutBtns = screen.getAllByRole('button', { name: /^Sign Out$/i });
    await user.click(signOutBtns[signOutBtns.length - 1]!);
    await waitFor(() => expect(logoutSpy).toHaveBeenCalledTimes(1));
  });
});
