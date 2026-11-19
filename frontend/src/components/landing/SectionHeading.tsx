import { cn } from '@/utils/cn';

export interface SectionHeadingProps {
  id?: string;
  eyebrow: string;
  heading: string;
  description?: string;
  align?: 'left' | 'center';
  tone?: 'default' | 'inverse';
  className?: string;
}

export function SectionHeading({
  id,
  eyebrow,
  heading,
  description,
  align = 'left',
  tone = 'default',
  className,
}: SectionHeadingProps) {
  const isCentered = align === 'center';
  const isInverse = tone === 'inverse';

  return (
    <div
      className={cn(
        isCentered ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl',
        className,
      )}
    >
      <p
        className={cn(
          'inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase',
          isInverse ? 'text-[#99F6E4]' : 'text-[var(--cb-primary)]',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            isInverse ? 'bg-[#5EEAD4]' : 'bg-[var(--cb-secondary)]',
          )}
        />
        {eyebrow}
      </p>
      <h2
        id={id}
        className={cn(
          'mt-2.5 text-2xl leading-tight font-bold tracking-tight sm:text-3xl lg:text-[2.125rem]',
          isInverse ? 'text-white' : 'text-[var(--cb-text)]',
        )}
      >
        {heading}
      </h2>
      {description && (
        <p
          className={cn(
            'mt-3.5 text-sm leading-relaxed sm:text-base',
            isInverse ? 'text-slate-200/95' : 'text-[var(--cb-text-secondary)]',
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
