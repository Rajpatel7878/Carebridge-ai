import type { ReactNode } from 'react';
import type { RiskLevel } from '@/types/domain';
import { cn } from '@/utils/cn';

export type BadgeVariant =
  'primary' | 'teal' | 'success' | 'warning' | 'critical' | 'neutral';

export interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary:
    'bg-[var(--cb-primary-soft)] text-[var(--cb-primary)] border-[var(--cb-primary-border)]',
  teal: 'bg-[var(--cb-secondary-soft)] text-[var(--cb-secondary-text)] border-[var(--cb-secondary-border)]',
  success:
    'bg-[var(--cb-success-soft)] text-[var(--cb-success)] border-[var(--cb-success-border)]',
  warning:
    'bg-[var(--cb-warning-soft)] text-[var(--cb-warning)] border-[var(--cb-warning-border)]',
  critical:
    'bg-[var(--cb-critical-soft)] text-[var(--cb-critical)] border-[var(--cb-critical-border)]',
  neutral:
    'bg-[var(--cb-surface-subtle)] text-[var(--cb-text-secondary)] border-[var(--cb-border)]',
};

const dotStyles: Record<BadgeVariant, string> = {
  primary: 'bg-[var(--cb-primary)]',
  teal: 'bg-[var(--cb-secondary)]',
  success: 'bg-[var(--cb-success)]',
  warning: 'bg-[var(--cb-warning)]',
  critical: 'bg-[var(--cb-critical)]',
  neutral: 'bg-[var(--cb-text-muted)]',
};

export function Badge({
  variant = 'neutral',
  dot = false,
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        variantStyles[variant],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn('h-1.5 w-1.5 rounded-full', dotStyles[variant])}
        />
      )}
      {children}
    </span>
  );
}

const riskConfig: Record<RiskLevel, { label: string; variant: BadgeVariant }> =
  {
    low: { label: 'Low Risk', variant: 'success' },
    moderate: { label: 'Moderate Risk', variant: 'warning' },
    high: { label: 'High Risk', variant: 'critical' },
    critical: { label: 'Critical Risk', variant: 'critical' },
  };

export function RiskBadge({ level }: { level: RiskLevel }) {
  const { label, variant } = riskConfig[level];
  return (
    <Badge variant={variant} dot>
      {label}
    </Badge>
  );
}
