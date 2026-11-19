import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Calendar,
  CalendarPlus,
  Clock,
  Eye,
  MapPin,
  Video,
  XCircle,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
} from '@/components/common';
import { Input, Select } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePatientPortal } from '@/hooks/usePatientPortal';
import { extractApiErrorMessage } from '@/services/api';
import {
  cancelPatientAppointment,
  fetchPatientAppointmentDetail,
  fetchPatientAppointments,
  requestPatientAppointment,
} from '@/services/patient';
import {
  APPOINTMENT_STATUS_BADGES,
  APPOINTMENT_TYPE_LABELS,
  formatAppointmentType,
  type AppointmentStatusCode,
  type AppointmentTypeCode,
  type AppointmentVisitMode,
  type PatientAppointment,
} from '@/types/patient';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/format';

const APPOINTMENT_TYPE_OPTIONS = (
  Object.entries(APPOINTMENT_TYPE_LABELS) as [AppointmentTypeCode, string][]
).map(([value, label]) => ({ value, label }));

const VISIT_MODE_OPTIONS: { value: AppointmentVisitMode; label: string }[] = [
  { value: 'In-Person Clinic', label: 'In-Person Clinic' },
  { value: 'Teleconsultation', label: 'Teleconsultation' },
  {
    value: 'Community Screening Center',
    label: 'Community Screening Center',
  },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending Confirmation' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function getDefaultPreferredSlot(): { date: string; time: string } {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return { date: `${year}-${month}-${day}`, time: '10:00' };
}

export function PatientAppointmentsPage() {
  useDocumentTitle('Appointments');
  const { showToast } = useDemo();
  const { refreshNotifications } = usePatientPortal();

  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [pastCount, setPastCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Request modal state
  const [requestOpen, setRequestOpen] = useState(false);
  const [appointmentType, setAppointmentType] =
    useState<AppointmentTypeCode>('SCREENING_REVIEW');
  const [visitMode, setVisitMode] =
    useState<AppointmentVisitMode>('In-Person Clinic');
  const [preferredDate, setPreferredDate] = useState(
    () => getDefaultPreferredSlot().date,
  );
  const [preferredTime, setPreferredTime] = useState(
    () => getDefaultPreferredSlot().time,
  );
  const [notes, setNotes] = useState('');
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Detail & cancel modal state
  const [detailAppt, setDetailAppt] = useState<PatientAppointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PatientAppointment | null>(
    null,
  );
  const [isCancelling, setIsCancelling] = useState(false);

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetchPatientAppointments(
        statusFilter !== 'all'
          ? (statusFilter as AppointmentStatusCode)
          : undefined,
      );
      setAppointments(response.items);
      setUpcomingCount(response.upcoming_count);
      setPastCount(response.past_count);
    } catch (err) {
      setLoadError(
        extractApiErrorMessage(
          err,
          'Unable to load your appointments right now.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    let cancelled = false;
    fetchPatientAppointments(
      statusFilter !== 'all'
        ? (statusFilter as AppointmentStatusCode)
        : undefined,
    )
      .then((response) => {
        if (cancelled) return;
        setAppointments(response.items);
        setUpcomingCount(response.upcoming_count);
        setPastCount(response.past_count);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          extractApiErrorMessage(
            err,
            'Unable to load your appointments right now.',
          ),
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  const openRequestModal = () => {
    const defaults = getDefaultPreferredSlot();
    setPreferredDate(defaults.date);
    setPreferredTime(defaults.time);
    setAppointmentType('SCREENING_REVIEW');
    setVisitMode('In-Person Clinic');
    setNotes('');
    setRequestError(null);
    setRequestOpen(true);
  };

  const handleRequestSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingRequest) return;
    setRequestError(null);

    if (!preferredDate || !preferredTime) {
      setRequestError('Please select both a preferred date and time.');
      return;
    }

    const candidate = new Date(`${preferredDate}T${preferredTime}:00`);
    if (Number.isNaN(candidate.getTime())) {
      setRequestError('Please enter a valid date and time.');
      return;
    }
    if (candidate.getTime() <= Date.now() + 5 * 60 * 1000) {
      setRequestError(
        'Please choose a future appointment time at least 10 minutes from now.',
      );
      return;
    }

    setIsSubmittingRequest(true);
    try {
      await requestPatientAppointment({
        scheduled_at: candidate.toISOString(),
        appointment_type: appointmentType,
        location_or_mode: visitMode,
        notes: notes.trim() || null,
      });
      setRequestOpen(false);
      setActiveTab('upcoming');
      setStatusFilter('all');
      showToast(
        'Appointment request submitted',
        'Your request is recorded as Pending Confirmation while the care team assigns a slot.',
      );
      await Promise.all([loadAppointments(), refreshNotifications()]);
    } catch (err) {
      setRequestError(
        extractApiErrorMessage(
          err,
          'Could not submit your appointment request. Please check the date and try again.',
        ),
      );
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleViewDetails = async (appt: PatientAppointment) => {
    setDetailAppt(appt);
    try {
      const fresh = await fetchPatientAppointmentDetail(appt.id);
      setDetailAppt(fresh);
    } catch {
      // Keep already-loaded appointment record visible
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget || isCancelling) return;
    setIsCancelling(true);
    try {
      await cancelPatientAppointment(cancelTarget.id);
      setCancelTarget(null);
      if (detailAppt?.id === cancelTarget.id) {
        setDetailAppt(null);
      }
      showToast(
        'Appointment cancelled',
        'Your appointment record has been updated to Cancelled.',
        'info',
      );
      await Promise.all([loadAppointments(), refreshNotifications()]);
    } catch (err) {
      showToast(
        'Could not cancel appointment',
        extractApiErrorMessage(err, 'Please refresh and try again.'),
        'warning',
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const visibleItems = appointments.filter((item) =>
    activeTab === 'upcoming' ? item.is_upcoming : !item.is_upcoming,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        subtitle="Review upcoming visits, consult past appointment records, and submit appointment requests for care-team scheduling."
        actions={
          <Button
            leftIcon={<CalendarPlus className="h-4 w-4" />}
            onClick={openRequestModal}
          >
            Request Appointment
          </Button>
        }
      />

      {/* Tabs + status filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Appointment schedule filter"
          className="inline-flex w-fit rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-1"
        >
          {(
            [
              { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
              { id: 'past', label: 'Past & Cancelled', count: pastCount },
            ] as const
          ).map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors sm:text-sm',
                  selected
                    ? 'bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]'
                    : 'text-[var(--cb-text-secondary)] hover:text-[var(--cb-text)]',
                )}
              >
                <span>{tab.label}</span>
                <span className="rounded-full bg-[var(--cb-surface-subtle)] px-2 py-0.5 text-[11px] cb-tabular">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="w-full sm:w-56">
          <Select
            aria-label="Filter appointments by status"
            value={statusFilter}
            options={STATUS_FILTER_OPTIONS}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading your appointments..." rows={3} />
      ) : loadError ? (
        <ErrorState
          title="Could not load appointments"
          message={loadError}
          onRetry={() => void loadAppointments()}
        />
      ) : visibleItems.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-6 w-6" aria-hidden="true" />}
          title={
            activeTab === 'upcoming'
              ? 'No upcoming appointments'
              : 'No past or cancelled appointments'
          }
          description={
            activeTab === 'upcoming'
              ? 'Submit a preferred visit date and mode to create a pending appointment request for care-team confirmation.'
              : 'Completed and cancelled appointments will appear here for your reference.'
          }
          action={
            activeTab === 'upcoming' ? (
              <Button
                size="sm"
                leftIcon={<CalendarPlus className="h-4 w-4" />}
                onClick={openRequestModal}
              >
                Request Appointment
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visibleItems.map((appt) => {
            const badge = APPOINTMENT_STATUS_BADGES[appt.status];
            const isTele = appt.location_or_mode === 'Teleconsultation';
            const canCancel =
              appt.status === 'PENDING' || appt.status === 'CONFIRMED';

            return (
              <Card key={appt.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant={badge.variant} dot>
                      {badge.label}
                    </Badge>
                    {appt.location_or_mode && (
                      <Badge variant={isTele ? 'teal' : 'neutral'}>
                        {appt.location_or_mode}
                      </Badge>
                    )}
                  </div>

                  <h2 className="mt-3 text-base font-semibold text-[var(--cb-text)]">
                    {formatAppointmentType(appt.appointment_type)}
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--cb-text-muted)]">
                    Clinician:{' '}
                    {appt.assigned_doctor_name ??
                      'Awaiting care-team assignment'}
                  </p>

                  {appt.notes && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--cb-text-secondary)]">
                      {appt.notes}
                    </p>
                  )}

                  <div className="mt-4 space-y-1.5 border-t border-[var(--cb-border)] pt-3 text-xs text-[var(--cb-text-secondary)]">
                    <p className="flex items-center gap-2 cb-tabular">
                      <Clock className="h-3.5 w-3.5 text-[var(--cb-text-muted)]" />
                      {formatDateTime(appt.scheduled_at)}
                    </p>
                    {appt.location_or_mode && (
                      <p className="flex items-center gap-2">
                        {isTele ? (
                          <Video className="h-3.5 w-3.5 text-[var(--cb-secondary)]" />
                        ) : (
                          <MapPin className="h-3.5 w-3.5 text-[var(--cb-text-muted)]" />
                        )}
                        {appt.location_or_mode}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Eye className="h-3.5 w-3.5" />}
                    onClick={() => void handleViewDetails(appt)}
                  >
                    Details
                  </Button>
                  {canCancel && (
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<XCircle className="h-3.5 w-3.5" />}
                      onClick={() => setCancelTarget(appt)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Request Appointment Modal */}
      <Modal
        open={requestOpen}
        onClose={() => {
          if (!isSubmittingRequest) setRequestOpen(false);
        }}
        title="Request an Appointment"
        description="Submit your preferred visit type, mode, and date. Requests start as Pending Confirmation and a clinician is assigned by the care team."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmittingRequest}
              onClick={() => setRequestOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="patient-appointment-request-form"
              isLoading={isSubmittingRequest}
            >
              Submit Request
            </Button>
          </>
        }
      >
        <form
          id="patient-appointment-request-form"
          onSubmit={handleRequestSubmit}
          className="space-y-4"
          noValidate
        >
          {requestError && (
            <ErrorState
              title="Check appointment request details"
              message={requestError}
            />
          )}

          <Select
            label="Appointment Type"
            value={appointmentType}
            options={APPOINTMENT_TYPE_OPTIONS}
            onChange={(e) =>
              setAppointmentType(e.target.value as AppointmentTypeCode)
            }
          />

          <Select
            label="Preferred Visit Mode"
            value={visitMode}
            options={VISIT_MODE_OPTIONS}
            onChange={(e) =>
              setVisitMode(e.target.value as AppointmentVisitMode)
            }
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Preferred Date"
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={preferredDate}
              required
              onChange={(e) => setPreferredDate(e.target.value)}
            />
            <Input
              label="Preferred Time"
              type="time"
              value={preferredTime}
              required
              onChange={(e) => setPreferredTime(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="appointment-notes"
              className="mb-1.5 block text-sm font-medium text-[var(--cb-text)]"
            >
              Visit Note (Optional)
            </label>
            <textarea
              id="appointment-notes"
              rows={3}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Share brief scheduling context (do not include emergency symptoms; call local emergency services for urgent care)."
              className="w-full rounded-lg border border-[var(--cb-border-strong)] bg-[var(--cb-surface)] px-3 py-2 text-sm text-[var(--cb-text)] placeholder:text-[var(--cb-text-muted)] transition-colors focus:border-[var(--cb-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--cb-ring)]"
            />
            <p className="mt-1 text-right text-[11px] text-[var(--cb-text-muted)] cb-tabular">
              {notes.length}/500
            </p>
          </div>
        </form>
      </Modal>

      {/* Appointment Details Modal */}
      <Modal
        open={Boolean(detailAppt)}
        onClose={() => setDetailAppt(null)}
        title="Appointment Details"
        footer={
          detailAppt ? (
            <>
              {(detailAppt.status === 'PENDING' ||
                detailAppt.status === 'CONFIRMED') && (
                <Button
                  variant="danger"
                  onClick={() => setCancelTarget(detailAppt)}
                >
                  Cancel Appointment
                </Button>
              )}
              <Button variant="outline" onClick={() => setDetailAppt(null)}>
                Close
              </Button>
            </>
          ) : undefined
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
                <dt className="text-[var(--cb-text-muted)]">Visit Type</dt>
                <dd className="font-medium text-[var(--cb-text)]">
                  {formatAppointmentType(detailAppt.appointment_type)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[var(--cb-text-muted)]">
                  Preferred / Scheduled Time
                </dt>
                <dd className="font-medium text-[var(--cb-text)] cb-tabular">
                  {formatDateTime(detailAppt.scheduled_at)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[var(--cb-text-muted)]">
                  Assigned Clinician
                </dt>
                <dd className="font-medium text-[var(--cb-text)]">
                  {detailAppt.assigned_doctor_name ??
                    'Awaiting care-team assignment'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[var(--cb-text-muted)]">Requested On</dt>
                <dd className="font-medium text-[var(--cb-text)] cb-tabular">
                  {formatDateTime(detailAppt.created_at)}
                </dd>
              </div>
            </dl>

            {detailAppt.status_note && (
              <div className="rounded-xl border border-[var(--cb-primary)]/30 bg-[var(--cb-primary-soft)]/45 p-3.5">
                <p className="text-xs font-semibold text-[var(--cb-primary)] uppercase">
                  Care Team Scheduling Update
                </p>
                <p className="mt-1 text-sm text-[var(--cb-text)]">
                  {detailAppt.status_note}
                </p>
              </div>
            )}

            {detailAppt.notes && (
              <div className="rounded-xl border border-[var(--cb-border)] p-3.5">
                <p className="text-xs font-semibold text-[var(--cb-text-muted)] uppercase">
                  Patient Note
                </p>
                <p className="mt-1 text-sm text-[var(--cb-text)]">
                  {detailAppt.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => {
          if (!isCancelling) setCancelTarget(null);
        }}
        title="Cancel appointment request?"
        description={
          cancelTarget
            ? `Cancel your ${formatAppointmentType(cancelTarget.appointment_type)} request for ${formatDateTime(cancelTarget.scheduled_at)}? You can submit a new request anytime.`
            : ''
        }
        confirmLabel="Cancel Appointment"
        intent="danger"
        isLoading={isCancelling}
        onConfirm={() => void handleConfirmCancel()}
      />
    </div>
  );
}
