import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface LoadingStateProps {
  label?: string;
  rows?: number;
  className?: string;
}

export function LoadingState({
  label = 'Loading clinical workspace...',
  rows = 3,
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6',
        className,
      )}
    >
      <div className="flex items-center gap-2.5 text-sm font-medium text-[var(--cb-text-secondary)]">
        <Loader2
          className="h-4 w-4 animate-spin text-[var(--cb-primary)]"
          aria-hidden="true"
        />
        <span>{label}</span>
      </div>
      {rows > 0 && (
        <div className="mt-4 space-y-2.5">
          {Array.from({ length: rows }).map((_, index) => (
            <div
              key={index}
              className="h-9 animate-pulse rounded-lg bg-[var(--cb-surface-subtle)]"
            />
          ))}
        </div>
      )}
    </div>
  );
}
