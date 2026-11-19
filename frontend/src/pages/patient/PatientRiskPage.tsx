import { useCallback, useEffect, useState } from 'react';
import { Calendar, Info, ShieldAlert, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/common';
import { PageHeader } from '@/components/navigation';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { extractApiErrorMessage } from '@/services/api';
import { fetchPatientRiskAssessments } from '@/services/patient';
import {
  RISK_CATEGORY_BADGES,
  RISK_COORDINATION_DISCLAIMER,
  type PatientRiskAssessment,
} from '@/types/patient';
import { formatDateTime } from '@/utils/format';

const STATUS_LABELS = {
  PENDING: { label: 'Pending Review', variant: 'warning' },
  REVIEWED: { label: 'Clinician Reviewed', variant: 'success' },
  ARCHIVED: { label: 'Archived', variant: 'neutral' },
} as const;

export function PatientRiskPage() {
  useDocumentTitle('Risk Overview');

  const [assessments, setAssessments] = useState<PatientRiskAssessment[]>([]);
  const [disclaimer, setDisclaimer] = useState(RISK_COORDINATION_DISCLAIMER);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAssessments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchPatientRiskAssessments();
      setAssessments(response.items);
      if (response.disclaimer) {
        setDisclaimer(response.disclaimer);
      }
    } catch (err) {
      setError(
        extractApiErrorMessage(
          err,
          'Unable to load your risk overview right now.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchPatientRiskAssessments()
      .then((response) => {
        if (cancelled) return;
        setAssessments(response.items);
        if (response.disclaimer) {
          setDisclaimer(response.disclaimer);
        }
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          extractApiErrorMessage(
            err,
            'Unable to load your risk overview right now.',
          ),
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Overview"
        subtitle="Read-only care coordination summaries provided by authorized clinical review workflows."
      />

      {isLoading ? (
        <LoadingState
          label="Checking authorized risk assessments..."
          rows={3}
        />
      ) : error ? (
        <ErrorState
          title="Could not load risk assessments"
          message={error}
          onRetry={() => void loadAssessments()}
        />
      ) : assessments.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert className="h-6 w-6" aria-hidden="true" />}
          title="No risk assessment is available yet."
          description="When an authorized clinician reviews your submitted screening or medical reports and publishes a care-coordination risk summary, it will appear here. CareBridge AI never generates placeholder scores or diagnoses."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <Link to="/patient/reports">
                <Button size="sm" leftIcon={<Upload className="h-4 w-4" />}>
                  Upload Health Report
                </Button>
              </Link>
              <Link to="/patient/appointments">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Calendar className="h-4 w-4" />}
                >
                  Request Appointment
                </Button>
              </Link>
            </div>
          }
        />
      ) : (
        <div className="space-y-4">
          {assessments.map((record) => {
            const statusMeta = STATUS_LABELS[record.status];
            const categoryMeta = record.risk_category
              ? RISK_CATEGORY_BADGES[record.risk_category]
              : null;

            return (
              <Card key={record.id} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusMeta.variant} dot>
                      {statusMeta.label}
                    </Badge>
                    {categoryMeta && (
                      <Badge variant={categoryMeta.variant} dot>
                        {categoryMeta.label}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-[var(--cb-text-muted)] cb-tabular">
                    Assessed {formatDateTime(record.assessed_at)}
                  </span>
                </div>

                {record.explanation && (
                  <div>
                    <h2 className="text-xs font-semibold tracking-wide text-[var(--cb-text-muted)] uppercase">
                      Coordination Summary
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--cb-text)]">
                      {record.explanation}
                    </p>
                  </div>
                )}

                {record.recommended_action && (
                  <div className="rounded-xl border border-[var(--cb-primary-border)] bg-[var(--cb-primary-soft)]/45 p-3.5">
                    <h3 className="text-xs font-semibold text-[var(--cb-primary)]">
                      Recommended Next Action
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--cb-text)]">
                      {record.recommended_action}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--cb-border)] pt-3 text-xs text-[var(--cb-text-muted)]">
                  <span>
                    Reviewing professional:{' '}
                    <strong className="font-medium text-[var(--cb-text-secondary)]">
                      {record.reviewing_professional_name ?? 'Not specified'}
                    </strong>
                  </span>
                  <span className="cb-tabular">
                    Updated {formatDateTime(record.updated_at)}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Mandatory clinical disclaimer */}
      <div
        role="note"
        className="flex items-start gap-3 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-4 text-xs leading-relaxed text-[var(--cb-text-secondary)] sm:text-sm"
      >
        <Info
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cb-primary)]"
          aria-hidden="true"
        />
        <p>{disclaimer}</p>
      </div>
    </div>
  );
}
