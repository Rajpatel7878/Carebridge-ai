import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Clock,
  FileText,
  GitBranch,
  Upload,
  UserCheck,
  UserCog,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/common';
import { StatCard } from '@/components/dashboard';
import { PageHeader } from '@/components/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { extractApiErrorMessage } from '@/services/api';
import { fetchPatientOverview } from '@/services/patient';
import type {
  PatientActivityItem,
  PatientOverviewResponse,
} from '@/types/patient';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/format';

const ACTIVITY_META: Record<
  PatientActivityItem['category'],
  { label: string; icon: typeof FileText }
> = {
  report: { label: 'Report', icon: FileText },
  appointment: { label: 'Appointment', icon: Calendar },
  referral: { label: 'Referral', icon: GitBranch },
  follow_up: { label: 'Follow-up', icon: ClipboardCheck },
};

function formatStatusLabel(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((word) => (word[0] ? word[0].toUpperCase() + word.slice(1) : ''))
    .join(' ');
}

export function PatientOverviewPage() {
  useDocumentTitle('Patient Overview');
  const { user } = useAuth();

  const [overview, setOverview] = useState<PatientOverviewResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPatientOverview();
      setOverview(data);
    } catch (err) {
      setError(
        extractApiErrorMessage(
          err,
          'Unable to load your dashboard overview right now.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchPatientOverview()
      .then((data) => {
        if (!cancelled) {
          setOverview(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            extractApiErrorMessage(
              err,
              'Unable to load your dashboard overview right now.',
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const patientName = overview?.patient_name ?? user?.full_name ?? 'Patient';

  if (isLoading && !overview) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Welcome back, ${patientName}`}
          subtitle="Loading your personal care overview, reports, and schedule."
        />
        <LoadingState label="Loading your health dashboard..." rows={4} />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Welcome back, ${patientName}`}
          subtitle="Manage your health reports, referrals, appointments, and follow-up tasks in one secure portal."
        />
        <ErrorState
          title="Could not load dashboard overview"
          message={error}
          onRetry={() => void loadOverview()}
        />
      </div>
    );
  }

  const metrics = overview?.metrics;
  const journey = overview?.journey ?? [];
  const activity = overview?.recent_activity ?? [];

  const quickActions = [
    {
      label: 'Upload Health Report',
      detail: 'Securely submit a PDF, PNG, or JPG report',
      to: '/patient/reports',
      icon: Upload,
      highlight: true,
    },
    {
      label: 'View My Reports',
      detail: 'Browse uploaded documents and review status',
      to: '/patient/reports',
      icon: FileText,
      highlight: false,
    },
    {
      label: 'View Appointments',
      detail: 'Check scheduled visits or request a new slot',
      to: '/patient/appointments',
      icon: Calendar,
      highlight: false,
    },
    {
      label: 'Track Referrals',
      detail: 'Follow specialist and department coordination',
      to: '/patient/referrals',
      icon: GitBranch,
      highlight: false,
    },
    {
      label: 'Update Profile',
      detail: 'Manage optional contact and language preferences',
      to: '/patient/profile',
      icon: UserCog,
      highlight: false,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${patientName}`}
        subtitle="Track your uploaded medical reports, appointments, specialist referrals, and care follow-ups in one place."
        badge={
          <Badge variant="teal" dot>
            Patient Portal
          </Badge>
        }
        actions={
          <>
            <Link to="/patient/appointments">
              <Button
                variant="outline"
                leftIcon={<Calendar className="h-4 w-4" />}
              >
                Appointments
              </Button>
            </Link>
            <Link to="/patient/reports">
              <Button leftIcon={<Upload className="h-4 w-4" />}>
                Upload Health Report
              </Button>
            </Link>
          </>
        }
      />

      {error && (
        <ErrorState
          title="Dashboard refresh failed"
          message={error}
          onRetry={() => void loadOverview()}
        />
      )}

      {/* Real backend-connected Health Overview metrics */}
      {metrics && (
        <section
          aria-label="Health overview metrics"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        >
          <StatCard
            label="Profile Completion"
            value={`${metrics.profile_completion_percentage}%`}
            trend={`${metrics.profile_completed_fields}/${metrics.profile_total_fields} fields`}
            trendTone={
              metrics.profile_completion_percentage >= 80
                ? 'positive'
                : 'neutral'
            }
            subtitle="optional fields anytime"
            icon={<UserCheck className="h-4 w-4" />}
            tone="teal"
          />
          <StatCard
            label="Uploaded Reports"
            value={metrics.total_reports}
            trend={
              metrics.pending_review_reports > 0
                ? `${metrics.pending_review_reports} pending review`
                : undefined
            }
            trendTone={
              metrics.pending_review_reports > 0 ? 'warning' : 'neutral'
            }
            subtitle={
              metrics.total_reports === 0
                ? 'No reports uploaded yet'
                : 'Stored privately'
            }
            icon={<FileText className="h-4 w-4" />}
            tone="primary"
          />
          <StatCard
            label="Upcoming Appointments"
            value={metrics.upcoming_appointments}
            subtitle={
              metrics.upcoming_appointments === 0
                ? 'None scheduled yet'
                : 'Scheduled or pending'
            }
            icon={<Calendar className="h-4 w-4" />}
            tone="primary"
          />
          <StatCard
            label="Pending Referrals"
            value={metrics.pending_referrals}
            subtitle={
              metrics.pending_referrals === 0
                ? 'No active referrals'
                : 'In coordination'
            }
            icon={<GitBranch className="h-4 w-4" />}
            tone={metrics.pending_referrals > 0 ? 'warning' : 'teal'}
          />
          <StatCard
            label="Follow-ups Due"
            value={metrics.attention_follow_ups}
            trend={
              metrics.overdue_follow_ups > 0
                ? `${metrics.overdue_follow_ups} overdue`
                : undefined
            }
            trendTone={metrics.overdue_follow_ups > 0 ? 'critical' : 'positive'}
            subtitle={
              metrics.attention_follow_ups === 0
                ? 'All caught up'
                : 'Needs attention'
            }
            icon={<ClipboardCheck className="h-4 w-4" />}
            tone={
              metrics.overdue_follow_ups > 0
                ? 'critical'
                : metrics.attention_follow_ups > 0
                  ? 'warning'
                  : 'success'
            }
          />
        </section>
      )}

      {/* Health Journey Timeline: Screening -> Report Submitted -> Review -> Referral -> Appointment -> Follow-up */}
      <Card>
        <CardHeader
          title="Your Health Journey"
          description="Screening → Report Submitted → Review → Referral → Appointment → Follow-up — updated automatically from your real account records."
        />
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {journey.map((stage, index) => {
            const isCompleted = stage.status === 'completed';
            const isCurrent = stage.status === 'current';
            return (
              <li
                key={stage.key}
                className={cn(
                  'flex flex-col justify-between rounded-xl border p-3.5 transition-colors',
                  isCompleted
                    ? 'border-[var(--cb-success-border)] bg-[var(--cb-success-soft)]/50'
                    : isCurrent
                      ? 'border-[var(--cb-primary-border)] bg-[var(--cb-primary-soft)]/55'
                      : 'border-[var(--cb-border)] bg-[var(--cb-surface-subtle)]/55',
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold tracking-wide text-[var(--cb-text-muted)] uppercase cb-tabular">
                      Step {index + 1}
                    </span>
                    {isCompleted ? (
                      <CheckCircle2
                        className="h-4 w-4 shrink-0 text-[var(--cb-success)]"
                        aria-label="Completed stage"
                      />
                    ) : isCurrent ? (
                      <Clock
                        className="h-4 w-4 shrink-0 text-[var(--cb-primary)]"
                        aria-label="Active stage"
                      />
                    ) : (
                      <Circle
                        className="h-4 w-4 shrink-0 text-[var(--cb-text-muted)]"
                        aria-label="Upcoming stage"
                      />
                    )}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[var(--cb-text)]">
                    {stage.label}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--cb-text-secondary)]">
                    {stage.detail}
                  </p>
                </div>
                <div className="mt-3">
                  <Badge
                    variant={
                      isCompleted
                        ? 'success'
                        : isCurrent
                          ? 'primary'
                          : 'neutral'
                    }
                  >
                    {isCompleted
                      ? 'Recorded'
                      : isCurrent
                        ? 'Current Step'
                        : 'Pending'}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent Activity"
            description="Latest updates across your uploaded reports, appointments, referrals, and follow-up milestones."
          />

          {activity.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" aria-hidden="true" />}
              title="No care activity recorded yet"
              description="Get started by uploading a medical report, requesting an appointment, or adding optional contact preferences to your profile."
              action={
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <Link to="/patient/reports">
                    <Button size="sm" leftIcon={<Upload className="h-4 w-4" />}>
                      Upload Health Report
                    </Button>
                  </Link>
                  <Link to="/patient/appointments">
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Calendar className="h-4 w-4" />}
                    >
                      Request Appointment
                    </Button>
                  </Link>
                </div>
              }
            />
          ) : (
            <ul className="divide-y divide-[var(--cb-border)]">
              {activity.map((item) => {
                const meta = ACTIVITY_META[item.category];
                const Icon = meta.icon;
                return (
                  <li key={item.id} className="py-3.5 first:pt-0 last:pb-0">
                    <Link
                      to={item.link_path}
                      className="group flex items-start justify-between gap-3 rounded-lg p-1.5 -m-1.5 transition-colors hover:bg-[var(--cb-surface-subtle)]"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-[var(--cb-text)] group-hover:text-[var(--cb-primary)]">
                              {item.title}
                            </p>
                            <Badge variant="neutral">
                              {formatStatusLabel(item.status)}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-[var(--cb-text-secondary)]">
                            {item.description}
                          </p>
                          <p className="mt-1 text-[11px] text-[var(--cb-text-muted)] cb-tabular">
                            {formatDateTime(item.occurred_at)}
                          </p>
                        </div>
                      </div>
                      <ArrowRight
                        className="mt-2 h-4 w-4 shrink-0 text-[var(--cb-text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--cb-primary)]"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader
            title="Quick Actions"
            description="Common actions for managing your care coordination."
          />
          <div className="space-y-2.5">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  to={action.to}
                  className={cn(
                    'group flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors',
                    action.highlight
                      ? 'border-[var(--cb-primary-border)] bg-[var(--cb-primary-soft)]/50 hover:bg-[var(--cb-primary-soft)]'
                      : 'border-[var(--cb-border)] bg-[var(--cb-surface)] hover:bg-[var(--cb-surface-subtle)]',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
                        action.highlight
                          ? 'border-[var(--cb-primary-border)] bg-[var(--cb-surface)] text-[var(--cb-primary)]'
                          : 'border-[var(--cb-border)] bg-[var(--cb-surface-subtle)] text-[var(--cb-text-secondary)]',
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--cb-text)]">
                        {action.label}
                      </p>
                      <p className="truncate text-xs text-[var(--cb-text-muted)]">
                        {action.detail}
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-[var(--cb-text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--cb-primary)]"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
