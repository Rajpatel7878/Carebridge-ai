import { AlertCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = 'Unable to load section',
  message,
  onRetry,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-3 rounded-xl border border-[var(--cb-critical-border)] bg-[var(--cb-critical-soft)] p-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className="mt-0.5 h-5 w-5 shrink-0 text-[var(--cb-critical)]"
          aria-hidden="true"
        />
        <div>
          <h3 className="text-sm font-semibold text-[var(--cb-text)]">
            {title}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--cb-text-secondary)] sm:text-sm">
            {message}
          </p>
        </div>
      </div>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
          onClick={onRetry}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
