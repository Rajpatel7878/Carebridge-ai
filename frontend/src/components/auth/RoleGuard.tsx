import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingState } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { UnauthorizedPage } from '@/pages/public/UnauthorizedPage';
import type { AccountRole } from '@/types/auth';

export interface RoleGuardProps {
  allowedRoles: AccountRole[];
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cb-bg)] px-4">
        <LoadingState label="Checking workspace permissions..." />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return <UnauthorizedPage requiredRoles={allowedRoles} />;
  }

  return <Outlet />;
}
