import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { cn } from '@/utils/cn';
import { SearchBar } from './SearchBar';
import { Select, type SelectOption } from './Select';

export interface FilterField {
  id: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (nextValue: string) => void;
}

export interface FilterControlsProps {
  searchValue: string;
  onSearchChange: (nextValue: string) => void;
  searchPlaceholder?: string;
  filters?: FilterField[];
  onReset?: () => void;
  hasActiveFilters?: boolean;
  resultCountLabel?: string;
  className?: string;
}

export function FilterControls({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  onReset,
  hasActiveFilters = false,
  resultCountLabel,
  className,
}: FilterControlsProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-3.5 sm:p-4',
        className,
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchBar
          value={searchValue}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          className="lg:flex-1"
        />
        {filters.length > 0 && (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:flex lg:items-center">
            {filters.map((filter) => (
              <Select
                key={filter.id}
                aria-label={filter.label}
                value={filter.value}
                options={filter.options}
                onChange={(event) => filter.onChange(event.target.value)}
                containerClassName="lg:w-44"
              />
            ))}
          </div>
        )}
        {hasActiveFilters && onReset && (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={onReset}
            className="self-start lg:self-center"
          >
            Reset
          </Button>
        )}
      </div>
      {resultCountLabel && (
        <p className="text-xs text-[var(--cb-text-muted)] cb-tabular">
          {resultCountLabel}
        </p>
      )}
    </div>
  );
}
