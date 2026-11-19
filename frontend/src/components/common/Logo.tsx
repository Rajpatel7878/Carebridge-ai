import { useId } from 'react';
import { cn } from '@/utils/cn';

export interface LogoProps {
  showTagline?: boolean;
  tagline?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'inverse';
  className?: string;
}

const ICON_SIZES = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
} as const;

const TEXT_SIZES = {
  sm: 'text-base',
  md: 'text-[1.0625rem]',
  lg: 'text-lg',
} as const;

export function Logo({
  showTagline = false,
  tagline = 'Population Health Platform',
  size = 'md',
  variant = 'default',
  className,
}: LogoProps) {
  const gradientId = useId();
  const isInverse = variant === 'inverse';

  return (
    <span
      className={cn('inline-flex items-center gap-2.5 select-none', className)}
    >
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={cn(ICON_SIZES[size], 'shrink-0')}
      >
        {!isInverse && (
          <defs>
            <linearGradient
              id={gradientId}
              x1="4"
              y1="4"
              x2="36"
              y2="36"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#1769AA" />
              <stop offset="1" stopColor="#0F4C81" />
            </linearGradient>
          </defs>
        )}
        <rect
          width="40"
          height="40"
          rx="10"
          fill={isInverse ? '#FFFFFF' : `url(#${gradientId})`}
          fillOpacity={isInverse ? 0.14 : 1}
        />
        <rect
          x="0.75"
          y="0.75"
          width="38.5"
          height="38.5"
          rx="9.25"
          stroke="#FFFFFF"
          strokeOpacity={isInverse ? 0.24 : 0.14}
          strokeWidth="1"
        />
        {/* Clinical cross */}
        <path
          d="M20 8.5V18.5M15 13.5H25"
          stroke="#FFFFFF"
          strokeWidth="2.9"
          strokeLinecap="round"
        />
        {/* Care-bridge arc connecting patient & provider nodes */}
        <path
          d="M8.5 27.2C11.7 21 15.6 18.5 20 18.5C24.4 18.5 28.3 21 31.5 27.2"
          stroke="#2DD4BF"
          strokeWidth="2.9"
          strokeLinecap="round"
        />
        <path
          d="M13 29.5H27"
          stroke="#FFFFFF"
          strokeOpacity="0.34"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="8.5" cy="27.2" r="2.35" fill="#FFFFFF" />
        <circle cx="31.5" cy="27.2" r="2.35" fill="#FFFFFF" />
        <circle cx="20" cy="18.5" r="1.6" fill="#2DD4BF" />
      </svg>
      <span className="flex flex-col leading-tight">
        <span
          className={cn(
            'font-bold tracking-tight',
            isInverse ? 'text-white' : 'text-[var(--cb-text)]',
            TEXT_SIZES[size],
          )}
        >
          CareBridge{' '}
          <span
            className={
              isInverse ? 'text-[#5EEAD4]' : 'text-[var(--cb-primary)]'
            }
          >
            AI
          </span>
        </span>
        {showTagline && (
          <span
            className={cn(
              'text-[11px] font-medium',
              isInverse ? 'text-slate-200/85' : 'text-[var(--cb-text-muted)]',
            )}
          >
            {tagline}
          </span>
        )}
      </span>
    </span>
  );
}
