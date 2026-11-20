import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Modal,
  Pagination,
} from '@/components/common';
import { DataTable, type DataTableColumn } from '@/components/dashboard';
import { Input, SearchBar, Select, Textarea } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { useDemo } from '@/hooks/useDemo';
import { useDoctorPortal } from '@/hooks/useDoctorPortal';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { extractApiErrorMessage } from '@/services/api';
import {
  createDoctorFollowUp,
  fetchDoctorAppointments,
  fetchDoctorFollowUps,
  fetchDoctorPatients,
  fetchDoctorReferrals,
  updateDoctorFollowUp,
} from '@/services/doctor';
import type {
  DoctorAppointmentItem,
  DoctorFollowUpItem,
  DoctorFollowUpScope,
  DoctorPatientSummary,
  DoctorReferralItem,
} from '@/types/doctor';
import {
  FOLLOW_UP_STATUS_BADGES,
  formatAppointmentType,
  type FollowUpStatusCode,
} from '@/types/patient';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/format';

const PAGE_SIZE = 10;

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function DoctorFollowUpsPage() {
  useDocumentTitle('Follow-ups');
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useDemo();
  const { refreshNotifications } = useDoctorPortal();

  const [items, setItems] = useState<DoctorFollowUpItem[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({
    pending: 0,
    overdue: 0,
    completed: 0,
    cancelled: 0,
  });
  const [scope, setScope] = useState<DoctorFollowUpScope>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Schedule follow-up modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [patients, setPatients] = useState<DoctorPatientSummary[]>([]);
  const [patientAppointments, setPatientAppointments] = useState<
    DoctorAppointmentItem[]
  >([]);
  const [patientReferrals, setPatientReferrals] = useState<
    DoctorReferralItem[]
  >([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [followUpType, setFollowUpType] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [relatedApptId, setRelatedApptId] = useState('');
  const [relatedReferralId, setRelatedReferralId] = useState('');
  const [notes, setNotes] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Edit / complete / cancel follow-up state
  const [editTarget, setEditTarget] = useState<DoctorFollowUpItem | null>(null);
  const [editStatus, setEditStatus] = useState<FollowUpStatusCode>('COMPLETED');
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<DoctorFollowUpItem | null>(
    null,
  );
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 220);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadFollowUps = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchDoctorFollowUps({
        scope,
        search: debouncedSearch || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setItems(response.items);
      setTotal(response.total);
      setCounts({
        pending: response.pending_count,
        overdue: response.overdue_count,
        completed: response.completed_count,
        cancelled: response.cancelled_count,
      });
      setTotalPages(response.total_pages);
    } catch (err) {
      setError(
        extractApiErrorMessage(err, 'Unable to load follow-up care plans.'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [scope, debouncedSearch, page]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        void loadFollowUps();
      }
    });
    return () => {
      active = false;
    };
  }, [loadFollowUps]);

  const loadLinkedRecords = useCallback(async (targetPatientId: string) => {
    setRelatedApptId('');
    setRelatedReferralId('');
    if (!targetPatientId) {
      setPatientAppointments([]);
      setPatientReferrals([]);
      return;
    }
    try {
      const [appts, refs] = await Promise.all([
        fetchDoctorAppointments({
          patient_id: targetPatientId,
          page: 1,
          page_size: 20,
        }),
        fetchDoctorReferrals({
          patient_id: targetPatientId,
          page: 1,
          page_size: 20,
        }),
      ]);
      setPatientAppointments(appts.items);
      setPatientReferrals(refs.items);
    } catch {
      setPatientAppointments([]);
      setPatientReferrals([]);
    }
  }, []);

  const openCreateModal = useCallback(
    async (preselectedPatientId?: string) => {
      setCreateError(null);
      setFollowUpType('');
      setScheduledAt('');
      setNotes('');
      setRelatedApptId('');
      setRelatedReferralId('');
      setCreateOpen(true);
      try {
        const roster = await fetchDoctorPatients({ page: 1, page_size: 50 });
        setPatients(roster.items);
        const initialId =
          preselectedPatientId &&
          roster.items.some((p) => p.patient_id === preselectedPatientId)
            ? preselectedPatientId
            : (roster.items[0]?.patient_id ?? '');
        setSelectedPatientId(initialId);
        if (initialId) {
          await loadLinkedRecords(initialId);
        }
      } catch {
        setPatients([]);
      }
    },
    [loadLinkedRecords],
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

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (isCreating) return;
    setCreateError(null);

    if (!selectedPatientId) {
      setCreateError('Select an actively assigned patient.');
      return;
    }
    if (followUpType.trim().length < 3) {
      setCreateError(
        'Enter a clear follow-up purpose (at least 3 characters).',
      );
      return;
    }
    if (!scheduledAt) {
      setCreateError('Select a future follow-up date and time.');
      return;
    }
    const parsed = new Date(scheduledAt);
    const leadTime = parsed.getTime() - Date.now();
    if (
      Number.isNaN(leadTime) ||
      leadTime < 5 * 60_000 ||
      leadTime > 365 * 24 * 60 * 60_000
    ) {
      setCreateError(
        'Follow-up date and time must be at least 5 minutes and no more than 365 days from now.',
      );
      return;
    }

    setIsCreating(true);
    try {
      const created = await createDoctorFollowUp({
        patient_id: selectedPatientId,
        follow_up_type: followUpType.trim(),
        scheduled_at: parsed.toISOString(),
        related_appointment_id: relatedApptId || null,
        related_referral_id: relatedReferralId || null,
        notes: notes.trim() || null,
      });
      setCreateOpen(false);
      showToast(
        'Follow-up scheduled',
        `Added follow-up plan for ${created.patient_name} (in-app portal update recorded).`,
        'success',
      );
      await Promise.all([loadFollowUps(), refreshNotifications()]);
    } catch (err) {
      setCreateError(
        extractApiErrorMessage(err, 'Could not schedule follow-up right now.'),
      );
    } finally {
      setIsCreating(false);
    }
  };

  const openEdit = useCallback((item: DoctorFollowUpItem) => {
    setEditTarget(item);
    setEditStatus(item.status === 'PENDING' ? 'COMPLETED' : 'PENDING');
    setEditScheduledAt(toDatetimeLocalValue(item.scheduled_at));
    setEditNotes(item.notes ?? '');
    setEditError(null);
  }, []);

  const handleSaveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editTarget || isSavingEdit) return;
    setEditError(null);

    let isoSchedule: string | undefined;
    const originalLocal = toDatetimeLocalValue(editTarget.scheduled_at);
    if (editScheduledAt && editScheduledAt !== originalLocal) {
      const parsed = new Date(editScheduledAt);
      if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
        setEditError('Updated follow-up time must be in the future.');
        return;
      }
      isoSchedule = parsed.toISOString();
    }
    if (
      editTarget.status === 'MISSED' &&
      editStatus === 'PENDING' &&
      !isoSchedule
    ) {
      setEditError(
        'Provide a new future date and time when reopening a missed follow-up.',
      );
      return;
    }

    setIsSavingEdit(true);
    try {
      await updateDoctorFollowUp(editTarget.id, {
        status: editStatus,
        scheduled_at: isoSchedule,
        notes: editNotes.trim() || null,
      });
      setEditTarget(null);
      showToast(
        'Follow-up updated',
        'Care follow-up record saved successfully.',
        'success',
      );
      await Promise.all([loadFollowUps(), refreshNotifications()]);
    } catch (err) {
      setEditError(
        extractApiErrorMessage(err, 'Could not update this follow-up.'),
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget || isCancelling) return;
    setIsCancelling(true);
    try {
      await updateDoctorFollowUp(cancelTarget.id, { status: 'CANCELLED' });
      setCancelTarget(null);
      showToast(
        'Follow-up cancelled',
        'The follow-up plan was marked Cancelled.',
        'info',
      );
      await Promise.all([loadFollowUps(), refreshNotifications()]);
    } catch (err) {
      showToast(
        'Could not cancel follow-up',
        extractApiErrorMessage(err, 'Please try again.'),
        'warning',
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const columns: DataTableColumn<DoctorFollowUpItem>[] = useMemo(
    () => [
      {
        key: 'patient',
        header: 'Patient & Plan',
        render: (row) => (
          <div>
            <Link
              to={`/doctor/patients/${row.patient_id}`}
              className="font-semibold text-[var(--cb-text)] hover:text-[var(--cb-primary)] hover:underline"
            >
              {row.patient_name}
            </Link>
            <p className="mt-0.5 text-xs font-medium text-[var(--cb-text-secondary)]">
              {row.follow_up_type}
            </p>
            {row.notes && (
              <p className="mt-0.5 max-w-[300px] truncate text-xs text-[var(--cb-text-muted)]">
                {row.notes}
              </p>
            )}
          </div>
        ),
      },
      {
        key: 'due',
        header: 'Scheduled Due Date',
        render: (row) => (
          <span className="text-xs font-medium text-[var(--cb-text)] cb-tabular">
            {formatDateTime(row.scheduled_at)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => {
          const badge = FOLLOW_UP_STATUS_BADGES[row.status];
          return (
            <Badge variant={row.is_overdue ? 'critical' : badge.variant} dot>
              {row.is_overdue ? 'Overdue' : badge.label}
            </Badge>
          );
        },
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => {
          const isEditable =
            row.status === 'PENDING' || row.status === 'MISSED';
          if (!isEditable) {
            return (
              <span className="text-xs text-[var(--cb-text-muted)]">
                Closed
              </span>
            );
          }
          return (
            <div className="inline-flex items-center justify-end gap-1.5">
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                onClick={() => openEdit(row)}
              >
                Update
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCancelTarget(row)}
              >
                Cancel
              </Button>
            </div>
          );
        },
      },
    ],
    [openEdit],
  );

  const scopeTabs: {
    id: DoctorFollowUpScope;
    label: string;
    count?: number;
  }[] = [
    { id: 'ALL', label: 'All' },
    { id: 'PENDING', label: 'Pending', count: counts.pending },
    { id: 'OVERDUE', label: 'Overdue', count: counts.overdue },
    { id: 'COMPLETED', label: 'Completed', count: counts.completed },
    { id: 'CANCELLED', label: 'Cancelled', count: counts.cancelled },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-ups"
        subtitle="Schedule and monitor post-visit, post-report, and post-referral follow-ups across your assigned patient panel using in-app care updates."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => void loadFollowUps()}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => void openCreateModal()}
            >
              Schedule Follow-up
            </Button>
          </div>
        }
      />

      {/* Scope Tabs */}
      <div
        role="tablist"
        aria-label="Follow-up status tabs"
        className="flex flex-wrap gap-1.5 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-1.5"
      >
        {scopeTabs.map((tab) => {
          const selected = scope === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                setScope(tab.id);
                setPage(1);
              }}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm',
                selected
                  ? 'bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]'
                  : 'text-[var(--cb-text-secondary)] hover:text-[var(--cb-text)]',
              )}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className="rounded-full bg-[var(--cb-surface-subtle)] px-2 py-0.5 text-[11px] cb-tabular">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <Card padding="sm">
        <SearchBar
          value={search}
          onChange={(next) => {
            setSearch(next);
            setPage(1);
          }}
          placeholder="Search follow-ups by patient name, plan type, or instruction..."
          ariaLabel="Search follow-ups"
        />
      </Card>

      <DataTable
        columns={columns}
        data={items}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error}
        onRetry={() => void loadFollowUps()}
        caption="Doctor follow-ups table"
        emptyTitle="No follow-ups in this view"
        emptyDescription="Schedule a follow-up plan for any assigned patient to track next consultations, repeat investigations, or referral checks in-app."
        emptyAction={
          <Button
            size="sm"
            leftIcon={<ClipboardCheck className="h-4 w-4" />}
            onClick={() => void openCreateModal()}
          >
            Schedule Follow-up
          </Button>
        }
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        itemLabel="follow-ups"
      />

      {/* Schedule Follow-up Modal */}
      <Modal
        open={createOpen}
        onClose={() => {
          if (!isCreating) setCreateOpen(false);
        }}
        title="Schedule Patient Follow-up"
        description="Create an in-app follow-up schedule for an assigned patient and optionally link an existing visit or referral."
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
              form="create-doctor-followup-form"
              leftIcon={<ClipboardCheck className="h-4 w-4" />}
              isLoading={isCreating}
              disabled={patients.length === 0}
            >
              Schedule Follow-up
            </Button>
          </>
        }
      >
        {patients.length === 0 ? (
          <p className="text-sm text-[var(--cb-text-secondary)]">
            No patients are currently assigned to your care panel. Follow-ups
            can only be scheduled for actively assigned patients.
          </p>
        ) : (
          <form
            id="create-doctor-followup-form"
            onSubmit={(event) => void handleCreate(event)}
            className="space-y-4"
          >
            <Select
              label="Assigned Patient"
              options={patients.map((p) => ({
                value: p.patient_id,
                label: p.full_name,
              }))}
              value={selectedPatientId}
              onChange={(event) => {
                const nextId = event.target.value;
                setSelectedPatientId(nextId);
                void loadLinkedRecords(nextId);
              }}
            />
            <Input
              label="Follow-up Purpose"
              placeholder="e.g., Repeat fasting glucose & blood pressure check"
              maxLength={100}
              value={followUpType}
              onChange={(event) => setFollowUpType(event.target.value)}
            />
            <Input
              label="Target Follow-up Date & Time"
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
            {patientAppointments.length > 0 && (
              <Select
                label="Link to Appointment (Optional)"
                options={[
                  { value: '', label: 'None' },
                  ...patientAppointments.map((a) => ({
                    value: a.id,
                    label: `${formatAppointmentType(a.appointment_type)} · ${formatDateTime(a.scheduled_at)}`,
                  })),
                ]}
                value={relatedApptId}
                onChange={(event) => setRelatedApptId(event.target.value)}
              />
            )}
            {patientReferrals.length > 0 && (
              <Select
                label="Link to Referral (Optional)"
                options={[
                  { value: '', label: 'None' },
                  ...patientReferrals.map((r) => ({
                    value: r.id,
                    label: `${r.referred_department} (${r.status})`,
                  })),
                ]}
                value={relatedReferralId}
                onChange={(event) => setRelatedReferralId(event.target.value)}
              />
            )}
            <Textarea
              label="Care Instructions / Notes (Optional)"
              placeholder="Concise instructions visible on the patient's follow-up plan..."
              rows={3}
              maxLength={400}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              helperText="Delivered inside the CareBridge AI portal only (no external SMS or email is sent)."
              error={createError ?? undefined}
            />
          </form>
        )}
      </Modal>

      {/* Update Follow-up Modal */}
      <Modal
        open={Boolean(editTarget)}
        onClose={() => {
          if (!isSavingEdit) setEditTarget(null);
        }}
        title="Update Follow-up Plan"
        description={
          editTarget
            ? `${editTarget.patient_name} · ${editTarget.follow_up_type}`
            : undefined
        }
        footer={
          <>
            <Button
              variant="outline"
              disabled={isSavingEdit}
              onClick={() => setEditTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-doctor-followup-form"
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
              isLoading={isSavingEdit}
            >
              Save Changes
            </Button>
          </>
        }
      >
        {editTarget && (
          <form
            id="edit-doctor-followup-form"
            onSubmit={(event) => void handleSaveEdit(event)}
            className="space-y-4"
          >
            <Select
              label="Follow-up Status"
              options={
                editTarget.status === 'PENDING'
                  ? [
                      { value: 'PENDING', label: 'Keep Scheduled (Pending)' },
                      { value: 'COMPLETED', label: 'Completed' },
                      { value: 'MISSED', label: 'Mark Missed' },
                    ]
                  : [
                      {
                        value: 'PENDING',
                        label: 'Reschedule (Return to Pending)',
                      },
                      { value: 'COMPLETED', label: 'Completed' },
                    ]
              }
              value={editStatus}
              onChange={(event) =>
                setEditStatus(event.target.value as FollowUpStatusCode)
              }
            />
            <Input
              label="Reschedule Date & Time (Optional)"
              type="datetime-local"
              value={editScheduledAt}
              onChange={(event) => setEditScheduledAt(event.target.value)}
            />
            <Textarea
              label="Follow-up Notes"
              rows={3}
              maxLength={400}
              value={editNotes}
              onChange={(event) => setEditNotes(event.target.value)}
              error={editError ?? undefined}
            />
          </form>
        )}
      </Modal>

      {/* Cancel Follow-up Confirmation */}
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => {
          if (!isCancelling) setCancelTarget(null);
        }}
        title="Cancel follow-up plan?"
        description={
          cancelTarget
            ? `Cancel "${cancelTarget.follow_up_type}" for ${cancelTarget.patient_name}? The patient's in-app follow-up status will be updated.`
            : ''
        }
        confirmLabel="Cancel Follow-up"
        intent="danger"
        isLoading={isCancelling}
        onConfirm={() => void handleConfirmCancel()}
      />
    </div>
  );
}
