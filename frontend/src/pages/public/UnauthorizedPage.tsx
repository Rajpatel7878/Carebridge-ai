import { useState } from 'react';
import { ArrowRight, Home, LogOut, ShieldAlert } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Logo, ThemeToggle } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  getDashboardPathForRole,
  getRoleDisplayName,
  type AccountRole,
} from '@/types/auth';

export interface UnauthorizedPageProps {
  requiredRoles?: AccountRole[];
}

export function UnauthorizedPage({ requiredRoles }: UnauthorizedPageProps) {
  useDocumentTitle('Access Restricted');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const safeDestination = user ? getDashboardPathForRole(user.role) : '/login';
  const requiredLabel = requiredRoles?.length
    ? requiredRoles.map(getRoleDisplayName).join(' or ')
    : null;

  const handleSwitchAccount = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--cb-bg)] text-[var(--cb-text)]">
      <header className="flex h-16 items-center justify-between border-b border-[var(--cb-border)] bg-[var(--cb-surface)] px-4 sm:px-8">
        <Link to="/" aria-label="CareBridge AI Home">
          <Logo size="sm" />
        </Link>
        <ThemeToggle showLabel />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-7 text-center shadow-[var(--cb-shadow-sm)] sm:p-9">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--cb-critical-soft)] text-[var(--cb-critical)]">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </div>

          <div className="mt-4">
            <Badge variant="critical">403 &middot; Access Restricted</Badge>
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--cb-text)]">
            You do not have access to this workspace
          </h1>

          <p className="mt-2.5 text-sm leading-relaxed text-[var(--cb-text-muted)]">
            {user ? (
              <>
                You are signed in as{' '}
                <strong className="text-[var(--cb-text)]">
                  {user.full_name}
                </strong>{' '}
                with the{' '}
                <strong className="text-[var(--cb-text)]">
                  {getRoleDisplayName(user.role)}
                </strong>{' '}
                role
                {requiredLabel ? (
                  <>
                    , while this route requires{' '}
                    <strong className="text-[var(--cb-text)]">
                      {requiredLabel}
                    </strong>{' '}
                    permissions.
                  </>
                ) : (
                  '.'
                )}
              </>
            ) : (
              'Your current session does not have the required permissions to open this page.'
            )}
          </p>

          {user?.requested_role === 'DOCTOR' && (
            <p className="mt-3 rounded-xl border border-[var(--cb-warning-border)] bg-[var(--cb-warning-soft)] px-3.5 py-2.5 text-xs text-[var(--cb-warning)]">
              Your clinician role request is pending administrator approval.
              Doctor workspace access activates automatically once approved.
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Button
              onClick={() => navigate(safeDestination, { replace: true })}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              {user
                ? `Go to ${getRoleDisplayName(user.role)} Dashboard`
                : 'Sign In'}
            </Button>

            {user ? (
              <Button
                variant="outline"
                isLoading={isLoggingOut}
                leftIcon={<LogOut className="h-4 w-4" />}
                onClick={handleSwitchAccount}
              >
                Sign Out
              </Button>
            ) : (
              <Button
                variant="outline"
                leftIcon={<Home className="h-4 w-4" />}
                onClick={() => navigate('/')}
              >
                Back to Home
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
