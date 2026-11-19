import { render, screen, waitFor } from '@testing-library/react';
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
import type { AccountRole, AuthUser } from '@/types/auth';

function buildTestUser(
  role: AccountRole,
  overrides: Partial<AuthUser> = {},
): AuthUser {
  const defaults: Record<
    AccountRole,
    Pick<AuthUser, 'id' | 'full_name' | 'email'>
  > = {
    PATIENT: {
      id: 'usr-patient-1',
      full_name: 'Ananya Mehta',
      email: 'ananya.mehta@example.org',
    },
    DOCTOR: {
      id: 'usr-doctor-1',
      full_name: 'Dr. Raghav Kulkarni',
      email: 'raghav.kulkarni@example.org',
    },
    ADMIN: {
      id: 'usr-admin-1',
      full_name: 'Neha Kapoor',
      email: 'neha.kapoor@example.org',
    },
  };

  return {
    ...defaults[role],
    role,
    is_active: true,
    is_verified: role !== 'PATIENT',
    requested_role: null,
    created_at: '2026-11-18T10:00:00Z',
    updated_at: '2026-11-18T10:00:00Z',
    ...overrides,
  };
}

function makeApiAxiosError(status: number, code: string, message: string) {
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

interface RenderOptions {
  /** Pass `null` for guest, an `AuthUser` for signed-in, or `undefined` to trigger live /auth/me fetch. */
  user?: AuthUser | null;
  hydrateFromApi?: boolean;
}

function renderAt(path: string, options: RenderOptions = { user: null }) {
  const initialUser = options.hydrateFromApi
    ? undefined
    : (options.user ?? null);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider initialUser={initialUser}>
            <DemoProvider>
              <AppRouter />
            </DemoProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

interface RouteSpec {
  path: string;
  expectedHeading: RegExp;
  asRole: AccountRole | null;
}

const ALL_ROUTES: RouteSpec[] = [
  {
    path: '/',
    expectedHeading: /Healthcare Shouldn't Stop at Screening\./i,
    asRole: null,
  },
  {
    path: '/privacy',
    expectedHeading: /Privacy Policy \(Prototype Placeholder\)/i,
    asRole: null,
  },
  {
    path: '/terms',
    expectedHeading: /Terms of Service \(Prototype Placeholder\)/i,
    asRole: null,
  },
  {
    path: '/login',
    expectedHeading: /Sign in to CareBridge AI/i,
    asRole: null,
  },
  {
    path: '/register',
    expectedHeading: /Create your CareBridge account/i,
    asRole: null,
  },
  {
    path: '/forgot-password',
    expectedHeading: /Reset your password/i,
    asRole: null,
  },
  {
    path: '/unauthorized',
    expectedHeading: /You do not have access to this workspace/i,
    asRole: 'PATIENT',
  },
  {
    path: '/patient',
    expectedHeading: /Welcome back, Ananya/i,
    asRole: 'PATIENT',
  },
  {
    path: '/patient/reports',
    expectedHeading: /My Health Reports/i,
    asRole: 'PATIENT',
  },
  {
    path: '/patient/risk',
    expectedHeading: /Risk Overview/i,
    asRole: 'PATIENT',
  },
  {
    path: '/patient/appointments',
    expectedHeading: /^Appointments$/i,
    asRole: 'PATIENT',
  },
  {
    path: '/patient/referrals',
    expectedHeading: /^Referrals$/i,
    asRole: 'PATIENT',
  },
  {
    path: '/patient/follow-ups',
    expectedHeading: /^Follow-ups$/i,
    asRole: 'PATIENT',
  },
  {
    path: '/patient/notifications',
    expectedHeading: /^Notifications$/i,
    asRole: 'PATIENT',
  },
  {
    path: '/patient/profile',
    expectedHeading: /^Profile$/i,
    asRole: 'PATIENT',
  },
  {
    path: '/patient/settings',
    expectedHeading: /^Settings$/i,
    asRole: 'PATIENT',
  },
  {
    path: '/doctor',
    expectedHeading: /Dr\. Raghav Kulkarni/i,
    asRole: 'DOCTOR',
  },
  {
    path: '/doctor/patients',
    expectedHeading: /My Patients/i,
    asRole: 'DOCTOR',
  },
  {
    path: '/doctor/patient-details',
    expectedHeading: /Harpreet Gill/i,
    asRole: 'DOCTOR',
  },
  {
    path: '/doctor/patients/PT-1044',
    expectedHeading: /Lakshmi Narayanan/i,
    asRole: 'DOCTOR',
  },
  {
    path: '/doctor/reports',
    expectedHeading: /Medical Reports/i,
    asRole: 'DOCTOR',
  },
  {
    path: '/doctor/risk-review',
    expectedHeading: /^Risk Review$/i,
    asRole: 'DOCTOR',
  },
  {
    path: '/doctor/referrals',
    expectedHeading: /^Referrals$/i,
    asRole: 'DOCTOR',
  },
  {
    path: '/doctor/appointments',
    expectedHeading: /^Appointments$/i,
    asRole: 'DOCTOR',
  },
  {
    path: '/doctor/follow-ups',
    expectedHeading: /^Follow-ups$/i,
    asRole: 'DOCTOR',
  },
  {
    path: '/doctor/notifications',
    expectedHeading: /^Notifications$/i,
    asRole: 'DOCTOR',
  },
  {
    path: '/doctor/profile',
    expectedHeading: /Clinician Profile/i,
    asRole: 'DOCTOR',
  },
  {
    path: '/doctor/settings',
    expectedHeading: /Workspace Settings/i,
    asRole: 'DOCTOR',
  },
  {
    path: '/admin',
    expectedHeading: /Population Health Command Center/i,
    asRole: 'ADMIN',
  },
  {
    path: '/admin/population-health',
    expectedHeading: /^Population Health$/i,
    asRole: 'ADMIN',
  },
  {
    path: '/admin/patients',
    expectedHeading: /Patient Management/i,
    asRole: 'ADMIN',
  },
  {
    path: '/admin/doctors',
    expectedHeading: /Doctor Management/i,
    asRole: 'ADMIN',
  },
  {
    path: '/admin/risk-distribution',
    expectedHeading: /Risk Distribution/i,
    asRole: 'ADMIN',
  },
  {
    path: '/admin/referrals',
    expectedHeading: /Referral Management/i,
    asRole: 'ADMIN',
  },
  {
    path: '/admin/appointments',
    expectedHeading: /Appointment Management/i,
    asRole: 'ADMIN',
  },
  {
    path: '/admin/follow-ups',
    expectedHeading: /Follow-up Monitoring/i,
    asRole: 'ADMIN',
  },
  {
    path: '/admin/analytics',
    expectedHeading: /^Analytics$/i,
    asRole: 'ADMIN',
  },
  {
    path: '/admin/settings',
    expectedHeading: /Platform Settings/i,
    asRole: 'ADMIN',
  },
  {
    path: '/unknown-route-xyz',
    expectedHeading: /Page not found/i,
    asRole: null,
  },
];

describe('CareBridge AI — Frontend Authentication, RBAC & UI Suite', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.spyOn(authService, 'fetchAdminUsers').mockResolvedValue({
      items: [buildTestUser('ADMIN'), buildTestUser('DOCTOR')],
      total: 2,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(ALL_ROUTES)(
    'renders route $path cleanly for authorized context',
    async ({ path, expectedHeading, asRole }) => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      renderAt(path, { user: asRole ? buildTestUser(asRole) : null });

      expect(
        screen.getByRole('heading', { level: 1, name: expectedHeading }),
      ).toBeInTheDocument();

      if (path === '/admin/doctors') {
        await waitFor(() =>
          expect(authService.fetchAdminUsers).toHaveBeenCalled(),
        );
      }

      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();

      errorSpy.mockRestore();
      warnSpy.mockRestore();
    },
  );

  it.each([
    '/patient',
    '/patient/profile',
    '/doctor',
    '/doctor/patients',
    '/admin',
    '/admin/doctors',
  ])(
    'redirects unauthenticated users visiting %s to /login',
    (protectedPath) => {
      renderAt(protectedPath, { user: null });

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: /Sign in to CareBridge AI/i,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Please sign in to access your CareBridge AI workspace/i,
        ),
      ).toBeInTheDocument();
    },
  );

  it('enforces role-based guards for PATIENT, DOCTOR, and ADMIN across workspaces', async () => {
    const user = userEvent.setup();

    // PATIENT blocked from /admin and /doctor, can return safely to /patient
    const patientRender = renderAt('/admin', {
      user: buildTestUser('PATIENT'),
    });
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /You do not have access to this workspace/i,
      }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /Go to Patient Dashboard/i }),
    );
    expect(
      screen.getByRole('heading', { level: 1, name: /Welcome back, Ananya/i }),
    ).toBeInTheDocument();
    patientRender.unmount();

    const patientToDoctor = renderAt('/doctor', {
      user: buildTestUser('PATIENT'),
    });
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /You do not have access to this workspace/i,
      }),
    ).toBeInTheDocument();
    patientToDoctor.unmount();

    // DOCTOR blocked from /admin, can return safely to /doctor
    const doctorRender = renderAt('/admin', { user: buildTestUser('DOCTOR') });
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /You do not have access to this workspace/i,
      }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /Go to Doctor Dashboard/i }),
    );
    expect(
      screen.getByRole('heading', { level: 1, name: /Dr\. Raghav Kulkarni/i }),
    ).toBeInTheDocument();
    doctorRender.unmount();

    // ADMIN allowed into /admin
    renderAt('/admin', { user: buildTestUser('ADMIN') });
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Population Health Command Center/i,
      }),
    ).toBeInTheDocument();
  });

  it('submits login, handles backend error, supports show/hide password, redirects by role, and stores zero tokens in web storage', async () => {
    const user = userEvent.setup();
    const loginSpy = vi
      .spyOn(authService, 'loginAccount')
      .mockRejectedValueOnce(
        makeApiAxiosError(
          401,
          'invalid_credentials',
          'Invalid email or password.',
        ),
      )
      .mockResolvedValueOnce({
        user: buildTestUser('DOCTOR'),
        access_token_expires_in: 1800,
        session_type: 'persistent',
        message: 'Signed in successfully.',
      });

    renderAt('/login', { user: null });

    // Client-side validation
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(
      await screen.findByText(/email address is required/i),
    ).toBeInTheDocument();

    // Password show/hide toggle
    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');

    // Invalid credential error from backend
    await user.type(
      screen.getByLabelText(/email address/i),
      'raghav.kulkarni@example.org',
    );
    await user.type(passwordInput, 'WrongPass!1');
    await user.click(
      screen.getByRole('checkbox', { name: /remember session/i }),
    );
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(
      await screen.findByText(/invalid email or password/i),
    ).toBeInTheDocument();

    // Valid credential redirects DOCTOR -> /doctor
    await user.clear(passwordInput);
    await user.type(passwordInput, 'CareBridge!2026');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /Dr\. Raghav Kulkarni/i,
      }),
    ).toBeInTheDocument();
    expect(loginSpy).toHaveBeenLastCalledWith({
      email: 'raghav.kulkarni@example.org',
      password: 'CareBridge!2026',
      remember_session: true,
    });

    // Security check: only theme preference may exist in localStorage; zero auth tokens or passwords anywhere
    expect(Object.keys(window.localStorage)).toEqual(['carebridge-theme']);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('validates registration, shows password strength, excludes ADMIN option, and submits to backend', async () => {
    const user = userEvent.setup();
    const pendingDoctorUser = buildTestUser('PATIENT', {
      full_name: 'Dr. Asha Menon',
      email: 'asha.menon@example.org',
      requested_role: 'DOCTOR',
    });

    const registerSpy = vi
      .spyOn(authService, 'registerAccount')
      .mockResolvedValueOnce({
        user: pendingDoctorUser,
        message: 'Account created with PATIENT access.',
        requires_role_approval: true,
      });

    renderAt('/register', { user: null });

    // Confirm ADMIN is never offered as a selectable public registration option
    const roleSelect = screen.getByLabelText(/account type/i);
    const optionValues = Array.from(roleSelect.querySelectorAll('option')).map(
      (opt) => opt.getAttribute('value'),
    );
    expect(optionValues).toEqual(['PATIENT', 'DOCTOR']);
    expect(optionValues).not.toContain('ADMIN');

    await user.type(screen.getByLabelText(/full name/i), 'Dr. Asha Menon');
    await user.type(
      screen.getByLabelText(/email address/i),
      'asha.menon@example.org',
    );
    await user.selectOptions(roleSelect, 'DOCTOR');
    expect(
      screen.getByText(/administrator must verify and approve/i),
    ).toBeInTheDocument();

    // Strong password feedback & mismatch check
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass!9');
    expect(screen.getByText('Strong')).toBeInTheDocument();

    await user.type(
      screen.getByLabelText(/confirm password/i),
      'MismatchPass!9',
    );
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(
      await screen.findByText(/passwords do not match/i),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/confirm password/i));
    await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass!9');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(
      await screen.findByRole('heading', {
        name: /account created successfully/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Doctor verification pending/i),
    ).toBeInTheDocument();
    expect(registerSpy).toHaveBeenCalledTimes(1);

    // Continue to login pre-fills the registered email
    await user.click(
      screen.getByRole('button', { name: /continue to sign in/i }),
    );
    expect(screen.getByLabelText(/email address/i)).toHaveValue(
      'asha.menon@example.org',
    );
  });

  it('restores authenticated session via GET /auth/me on refresh, displays real profile, and logs out cleanly', async () => {
    const user = userEvent.setup();
    const restoredPatient = buildTestUser('PATIENT', {
      full_name: 'Rohan Malhotra',
      email: 'rohan.malhotra@example.org',
    });

    vi.spyOn(authService, 'fetchCurrentUser').mockResolvedValueOnce(
      restoredPatient,
    );
    const logoutSpy = vi
      .spyOn(authService, 'logoutAccount')
      .mockResolvedValueOnce({ message: 'Signed out successfully.' });

    renderAt('/patient/profile', { hydrateFromApi: true });

    // Loading state displayed during initial session check
    expect(
      screen.getByText(/Verifying your CareBridge AI session/i),
    ).toBeInTheDocument();

    // Restores authenticated profile with real user full_name, email, and role
    expect(
      await screen.findByRole('heading', { level: 1, name: /^Profile$/i }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('Rohan Malhotra')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('rohan.malhotra@example.org'),
    ).toBeInTheDocument();

    // Sign out from profile page invokes backend logout and redirects to /login
    const signOutButtons = screen.getAllByRole('button', {
      name: /^sign out$/i,
    });
    await user.click(signOutButtons[0]!);

    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /Sign in to CareBridge AI/i,
      }),
    ).toBeInTheDocument();
  });

  it('allows ADMIN to approve a pending doctor request on Doctor Management', async () => {
    const user = userEvent.setup();
    const pendingUser = buildTestUser('PATIENT', {
      id: 'usr-pending-doc',
      full_name: 'Dr. Pending Clinician',
      email: 'pending.clinician@example.org',
      requested_role: 'DOCTOR',
      is_verified: false,
    });

    vi.spyOn(authService, 'fetchAdminUsers').mockResolvedValueOnce({
      items: [buildTestUser('ADMIN'), pendingUser],
      total: 2,
    });
    const updateSpy = vi
      .spyOn(authService, 'updateAdminUser')
      .mockResolvedValueOnce({
        ...pendingUser,
        role: 'DOCTOR',
        requested_role: null,
        is_verified: true,
      });

    renderAt('/admin/doctors', { user: buildTestUser('ADMIN') });

    const approveBtn = await screen.findByRole('button', {
      name: /approve doctor/i,
    });
    await user.click(approveBtn);

    expect(updateSpy).toHaveBeenCalledWith('usr-pending-doc', {
      role: 'DOCTOR',
      is_verified: true,
    });
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /approve doctor/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it('toggles light and dark themes and persists preference to localStorage', async () => {
    const user = userEvent.setup();
    renderAt('/', { user: null });

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    const toggle = screen.getAllByRole('button', {
      name: /switch to dark mode/i,
    })[0]!;
    await user.click(toggle);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem('carebridge-theme')).toBe('dark');

    const backToggle = screen.getAllByRole('button', {
      name: /switch to light mode/i,
    })[0]!;
    await user.click(backToggle);

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem('carebridge-theme')).toBe('light');
  });

  it('supports sidebar & mobile drawer, report modal, follow-up confirmation, forgot-password, and zero broken links', async () => {
    const user = userEvent.setup();

    // Doctor sidebar + mobile drawer
    const docView = renderAt('/doctor', { user: buildTestUser('DOCTOR') });
    await user.click(screen.getByRole('link', { name: /risk review/i }));
    expect(
      screen.getByRole('heading', { level: 1, name: /^Risk Review$/i }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /open sidebar navigation/i }),
    );
    expect(
      screen.getByRole('button', { name: /close sidebar/i }),
    ).toBeInTheDocument();
    docView.unmount();

    // Patient report filter + empty state + modal
    const reportView = renderAt('/patient/reports', {
      user: buildTestUser('PATIENT'),
    });
    await user.type(
      screen.getByRole('searchbox'),
      'no-matching-report-query-999',
    );
    expect(screen.getByText(/no matching records/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^reset$/i }));
    await user.click(screen.getAllByRole('button', { name: /^view$/i })[0]!);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    reportView.unmount();

    // Patient follow-up confirmation dialog
    const followUpView = renderAt('/patient/follow-ups', {
      user: buildTestUser('PATIENT'),
    });
    const beforeCount = screen.getAllByRole('button', {
      name: /mark complete/i,
    }).length;
    await user.click(
      screen.getAllByRole('button', { name: /mark complete/i })[0]!,
    );
    await user.click(screen.getByRole('button', { name: /^mark completed$/i }));
    expect(
      screen.getAllByRole('button', { name: /mark complete/i }),
    ).toHaveLength(beforeCount - 1);
    followUpView.unmount();

    // Forgot password validation & submission
    const forgotView = renderAt('/forgot-password', { user: null });
    await user.type(
      screen.getByLabelText(/account email/i),
      'ananya.mehta@example.org',
    );
    await user.click(
      screen.getByRole('button', { name: /send reset instructions/i }),
    );
    expect(
      await screen.findByRole('heading', { name: /check recovery options/i }),
    ).toBeInTheDocument();
    forgotView.unmount();

    // Link integrity audit across key portals
    const validPaths = new Set(ALL_ROUTES.map((r) => r.path));
    validPaths.delete('/unknown-route-xyz');
    for (const route of [
      { path: '/', asRole: null as AccountRole | null },
      { path: '/login', asRole: null as AccountRole | null },
      { path: '/patient', asRole: 'PATIENT' as AccountRole },
      { path: '/doctor', asRole: 'DOCTOR' as AccountRole },
      { path: '/admin', asRole: 'ADMIN' as AccountRole },
    ]) {
      const { unmount } = renderAt(route.path, {
        user: route.asRole ? buildTestUser(route.asRole) : null,
      });
      for (const link of screen.queryAllByRole('link')) {
        const href = link.getAttribute('href') ?? '';
        const pathOnly = href.split('#')[0] || '/';
        const isKnown =
          validPaths.has(pathOnly) ||
          /^\/doctor\/patients\/PT-\d+$/.test(pathOnly);
        expect(isKnown, `Unexpected link "${href}" on ${route.path}`).toBe(
          true,
        );
      }
      unmount();
    }
  });

  it('verifies Phase 4 public landing sections, navbar states, mobile menu, anchor targets, and CTAs', async () => {
    const user = userEvent.setup();
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');

    const landingView = renderAt('/', { user: null });

    // Accessible skip link + exactly one h1 on landing page
    const skipLink = screen.getByRole('link', {
      name: /skip to main content/i,
    });
    expect(skipLink).toHaveAttribute('href', '#main-content');
    expect(document.getElementById('main-content')).toBeInTheDocument();
    const h1Elements = screen.getAllByRole('heading', { level: 1 });
    expect(h1Elements).toHaveLength(1);
    expect(h1Elements[0]).toHaveTextContent(
      "Healthcare Shouldn't Stop at Screening.",
    );

    // Every required landing page section heading & disclaimer is rendered
    for (const heading of [
      /The Missing Link in Healthcare/i,
      /One Connected Journey From Screening to Care/i,
      /Six Connected Steps From Screening to Follow-up/i,
      /Purpose-Built Modules Across the Care Continuum/i,
      /Your Health Journey, Clearly Connected\./i,
      /More Visibility\. Better Care Coordination\./i,
      /See the Bigger Picture of Population Health\./i,
      /Moving From Fragmented Care to Connected Care/i,
      /Designed to Communicate Clearly in English and Hindi/i,
      /Healthcare Information Deserves Careful Protection\./i,
      /Bridging the Gap Between Health Screening and Care Delivery/i,
      /Let's Make Every Health Screening Count\./i,
    ]) {
      expect(
        screen.getByRole('heading', { name: heading }),
      ).toBeInTheDocument();
    }

    expect(
      screen.getAllByText(
        /CareBridge AI is a healthcare coordination and decision-support prototype\. It does not replace a qualified healthcare professional, provide a definitive diagnosis or serve as an emergency medical service\./i,
      ).length,
    ).toBeGreaterThanOrEqual(2);

    // Verify all section anchor links on `/` correspond to real DOM section IDs and no fake mailto/tel exists
    for (const anchor of screen.getAllByRole('link')) {
      const href = anchor.getAttribute('href') ?? '';
      expect(href).not.toBe('#');
      expect(href.startsWith('mailto:')).toBe(false);
      expect(href.startsWith('tel:')).toBe(false);
      const hashPart = href.split('#')[1];
      if (hashPart) {
        expect(
          document.getElementById(hashPart),
          `Missing section element for #${hashPart}`,
        ).not.toBeNull();
      }
    }

    // Smooth-scroll secondary CTA ("Explore How It Works") + navbar link
    await user.click(
      screen.getByRole('link', { name: /explore how it works/i }),
    );
    expect(scrollSpy).toHaveBeenCalled();

    // Mobile hamburger menu opens, exposes section + auth links, and closes on Escape
    const mobileToggle = screen.getByRole('button', {
      name: /open navigation menu/i,
    });
    expect(mobileToggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(mobileToggle);
    expect(
      screen.getByRole('navigation', { name: /mobile navigation/i }),
    ).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(
      screen.queryByRole('navigation', { name: /mobile navigation/i }),
    ).not.toBeInTheDocument();

    // Interactive Hero ecosystem stage selector & Next button
    await user.click(screen.getByRole('button', { name: /04\s*doctor/i }));
    expect(
      screen.getByText(/determines appropriate specialist referrals/i),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /next care stage/i }));
    expect(
      screen.getByText(
        /connects each referral to scheduled appointments and reminders/i,
      ),
    ).toBeInTheDocument();

    // Interactive feature availability filters (10 total: 2 live, 5 preview, 3 planned)
    await user.click(screen.getByRole('button', { name: /active now\s*2/i }));
    expect(
      screen.getByRole('heading', { name: /secure user access/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /smart patient referral/i }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /all features\s*10/i }),
    );
    expect(
      screen.getByRole('heading', { name: /smart patient referral/i }),
    ).toBeInTheDocument();

    // Guest clicking "Explore Doctor Experience" redirects cleanly to /login (no auth bypass)
    await user.click(
      screen.getByRole('link', { name: /explore doctor experience/i }),
    );
    expect(
      screen.getByRole('heading', { name: /sign in to carebridge ai/i }),
    ).toBeInTheDocument();
    landingView.unmount();

    // Authenticated Doctor visiting `/` sees Dashboard CTA pointing to /doctor and no navbar Login link
    const authedLanding = renderAt('/', { user: buildTestUser('DOCTOR') });
    const dashboardLinks = screen.getAllByRole('link', {
      name: /^dashboard$/i,
    });
    expect(dashboardLinks[0]).toHaveAttribute('href', '/doctor');
    await user.click(
      screen.getByRole('link', { name: /explore doctor experience/i }),
    );
    expect(
      screen.getByRole('heading', { name: /dr\. raghav kulkarni/i }),
    ).toBeInTheDocument();
    authedLanding.unmount();

    scrollSpy.mockRestore();
  });

  it('switches the live public experience between English and Hindi and navigates to legal pages', async () => {
    const user = userEvent.setup();
    const view = renderAt('/', { user: null });

    expect(document.documentElement.lang).toBe('en');

    // Switch to Hindi via the accessible language selector
    const hindiButtons = screen.getAllByRole('button', {
      name: /select language: hindi/i,
    });
    await user.click(hindiButtons[0]!);

    expect(document.documentElement.lang).toBe('hi');
    expect(window.localStorage.getItem('carebridge-language')).toBe('hi');
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /स्वास्थ्य देखभाल केवल जांच पर नहीं रुकनी चाहिए।/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: /आइए हर स्वास्थ्य जांच को सार्थक बनाएँ।/,
      }),
    ).toBeInTheDocument();

    // Navigate to Privacy Policy in Hindi and verify localized legal page renders
    await user.click(screen.getByRole('link', { name: /^गोपनीयता नीति$/ }));
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /गोपनीयता नीति \(प्रोटोटाइप प्रारूप\)/,
      }),
    ).toBeInTheDocument();

    // Switch back to English and open Terms of Service
    const englishButtons = screen.getAllByRole('button', {
      name: /भाषा चुनें: english/i,
    });
    await user.click(englishButtons[0]!);
    expect(document.documentElement.lang).toBe('en');
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Privacy Policy \(Prototype Placeholder\)/i,
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getAllByRole('link', { name: /^terms of service$/i })[0]!,
    );
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Terms of Service \(Prototype Placeholder\)/i,
      }),
    ).toBeInTheDocument();

    view.unmount();
  });
});
