import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export type StatTone = 'primary' | 'teal' | 'success' | 'warning' | 'critical';

export interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendTone?: 'positive' | 'warning' | 'critical' | 'neutral';
  icon: ReactNode;
  tone?: StatTone;
  className?: string;
}

const iconToneClasses: Record<StatTone, string> = {
  primary: 'bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]',
  teal: 'bg-[var(--cb-secondary-soft)] text-[var(--cb-secondary-text)]',
  success: 'bg-[var(--cb-success-soft)] text-[var(--cb-success)]',
  warning: 'bg-[var(--cb-warning-soft)] text-[var(--cb-warning)]',
  critical: 'bg-[var(--cb-critical-soft)] text-[var(--cb-critical)]',
};

const trendToneClasses: Record<
  NonNullable<StatCardProps['trendTone']>,
  string
> = {
  positive: 'text-[var(--cb-success)]',
  warning: 'text-[var(--cb-warning)]',
  critical: 'text-[var(--cb-critical)]',
  neutral: 'text-[var(--cb-text-muted)]',
};

export function StatCard({
  label,
  value,
  subtitle,
  trend,
  trendTone = 'neutral',
  icon,
  tone = 'primary',
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col justify-between rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-5 shadow-[var(--cb-shadow-xs)] transition-colors hover:border-[var(--cb-border-strong)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium tracking-wide text-[var(--cb-text-muted)] uppercase">
          {label}
        </span>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            iconToneClasses[tone],
          )}
        >
          {icon}
        </div>
      </div>

      <div className="mt-3">
        <p className="text-2xl font-bold tracking-tight text-[var(--cb-text)] cb-tabular sm:text-[1.65rem]">
          {value}
        </p>
        {(trend || subtitle) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            {trend && (
              <span
                className={cn('font-semibold', trendToneClasses[trendTone])}
              >
                {trend}
              </span>
            )}
            {subtitle && (
              <span className="text-[var(--cb-text-muted)]">{subtitle}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
