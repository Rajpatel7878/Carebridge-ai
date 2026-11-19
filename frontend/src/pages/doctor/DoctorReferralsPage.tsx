import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import {
  CheckCircle2,
  Eye,
  GitBranch,
  Info,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge, Button, Card, Modal, Pagination } from '@/components/common';
import { DataTable, type DataTableColumn } from '@/components/dashboard';
import { Input, SearchBar, Select, Textarea } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { useDemo } from '@/hooks/useDemo';
import { useDoctorPortal } from '@/hooks/useDoctorPortal';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { extractApiErrorMessage } from '@/services/api';
import {
  createDoctorReferral,
  fetchDoctorPatients,
  fetchDoctorReferrals,
  updateDoctorReferralStatus,
} from '@/services/doctor';
import {
  DEFAULT_REFERRAL_DEPARTMENTS,
  REFERRAL_NEXT_STATUSES,
  type DoctorPatientSummary,
  type DoctorReferralItem,
} from '@/types/doctor';
import {
  REFERRAL_STATUS_BADGES,
  type ReferralStatusCode,
} from '@/types/patient';
import { formatDateTime } from '@/utils/format';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Referral Statuses' },
  { value: 'PENDING', label: 'Pending Review' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PAGE_SIZE = 10;

export function DoctorReferralsPage() {
  useDocumentTitle('Referrals');
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useDemo();
  const { refreshNotifications } = useDoctorPortal();

  const [referrals, setReferrals] = useState<DoctorReferralItem[]>([]);
  const [departments, setDepartments] = useState<string[]>(
    DEFAULT_REFERRAL_DEPARTMENTS,
  );
  const [coordinationNotice, setCoordinationNotice] = useState(
    'Referrals are tracked internally within CareBridge AI for care coordination and are not transmitted automatically to external hospital systems.',
  );
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({
    pending: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create referral modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [assignedPatients, setAssignedPatients] = useState<
    DoctorPatientSummary[]
  >([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(
    DEFAULT_REFERRAL_DEPARTMENTS[0] ?? 'Cardiology',
  );
  const [reason, setReason] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Status update & history modal state
  const [selectedReferral, setSelectedReferral] =
    useState<DoctorReferralItem | null>(null);
  const [nextStatus, setNextStatus] = useState<ReferralStatusCode>('ACCEPTED');
  const [statusNextAction, setStatusNextAction] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 220);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadReferrals = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchDoctorReferrals({
        status:
          statusFilter !== 'all'
            ? (statusFilter as ReferralStatusCode)
            : undefined,
        department: departmentFilter !== 'all' ? departmentFilter : undefined,
        search: debouncedSearch || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setReferrals(response.items);
      setTotal(response.total);
      setCounts({
        pending: response.pending_count,
        active: response.active_count,
        completed: response.completed_count,
        cancelled: response.cancelled_count,
      });
      if (response.allowed_departments.length > 0) {
        setDepartments(response.allowed_departments);
      }
      if (response.coordination_notice) {
        setCoordinationNotice(response.coordination_notice);
      }
      setTotalPages(response.total_pages);
    } catch (err) {
      setError(
        extractApiErrorMessage(err, 'Unable to load referrals right now.'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, departmentFilter, debouncedSearch, page]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        void loadReferrals();
      }
    });
    return () => {
      active = false;
    };
  }, [loadReferrals]);

  const openCreateModal = useCallback(
    async (preselectedPatientId?: string) => {
      setCreateError(null);
      setReason('');
      setNextAction('');
      setSelectedDepartment(departments[0] ?? 'Cardiology');
      setCreateOpen(true);
      try {
        const roster = await fetchDoctorPatients({ page: 1, page_size: 50 });
        setAssignedPatients(roster.items);
        if (
          preselectedPatientId &&
          roster.items.some((p) => p.patient_id === preselectedPatientId)
        ) {
          setSelectedPatientId(preselectedPatientId);
        } else {
          setSelectedPatientId(roster.items[0]?.patient_id ?? '');
        }
      } catch {
        setAssignedPatients([]);
      }
    },
    [departments],
  );

  useEffect(() => {
    if (searchParams.get('action') !== 'create') return;
    const preselected = searchParams.get('patient_id') ?? undefined;
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      void openCreateModal(preselected);
      setSearchParams({}, { replace: true });
    });
    return () => {
      active = false;
    };
  }, [openCreateModal, searchParams, setSearchParams]);

  const openReferralDetail = useCallback((referral: DoctorReferralItem) => {
    setSelectedReferral(referral);
    const allowed = REFERRAL_NEXT_STATUSES[referral.status];
    setNextStatus(allowed[0] ?? referral.status);
    setStatusNextAction(referral.next_action ?? '');
    setStatusNote('');
    setStatusError(null);
  }, []);

  const handleCreateReferral = async (event: FormEvent) => {
    event.preventDefault();
    if (isCreating) return;
    setCreateError(null);

    if (!selectedPatientId) {
      setCreateError('Select an actively assigned patient.');
      return;
    }
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 5) {
      setCreateError(
        'Provide a concise clinical referral reason (at least 5 characters).',
      );
      return;
    }

    setIsCreating(true);
    try {
      const created = await createDoctorReferral({
        patient_id: selectedPatientId,
        referred_department: selectedDepartment,
        reason: trimmedReason,
        next_action: nextAction.trim() || null,
      });
      setCreateOpen(false);
      showToast(
        'Referral created',
        `Recorded ${created.referred_department} referral for ${created.patient_name}.`,
        'success',
      );
      await Promise.all([loadReferrals(), refreshNotifications()]);
    } catch (err) {
      setCreateError(
        extractApiErrorMessage(err, 'Could not create referral right now.'),
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateStatus = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedReferral || isUpdating) return;
    setStatusError(null);

    setIsUpdating(true);
    try {
      const updated = await updateDoctorReferralStatus(selectedReferral.id, {
        status: nextStatus,
        next_action: statusNextAction.trim() || null,
        note: statusNote.trim() || null,
      });
      setSelectedReferral(updated);
      const nextAllowed = REFERRAL_NEXT_STATUSES[updated.status];
      setNextStatus(nextAllowed[0] ?? updated.status);
      setStatusNote('');
      showToast(
        'Referral status updated',
        `Updated to ${REFERRAL_STATUS_BADGES[updated.status].label}.`,
        'success',
      );
      await Promise.all([loadReferrals(), refreshNotifications()]);
    } catch (err) {
      setStatusError(
        extractApiErrorMessage(
          err,
          'Could not update referral status right now.',
        ),
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const columns: DataTableColumn<DoctorReferralItem>[] = useMemo(
    () => [
      {
        key: 'patient',
        header: 'Patient',
        render: (row) => (
          <div>
            <Link
              to={`/doctor/patients/${row.patient_id}`}
              onClick={(event) => event.stopPropagation()}
              className="font-semibold text-[var(--cb-text)] hover:text-[var(--cb-primary)] hover:underline"
            >
              {row.patient_name}
            </Link>
            <p className="mt-0.5 text-xs text-[var(--cb-text-muted)] cb-tabular">
              Created {formatDateTime(row.created_at)}
            </p>
          </div>
        ),
      },
      {
        key: 'department',
        header: 'Target Specialty',
        render: (row) => (
          <div>
            <p className="font-medium text-[var(--cb-text)]">
              {row.referred_department}
            </p>
            {row.reason && (
              <p className="mt-0.5 max-w-[300px] truncate text-xs text-[var(--cb-text-muted)]">
                {row.reason}
              </p>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => {
          const badge = REFERRAL_STATUS_BADGES[row.status];
          return (
            <Badge variant={badge.variant} dot>
              {badge.label}
            </Badge>
          );
        },
      },
      {
        key: 'actions',
        header: 'Manage',
        align: 'right',
        render: (row) => (
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Eye className="h-3.5 w-3.5" />}
            onClick={(event) => {
              event.stopPropagation();
              openReferralDetail(row);
            }}
          >
            {REFERRAL_NEXT_STATUSES[row.status].length > 0
              ? 'Update / History'
              : 'View History'}
          </Button>
        ),
      },
    ],
    [openReferralDetail],
  );

  const departmentFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'All Departments' },
      ...departments.map((dept) => ({ value: dept, label: dept })),
    ],
    [departments],
  );

  const allowedTransitions = selectedReferral
    ? REFERRAL_NEXT_STATUSES[selectedReferral.status]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Referrals"
        subtitle="Create and track specialist referrals for your assigned patients with validated status transitions and a complete coordination history."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => void loadReferrals()}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => void openCreateModal()}
            >
              Create Referral
            </Button>
          </div>
        }
      />

      {/* Truthful Coordination Scope Notice */}
      <div className="flex items-start gap-2.5 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] px-4 py-3 text-xs text-[var(--cb-text-muted)]">
        <Info
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cb-primary)]"
          aria-hidden="true"
        />
        <p>{coordinationNotice}</p>
      </div>

      {/* Live Summary Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="warning" dot>
          Pending: {counts.pending}
        </Badge>
        <Badge variant="primary" dot>
          Active Total: {counts.active}
        </Badge>
        <Badge variant="success" dot>
          Completed: {counts.completed}
        </Badge>
        <Badge variant="neutral" dot>
          Cancelled: {counts.cancelled}
        </Badge>
      </div>

      {/* Search & Filters */}
      <Card padding="sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1">
            <SearchBar
              value={search}
              onChange={(next) => {
                setSearch(next);
                setPage(1);
              }}
              placeholder="Search referrals by patient, specialty, or reason..."
              ariaLabel="Search referrals"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[440px]">
            <Select
              aria-label="Filter referrals by status"
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            />
            <Select
              aria-label="Filter referrals by department"
              options={departmentFilterOptions}
              value={departmentFilter}
              onChange={(event) => {
                setDepartmentFilter(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={referrals}
        rowKey={(row) => row.id}
        onRowClick={openReferralDetail}
        isLoading={isLoading}
        error={error}
        onRetry={() => void loadReferrals()}
        caption="Specialist referrals table"
        emptyTitle="No specialist referrals recorded"
        emptyDescription="Create a referral for an assigned patient when specialty consultation or diagnostic coordination is clinically appropriate."
        emptyAction={
          <Button
            size="sm"
            leftIcon={<GitBranch className="h-4 w-4" />}
            onClick={() => void openCreateModal()}
          >
            Create Referral
          </Button>
        }
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        itemLabel="referrals"
      />

      {/* Create Referral Modal */}
      <Modal
        open={createOpen}
        onClose={() => {
          if (!isCreating) setCreateOpen(false);
        }}
        title="Create Specialist Referral"
        description="Refer an actively assigned patient to an authorized clinical specialty or department."
        footer={
          <>
            <Button
              variant="outline"
              disabled={isCreating}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-doctor-referral-form"
              leftIcon={<GitBranch className="h-4 w-4" />}
              isLoading={isCreating}
              disabled={assignedPatients.length === 0}
            >
              Create Referral
            </Button>
          </>
        }
      >
        {assignedPatients.length === 0 ? (
          <p className="text-sm text-[var(--cb-text-secondary)]">
            No patients are currently assigned to your panel. Referrals can only
            be created for actively assigned patients.
          </p>
        ) : (
          <form
            id="create-doctor-referral-form"
            onSubmit={(event) => void handleCreateReferral(event)}
            className="space-y-4"
          >
            <Select
              label="Assigned Patient"
              options={assignedPatients.map((p) => ({
                value: p.patient_id,
                label: p.full_name,
              }))}
              value={selectedPatientId}
              onChange={(event) => setSelectedPatientId(event.target.value)}
            />
            <Select
              label="Target Specialty / Department"
              options={departments.map((dept) => ({
                value: dept,
                label: dept,
              }))}
              value={selectedDepartment}
              onChange={(event) => setSelectedDepartment(event.target.value)}
            />
            <Textarea
              label="Concise Clinical Referral Reason"
              placeholder="State the clinical indication and relevant background for specialist review..."
              rows={3}
              maxLength={1000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              error={createError ?? undefined}
            />
            <Input
              label="Recommended Next Step (Optional)"
              placeholder="e.g., Bring prior diagnostic imaging and fasting lipid panel"
              maxLength={500}
              value={nextAction}
              onChange={(event) => setNextAction(event.target.value)}
            />
          </form>
        )}
      </Modal>

      {/* Referral Detail, History & Status Transition Modal */}
      <Modal
        open={Boolean(selectedReferral)}
        onClose={() => {
          if (!isUpdating) setSelectedReferral(null);
        }}
        title="Referral Details & History"
        size="lg"
        footer={
          <Button
            variant="outline"
            disabled={isUpdating}
            onClick={() => setSelectedReferral(null)}
          >
            Close
          </Button>
        }
      >
        {selectedReferral && (
          <div className="space-y-5">
            <div className="rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--cb-text)]">
                    {selectedReferral.patient_name} →{' '}
                    {selectedReferral.referred_department}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--cb-text-muted)]">
                    Referred by{' '}
                    {selectedReferral.referring_doctor_name ?? 'Clinician'} ·{' '}
                    {formatDateTime(selectedReferral.created_at)}
                  </p>
                </div>
                <Badge
                  variant={
                    REFERRAL_STATUS_BADGES[selectedReferral.status].variant
                  }
                  dot
                >
                  {REFERRAL_STATUS_BADGES[selectedReferral.status].label}
                </Badge>
              </div>
              {selectedReferral.reason && (
                <p className="mt-3 text-sm text-[var(--cb-text)]">
                  {selectedReferral.reason}
                </p>
              )}
              {selectedReferral.next_action && (
                <p className="mt-2 text-xs text-[var(--cb-text-secondary)]">
                  <span className="font-semibold">Next step:</span>{' '}
                  {selectedReferral.next_action}
                </p>
              )}
            </div>

            {allowedTransitions.length > 0 && (
              <form
                onSubmit={(event) => void handleUpdateStatus(event)}
                className="space-y-3.5 rounded-xl border border-[var(--cb-border)] p-4"
              >
                <p className="text-sm font-semibold text-[var(--cb-text)]">
                  Update Referral Status
                </p>
                <Select
                  label="Next Status"
                  options={allowedTransitions.map((code) => ({
                    value: code,
                    label: REFERRAL_STATUS_BADGES[code].label,
                  }))}
                  value={nextStatus}
                  onChange={(event) =>
                    setNextStatus(event.target.value as ReferralStatusCode)
                  }
                />
                <Input
                  label="Updated Next Step (Optional)"
                  maxLength={500}
                  value={statusNextAction}
                  onChange={(event) => setStatusNextAction(event.target.value)}
                />
                <Textarea
                  label="Coordination History Note (Clinician Log, Optional)"
                  rows={2}
                  maxLength={500}
                  value={statusNote}
                  onChange={(event) => setStatusNote(event.target.value)}
                  error={statusError ?? undefined}
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    isLoading={isUpdating}
                  >
                    Save Status Transition
                  </Button>
                </div>
              </form>
            )}

            <div className="space-y-2.5">
              <p className="text-xs font-semibold tracking-wide text-[var(--cb-text-muted)] uppercase">
                Referral Audit History ({selectedReferral.history.length})
              </p>
              {selectedReferral.history.length === 0 ? (
                <p className="text-xs text-[var(--cb-text-muted)]">
                  No additional status changes recorded yet.
                </p>
              ) : (
                <ol className="space-y-2">
                  {selectedReferral.history.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-lg border border-[var(--cb-border)] px-3.5 py-2.5 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-[var(--cb-text)]">
                          {entry.previous_status
                            ? `${REFERRAL_STATUS_BADGES[entry.previous_status].label} → `
                            : ''}
                          {REFERRAL_STATUS_BADGES[entry.new_status].label}
                        </span>
                        <span className="text-[var(--cb-text-muted)] cb-tabular">
                          {formatDateTime(entry.created_at)}
                        </span>
                      </div>
                      {entry.note && (
                        <p className="mt-1 text-[var(--cb-text-secondary)]">
                          {entry.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
