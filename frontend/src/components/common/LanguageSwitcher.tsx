import { Languages } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/utils/cn';

export interface LanguageSwitcherProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function LanguageSwitcher({
  variant = 'compact',
  className,
}: LanguageSwitcherProps) {
  const { language, setLanguage, languages, t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t.nav.languageLabel}
      className={cn(
        'inline-flex items-center rounded-lg border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)] p-0.5',
        variant === 'full' ? 'gap-1 p-1' : 'h-9 gap-0.5',
        className,
      )}
    >
      {variant === 'compact' && (
        <Languages
          aria-hidden="true"
          className="ml-1.5 mr-0.5 h-3.5 w-3.5 shrink-0 text-[var(--cb-text-muted)]"
        />
      )}
      {languages.map((option) => {
        const isActive = language === option.code;
        return (
          <button
            key={option.code}
            type="button"
            lang={option.code}
            aria-pressed={isActive}
            aria-label={`${t.nav.languageLabel}: ${option.label}`}
            onClick={() => setLanguage(option.code)}
            className={cn(
              'inline-flex items-center justify-center rounded-md font-semibold transition-colors',
              variant === 'full'
                ? 'h-10 gap-2 px-4 text-sm'
                : 'h-7 px-2 text-xs',
              isActive
                ? 'bg-[var(--cb-surface)] text-[var(--cb-primary)] shadow-[var(--cb-shadow-xs)] ring-1 ring-[var(--cb-border)]'
                : 'text-[var(--cb-text-muted)] hover:text-[var(--cb-text)]',
            )}
          >
            {variant === 'full' ? (
              <>
                <span>{option.nativeLabel}</span>
                {option.nativeLabel !== option.label && (
                  <span className="text-xs font-normal text-[var(--cb-text-muted)]">
                    ({option.label})
                  </span>
                )}
              </>
            ) : (
              option.shortLabel
            )}
          </button>
        );
      })}
    </div>
  );
}
