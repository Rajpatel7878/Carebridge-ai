import { useMemo, useState } from 'react';
import { BellOff, CheckCheck } from 'lucide-react';
import { Button, EmptyState, NotificationItem } from '@/components/common';
import { Select } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { useDemo } from '@/hooks/useDemo';
import type { UserRole } from '@/types/domain';
import { cn } from '@/utils/cn';

export interface NotificationsCenterProps {
  role: UserRole;
  subtitle: string;
}

export function NotificationsCenter({
  role,
  subtitle,
}: NotificationsCenterProps) {
  const {
    getRoleNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    showToast,
  } = useDemo();

  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [category, setCategory] = useState<string>('all');

  const allItems = getRoleNotifications(role);
  const unreadCount = getUnreadCount(role);

  const visibleItems = useMemo(() => {
    return allItems.filter((item) => {
      if (tab === 'unread' && item.read) return false;
      if (category !== 'all' && item.category !== category) return false;
      return true;
    });
  }, [allItems, tab, category]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle={subtitle}
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={unreadCount === 0}
            leftIcon={<CheckCheck className="h-4 w-4" />}
            onClick={() => {
              markAllNotificationsRead(role);
              showToast('All demo notifications marked as read');
            }}
          >
            Mark all as read
          </Button>
        }
      />

      <div className="flex flex-col justify-between gap-3 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-3.5 sm:flex-row sm:items-center">
        <div className="inline-flex rounded-lg bg-[var(--cb-surface-subtle)] p-1">
          {(
            [
              { id: 'all', label: `All (${allItems.length})` },
              { id: 'unread', label: `Unread (${unreadCount})` },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTab(option.id)}
              className={cn(
                'rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors cb-tabular',
                tab === option.id
                  ? 'bg-[var(--cb-surface)] text-[var(--cb-primary)] shadow-[var(--cb-shadow-xs)]'
                  : 'text-[var(--cb-text-muted)] hover:text-[var(--cb-text)]',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <Select
          aria-label="Filter notifications by category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          containerClassName="sm:w-52"
          options={[
            { value: 'all', label: 'All Categories' },
            { value: 'report', label: 'Reports' },
            { value: 'appointment', label: 'Appointments' },
            { value: 'referral', label: 'Referrals' },
            { value: 'follow-up', label: 'Follow-ups' },
            { value: 'risk', label: 'Risk Alerts' },
          ]}
        />
      </div>

      {visibleItems.length === 0 ? (
        <EmptyState
          icon={<BellOff className="h-6 w-6" />}
          title="You're all caught up"
          description="No notifications match the selected filter right now."
          action={
            (tab !== 'all' || category !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTab('all');
                  setCategory('all');
                }}
              >
                Show all notifications
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item) => (
            <NotificationItem
              key={item.id}
              notification={item}
              onMarkRead={markNotificationRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}
