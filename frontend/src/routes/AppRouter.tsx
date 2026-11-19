import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { GuestOnlyRoute, ProtectedRoute, RoleGuard } from '@/components/auth';
import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AdminAnalyticsPage } from '@/pages/admin/AdminAnalyticsPage';
import { AdminAppointmentsPage } from '@/pages/admin/AdminAppointmentsPage';
import { AdminDoctorsPage } from '@/pages/admin/AdminDoctorsPage';
import { AdminFollowUpsPage } from '@/pages/admin/AdminFollowUpsPage';
import { AdminOverviewPage } from '@/pages/admin/AdminOverviewPage';
import { AdminPatientsPage } from '@/pages/admin/AdminPatientsPage';
import { AdminPopulationHealthPage } from '@/pages/admin/AdminPopulationHealthPage';
import { AdminReferralsPage } from '@/pages/admin/AdminReferralsPage';
import { AdminRiskDistributionPage } from '@/pages/admin/AdminRiskDistributionPage';
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { DoctorAppointmentsPage } from '@/pages/doctor/DoctorAppointmentsPage';
import { DoctorFollowUpsPage } from '@/pages/doctor/DoctorFollowUpsPage';
import { DoctorNotificationsPage } from '@/pages/doctor/DoctorNotificationsPage';
import { DoctorOverviewPage } from '@/pages/doctor/DoctorOverviewPage';
import { DoctorPatientDetailsPage } from '@/pages/doctor/DoctorPatientDetailsPage';
import { DoctorPatientsPage } from '@/pages/doctor/DoctorPatientsPage';
import { DoctorProfilePage } from '@/pages/doctor/DoctorProfilePage';
import { DoctorReferralsPage } from '@/pages/doctor/DoctorReferralsPage';
import { DoctorReportsPage } from '@/pages/doctor/DoctorReportsPage';
import { DoctorRiskReviewPage } from '@/pages/doctor/DoctorRiskReviewPage';
import { DoctorSettingsPage } from '@/pages/doctor/DoctorSettingsPage';
import { PatientAppointmentsPage } from '@/pages/patient/PatientAppointmentsPage';
import { PatientFollowUpsPage } from '@/pages/patient/PatientFollowUpsPage';
import { PatientNotificationsPage } from '@/pages/patient/PatientNotificationsPage';
import { PatientOverviewPage } from '@/pages/patient/PatientOverviewPage';
import { PatientProfilePage } from '@/pages/patient/PatientProfilePage';
import { PatientReferralsPage } from '@/pages/patient/PatientReferralsPage';
import { PatientReportsPage } from '@/pages/patient/PatientReportsPage';
import { PatientRiskPage } from '@/pages/patient/PatientRiskPage';
import { PatientSettingsPage } from '@/pages/patient/PatientSettingsPage';
import { LandingPage } from '@/pages/public/LandingPage';
import { NotFoundPage } from '@/pages/public/NotFoundPage';
import { PrivacyPolicyPage } from '@/pages/public/PrivacyPolicyPage';
import { TermsOfServicePage } from '@/pages/public/TermsOfServicePage';
import { UnauthorizedPage } from '@/pages/public/UnauthorizedPage';
import { scrollToSectionId } from '@/utils/scroll';

function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const sectionId = hash.slice(1);
      if (sectionId === 'home') {
        window.scrollTo(0, 0);
        return;
      }
      if (scrollToSectionId(sectionId)) {
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

export function AppRouter() {
  return (
    <>
      <ScrollManager />
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
        </Route>

        {/* Authentication Screens */}
        <Route element={<GuestOnlyRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
        </Route>
        <Route element={<AuthLayout />}>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Explicit Unauthorized Screen */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected Role-Scoped Workspaces */}
        <Route element={<ProtectedRoute />}>
          {/* Patient Portal (PATIENT role only) */}
          <Route element={<RoleGuard allowedRoles={['PATIENT']} />}>
            <Route path="/patient" element={<DashboardLayout role="patient" />}>
              <Route index element={<PatientOverviewPage />} />
              <Route path="reports" element={<PatientReportsPage />} />
              <Route path="risk" element={<PatientRiskPage />} />
              <Route
                path="appointments"
                element={<PatientAppointmentsPage />}
              />
              <Route path="referrals" element={<PatientReferralsPage />} />
              <Route path="follow-ups" element={<PatientFollowUpsPage />} />
              <Route
                path="notifications"
                element={<PatientNotificationsPage />}
              />
              <Route path="profile" element={<PatientProfilePage />} />
              <Route path="settings" element={<PatientSettingsPage />} />
            </Route>
          </Route>

          {/* Doctor Workspace (DOCTOR role only) */}
          <Route element={<RoleGuard allowedRoles={['DOCTOR']} />}>
            <Route path="/doctor" element={<DashboardLayout role="doctor" />}>
              <Route index element={<DoctorOverviewPage />} />
              <Route path="patients" element={<DoctorPatientsPage />} />
              <Route
                path="patient-details"
                element={<DoctorPatientDetailsPage />}
              />
              <Route
                path="patients/:patientId"
                element={<DoctorPatientDetailsPage />}
              />
              <Route path="reports" element={<DoctorReportsPage />} />
              <Route path="risk-review" element={<DoctorRiskReviewPage />} />
              <Route path="referrals" element={<DoctorReferralsPage />} />
              <Route path="appointments" element={<DoctorAppointmentsPage />} />
              <Route path="follow-ups" element={<DoctorFollowUpsPage />} />
              <Route
                path="notifications"
                element={<DoctorNotificationsPage />}
              />
              <Route path="profile" element={<DoctorProfilePage />} />
              <Route path="settings" element={<DoctorSettingsPage />} />
            </Route>
          </Route>

          {/* Administrator Console (ADMIN role only) */}
          <Route element={<RoleGuard allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<DashboardLayout role="admin" />}>
              <Route index element={<AdminOverviewPage />} />
              <Route
                path="population-health"
                element={<AdminPopulationHealthPage />}
              />
              <Route path="patients" element={<AdminPatientsPage />} />
              <Route path="doctors" element={<AdminDoctorsPage />} />
              <Route
                path="risk-distribution"
                element={<AdminRiskDistributionPage />}
              />
              <Route path="referrals" element={<AdminReferralsPage />} />
              <Route path="appointments" element={<AdminAppointmentsPage />} />
              <Route path="follow-ups" element={<AdminFollowUpsPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
          </Route>
        </Route>

        {/* Catch-All 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
