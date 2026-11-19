import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import {
  CalendarClock,
  Check,
  CheckCircle2,
  Eye,
  RefreshCw,
  XCircle,
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
  fetchDoctorAppointmentDetail,
  fetchDoctorAppointments,
  rescheduleDoctorAppointment,
  updateDoctorAppointmentStatus,
} from '@/services/doctor';
import {
  DOCTOR_VISIT_MODE_OPTIONS,
  type DoctorAppointmentItem,
  type DoctorAppointmentScope,
} from '@/types/doctor';
import {
  APPOINTMENT_STATUS_BADGES,
  formatAppointmentType,
  type AppointmentVisitMode,
} from '@/types/patient';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/format';

const PAGE_SIZE = 10;

const VISIT_MODE_SELECT_OPTIONS = DOCTOR_VISIT_MODE_OPTIONS.map((mode) => ({
  value: mode,
  label: mode,
}));

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function DoctorAppointmentsPage() {
  useDocumentTitle('Appointments');
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useDemo();
  const { refreshNotifications } = useDoctorPortal();

  const patientIdFilter = searchParams.get('patient_id') ?? '';

  const [appointments, setAppointments] = useState<DoctorAppointmentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({
    pending: 0,
    today: 0,
    upcoming: 0,
    completed: 0,
    cancelled: 0,
  });
  const [scope, setScope] = useState<DoctorAppointmentScope>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail, status action, and reschedule modal state
  const [detailAppt, setDetailAppt] = useState<DoctorAppointmentItem | null>(
    null,
  );
  const [statusModal, setStatusModal] = useState<{
    appt: DoctorAppointmentItem;
    nextStatus: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  } | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [rescheduleTarget, setRescheduleTarget] =
    useState<DoctorAppointmentItem | null>(null);
  const [rescheduleAt, setRescheduleAt] = useState('');
  const [rescheduleMode, setRescheduleMode] =
    useState<AppointmentVisitMode>('In-Person Clinic');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 220);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchDoctorAppointments({
        scope,
        patient_id: patientIdFilter || undefined,
        search: debouncedSearch || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setAppointments(response.items);
      setTotal(response.total);
      setCounts({
        pending: response.pending_count,
        today: response.today_count,
        upcoming: response.upcoming_count,
        completed: response.completed_count,
        cancelled: response.cancelled_count,
      });
      setTotalPages(response.total_pages);
    } catch (err) {
      setError(
        extractApiErrorMessage(
          err,
          'Unable to load clinical appointments right now.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [scope, patientIdFilter, debouncedSearch, page]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        void loadAppointments();
      }
    });
    return () => {
      active = false;
    };
  }, [loadAppointments]);

  const openDetail = useCallback(async (appt: DoctorAppointmentItem) => {
    setDetailAppt(appt);
    try {
      const fresh = await fetchDoctorAppointmentDetail(appt.id);
      setDetailAppt(fresh);
    } catch {
      // Retain loaded item
    }
  }, []);

  const openStatusAction = useCallback(
    (
      appt: DoctorAppointmentItem,
      nextStatus: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED',
    ) => {
      setStatusModal({ appt, nextStatus });
      setStatusReason('');
      setStatusError(null);
    },
    [],
  );

  const openReschedule = useCallback((appt: DoctorAppointmentItem) => {
    setRescheduleTarget(appt);
    setRescheduleAt(toDatetimeLocalValue(appt.scheduled_at));
    setRescheduleMode(
      (DOCTOR_VISIT_MODE_OPTIONS.includes(
        appt.location_or_mode as AppointmentVisitMode,
      )
        ? appt.location_or_mode
        : 'In-Person Clinic') as AppointmentVisitMode,
    );
    setRescheduleReason('');
    setRescheduleError(null);
  }, []);

  const handleSubmitStatus = async (event: FormEvent) => {
    event.preventDefault();
    if (!statusModal || isUpdatingStatus) return;
    setStatusError(null);

    const trimmed = statusReason.trim();
    const isRejectingPending =
      statusModal.appt.status === 'PENDING' &&
      statusModal.nextStatus === 'CANCELLED';
    if (isRejectingPending && trimmed.length < 3) {
      setStatusError(
        'Provide a brief reason (at least 3 characters) when declining a pending appointment request.',
      );
      return;
    }

    setIsUpdatingStatus(true);
    try {
      await updateDoctorAppointmentStatus(statusModal.appt.id, {
        status: statusModal.nextStatus,
        reason: trimmed || null,
      });
      const label =
        statusModal.nextStatus === 'CONFIRMED'
          ? 'confirmed'
          : statusModal.nextStatus === 'COMPLETED'
            ? 'marked completed'
            : isRejectingPending
              ? 'declined'
              : 'cancelled';
      setStatusModal(null);
      setDetailAppt(null);
      showToast(
        'Appointment updated',
        `Visit with ${statusModal.appt.patient_name} was ${label}.`,
        'success',
      );
      await Promise.all([loadAppointments(), refreshNotifications()]);
    } catch (err) {
      setStatusError(
        extractApiErrorMessage(
          err,
          'Could not update this appointment status.',
        ),
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSubmitReschedule = async (event: FormEvent) => {
    event.preventDefault();
    if (!rescheduleTarget || isRescheduling) return;
    setRescheduleError(null);

    if (!rescheduleAt) {
      setRescheduleError('Select a valid future date and time.');
      return;
    }
    const parsed = new Date(rescheduleAt);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
      setRescheduleError('Rescheduled appointment time must be in the future.');
      return;
    }

    setIsRescheduling(true);
    try {
      await rescheduleDoctorAppointment(rescheduleTarget.id, {
        scheduled_at: parsed.toISOString(),
        location_or_mode: rescheduleMode,
        reason: rescheduleReason.trim() || null,
      });
      const patientName = rescheduleTarget.patient_name;
      setRescheduleTarget(null);
      setDetailAppt(null);
      showToast(
        'Appointment rescheduled',
        `Updated visit schedule for ${patientName}.`,
        'success',
      );
      await Promise.all([loadAppointments(), refreshNotifications()]);
    } catch (err) {
      setRescheduleError(
        extractApiErrorMessage(
          err,
          'Could not reschedule this appointment. Check for conflicting slots.',
        ),
      );
    } finally {
      setIsRescheduling(false);
    }
  };

  const columns: DataTableColumn<DoctorAppointmentItem>[] = useMemo(
    () => [
      {
        key: 'patient',
        header: 'Patient & Visit',
        render: (row) => (
          <div>
            <Link
              to={`/doctor/patients/${row.patient_id}`}
              onClick={(event) => event.stopPropagation()}
              className="font-semibold text-[var(--cb-text)] hover:text-[var(--cb-primary)] hover:underline"
            >
              {row.patient_name}
            </Link>
            <p className="mt-0.5 text-xs text-[var(--cb-text-muted)]">
              {formatAppointmentType(row.appointment_type)}
              {row.location_or_mode ? ` · ${row.location_or_mode}` : ''}
            </p>
          </div>
        ),
      },
      {
        key: 'schedule',
        header: 'Scheduled Time',
        render: (row) => (
          <div className="text-xs cb-tabular">
            <p className="font-medium text-[var(--cb-text)]">
              {formatDateTime(row.scheduled_at)}
            </p>
            {row.is_today && (
              <span className="text-[11px] font-semibold text-[var(--cb-primary)]">
                Today
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => {
          const badge = APPOINTMENT_STATUS_BADGES[row.status];
          return (
            <Badge variant={badge.variant} dot>
              {badge.label}
            </Badge>
          );
        },
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <div
            className="inline-flex flex-wrap items-center justify-end gap-1.5"
            onClick={(event) => event.stopPropagation()}
          >
            {row.status === 'PENDING' && (
              <>
                <Button
                  size="sm"
                  leftIcon={<Check className="h-3.5 w-3.5" />}
                  onClick={() => openStatusAction(row, 'CONFIRMED')}
                >
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openReschedule(row)}
                >
                  Reschedule
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => openStatusAction(row, 'CANCELLED')}
                >
                  Reject
                </Button>
              </>
            )}
            {row.status === 'CONFIRMED' && (
              <>
                <Button
                  size="sm"
                  leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  onClick={() => openStatusAction(row, 'COMPLETED')}
                >
                  Complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<CalendarClock className="h-3.5 w-3.5" />}
                  onClick={() => openReschedule(row)}
                >
                  Reschedule
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openStatusAction(row, 'CANCELLED')}
                >
                  Cancel
                </Button>
              </>
            )}
            {(row.status === 'COMPLETED' || row.status === 'CANCELLED') && (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Eye className="h-3.5 w-3.5" />}
                onClick={() => void openDetail(row)}
              >
                Details
              </Button>
            )}
          </div>
        ),
      },
    ],
    [openDetail, openReschedule, openStatusAction],
  );

  const scopeTabs: {
    id: DoctorAppointmentScope;
    label: string;
    count?: number;
  }[] = [
    { id: 'ALL', label: 'All' },
    { id: 'PENDING', label: 'Pending', count: counts.pending },
    { id: 'TODAY', label: 'Today', count: counts.today },
    { id: 'UPCOMING', label: 'Upcoming', count: counts.upcoming },
    { id: 'COMPLETED', label: 'Completed', count: counts.completed },
    { id: 'CANCELLED', label: 'Cancelled', count: counts.cancelled },
  ];

  const isRejectModal =
    statusModal?.appt.status === 'PENDING' &&
    statusModal?.nextStatus === 'CANCELLED';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        subtitle="Review incoming appointment requests from assigned patients, confirm or reschedule slots with conflict checking, and log visit outcomes."
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void loadAppointments()}
            disabled={isLoading}
          >
            Refresh
          </Button>
        }
      />

      {/* Scope Tabs */}
      <div
        role="tablist"
        aria-label="Appointment filter tabs"
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

      {/* Search Bar */}
      <Card padding="sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <SearchBar
              value={search}
              onChange={(next) => {
                setSearch(next);
                setPage(1);
              }}
              placeholder="Search appointments by patient name or visit type..."
              ariaLabel="Search appointments"
            />
          </div>
          {(debouncedSearch || patientIdFilter || scope !== 'ALL') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setDebouncedSearch('');
                setScope('ALL');
                setPage(1);
                if (patientIdFilter) {
                  setSearchParams({}, { replace: true });
                }
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={appointments}
        rowKey={(row) => row.id}
        onRowClick={(row) => void openDetail(row)}
        isLoading={isLoading}
        error={error}
        onRetry={() => void loadAppointments()}
        caption="Doctor appointments table"
        emptyTitle="No appointments in this view"
        emptyDescription="Incoming patient requests and confirmed clinic sessions for your assigned panel will appear here."
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        itemLabel="appointments"
      />

      {/* Appointment Detail Modal */}
      <Modal
        open={Boolean(detailAppt)}
        onClose={() => setDetailAppt(null)}
        title="Appointment Details"
        footer={
          <Button variant="outline" onClick={() => setDetailAppt(null)}>
            Close
          </Button>
        }
      >
        {detailAppt && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={APPOINTMENT_STATUS_BADGES[detailAppt.status].variant}
                dot
              >
                {APPOINTMENT_STATUS_BADGES[detailAppt.status].label}
              </Badge>
              {detailAppt.location_or_mode && (
                <Badge variant="neutral">{detailAppt.location_or_mode}</Badge>
              )}
            </div>
            <dl className="divide-y divide-[var(--cb-border)] rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)] px-4 text-xs sm:text-sm">
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[var(--cb-text-muted)]">Patient</dt>
                <dd className="font-medium text-[var(--cb-text)]">
                  {detailAppt.patient_name}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[var(--cb-text-muted)]">Visit Type</dt>
                <dd className="font-medium text-[var(--cb-text)]">
                  {formatAppointmentType(detailAppt.appointment_type)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[var(--cb-text-muted)]">Scheduled Time</dt>
                <dd className="font-medium text-[var(--cb-text)] cb-tabular">
                  {formatDateTime(detailAppt.scheduled_at)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[var(--cb-text-muted)]">Assigned Doctor</dt>
                <dd className="font-medium text-[var(--cb-text)]">
                  {detailAppt.assigned_doctor_name ?? 'Awaiting confirmation'}
                </dd>
              </div>
            </dl>
            {detailAppt.notes && (
              <div className="rounded-xl border border-[var(--cb-border)] p-3.5">
                <p className="text-xs font-semibold text-[var(--cb-text-muted)] uppercase">
                  Patient Request Note
                </p>
                <p className="mt-1 text-sm text-[var(--cb-text)]">
                  {detailAppt.notes}
                </p>
              </div>
            )}
            {detailAppt.status_note && (
              <div className="rounded-xl border border-[var(--cb-primary)]/25 bg-[var(--cb-primary-soft)]/45 p-3.5">
                <p className="text-xs font-semibold text-[var(--cb-primary)] uppercase">
                  Scheduling Note
                </p>
                <p className="mt-1 text-sm text-[var(--cb-text)]">
                  {detailAppt.status_note}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Confirm / Complete / Reject / Cancel Status Modal */}
      <Modal
        open={Boolean(statusModal)}
        onClose={() => {
          if (!isUpdatingStatus) setStatusModal(null);
        }}
        title={
          statusModal?.nextStatus === 'CONFIRMED'
            ? 'Confirm Appointment'
            : statusModal?.nextStatus === 'COMPLETED'
              ? 'Mark Appointment Completed'
              : isRejectModal
                ? 'Decline Appointment Request'
                : 'Cancel Appointment'
        }
        description={
          statusModal
            ? `${statusModal.appt.patient_name} · ${formatAppointmentType(statusModal.appt.appointment_type)} · ${formatDateTime(statusModal.appt.scheduled_at)}`
            : undefined
        }
        footer={
          <>
            <Button
              variant="outline"
              disabled={isUpdatingStatus}
              onClick={() => setStatusModal(null)}
            >
              Back
            </Button>
            <Button
              type="submit"
              form="doctor-appointment-status-form"
              variant={
                statusModal?.nextStatus === 'CANCELLED' ? 'danger' : 'primary'
              }
              leftIcon={
                statusModal?.nextStatus === 'CANCELLED' ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )
              }
              isLoading={isUpdatingStatus}
            >
              {statusModal?.nextStatus === 'CONFIRMED'
                ? 'Confirm Visit'
                : statusModal?.nextStatus === 'COMPLETED'
                  ? 'Mark Completed'
                  : isRejectModal
                    ? 'Decline Request'
                    : 'Cancel Visit'}
            </Button>
          </>
        }
      >
        <form
          id="doctor-appointment-status-form"
          onSubmit={(event) => void handleSubmitStatus(event)}
          className="space-y-4"
        >
          <Textarea
            label={
              isRejectModal
                ? 'Reason for Declining (Required)'
                : 'Scheduling Update Note (Optional)'
            }
            placeholder={
              isRejectModal
                ? 'e.g., Slot unavailable during clinic rounds — please request an afternoon session.'
                : 'Optional scheduling instructions shared with the patient (avoid sensitive clinical notes).'
            }
            rows={3}
            maxLength={500}
            value={statusReason}
            onChange={(event) => setStatusReason(event.target.value)}
            error={statusError ?? undefined}
          />
        </form>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        open={Boolean(rescheduleTarget)}
        onClose={() => {
          if (!isRescheduling) setRescheduleTarget(null);
        }}
        title="Reschedule Appointment"
        description={
          rescheduleTarget
            ? `Update visit date/time for ${rescheduleTarget.patient_name}. Conflicting slots within 30 minutes are prevented automatically.`
            : undefined
        }
        footer={
          <>
            <Button
              variant="outline"
              disabled={isRescheduling}
              onClick={() => setRescheduleTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="doctor-appointment-reschedule-form"
              leftIcon={<CalendarClock className="h-4 w-4" />}
              isLoading={isRescheduling}
            >
              Save New Schedule
            </Button>
          </>
        }
      >
        <form
          id="doctor-appointment-reschedule-form"
          onSubmit={(event) => void handleSubmitReschedule(event)}
          className="space-y-4"
        >
          <Input
            label="New Date & Time"
            type="datetime-local"
            value={rescheduleAt}
            onChange={(event) => setRescheduleAt(event.target.value)}
            required
          />
          <Select
            label="Visit Mode"
            options={VISIT_MODE_SELECT_OPTIONS}
            value={rescheduleMode}
            onChange={(event) =>
              setRescheduleMode(event.target.value as AppointmentVisitMode)
            }
          />
          <Textarea
            label="Reschedule Note (Optional)"
            placeholder="e.g., Moved to Thursday morning diagnostic clinic session."
            rows={3}
            maxLength={500}
            value={rescheduleReason}
            onChange={(event) => setRescheduleReason(event.target.value)}
            error={rescheduleError ?? undefined}
          />
        </form>
      </Modal>
    </div>
  );
}
