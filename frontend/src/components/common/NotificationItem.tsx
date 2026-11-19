import {
  AlertCircle,
  ArrowRight,
  Bell,
  Calendar,
  Check,
  ClipboardCheck,
  FileText,
  GitBranch,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AppNotification, NotificationCategory } from '@/types/domain';
import { cn } from '@/utils/cn';
import { Badge } from './Badge';

const categoryIcons: Record<NotificationCategory, typeof Bell> = {
  report: FileText,
  appointment: Calendar,
  referral: GitBranch,
  'follow-up': ClipboardCheck,
  risk: AlertCircle,
  system: Bell,
};

export interface NotificationItemProps {
  notification: AppNotification;
  onMarkRead?: (id: string) => void;
  compact?: boolean;
}

export function NotificationItem({
  notification,
  onMarkRead,
  compact = false,
}: NotificationItemProps) {
  const Icon = categoryIcons[notification.category];

  const iconTone =
    notification.priority === 'urgent'
      ? 'bg-[var(--cb-critical-soft)] text-[var(--cb-critical)]'
      : notification.priority === 'important'
        ? 'bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]'
        : 'bg-[var(--cb-surface-subtle)] text-[var(--cb-text-secondary)]';

  return (
    <div
      className={cn(
        'flex items-start gap-3.5 rounded-xl border transition-colors',
        compact ? 'p-3' : 'p-4',
        notification.read
          ? 'border-[var(--cb-border)] bg-[var(--cb-surface)]'
          : 'border-[var(--cb-primary-border)] bg-[var(--cb-primary-soft)]/45',
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          iconTone,
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {!notification.read && (
              <span
                aria-label="Unread"
                className="h-2 w-2 shrink-0 rounded-full bg-[var(--cb-primary)]"
              />
            )}
            <h3 className="text-sm font-semibold text-[var(--cb-text)]">
              {notification.title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {notification.priority === 'urgent' && (
              <Badge variant="critical">Urgent</Badge>
            )}
            {notification.priority === 'important' && !compact && (
              <Badge variant="warning">Important</Badge>
            )}
            <span className="text-xs text-[var(--cb-text-muted)]">
              {notification.timestamp}
            </span>
          </div>
        </div>

        <p className="mt-1 text-xs leading-relaxed text-[var(--cb-text-secondary)] sm:text-sm">
          {notification.message}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-3">
          <Link
            to={notification.actionPath}
            onClick={() => {
              if (!notification.read) onMarkRead?.(notification.id);
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--cb-primary)] hover:underline"
          >
            {notification.actionLabel}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>

          {!notification.read && onMarkRead && (
            <button
              type="button"
              onClick={() => onMarkRead(notification.id)}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--cb-text-muted)] transition-colors hover:text-[var(--cb-text)]"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Mark as read
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
