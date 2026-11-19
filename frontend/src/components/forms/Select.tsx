import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  helperText?: string;
  error?: string;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      label,
      options,
      helperText,
      error,
      containerClassName,
      className,
      id,
      ...rest
    },
    ref,
  ) {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const errorId = `${selectId}-error`;

    return (
      <div className={cn('w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="mb-1.5 block text-sm font-medium text-[var(--cb-text)]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              'h-10 w-full appearance-none rounded-lg border bg-[var(--cb-surface)] pr-9 pl-3 text-sm text-[var(--cb-text)] transition-colors focus:border-[var(--cb-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--cb-ring)] disabled:cursor-not-allowed disabled:opacity-60',
              error
                ? 'border-[var(--cb-critical)]'
                : 'border-[var(--cb-border-strong)]',
              className,
            )}
            {...rest}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[var(--cb-text-muted)]"
          />
        </div>
        {error ? (
          <p
            id={errorId}
            role="alert"
            className="mt-1.5 text-xs font-medium text-[var(--cb-critical)]"
          >
            {error}
          </p>
        ) : (
          helperText && (
            <p className="mt-1.5 text-xs text-[var(--cb-text-muted)]">
              {helperText}
            </p>
          )
        )}
      </div>
    );
  },
);
