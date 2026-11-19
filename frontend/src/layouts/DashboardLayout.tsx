import { useCallback, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { DashboardNavbar, Sidebar } from '@/components/navigation';
import {
  ACTIVE_DEMO_ADMIN,
  ACTIVE_DEMO_DOCTOR,
  ACTIVE_DEMO_PATIENT,
} from '@/data';
import { useAuth } from '@/hooks/useAuth';
import { useDemo } from '@/hooks/useDemo';
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
      name: ACTIVE_DEMO_PATIENT.fullName,
      email: ACTIVE_DEMO_PATIENT.email,
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

export function DashboardLayout({ role }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { getUnreadCount, showToast } = useDemo();

  const fallback = getFallbackIdentity(role);
  const userName = user?.full_name ?? fallback.name;
  const userEmail = user?.email ?? fallback.email;
  const roleLabel = user ? getRoleDisplayName(user.role) : fallback.roleLabel;
  const unreadCount = getUnreadCount(role);

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
          userSubtitle={`${roleLabel} · ${userEmail}`}
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
