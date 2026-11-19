import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingState } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardPathForRole, isPathAllowedForRole } from '@/types/auth';

interface RedirectState {
  from?: string;
}

export function GuestOnlyRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cb-bg)] px-4">
        <LoadingState label="Loading CareBridge AI..." />
      </div>
    );
  }

  if (user) {
    const state = location.state as RedirectState | null;
    const requested = typeof state?.from === 'string' ? state.from : '';
    const destination = isPathAllowedForRole(requested, user.role)
      ? requested
      : getDashboardPathForRole(user.role);
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}
