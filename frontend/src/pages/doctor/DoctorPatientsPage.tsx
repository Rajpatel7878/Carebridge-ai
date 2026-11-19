import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Pagination } from '@/components/common';
import { DataTable, type DataTableColumn } from '@/components/dashboard';
import { SearchBar, Select } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { extractApiErrorMessage } from '@/services/api';
import { fetchDoctorPatients } from '@/services/doctor';
import type {
  DoctorPatientSummary,
  DoctorPatientStatusFilter,
} from '@/types/doctor';
import { RISK_CATEGORY_BADGES } from '@/types/patient';
import { formatDate, formatDateTime, getInitials } from '@/utils/format';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Assigned Patients' },
  { value: 'NEEDS_ATTENTION', label: 'Requiring Attention' },
  { value: 'PENDING_REPORTS', label: 'Pending Report Reviews' },
  { value: 'PENDING_APPOINTMENTS', label: 'Pending Appointments' },
  { value: 'OVERDUE_FOLLOW_UP', label: 'Overdue Follow-ups' },
  { value: 'UP_TO_DATE', label: 'Up to Date' },
];

const PAGE_SIZE = 10;

export function DoctorPatientsPage() {
  useDocumentTitle('My Patients');
  const navigate = useNavigate();

  const [patients, setPatients] = useState<DoctorPatientSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<DoctorPatientStatusFilter>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 220);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadPatients = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchDoctorPatients({
        search: debouncedSearch || undefined,
        status: statusFilter,
        page,
        page_size: PAGE_SIZE,
      });
      setPatients(response.items);
      setTotal(response.total);
      setTotalPages(response.total_pages);
    } catch (err) {
      setError(
        extractApiErrorMessage(
          err,
          'Unable to load your assigned patient list right now.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter, page]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        void loadPatients();
      }
    });
    return () => {
      active = false;
    };
  }, [loadPatients]);

  const columns: DataTableColumn<DoctorPatientSummary>[] = useMemo(
    () => [
      {
        key: 'patient',
        header: 'Patient',
        render: (row) => (
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--cb-primary-soft)] text-xs font-bold text-[var(--cb-primary)]">
              {getInitials(row.full_name)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-[var(--cb-text)]">
                {row.full_name}
              </p>
              <p className="text-xs text-[var(--cb-text-muted)]">
                {row.date_of_birth
                  ? `DOB ${formatDate(row.date_of_birth)}`
                  : 'DOB not provided'}
                {[row.city, row.state].filter(Boolean).length > 0
                  ? ` · ${[row.city, row.state].filter(Boolean).join(', ')}`
                  : ''}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Care Status',
        render: (row) => (
          <div className="space-y-1">
            <Badge variant={row.requires_attention ? 'warning' : 'success'} dot>
              {row.requires_attention ? 'Needs Attention' : 'Up to Date'}
            </Badge>
            {row.attention_reasons.length > 0 && (
              <p className="text-xs text-[var(--cb-text-muted)]">
                {row.attention_reasons.join(' · ')}
              </p>
            )}
          </div>
        ),
      },
      {
        key: 'risk',
        header: 'Recorded Risk',
        render: (row) => {
          if (!row.latest_risk_category) {
            return (
              <span className="text-xs text-[var(--cb-text-muted)]">
                No risk record
              </span>
            );
          }
          const risk = RISK_CATEGORY_BADGES[row.latest_risk_category];
          return (
            <Badge variant={risk.variant} dot>
              {risk.label}
            </Badge>
          );
        },
      },
      {
        key: 'workload',
        header: 'Reports & Visits',
        render: (row) => (
          <div className="text-xs cb-tabular">
            <p className="text-[var(--cb-text)]">
              {row.total_reports} report{row.total_reports === 1 ? '' : 's'}
              {row.pending_reports > 0
                ? ` (${row.pending_reports} awaiting review)`
                : ''}
            </p>
            <p className="mt-0.5 text-[var(--cb-text-muted)]">
              {row.upcoming_appointments} upcoming visit
              {row.upcoming_appointments === 1 ? '' : 's'} ·{' '}
              {row.pending_follow_ups} pending follow-up
              {row.pending_follow_ups === 1 ? '' : 's'}
            </p>
          </div>
        ),
      },
      {
        key: 'activity',
        header: 'Last Activity',
        render: (row) => (
          <span className="text-xs text-[var(--cb-text-muted)] cb-tabular">
            {row.last_activity_at
              ? formatDateTime(row.last_activity_at)
              : formatDateTime(row.assigned_at)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Record',
        align: 'right',
        render: (row) => (
          <Button
            size="sm"
            variant="outline"
            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/doctor/patients/${row.patient_id}`);
            }}
          >
            Open Chart
          </Button>
        ),
      },
    ],
    [navigate],
  );

  const hasFilters = Boolean(debouncedSearch) || statusFilter !== 'ALL';

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Patients"
        subtitle="View and manage patients officially assigned to your care panel. Access is restricted to active authorized assignments."
        badge={
          <Badge variant="primary" dot>
            {total} assigned
          </Badge>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void loadPatients()}
            disabled={isLoading}
          >
            Refresh
          </Button>
        }
      />

      {/* Search & Status Filters */}
      <Card padding="sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex-1">
            <SearchBar
              value={search}
              onChange={(next) => {
                setSearch(next);
                setPage(1);
              }}
              placeholder="Search assigned patients by name, city, or state..."
              ariaLabel="Search assigned patients"
            />
          </div>
          <div className="w-full md:w-64">
            <Select
              aria-label="Filter patients by care status"
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(
                  event.target.value as DoctorPatientStatusFilter,
                );
                setPage(1);
              }}
            />
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setDebouncedSearch('');
                setStatusFilter('ALL');
                setPage(1);
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={patients}
        rowKey={(row) => row.patient_id}
        onRowClick={(row) => navigate(`/doctor/patients/${row.patient_id}`)}
        isLoading={isLoading}
        error={error}
        onRetry={() => void loadPatients()}
        caption="Assigned patients table"
        emptyTitle={
          hasFilters
            ? 'No assigned patients match your filters'
            : 'No patients assigned to your care panel yet'
        }
        emptyDescription={
          hasFilters
            ? 'Try clearing your search terms or switching the care status filter.'
            : 'Patient records appear here after an authorized administrator assigns them to you.'
        }
        emptyAction={
          hasFilters ? (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Users className="h-4 w-4" />}
              onClick={() => {
                setSearch('');
                setDebouncedSearch('');
                setStatusFilter('ALL');
                setPage(1);
              }}
            >
              Show All Assigned Patients
            </Button>
          ) : undefined
        }
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        itemLabel="assigned patients"
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] px-4 py-3 text-xs text-[var(--cb-text-muted)]">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cb-secondary)]"
          aria-hidden="true"
        />
        <p>
          Assignment-scoped authorization is enforced on every patient request.
          Only administrators can create, revoke, or transfer patient-doctor
          assignments.
        </p>
      </div>
    </div>
  );
}
