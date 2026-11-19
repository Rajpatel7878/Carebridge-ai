import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      label,
      helperText,
      error,
      containerClassName,
      className,
      id,
      rows = 3,
      ...rest
    },
    ref,
  ) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className={cn('w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-[var(--cb-text)]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(
            'w-full rounded-lg border bg-[var(--cb-surface)] px-3 py-2 text-sm text-[var(--cb-text)] placeholder:text-[var(--cb-text-muted)] transition-colors focus:border-[var(--cb-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--cb-ring)] disabled:cursor-not-allowed disabled:opacity-60',
            error
              ? 'border-[var(--cb-critical)] focus:border-[var(--cb-critical)]'
              : 'border-[var(--cb-border-strong)]',
            className,
          )}
          {...rest}
        />
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
            <p
              id={helperId}
              className="mt-1.5 text-xs text-[var(--cb-text-muted)]"
            >
              {helperText}
            </p>
          )
        )}
      </div>
    );
  },
);
