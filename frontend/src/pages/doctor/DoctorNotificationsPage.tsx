import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  NotificationItem,
} from '@/components/common';
import { Select } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { useDemo } from '@/hooks/useDemo';
import { useDoctorPortal } from '@/hooks/useDoctorPortal';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { extractApiErrorMessage } from '@/services/api';
import { fetchDoctorNotifications } from '@/services/doctor';
import {
  DOCTOR_NOTIFICATION_ROUTE_MAP,
  type DoctorNotification,
} from '@/types/doctor';
import type { NotificationCategory } from '@/types/domain';
import type { NotificationTypeCode } from '@/types/patient';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/format';

const NOTIFICATION_CATEGORY_MAP: Record<
  NotificationTypeCode,
  NotificationCategory
> = {
  REPORT: 'report',
  APPOINTMENT: 'appointment',
  REFERRAL: 'referral',
  FOLLOW_UP: 'follow-up',
  PROFILE: 'system',
  SYSTEM: 'system',
};

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'SYSTEM', label: 'Care Panel Assignments' },
  { value: 'REPORT', label: 'Medical Reports' },
  { value: 'APPOINTMENT', label: 'Appointments' },
  { value: 'REFERRAL', label: 'Referrals' },
  { value: 'FOLLOW_UP', label: 'Follow-ups' },
  { value: 'PROFILE', label: 'Clinician Account' },
];

export function DoctorNotificationsPage() {
  useDocumentTitle('Notifications');
  const { showToast } = useDemo();
  const { markOneRead, markAllRead, refreshNotifications } = useDoctorPortal();

  const [items, setItems] = useState<DoctorNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchDoctorNotifications(unreadOnly);
      setItems(response.items);
      setUnreadCount(response.unread_count);
    } catch (err) {
      setError(
        extractApiErrorMessage(err, 'Unable to load clinical notifications.'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        void loadNotifications();
      }
    });
    return () => {
      active = false;
    };
  }, [loadNotifications]);

  const handleMarkRead = async (notification: DoctorNotification) => {
    if (notification.is_read) return;
    try {
      await markOneRead(notification.id);
      setItems((prev) =>
        unreadOnly
          ? prev.filter((entry) => entry.id !== notification.id)
          : prev.map((entry) =>
              entry.id === notification.id
                ? { ...entry, is_read: true }
                : entry,
            ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      showToast(
        'Could not update notification',
        extractApiErrorMessage(err, 'Please try again.'),
        'warning',
      );
    }
  };

  const handleMarkAllRead = async () => {
    if (isMarkingAll || unreadCount === 0) return;
    setIsMarkingAll(true);
    try {
      const count = await markAllRead();
      showToast(
        'Notifications marked as read',
        `Updated ${count} notification${count === 1 ? '' : 's'}.`,
        'info',
      );
      await Promise.all([loadNotifications(), refreshNotifications()]);
    } catch (err) {
      showToast(
        'Could not mark all as read',
        extractApiErrorMessage(err, 'Please try again.'),
        'warning',
      );
    } finally {
      setIsMarkingAll(false);
    }
  };

  const filteredItems = items.filter((item) =>
    typeFilter === 'all' ? true : item.notification_type === typeFilter,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="In-app workflow notifications for patient assignments, report submissions, appointment requests, referrals, and overdue follow-ups."
        badge={
          <Badge variant={unreadCount > 0 ? 'primary' : 'neutral'} dot>
            {unreadCount} unread
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => void loadNotifications()}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              leftIcon={<CheckCheck className="h-4 w-4" />}
              onClick={() => void handleMarkAllRead()}
              disabled={unreadCount === 0}
              isLoading={isMarkingAll}
            >
              Mark All Read
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Notification read status filter"
          className="inline-flex w-fit rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-1"
        >
          {(
            [
              { id: 'all', label: 'All Notifications' },
              { id: 'unread', label: `Unread (${unreadCount})` },
            ] as const
          ).map((tab) => {
            const selected =
              (tab.id === 'unread' && unreadOnly) ||
              (tab.id === 'all' && !unreadOnly);
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setUnreadOnly(tab.id === 'unread')}
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

        <div className="w-full sm:w-64">
          <Select
            aria-label="Filter notifications by category"
            options={TYPE_FILTER_OPTIONS}
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState
          title="Could not load notifications"
          message={error}
          onRetry={() => void loadNotifications()}
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title={
            unreadOnly
              ? 'All caught up — no unread notifications'
              : 'No clinical notifications yet'
          }
          description="In-app updates appear automatically when administrators assign patients, patients upload reports or request visits, or follow-ups require attention."
        />
      ) : (
        <Card className="space-y-3">
          {filteredItems.map((item) => {
            const targetPath =
              DOCTOR_NOTIFICATION_ROUTE_MAP[
                item.notification_type as NotificationTypeCode
              ] ?? '/doctor';
            return (
              <NotificationItem
                key={item.id}
                notification={{
                  id: item.id,
                  role: 'doctor',
                  category:
                    NOTIFICATION_CATEGORY_MAP[
                      item.notification_type as NotificationTypeCode
                    ] ?? 'system',
                  priority: item.is_read ? 'normal' : 'important',
                  title: item.title,
                  message: item.message,
                  timestamp: formatDateTime(item.created_at),
                  read: item.is_read,
                  actionPath: targetPath,
                  actionLabel: 'Open workspace',
                }}
                onMarkRead={() => void handleMarkRead(item)}
              />
            );
          })}
        </Card>
      )}

      <div className="flex items-start gap-2.5 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] px-4 py-3 text-xs text-[var(--cb-text-muted)]">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cb-secondary)]"
          aria-hidden="true"
        />
        <p>
          Notification previews omit sensitive clinical notes and diagnostic
          identifiers by design. Notifications are delivered exclusively in-app.
        </p>
      </div>
    </div>
  );
}
