import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Eye,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
} from '@/components/common';
import { StatCard } from '@/components/dashboard';
import { PageHeader } from '@/components/navigation';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePatientPortal } from '@/hooks/usePatientPortal';
import { extractApiErrorMessage } from '@/services/api';
import {
  completePatientFollowUp,
  fetchPatientFollowUpDetail,
  fetchPatientFollowUps,
} from '@/services/patient';
import { FOLLOW_UP_STATUS_BADGES, type PatientFollowUp } from '@/types/patient';
import { cn } from '@/utils/cn';
import { formatDate, formatDateTime } from '@/utils/format';

type FollowUpViewTab = 'all' | 'overdue' | 'upcoming' | 'completed';

function getFollowUpNextStep(item: PatientFollowUp): string {
  if (item.status === 'COMPLETED') {
    return 'Marked completed in your portal. Keep any supporting reports ready for your next clinic visit.';
  }
  if (item.status === 'CANCELLED') {
    return 'This follow-up item was cancelled and requires no further action.';
  }
  if (item.status === 'MISSED') {
    return 'This follow-up window passed. Request an appointment if you need to reschedule with your care team.';
  }
  if (item.is_overdue) {
    return 'Target date has passed. Complete this care check-in when done or request a follow-up visit.';
  }
  return 'Scheduled ahead. Complete the step on or before the target date and mark it done in your portal.';
}

export function PatientFollowUpsPage() {
  useDocumentTitle('Follow-ups');
  const { showToast } = useDemo();
  const { refreshNotifications } = usePatientPortal();

  const [items, setItems] = useState<PatientFollowUp[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [activeTab, setActiveTab] = useState<FollowUpViewTab>('all');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detailTask, setDetailTask] = useState<PatientFollowUp | null>(null);
  const [confirmTask, setConfirmTask] = useState<PatientFollowUp | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const loadFollowUps = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchPatientFollowUps();
      setItems(response.items);
      setOverdueCount(response.overdue_count);
      setUpcomingCount(response.upcoming_count);
      setCompletedCount(response.completed_count);
    } catch (err) {
      setError(
        extractApiErrorMessage(
          err,
          'Unable to load your follow-up milestones right now.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchPatientFollowUps()
      .then((response) => {
        if (cancelled) return;
        setItems(response.items);
        setOverdueCount(response.overdue_count);
        setUpcomingCount(response.upcoming_count);
        setCompletedCount(response.completed_count);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          extractApiErrorMessage(
            err,
            'Unable to load your follow-up milestones right now.',
          ),
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpenDetail = async (task: PatientFollowUp) => {
    setDetailTask(task);
    try {
      const fresh = await fetchPatientFollowUpDetail(task.id);
      setDetailTask(fresh);
    } catch {
      // Keep displayed record visible
    }
  };

  const handleConfirmComplete = async () => {
    if (!confirmTask || isCompleting) return;
    setIsCompleting(true);
    try {
      await completePatientFollowUp(confirmTask.id);
      setConfirmTask(null);
      if (detailTask?.id === confirmTask.id) {
        setDetailTask(null);
      }
      showToast(
        'Follow-up completed',
        `"${confirmTask.follow_up_type}" has been marked completed.`,
      );
      await Promise.all([loadFollowUps(), refreshNotifications()]);
    } catch (err) {
      showToast(
        'Could not update follow-up',
        extractApiErrorMessage(err, 'Please refresh and try again.'),
        'warning',
      );
    } finally {
      setIsCompleting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === 'overdue') return item.is_overdue;
    if (activeTab === 'upcoming') {
      return item.status === 'PENDING' && !item.is_overdue;
    }
    if (activeTab === 'completed') return item.status === 'COMPLETED';
    return true;
  });

  const tabs: { id: FollowUpViewTab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: items.length },
    { id: 'overdue', label: 'Overdue', count: overdueCount },
    { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
    { id: 'completed', label: 'Completed', count: completedCount },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-ups"
        subtitle="Stay on track with scheduled post-visit check-ins, repeat screening tasks, and continuity-of-care milestones."
      />

      {/* Summary counters */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Overdue"
          value={overdueCount}
          subtitle={
            overdueCount === 0 ? 'No overdue tasks' : 'Requires attention'
          }
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={overdueCount > 0 ? 'critical' : 'success'}
        />
        <StatCard
          label="Upcoming"
          value={upcomingCount}
          subtitle={
            upcomingCount === 0 ? 'No upcoming tasks' : 'Scheduled ahead'
          }
          icon={<Clock className="h-4 w-4" />}
          tone="primary"
        />
        <StatCard
          label="Completed"
          value={completedCount}
          subtitle="Recorded in portal"
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="success"
        />
      </div>

      {/* Category tabs */}
      <div
        role="tablist"
        aria-label="Follow-up category filter"
        className="flex flex-wrap gap-1.5 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-1 w-fit"
      >
        {tabs.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm',
                selected
                  ? 'bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]'
                  : 'text-[var(--cb-text-secondary)] hover:text-[var(--cb-text)]',
              )}
            >
              <span>{tab.label}</span>
              <span className="rounded-full bg-[var(--cb-surface-subtle)] px-2 py-0.5 text-[11px] cb-tabular">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <LoadingState label="Loading your follow-up milestones..." rows={3} />
      ) : error ? (
        <ErrorState
          title="Could not load follow-ups"
          message={error}
          onRetry={() => void loadFollowUps()}
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="h-6 w-6" aria-hidden="true" />}
          title={
            items.length === 0
              ? 'No follow-up tasks scheduled yet'
              : `No ${activeTab} follow-ups`
          }
          description={
            items.length === 0
              ? 'When your care team schedules post-screening check-ins or repeat test reminders, they will appear here with clear target dates and status updates.'
              : 'Switch to another tab to review your remaining follow-up records.'
          }
          action={
            items.length === 0 ? (
              <Link to="/patient/appointments">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Calendar className="h-4 w-4" />}
                >
                  View Appointments
                </Button>
              </Link>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab('all')}
              >
                Show All Follow-ups
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredItems.map((task) => {
            const statusMeta =
              task.is_overdue && task.status === 'PENDING'
                ? { label: 'Overdue', variant: 'critical' as const }
                : FOLLOW_UP_STATUS_BADGES[task.status];
            const canComplete = task.status === 'PENDING';

            return (
              <Card key={task.id} className="space-y-3.5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusMeta.variant} dot>
                        {statusMeta.label}
                      </Badge>
                      <span className="text-xs text-[var(--cb-text-muted)] cb-tabular">
                        Target date: {formatDateTime(task.scheduled_at)}
                      </span>
                    </div>
                    <h2 className="text-base font-semibold text-[var(--cb-text)]">
                      {task.follow_up_type}
                    </h2>
                    {task.notes && (
                      <p className="text-sm leading-relaxed text-[var(--cb-text-secondary)]">
                        {task.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Eye className="h-3.5 w-3.5" />}
                      onClick={() => void handleOpenDetail(task)}
                    >
                      Details
                    </Button>
                    {canComplete && (
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<CheckCircle2 className="h-4 w-4" />}
                        onClick={() => setConfirmTask(task)}
                      >
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </div>

                {/* Status timeline & next-step guidance */}
                <div className="flex flex-col justify-between gap-2 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)] p-3 text-xs text-[var(--cb-text-secondary)] sm:flex-row sm:items-center">
                  <span>
                    <strong className="font-semibold text-[var(--cb-text)]">
                      Next step:{' '}
                    </strong>
                    {getFollowUpNextStep(task)}
                  </span>
                  <span className="shrink-0 text-[11px] text-[var(--cb-text-muted)] cb-tabular">
                    Created {formatDate(task.created_at)}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      <Modal
        open={Boolean(detailTask)}
        onClose={() => setDetailTask(null)}
        title="Follow-up Details"
        footer={
          detailTask ? (
            <>
              {detailTask.status === 'PENDING' && (
                <Button
                  variant="secondary"
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={() => setConfirmTask(detailTask)}
                >
                  Mark Complete
                </Button>
              )}
              <Button variant="outline" onClick={() => setDetailTask(null)}>
                Close
              </Button>
            </>
          ) : undefined
        }
      >
        {detailTask && (
          <div className="space-y-4">
            <Badge
              variant={
                detailTask.is_overdue && detailTask.status === 'PENDING'
                  ? 'critical'
                  : FOLLOW_UP_STATUS_BADGES[detailTask.status].variant
              }
              dot
            >
              {detailTask.is_overdue && detailTask.status === 'PENDING'
                ? 'Overdue'
                : FOLLOW_UP_STATUS_BADGES[detailTask.status].label}
            </Badge>

            <dl className="divide-y divide-[var(--cb-border)] rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)] px-4 text-xs sm:text-sm">
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[var(--cb-text-muted)]">Follow-up Type</dt>
                <dd className="font-medium text-[var(--cb-text)]">
                  {detailTask.follow_up_type}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[var(--cb-text-muted)]">Scheduled For</dt>
                <dd className="font-medium text-[var(--cb-text)] cb-tabular">
                  {formatDateTime(detailTask.scheduled_at)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[var(--cb-text-muted)]">Last Updated</dt>
                <dd className="font-medium text-[var(--cb-text)] cb-tabular">
                  {formatDateTime(detailTask.updated_at)}
                </dd>
              </div>
            </dl>

            {detailTask.notes && (
              <div className="rounded-xl border border-[var(--cb-border)] p-3.5">
                <p className="text-xs font-semibold text-[var(--cb-text-muted)] uppercase">
                  Instructions
                </p>
                <p className="mt-1 text-sm text-[var(--cb-text)]">
                  {detailTask.notes}
                </p>
              </div>
            )}

            <p className="text-xs leading-relaxed text-[var(--cb-text-secondary)]">
              {getFollowUpNextStep(detailTask)}
            </p>
          </div>
        )}
      </Modal>

      {/* Mark complete confirmation */}
      <ConfirmDialog
        open={Boolean(confirmTask)}
        onClose={() => {
          if (!isCompleting) setConfirmTask(null);
        }}
        title="Mark follow-up completed?"
        description={
          confirmTask
            ? `Confirm that you have completed "${confirmTask.follow_up_type}"? This update is saved to your CareBridge AI follow-up history.`
            : ''
        }
        confirmLabel="Mark Completed"
        isLoading={isCompleting}
        onConfirm={() => void handleConfirmComplete()}
      />
    </div>
  );
}
