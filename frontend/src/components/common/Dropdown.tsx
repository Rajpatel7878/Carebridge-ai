import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

export interface DropdownMenuItem {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  to?: string;
  onSelect?: () => void;
  danger?: boolean;
  dividerBefore?: boolean;
}

export interface DropdownProps {
  trigger: (props: { open: boolean }) => ReactNode;
  items: DropdownMenuItem[];
  header?: ReactNode;
  align?: 'left' | 'right';
  widthClassName?: string;
  ariaLabel?: string;
  className?: string;
}

export function Dropdown({
  trigger,
  items,
  header,
  align = 'right',
  widthClassName = 'w-56',
  ariaLabel = 'Open menu',
  className,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center rounded-lg"
      >
        {trigger({ open })}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute z-40 mt-2 origin-top rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-elevated)] py-1.5 shadow-[var(--cb-shadow-lg)]',
            align === 'right' ? 'right-0' : 'left-0',
            widthClassName,
          )}
        >
          {header && (
            <div className="border-b border-[var(--cb-border)] px-3.5 py-2.5">
              {header}
            </div>
          )}

          {items.map((item) => {
            const itemClasses = cn(
              'flex w-full items-start gap-2.5 px-3.5 py-2 text-left text-sm transition-colors',
              item.danger
                ? 'text-[var(--cb-critical)] hover:bg-[var(--cb-critical-soft)]'
                : 'text-[var(--cb-text-secondary)] hover:bg-[var(--cb-surface-subtle)] hover:text-[var(--cb-text)]',
            );

            const content = (
              <>
                {item.icon && (
                  <span className="mt-0.5 shrink-0 text-[var(--cb-text-muted)]">
                    {item.icon}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{item.label}</span>
                  {item.description && (
                    <span className="mt-0.5 block text-xs text-[var(--cb-text-muted)]">
                      {item.description}
                    </span>
                  )}
                </span>
              </>
            );

            return (
              <div key={item.id}>
                {item.dividerBefore && (
                  <div className="my-1 border-t border-[var(--cb-border)]" />
                )}
                {item.to ? (
                  <Link
                    to={item.to}
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      item.onSelect?.();
                    }}
                    className={itemClasses}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      item.onSelect?.();
                    }}
                    className={itemClasses}
                  >
                    {content}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
