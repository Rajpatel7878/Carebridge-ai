import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    helperText,
    error,
    leftIcon,
    rightElement,
    containerClassName,
    className,
    id,
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
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--cb-text-muted)]">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(
            'h-10 w-full rounded-lg border bg-[var(--cb-surface)] px-3 text-sm text-[var(--cb-text)] placeholder:text-[var(--cb-text-muted)] transition-colors focus:border-[var(--cb-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--cb-ring)] disabled:cursor-not-allowed disabled:opacity-60',
            error
              ? 'border-[var(--cb-critical)] focus:border-[var(--cb-critical)]'
              : 'border-[var(--cb-border-strong)]',
            leftIcon ? 'pl-9' : '',
            rightElement ? 'pr-10' : '',
            className,
          )}
          {...rest}
        />
        {rightElement && (
          <span className="absolute inset-y-0 right-0 flex items-center pr-2">
            {rightElement}
          </span>
        )}
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
});
