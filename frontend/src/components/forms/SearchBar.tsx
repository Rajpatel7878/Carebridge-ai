import { Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SearchBarProps {
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search records...',
  ariaLabel,
  className,
}: SearchBarProps) {
  return (
    <div className={cn('relative w-full', className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--cb-text-muted)]"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="h-10 w-full rounded-lg border border-[var(--cb-border-strong)] bg-[var(--cb-surface)] pr-9 pl-9 text-sm text-[var(--cb-text)] placeholder:text-[var(--cb-text-muted)] transition-colors focus:border-[var(--cb-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--cb-ring)]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-[var(--cb-text-muted)] hover:bg-[var(--cb-surface-subtle)] hover:text-[var(--cb-text)]"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
