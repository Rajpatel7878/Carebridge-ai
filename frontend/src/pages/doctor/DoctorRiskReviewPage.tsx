import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Info,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  Pagination,
} from '@/components/common';
import { Input, Select, Textarea } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { useDemo } from '@/hooks/useDemo';
import { useDoctorPortal } from '@/hooks/useDoctorPortal';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { extractApiErrorMessage } from '@/services/api';
import {
  fetchDoctorRiskAssessments,
  submitDoctorRiskReview,
} from '@/services/doctor';
import {
  CLINICAL_REVIEW_STATUS_BADGES,
  DOCTOR_CLINICAL_RISK_DISCLAIMER,
  RISK_SOURCE_BADGES,
  RISK_STATUS_BADGES,
  type ClinicalReviewStatusCode,
  type DoctorRiskAssessmentItem,
} from '@/types/doctor';
import {
  RISK_CATEGORY_BADGES,
  type RiskAssessmentStatus,
  type RiskCategoryCode,
} from '@/types/patient';
import { formatDateTime } from '@/utils/format';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Assessment States' },
  { value: 'PENDING', label: 'Pending Clinician Review' },
  { value: 'REVIEWED', label: 'Clinically Reviewed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Risk Categories' },
  { value: 'CRITICAL', label: 'Critical Attention' },
  { value: 'HIGH', label: 'High Attention' },
  { value: 'MODERATE', label: 'Moderate Attention' },
  { value: 'LOW', label: 'Low Attention' },
];

const CLINICAL_REVIEW_OPTIONS: {
  value: ClinicalReviewStatusCode;
  label: string;
}[] = [
  { value: 'REVIEWED', label: 'Clinically Reviewed — Guidance recorded' },
  {
    value: 'FLAGGED_FOR_REVIEW',
    label: 'Flag for Additional Review — Keep open for deeper evaluation',
  },
  {
    value: 'FOLLOW_UP_REQUIRED',
    label: 'Follow-up Required — Needs scheduled clinical follow-up',
  },
  { value: 'ARCHIVED', label: 'Archived — Superseded by newer assessment' },
];

const PAGE_SIZE = 10;

export function DoctorRiskReviewPage() {
  useDocumentTitle('Risk Review');
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useDemo();
  const { refreshNotifications } = useDoctorPortal();

  const patientIdFilter = searchParams.get('patient_id') ?? '';

  const [items, setItems] = useState<DoctorRiskAssessmentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [disclaimer, setDisclaimer] = useState(DOCTOR_CLINICAL_RISK_DISCLAIMER);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clinical review modal state
  const [activeAssessment, setActiveAssessment] =
    useState<DoctorRiskAssessmentItem | null>(null);
  const [reviewStatus, setReviewStatus] =
    useState<ClinicalReviewStatusCode>('REVIEWED');
  const [reviewNote, setReviewNote] = useState('');
  const [recommendedAction, setRecommendedAction] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAssessments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchDoctorRiskAssessments({
        patient_id: patientIdFilter || undefined,
        status:
          statusFilter !== 'all'
            ? (statusFilter as RiskAssessmentStatus)
            : undefined,
        risk_category:
          categoryFilter !== 'all'
            ? (categoryFilter as RiskCategoryCode)
            : undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setItems(response.items);
      setTotal(response.total);
      setPendingCount(response.pending_count);
      setFlaggedCount(response.flagged_count);
      setReviewedCount(response.reviewed_count);
      setDisclaimer(response.disclaimer || DOCTOR_CLINICAL_RISK_DISCLAIMER);
      setTotalPages(response.total_pages);
    } catch (err) {
      setError(
        extractApiErrorMessage(
          err,
          'Unable to load authorized risk assessment records right now.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [patientIdFilter, statusFilter, categoryFilter, page]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        void loadAssessments();
      }
    });
    return () => {
      active = false;
    };
  }, [loadAssessments]);

  const openReviewModal = (assessment: DoctorRiskAssessmentItem) => {
    setActiveAssessment(assessment);
    setReviewStatus('REVIEWED');
    setReviewNote('');
    setRecommendedAction(assessment.recommended_action ?? '');
    setFormError(null);
  };

  const handleSubmitReview = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeAssessment || isSubmitting) return;
    setFormError(null);

    const trimmedNote = reviewNote.trim();
    if (trimmedNote.length < 3) {
      setFormError(
        'Enter a professional clinical review note (at least 3 characters).',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await submitDoctorRiskReview(activeAssessment.id, {
        review_status: reviewStatus,
        review_note: trimmedNote,
        recommended_action: recommendedAction.trim() || null,
      });
      setActiveAssessment(null);
      showToast(
        'Clinical risk review recorded',
        `Saved as ${CLINICAL_REVIEW_STATUS_BADGES[reviewStatus].label}.`,
        'success',
      );
      await Promise.all([loadAssessments(), refreshNotifications()]);
    } catch (err) {
      setFormError(
        extractApiErrorMessage(
          err,
          'Could not save your clinical review right now.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasFilters =
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    Boolean(patientIdFilter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Review"
        subtitle="Inspect valid risk assessment records for your assigned patients, distinguish source context from clinician evaluation, and document clinical review observations."
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void loadAssessments()}
            disabled={isLoading}
          >
            Refresh
          </Button>
        }
      />

      {/* Clinical Responsibility & AI Separation Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-[var(--cb-primary)]/25 bg-[var(--cb-primary-soft)]/55 px-4 py-3.5 text-xs leading-relaxed text-[var(--cb-text)] sm:text-sm">
        <Info
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cb-primary)]"
          aria-hidden="true"
        />
        <p>{disclaimer}</p>
      </div>

      {/* Live Summary Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="warning" dot>
          Pending Review: {pendingCount}
        </Badge>
        <Badge variant="critical" dot>
          Flagged / Follow-up Required: {flaggedCount}
        </Badge>
        <Badge variant="success" dot>
          Reviewed: {reviewedCount}
        </Badge>
      </div>

      {/* Filter Bar */}
      <Card padding="sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Select
              aria-label="Filter by assessment status"
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex-1">
            <Select
              aria-label="Filter by risk category"
              options={CATEGORY_OPTIONS}
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setPage(1);
              }}
            />
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setCategoryFilter('all');
                setPage(1);
                if (patientIdFilter) {
                  setSearchParams({}, { replace: true });
                }
              }}
            >
              Reset Filters
            </Button>
          )}
        </div>
      </Card>

      {/* Assessment Cards */}
      {isLoading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState
          title="Unable to load risk assessments"
          message={error}
          onRetry={() => void loadAssessments()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert className="h-6 w-6" />}
          title={
            hasFilters
              ? 'No risk records match your filters'
              : 'No patient risk assessments available for review'
          }
          description={
            hasFilters
              ? 'Adjust or reset the status and category filters to inspect all recorded assessments.'
              : 'CareBridge AI never fabricates risk scores or diagnoses. Valid screening or assessment records for your assigned patients will appear here when recorded.'
          }
        />
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const statusBadge = RISK_STATUS_BADGES[item.status];
            const categoryBadge = item.risk_category
              ? RISK_CATEGORY_BADGES[item.risk_category]
              : null;
            const sourceBadge = item.source
              ? RISK_SOURCE_BADGES[item.source]
              : null;

            return (
              <Card key={item.id} className="space-y-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/doctor/patients/${item.patient_id}`}
                        className="text-base font-semibold text-[var(--cb-text)] hover:text-[var(--cb-primary)] hover:underline"
                      >
                        {item.patient_name}
                      </Link>
                      {categoryBadge && (
                        <Badge variant={categoryBadge.variant} dot>
                          {categoryBadge.label}
                        </Badge>
                      )}
                      <Badge variant={statusBadge.variant}>
                        {statusBadge.label}
                      </Badge>
                      {sourceBadge && (
                        <Badge variant={sourceBadge.variant}>
                          {sourceBadge.label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[var(--cb-text-muted)] cb-tabular">
                      Recorded {formatDateTime(item.assessed_at)}
                      {item.related_report_id && (
                        <>
                          {' · '}
                          <Link
                            to={`/doctor/reports/${item.related_report_id}`}
                            className="font-medium text-[var(--cb-primary)] hover:underline"
                          >
                            View linked medical report
                          </Link>
                        </>
                      )}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    leftIcon={<ClipboardCheck className="h-4 w-4" />}
                    onClick={() => openReviewModal(item)}
                  >
                    Record Clinical Review
                  </Button>
                </div>

                {/* Assessment Source Summary — Clearly distinguished from clinician evaluation */}
                <div className="rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)] p-3.5">
                  <p className="text-[11px] font-semibold tracking-wide text-[var(--cb-text-muted)] uppercase">
                    {item.is_ai_assisted
                      ? 'Automated / AI-Assisted Input Summary (Requires Independent Clinical Evaluation)'
                      : 'Recorded Assessment Explanation'}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--cb-text)]">
                    {item.explanation ??
                      'No additional explanation was recorded with this assessment entry.'}
                  </p>
                </div>

                {/* Clinician Review History — Visually separated */}
                <div className="space-y-2.5 border-t border-[var(--cb-border)] pt-3.5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--cb-text)]">
                    <Stethoscope
                      className="h-3.5 w-3.5 text-[var(--cb-secondary)]"
                      aria-hidden="true"
                    />
                    Clinician Review History ({item.clinical_reviews.length})
                  </p>
                  {item.clinical_reviews.length === 0 ? (
                    <p className="text-xs text-[var(--cb-text-muted)]">
                      Awaiting verified clinician evaluation.
                    </p>
                  ) : (
                    <ol className="space-y-2">
                      {item.clinical_reviews.map((review) => {
                        const reviewBadge =
                          CLINICAL_REVIEW_STATUS_BADGES[review.review_status];
                        return (
                          <li
                            key={review.id}
                            className="rounded-lg border border-[var(--cb-border)] bg-[var(--cb-surface)] p-3 text-xs sm:text-sm"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={reviewBadge.variant} dot>
                                  {reviewBadge.label}
                                </Badge>
                                <span className="text-xs font-semibold text-[var(--cb-text)]">
                                  {review.doctor_name ?? 'Authorized Clinician'}
                                </span>
                              </div>
                              <span className="text-xs text-[var(--cb-text-muted)] cb-tabular">
                                {formatDateTime(review.reviewed_at)}
                              </span>
                            </div>
                            {review.review_note && (
                              <p className="mt-2 whitespace-pre-wrap text-[var(--cb-text)]">
                                {review.review_note}
                              </p>
                            )}
                            {review.recommended_action && (
                              <p className="mt-1.5 text-xs text-[var(--cb-text-secondary)]">
                                <span className="font-semibold">
                                  Patient next step:
                                </span>{' '}
                                {review.recommended_action}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        itemLabel="risk assessments"
      />

      {/* Record Clinical Review Modal */}
      <Modal
        open={Boolean(activeAssessment)}
        onClose={() => {
          if (!isSubmitting) setActiveAssessment(null);
        }}
        title="Record Clinical Risk Review"
        description={
          activeAssessment
            ? `Document your independent clinical review for ${activeAssessment.patient_name}.`
            : undefined
        }
        footer={
          <>
            <Button
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setActiveAssessment(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="clinical-risk-review-form"
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
              isLoading={isSubmitting}
            >
              Save Clinical Review
            </Button>
          </>
        }
      >
        <form
          id="clinical-risk-review-form"
          onSubmit={(event) => void handleSubmitReview(event)}
          className="space-y-4"
        >
          <Select
            label="Clinical Review Outcome"
            options={CLINICAL_REVIEW_OPTIONS}
            value={reviewStatus}
            onChange={(event) =>
              setReviewStatus(event.target.value as ClinicalReviewStatusCode)
            }
          />
          <Textarea
            label="Clinician Review Note (Protected)"
            placeholder="Record your clinical assessment note, verification findings, or reason for flagging additional review..."
            rows={4}
            maxLength={2000}
            value={reviewNote}
            onChange={(event) => setReviewNote(event.target.value)}
            error={formError ?? undefined}
          />
          <Input
            label="Patient-Facing Next Step (Optional)"
            placeholder="e.g., Schedule fasting follow-up consultation within 2 weeks"
            maxLength={500}
            value={recommendedAction}
            onChange={(event) => setRecommendedAction(event.target.value)}
            helperText="Displayed as general care guidance on the patient's health record."
          />
        </form>
      </Modal>
    </div>
  );
}
