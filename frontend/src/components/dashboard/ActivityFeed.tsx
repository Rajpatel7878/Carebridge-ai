import type { ActivityEvent } from '@/types/domain';
import { cn } from '@/utils/cn';

const dotColorMap: Record<ActivityEvent['tone'], string> = {
  info: 'bg-[var(--cb-primary)]',
  success: 'bg-[var(--cb-success)]',
  warning: 'bg-[var(--cb-warning)]',
  critical: 'bg-[var(--cb-critical)]',
};

export interface ActivityFeedProps {
  events: ActivityEvent[];
  className?: string;
}

export function ActivityFeed({ events, className }: ActivityFeedProps) {
  return (
    <ol className={cn('space-y-4', className)}>
      {events.map((event, index) => (
        <li key={event.id} className="relative flex gap-3.5">
          {index < events.length - 1 && (
            <span
              aria-hidden="true"
              className="absolute top-5 left-[7px] h-[calc(100%+0.5rem)] w-px bg-[var(--cb-border)]"
            />
          )}
          <span
            aria-hidden="true"
            className={cn(
              'relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-[var(--cb-surface)]',
              dotColorMap[event.tone],
            )}
          />
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--cb-text)]">
                {event.title}
              </p>
              <span className="text-xs text-[var(--cb-text-muted)]">
                {event.timestamp}
              </span>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--cb-text-secondary)]">
              {event.description}
            </p>
            <p className="mt-1 text-[11px] font-medium text-[var(--cb-text-muted)]">
              {event.actor}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
