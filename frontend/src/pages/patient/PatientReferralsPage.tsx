import { useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Eye,
  GitBranch,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
} from '@/components/common';
import { Select } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { extractApiErrorMessage } from '@/services/api';
import {
  fetchPatientReferralDetail,
  fetchPatientReferrals,
} from '@/services/patient';
import {
  REFERRAL_STATUS_BADGES,
  type PatientReferral,
  type ReferralStatusCode,
} from '@/types/patient';
import { cn } from '@/utils/cn';
import { formatDate, formatDateTime } from '@/utils/format';

const REFERRAL_STEPS: { code: ReferralStatusCode; label: string }[] = [
  { code: 'PENDING', label: 'Pending' },
  { code: 'ACCEPTED', label: 'Accepted' },
  { code: 'SCHEDULED', label: 'Scheduled' },
  { code: 'COMPLETED', label: 'Completed' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Referral Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function getDefaultNextAction(status: ReferralStatusCode): string {
  switch (status) {
    case 'PENDING':
      return 'The receiving department is reviewing this referral. No action is needed from you right now.';
    case 'ACCEPTED':
      return 'Referral accepted. Coordinate or review an upcoming visit in Appointments.';
    case 'SCHEDULED':
      return 'Your referral consultation is scheduled. Check your Appointments tab for date and mode details.';
    case 'COMPLETED':
      return 'Referral consultation completed. Check Follow-ups for any post-visit care tasks.';
    case 'CANCELLED':
      return 'This referral was cancelled. Contact your care team if you need updated guidance.';
  }
}

export function PatientReferralsPage() {
  useDocumentTitle('Referrals');

  const [referrals, setReferrals] = useState<PatientReferral[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReferral, setSelectedReferral] =
    useState<PatientReferral | null>(null);

  const loadReferrals = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchPatientReferrals(
        statusFilter !== 'all'
          ? (statusFilter as ReferralStatusCode)
          : undefined,
      );
      setReferrals(response.items);
    } catch (err) {
      setError(
        extractApiErrorMessage(
          err,
          'Unable to load your referral records right now.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    let cancelled = false;
    fetchPatientReferrals(
      statusFilter !== 'all' ? (statusFilter as ReferralStatusCode) : undefined,
    )
      .then((response) => {
        if (cancelled) return;
        setReferrals(response.items);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          extractApiErrorMessage(
            err,
            'Unable to load your referral records right now.',
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

  const handleOpenDetail = async (referral: PatientReferral) => {
    setSelectedReferral(referral);
    try {
      const fresh = await fetchPatientReferralDetail(referral.id);
      setSelectedReferral(fresh);
    } catch {
      // Keep displayed record visible if refresh fails
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Referral Tracking"
        subtitle="Track clinician-initiated referrals across specialty departments, view current progress, and see recommended next steps."
        actions={
          <div className="w-56">
            <Select
              aria-label="Filter referrals by status"
              value={statusFilter}
              options={STATUS_FILTER_OPTIONS}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        }
      />

      {isLoading ? (
        <LoadingState label="Loading your referral records..." rows={3} />
      ) : error ? (
        <ErrorState
          title="Could not load referrals"
          message={error}
          onRetry={() => void loadReferrals()}
        />
      ) : referrals.length === 0 ? (
        <EmptyState
          icon={<GitBranch className="h-6 w-6" aria-hidden="true" />}
          title={
            statusFilter !== 'all'
              ? 'No referrals match this status'
              : 'No referrals on file yet'
          }
          description={
            statusFilter !== 'all'
              ? 'Select "All Referral Statuses" to see all referral records associated with your account.'
              : 'Referrals are created by authorized clinicians when specialty or department follow-up is recommended. Any referral linked to your account will appear here automatically.'
          }
          action={
            statusFilter !== 'all' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatusFilter('all')}
              >
                Show All Referrals
              </Button>
            ) : (
              <Link to="/patient/appointments">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Calendar className="h-4 w-4" />}
                >
                  View Appointments
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {referrals.map((referral) => {
            const statusMeta = REFERRAL_STATUS_BADGES[referral.status];
            const isCancelled = referral.status === 'CANCELLED';
            const activeIndex = REFERRAL_STEPS.findIndex(
              (step) => step.code === referral.status,
            );
            const nextAction =
              referral.next_action ?? getDefaultNextAction(referral.status);

            return (
              <Card key={referral.id} className="space-y-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusMeta.variant} dot>
                        {statusMeta.label}
                      </Badge>
                      <span className="text-xs text-[var(--cb-text-muted)] cb-tabular">
                        Issued {formatDate(referral.created_at)}
                      </span>
                    </div>
                    <h2 className="mt-2 text-base font-semibold text-[var(--cb-text)] sm:text-lg">
                      {referral.referred_department}
                    </h2>
                    <p className="mt-0.5 text-xs text-[var(--cb-text-muted)]">
                      Referring clinician:{' '}
                      {referral.referring_doctor_name ?? 'Care Team'}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Eye className="h-3.5 w-3.5" />}
                    onClick={() => void handleOpenDetail(referral)}
                  >
                    View Details
                  </Button>
                </div>

                {referral.reason && (
                  <p className="text-sm leading-relaxed text-[var(--cb-text-secondary)]">
                    {referral.reason}
                  </p>
                )}

                {/* Status timeline */}
                {isCancelled ? (
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)] p-3 text-xs text-[var(--cb-text-secondary)]">
                    <XCircle
                      className="h-4 w-4 shrink-0 text-[var(--cb-text-muted)]"
                      aria-hidden="true"
                    />
                    <span>
                      Referral marked Cancelled on{' '}
                      {formatDate(referral.updated_at)}.
                    </span>
                  </div>
                ) : (
                  <ol
                    aria-label="Referral status timeline"
                    className="grid grid-cols-2 gap-2.5 border-t border-[var(--cb-border)] pt-4 sm:grid-cols-4"
                  >
                    {REFERRAL_STEPS.map((step, idx) => {
                      const reached = idx <= activeIndex;
                      const current = idx === activeIndex;
                      return (
                        <li
                          key={step.code}
                          className={cn(
                            'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium',
                            current
                              ? 'border-[var(--cb-primary-border)] bg-[var(--cb-primary-soft)]/60 text-[var(--cb-primary)]'
                              : reached
                                ? 'border-[var(--cb-success-border)] bg-[var(--cb-success-soft)]/50 text-[var(--cb-success)]'
                                : 'border-[var(--cb-border)] bg-[var(--cb-surface-subtle)]/55 text-[var(--cb-text-muted)]',
                          )}
                        >
                          {reached ? (
                            <CheckCircle2
                              className="h-3.5 w-3.5 shrink-0"
                              aria-hidden="true"
                            />
                          ) : (
                            <Circle
                              className="h-3.5 w-3.5 shrink-0"
                              aria-hidden="true"
                            />
                          )}
                          <span>{step.label}</span>
                        </li>
                      );
                    })}
                  </ol>
                )}

                <div className="rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)] p-3 text-xs leading-relaxed text-[var(--cb-text-secondary)]">
                  <strong className="font-semibold text-[var(--cb-text)]">
                    Next action:{' '}
                  </strong>
                  {nextAction}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Referral Details Modal */}
      <Modal
        open={Boolean(selectedReferral)}
        onClose={() => setSelectedReferral(null)}
        title="Referral Details"
        footer={
          <Button variant="outline" onClick={() => setSelectedReferral(null)}>
            Close
          </Button>
        }
      >
        {selectedReferral && (
          <div className="space-y-4">
            <Badge
              variant={REFERRAL_STATUS_BADGES[selectedReferral.status].variant}
              dot
            >
              {REFERRAL_STATUS_BADGES[selectedReferral.status].label}
            </Badge>

            <dl className="divide-y divide-[var(--cb-border)] rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)] px-4 text-xs sm:text-sm">
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[var(--cb-text-muted)]">Department</dt>
                <dd className="font-medium text-[var(--cb-text)]">
                  {selectedReferral.referred_department}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[var(--cb-text-muted)]">
                  Referring Clinician
                </dt>
                <dd className="font-medium text-[var(--cb-text)]">
                  {selectedReferral.referring_doctor_name ?? 'Care Team'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[var(--cb-text-muted)]">Referral Date</dt>
                <dd className="font-medium text-[var(--cb-text)] cb-tabular">
                  {formatDateTime(selectedReferral.created_at)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[var(--cb-text-muted)]">Last Updated</dt>
                <dd className="font-medium text-[var(--cb-text)] cb-tabular">
                  {formatDateTime(selectedReferral.updated_at)}
                </dd>
              </div>
            </dl>

            {selectedReferral.reason && (
              <div className="rounded-xl border border-[var(--cb-border)] p-3.5">
                <p className="text-xs font-semibold text-[var(--cb-text-muted)] uppercase">
                  Coordination Note
                </p>
                <p className="mt-1 text-sm text-[var(--cb-text)]">
                  {selectedReferral.reason}
                </p>
              </div>
            )}

            <div className="rounded-xl border border-[var(--cb-primary-border)] bg-[var(--cb-primary-soft)]/45 p-3.5">
              <p className="text-xs font-semibold text-[var(--cb-primary)]">
                Recommended Next Step
              </p>
              <p className="mt-1 text-sm text-[var(--cb-text)]">
                {selectedReferral.next_action ??
                  getDefaultNextAction(selectedReferral.status)}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
