import { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  Calendar,
  Check,
  CheckCheck,
  ClipboardCheck,
  FileText,
  GitBranch,
  Info,
  User,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/common';
import { PageHeader } from '@/components/navigation';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePatientPortal } from '@/hooks/usePatientPortal';
import { extractApiErrorMessage } from '@/services/api';
import { fetchPatientNotifications } from '@/services/patient';
import {
  NOTIFICATION_ROUTE_MAP,
  type NotificationTypeCode,
  type PatientNotification,
} from '@/types/patient';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/format';

const TYPE_META: Record<
  NotificationTypeCode,
  { label: string; icon: typeof Bell }
> = {
  REPORT: { label: 'Report', icon: FileText },
  APPOINTMENT: { label: 'Appointment', icon: Calendar },
  REFERRAL: { label: 'Referral', icon: GitBranch },
  FOLLOW_UP: { label: 'Follow-up', icon: ClipboardCheck },
  PROFILE: { label: 'Profile', icon: User },
  SYSTEM: { label: 'Portal', icon: Info },
};

export function PatientNotificationsPage() {
  useDocumentTitle('Notifications');
  const { showToast } = useDemo();
  const { markOneRead, markAllRead, refreshNotifications } = usePatientPortal();

  const [items, setItems] = useState<PatientNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchPatientNotifications(filter === 'unread');
      setItems(response.items);
      setUnreadCount(response.unread_count);
    } catch (err) {
      setError(
        extractApiErrorMessage(
          err,
          'Unable to load your notifications right now.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    let cancelled = false;
    fetchPatientNotifications(filter === 'unread')
      .then((response) => {
        if (cancelled) return;
        setItems(response.items);
        setUnreadCount(response.unread_count);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          extractApiErrorMessage(
            err,
            'Unable to load your notifications right now.',
          ),
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const handleMarkOneRead = async (notification: PatientNotification) => {
    if (notification.is_read || markingId) return;
    setMarkingId(notification.id);
    try {
      await markOneRead(notification.id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setItems((prev) =>
        filter === 'unread'
          ? prev.filter((item) => item.id !== notification.id)
          : prev.map((item) =>
              item.id === notification.id ? { ...item, is_read: true } : item,
            ),
      );
    } catch (err) {
      showToast(
        'Could not update notification',
        extractApiErrorMessage(err, 'Please try again.'),
        'warning',
      );
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (isMarkingAll || unreadCount === 0) return;
    setIsMarkingAll(true);
    try {
      const count = await markAllRead();
      setUnreadCount(0);
      setItems((prev) =>
        filter === 'unread'
          ? []
          : prev.map((item) => ({ ...item, is_read: true })),
      );
      await refreshNotifications();
      showToast(
        'All notifications marked as read',
        `${count} ${count === 1 ? 'notification' : 'notifications'} updated.`,
      );
    } catch (err) {
      showToast(
        'Could not mark notifications read',
        extractApiErrorMessage(err, 'Please try again.'),
        'warning',
      );
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="In-app updates about your uploaded reports, appointment requests, referrals, and follow-up tasks."
        badge={
          <Badge variant={unreadCount > 0 ? 'primary' : 'neutral'} dot>
            {unreadCount} unread
          </Badge>
        }
        actions={
          <Button
            size="sm"
            variant="outline"
            disabled={unreadCount === 0}
            isLoading={isMarkingAll}
            leftIcon={<CheckCheck className="h-4 w-4" />}
            onClick={() => void handleMarkAllRead()}
          >
            Mark all as read
          </Button>
        }
      />

      {/* All / Unread Tabs */}
      <div
        role="tablist"
        aria-label="Notification filter"
        className="inline-flex w-fit rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-1"
      >
        {(
          [
            { id: 'all', label: 'All History' },
            { id: 'unread', label: `Unread (${unreadCount})` },
          ] as const
        ).map((tab) => {
          const selected = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setFilter(tab.id)}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors sm:text-sm',
                selected
                  ? 'bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]'
                  : 'text-[var(--cb-text-secondary)] hover:text-[var(--cb-text)]',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <LoadingState label="Loading your notifications..." rows={3} />
      ) : error ? (
        <ErrorState
          title="Could not load notifications"
          message={error}
          onRetry={() => void loadNotifications()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" aria-hidden="true" />}
          title={
            filter === 'unread'
              ? 'You are all caught up'
              : 'No notifications yet'
          }
          description={
            filter === 'unread'
              ? 'All of your in-app care notifications have been read.'
              : 'In-app confirmations and status updates will appear here whenever you upload a report, request an appointment, or receive care updates.'
          }
          action={
            filter === 'unread' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setFilter('all')}
              >
                View Notification History
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const meta = TYPE_META[item.notification_type];
            const Icon = meta.icon;
            const destination = NOTIFICATION_ROUTE_MAP[item.notification_type];

            return (
              <Card
                key={item.id}
                className={cn(
                  'transition-colors',
                  !item.is_read &&
                    'border-[var(--cb-primary-border)] bg-[var(--cb-primary-soft)]/25',
                )}
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="flex min-w-0 items-start gap-3.5">
                    <div
                      className={cn(
                        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        item.is_read
                          ? 'bg-[var(--cb-surface-subtle)] text-[var(--cb-text-muted)]'
                          : 'bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]',
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-semibold text-[var(--cb-text)]">
                          {item.title}
                        </h2>
                        <Badge variant="neutral">{meta.label}</Badge>
                        {!item.is_read && (
                          <Badge variant="primary" dot>
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--cb-text-secondary)] sm:text-sm">
                        {item.message}
                      </p>
                      <p className="mt-1.5 text-[11px] text-[var(--cb-text-muted)] cb-tabular">
                        {formatDateTime(item.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {destination !== '/patient/notifications' && (
                      <Link to={destination}>
                        <Button size="sm" variant="ghost">
                          Open
                        </Button>
                      </Link>
                    )}
                    {!item.is_read && (
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={markingId === item.id}
                        leftIcon={<Check className="h-3.5 w-3.5" />}
                        onClick={() => void handleMarkOneRead(item)}
                      >
                        Mark read
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
