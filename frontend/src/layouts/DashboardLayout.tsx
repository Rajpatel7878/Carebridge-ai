import { useCallback, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { DashboardNavbar, Sidebar } from '@/components/navigation';
import { PatientPortalProvider } from '@/contexts/PatientPortalContext';
import { ACTIVE_DEMO_ADMIN, ACTIVE_DEMO_DOCTOR } from '@/data';
import { useAuth } from '@/hooks/useAuth';
import { useDemo } from '@/hooks/useDemo';
import { usePatientPortal } from '@/hooks/usePatientPortal';
import { getRoleDisplayName } from '@/types/auth';
import type { UserRole } from '@/types/domain';

export interface DashboardLayoutProps {
  role: UserRole;
}

function getFallbackIdentity(role: UserRole): {
  name: string;
  email: string;
  roleLabel: string;
} {
  if (role === 'patient') {
    return {
      name: 'Patient',
      email: '',
      roleLabel: 'Patient',
    };
  }
  if (role === 'doctor') {
    return {
      name: ACTIVE_DEMO_DOCTOR.fullName,
      email: ACTIVE_DEMO_DOCTOR.email,
      roleLabel: 'Doctor',
    };
  }
  return {
    name: ACTIVE_DEMO_ADMIN.fullName,
    email: ACTIVE_DEMO_ADMIN.email,
    roleLabel: 'Administrator',
  };
}

function DashboardShell({ role }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { getUnreadCount, showToast } = useDemo();
  const { unreadCount: patientUnreadCount } = usePatientPortal();

  const fallback = getFallbackIdentity(role);
  const userName = user?.full_name ?? fallback.name;
  const userEmail = user?.email ?? fallback.email;
  const roleLabel = user ? getRoleDisplayName(user.role) : fallback.roleLabel;
  const unreadCount =
    role === 'patient' ? patientUnreadCount : getUnreadCount(role);
  const userSubtitle = userEmail ? `${roleLabel} · ${userEmail}` : roleLabel;

  const handleLogout = useCallback(async () => {
    await logout();
    showToast(
      'Signed out successfully',
      'Your CareBridge AI session has ended.',
      'info',
    );
    navigate('/login', { replace: true });
  }, [logout, navigate, showToast]);

  return (
    <div className="min-h-screen bg-[var(--cb-bg)] text-[var(--cb-text)]">
      <Sidebar
        role={role}
        userName={userName}
        roleLabel={roleLabel}
        unreadCount={unreadCount}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <div className="flex min-h-screen min-w-0 flex-col lg:pl-[260px]">
        <DashboardNavbar
          role={role}
          userName={userName}
          userSubtitle={userSubtitle}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onLogout={handleLogout}
        />

        <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function DashboardLayout({ role }: DashboardLayoutProps) {
  return (
    <PatientPortalProvider enabled={role === 'patient'}>
      <DashboardShell role={role} />
    </PatientPortalProvider>
  );
}
