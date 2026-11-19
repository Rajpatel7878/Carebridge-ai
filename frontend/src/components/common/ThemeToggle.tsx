import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/utils/cn';

export interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({
  showLabel = false,
  className,
}: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();
  const nextLabel = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={nextLabel}
      title={nextLabel}
      className={cn(
        'inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--cb-border)] bg-[var(--cb-surface)] text-xs font-medium text-[var(--cb-text-secondary)] transition-colors hover:bg-[var(--cb-surface-subtle)] hover:text-[var(--cb-text)]',
        showLabel ? 'px-3' : 'w-9',
        className,
      )}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 text-[var(--cb-primary)]" aria-hidden="true" />
      )}
      {showLabel && <span>{isDark ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  );
}
