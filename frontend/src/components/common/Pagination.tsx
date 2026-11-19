import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (nextPage: number) => void;
  itemLabel?: string;
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = 'records',
}: PaginationProps) {
  if (totalItems <= 0 || totalPages <= 1) {
    return null;
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col items-center justify-between gap-3 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] px-4 py-3 sm:flex-row"
    >
      <p className="text-xs text-[var(--cb-text-muted)] cb-tabular">
        Showing{' '}
        <span className="font-semibold text-[var(--cb-text)]">{start}</span>–
        <span className="font-semibold text-[var(--cb-text)]">{end}</span> of{' '}
        <span className="font-semibold text-[var(--cb-text)]">
          {totalItems}
        </span>{' '}
        {itemLabel}
      </p>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page <= 1}
          leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Previous
        </Button>
        <span className="px-2 text-xs font-medium text-[var(--cb-text-secondary)] cb-tabular">
          Page {page} of {totalPages}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
