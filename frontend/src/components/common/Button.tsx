import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ButtonVariant =
  'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#1769AA] text-white hover:bg-[#12568B] active:bg-[#0E4470] dark:bg-[#2B82C9] dark:text-white dark:hover:bg-[#3B9AE1] shadow-[var(--cb-shadow-xs)] border border-transparent',
  secondary:
    'bg-[#0D9488] text-white hover:bg-[#0F766E] dark:bg-[#14B8A6] dark:text-[#06201E] dark:hover:bg-[#2DD4BF] shadow-[var(--cb-shadow-xs)] border border-transparent',
  outline:
    'bg-[var(--cb-surface)] text-[var(--cb-text)] border border-[var(--cb-border-strong)] hover:bg-[var(--cb-surface-subtle)]',
  ghost:
    'bg-transparent text-[var(--cb-text-secondary)] border border-transparent hover:bg-[var(--cb-surface-subtle)] hover:text-[var(--cb-text)]',
  danger:
    'bg-[#DC2626] text-white hover:bg-[#B91C1C] dark:bg-[#DC2626] dark:hover:bg-[#EF4444] shadow-[var(--cb-shadow-xs)] border border-transparent',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      type = 'button',
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-55',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className,
        )}
        {...rest}
      >
        {isLoading ? (
          <Loader2
            className="h-4 w-4 shrink-0 animate-spin"
            aria-hidden="true"
          />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className="inline-flex shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  },
);
