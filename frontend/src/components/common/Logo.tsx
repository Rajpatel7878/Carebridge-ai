import { cn } from '@/utils/cn';

export interface LogoProps {
  showTagline?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function Logo({
  showTagline = false,
  size = 'md',
  className,
}: LogoProps) {
  const iconSize = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';

  return (
    <span
      className={cn('inline-flex items-center gap-2.5 select-none', className)}
    >
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={cn(iconSize, 'shrink-0')}
      >
        <rect width="40" height="40" rx="10" fill="#1769AA" />
        <path
          d="M8.5 25.5C11.8 18 15.6 15.5 20 15.5C24.4 15.5 28.2 18 31.5 25.5"
          stroke="#14B8A6"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M20 9.5V21.5M14 15.5H26"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx="8.5" cy="25.5" r="2.2" fill="#FFFFFF" />
        <circle cx="31.5" cy="25.5" r="2.2" fill="#FFFFFF" />
      </svg>
      <span className="flex flex-col leading-tight">
        <span
          className={cn(
            'font-bold tracking-tight text-[var(--cb-text)]',
            size === 'sm' ? 'text-base' : 'text-[1.0625rem]',
          )}
        >
          CareBridge <span className="text-[var(--cb-primary)]">AI</span>
        </span>
        {showTagline && (
          <span className="text-[11px] font-medium text-[var(--cb-text-muted)]">
            Population Health Platform
          </span>
        )}
      </span>
    </span>
  );
}
