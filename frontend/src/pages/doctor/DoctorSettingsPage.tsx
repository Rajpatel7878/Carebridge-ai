import { useState } from 'react';
import { Bell, LogOut, Palette, ShieldCheck, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  LanguageSwitcher,
  ThemeToggle,
} from '@/components/common';
import { PageHeader } from '@/components/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useTheme } from '@/hooks/useTheme';
import { formatDoctorDisplayName } from '@/types/doctor';

export function DoctorSettingsPage() {
  useDocumentTitle('Workspace Settings');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const { showToast } = useDemo();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      showToast(
        'Signed out successfully',
        'Your clinician session and credentials have been cleared.',
        'info',
      );
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
      setConfirmLogout(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace Settings"
        subtitle="Configure interface appearance, language preferences, and session controls for your CareBridge AI clinician portal."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <CardHeader
            title="Display & Language"
            description="Customize workspace theme and localized interface preferences"
          />

          <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--cb-border)] p-4">
            <div className="flex items-start gap-3">
              <Palette
                className="mt-0.5 h-4 w-4 text-[var(--cb-primary)]"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold text-[var(--cb-text)]">
                  Color Theme
                </p>
                <p className="text-xs text-[var(--cb-text-muted)]">
                  Active mode: {theme === 'dark' ? 'Dark' : 'Light'} clinical
                  palette
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--cb-border)] p-4">
            <div>
              <p className="text-sm font-semibold text-[var(--cb-text)]">
                Interface Language
              </p>
              <p className="text-xs text-[var(--cb-text-muted)]">
                Stored locally without recording any patient or clinical data
              </p>
            </div>
            <LanguageSwitcher />
          </div>
        </Card>

        <Card className="space-y-4">
          <CardHeader
            title="In-App Notification Policy"
            description="Privacy-first clinical event notifications"
          />
          <div className="rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)] p-4 text-xs leading-relaxed text-[var(--cb-text-secondary)]">
            <p className="flex items-center gap-2 font-semibold text-[var(--cb-text)]">
              <Bell
                className="h-4 w-4 text-[var(--cb-primary)]"
                aria-hidden="true"
              />
              In-App Delivery Only
            </p>
            <p className="mt-1.5">
              CareBridge AI records assignment updates, patient report
              submissions, appointment requests, referral changes, and overdue
              follow-up notices inside your authenticated clinician portal. No
              external SMS or email alerts are dispatched, and private clinical
              notes are excluded from notification previews.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/doctor/notifications')}
            >
              Open Notification Center
            </Button>
          </div>
        </Card>
      </div>

      <Card className="space-y-4">
        <CardHeader
          title="Authenticated Clinician Session"
          description="Protected via HttpOnly cookies, CSRF double-submit verification, and assignment-scoped RBAC"
          action={
            <Badge variant="success" dot>
              Active DOCTOR Session
            </Badge>
          }
        />

        <div className="flex flex-col justify-between gap-4 rounded-xl border border-[var(--cb-border)] p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <ShieldCheck
              className="mt-0.5 h-5 w-5 shrink-0 text-[var(--cb-secondary)]"
              aria-hidden="true"
            />
            <div className="text-xs sm:text-sm">
              <p className="font-semibold text-[var(--cb-text)]">
                {formatDoctorDisplayName(user?.full_name ?? 'Clinician')}
              </p>
              <p className="text-xs text-[var(--cb-text-muted)]">
                {user?.email ?? 'Authenticated clinician account'} · Tokens are
                never written to browser web storage.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<User className="h-4 w-4" />}
              onClick={() => navigate('/doctor/profile')}
            >
              Edit Clinician Profile
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<LogOut className="h-4 w-4" />}
              onClick={() => setConfirmLogout(true)}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmLogout}
        onClose={() => {
          if (!isLoggingOut) setConfirmLogout(false);
        }}
        title="Sign out of clinician workspace?"
        description="Signing out immediately revokes your refresh token and invalidates your current clinician access session."
        confirmLabel="Sign Out"
        intent="danger"
        isLoading={isLoggingOut}
        onConfirm={() => void handleSignOut()}
      />
    </div>
  );
}
