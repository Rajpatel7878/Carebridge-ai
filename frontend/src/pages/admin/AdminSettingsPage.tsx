import { useState } from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ThemeToggle,
} from '@/components/common';
import { Input, ToggleSwitch } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { ACTIVE_DEMO_ADMIN } from '@/data';
import { useAuth } from '@/hooks/useAuth';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getRoleDisplayName } from '@/types/auth';
import { formatDate, getInitials } from '@/utils/format';

export function AdminSettingsPage() {
  useDocumentTitle('Admin Settings');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useDemo();

  const [urgentSlaHours, setUrgentSlaHours] = useState('72');
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [slaAlerts, setSlaAlerts] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const displayName = user?.full_name ?? ACTIVE_DEMO_ADMIN.fullName;
  const displayEmail = user?.email ?? ACTIVE_DEMO_ADMIN.email;
  const displayRole = user ? getRoleDisplayName(user.role) : 'Administrator';

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      showToast('Signed out successfully', undefined, 'info');
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Settings"
        subtitle="Review your authenticated administrator profile, console theme, and operational preferences."
      />

      <Card>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--cb-primary-soft)] text-sm font-bold text-[var(--cb-primary)]">
              {getInitials(displayName)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-[var(--cb-text)]">
                {displayName}
              </h2>
              <p className="truncate text-xs text-[var(--cb-text-muted)]">
                {displayEmail}
                {user?.created_at
                  ? ` · Joined ${formatDate(user.created_at)}`
                  : ''}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="neutral" dot>
                  {displayRole}
                </Badge>
                {user?.is_verified && (
                  <Badge variant="success">
                    <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            isLoading={isLoggingOut}
            leftIcon={<LogOut className="h-4 w-4" />}
            onClick={handleLogout}
          >
            Sign Out
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold text-[var(--cb-text)]">
              Console Theme
            </h2>
            <p className="mt-0.5 text-sm text-[var(--cb-text-muted)]">
              Toggle between light and dark mode across all charts, tables, and
              views.
            </p>
          </div>
          <ThemeToggle showLabel />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Organization & Operational Thresholds (Sample)"
          description="Operational alerting thresholds apply locally until automated notification workflows are enabled."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Program Network"
            value={ACTIVE_DEMO_ADMIN.organization}
            disabled
          />
          <Input
            label="Urgent Referral Target SLA (Hours)"
            type="number"
            value={urgentSlaHours}
            onChange={(e) => setUrgentSlaHours(e.target.value)}
          />
        </div>

        <div className="mt-5 divide-y divide-[var(--cb-border)] border-t border-[var(--cb-border)]">
          <ToggleSwitch
            label="Overdue Critical Follow-up Alerts"
            description="Surface clinics with overdue critical-risk tasks on the overview dashboard."
            checked={slaAlerts}
            onChange={setSlaAlerts}
          />
          <ToggleSwitch
            label="Weekly District Coverage Summary"
            description="Include district screening equity indicators in analytics summaries."
            checked={weeklyDigest}
            onChange={setWeeklyDigest}
          />
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            onClick={() => showToast('Admin console preferences saved locally')}
          >
            Save Configuration
          </Button>
        </div>
      </Card>
    </div>
  );
}
