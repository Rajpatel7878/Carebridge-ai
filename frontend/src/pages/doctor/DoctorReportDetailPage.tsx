import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  FileImage,
  FileText,
  GitBranch,
  Lock,
  User,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/common';
import { ReportAnalysisPanel } from '@/components/dashboard/ReportAnalysisPanel';
import { Select, Textarea } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { useDemo } from '@/hooks/useDemo';
import { useDoctorPortal } from '@/hooks/useDoctorPortal';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { extractApiErrorMessage } from '@/services/api';
import {
  downloadDoctorReport,
  fetchDoctorReportDetail,
  submitDoctorReportReview,
} from '@/services/doctor';
import {
  DOCTOR_REVIEW_DECISION_BADGES,
  type DoctorReportDetail,
  type DoctorReportReviewDecision,
} from '@/types/doctor';
import { REPORT_REVIEW_BADGES } from '@/types/patient';
import { formatDateTime, formatFileSize } from '@/utils/format';

const REVIEW_DECISION_OPTIONS: {
  value: DoctorReportReviewDecision;
  label: string;
}[] = [
  { value: 'IN_REVIEW', label: 'In Review — Currently evaluating report' },
  { value: 'REVIEWED', label: 'Reviewed — Evaluation complete' },
  {
    value: 'NEEDS_FOLLOW_UP',
    label: 'Needs Follow-up — Clinical follow-up required',
  },
  { value: 'PENDING', label: 'Pending — Return to pending review queue' },
];

export function DoctorReportDetailPage() {
  useDocumentTitle('Report Review');
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { showToast } = useDemo();
  const { refreshNotifications } = useDoctorPortal();

  const [report, setReport] = useState<DoctorReportDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [decision, setDecision] =
    useState<DoctorReportReviewDecision>('REVIEWED');
  const [reviewNote, setReviewNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const loadReport = useCallback(async () => {
    if (!reportId) {
      setError('No report identifier was provided.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const detail = await fetchDoctorReportDetail(reportId);
      setReport(detail);
      if (detail.review_status === 'PENDING_REVIEW') {
        setDecision('IN_REVIEW');
      } else if (detail.review_status === 'IN_REVIEW') {
        setDecision('REVIEWED');
      } else {
        setDecision(detail.review_status);
      }
    } catch (err) {
      setError(
        extractApiErrorMessage(
          err,
          'Unable to load this medical report or verify patient assignment.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        void loadReport();
      }
    });
    return () => {
      active = false;
    };
  }, [loadReport]);

  const handleDownload = async () => {
    if (!report || isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadDoctorReport(report.id, report.original_filename);
      showToast(
        'Report downloaded',
        `Saved ${report.original_filename} for clinical inspection.`,
        'info',
      );
    } catch (err) {
      showToast(
        'Download failed',
        extractApiErrorMessage(
          err,
          'Unable to download this report right now.',
        ),
        'warning',
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSubmitReview = async (event: FormEvent) => {
    event.preventDefault();
    if (!report || isSubmitting) return;
    setFormError(null);

    const trimmedNote = reviewNote.trim();
    if (
      (decision === 'NEEDS_FOLLOW_UP' || decision === 'REVIEWED') &&
      trimmedNote.length > 0 &&
      trimmedNote.length < 3
    ) {
      setFormError(
        'Provide a concise clinical note of at least 3 characters, or leave blank.',
      );
      return;
    }
    if (trimmedNote.length > 2000) {
      setFormError('Clinical review note must be 2,000 characters or fewer.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await submitDoctorReportReview(report.id, {
        review_status: decision,
        review_note: trimmedNote || null,
      });
      setReport(updated);
      setReviewNote('');
      await refreshNotifications();
      showToast(
        'Report review saved',
        `Marked as ${DOCTOR_REVIEW_DECISION_BADGES[decision].label} and added to the review history.`,
        'success',
      );
    } catch (err) {
      setFormError(
        extractApiErrorMessage(
          err,
          'Could not save your clinical report review. Please try again.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Report Review"
          subtitle="Loading authorized diagnostic report and review history..."
        />
        <LoadingState rows={5} />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Report Review"
          subtitle="Authorized medical report review workspace"
          actions={
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate('/doctor/reports')}
            >
              Back to Reports
            </Button>
          }
        />
        <ErrorState
          title="Medical report unavailable"
          message={
            error ??
            'This medical report does not exist or belongs to a patient not currently assigned to you.'
          }
          onRetry={() => void loadReport()}
        />
      </div>
    );
  }

  const currentBadge = REPORT_REVIEW_BADGES[report.review_status];

  return (
    <div className="space-y-6">
      <PageHeader
        title={report.original_filename}
        subtitle={`Uploaded by ${report.patient_name} on ${formatDateTime(report.uploaded_at)}`}
        badge={
          <Badge variant={currentBadge.variant} dot>
            {currentBadge.label}
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate('/doctor/reports')}
            >
              All Reports
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<User className="h-4 w-4" />}
              onClick={() => navigate(`/doctor/patients/${report.patient_id}`)}
            >
              Patient Chart
            </Button>
            <Button
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
              isLoading={isDownloading}
              onClick={() => void handleDownload()}
            >
              Download File
            </Button>
          </div>
        }
      />

      <ReportAnalysisPanel key={report.id} role="doctor" reportId={report.id} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Report Metadata & Care Actions */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader
              title="Document Metadata"
              description="Original patient-uploaded file (read-only)"
            />
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)] p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]">
                {report.file_type === 'PDF' ? (
                  <FileText className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <FileImage className="h-5 w-5" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--cb-text)]">
                  {report.original_filename}
                </p>
                <p className="text-xs text-[var(--cb-text-muted)] cb-tabular">
                  {report.file_type} · {formatFileSize(report.file_size)}
                </p>
              </div>
            </div>

            <dl className="divide-y divide-[var(--cb-border)] text-xs sm:text-sm">
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[var(--cb-text-muted)]">Patient</dt>
                <dd className="font-medium text-[var(--cb-text)]">
                  <Link
                    to={`/doctor/patients/${report.patient_id}`}
                    className="text-[var(--cb-primary)] hover:underline"
                  >
                    {report.patient_name}
                  </Link>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[var(--cb-text-muted)]">Location</dt>
                <dd className="font-medium text-[var(--cb-text)]">
                  {[report.patient_city, report.patient_state]
                    .filter(Boolean)
                    .join(', ') || 'Not specified'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[var(--cb-text-muted)]">Upload Status</dt>
                <dd>
                  <Badge variant="success">{report.upload_status}</Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[var(--cb-text-muted)]">Last Updated</dt>
                <dd className="font-medium text-[var(--cb-text)] cb-tabular">
                  {formatDateTime(report.updated_at)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[var(--cb-text-muted)]">Review Entries</dt>
                <dd className="font-medium text-[var(--cb-text)] cb-tabular">
                  {report.reviews.length}
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader
              title="Next Care Steps"
              description="Coordinate follow-up or specialist referral for this patient"
            />
            <div className="flex flex-col gap-2.5">
              <Button
                variant="outline"
                leftIcon={<ClipboardCheck className="h-4 w-4" />}
                onClick={() =>
                  navigate(
                    `/doctor/follow-ups?action=create&patient_id=${encodeURIComponent(report.patient_id)}`,
                  )
                }
              >
                Schedule Follow-up
              </Button>
              <Button
                variant="outline"
                leftIcon={<GitBranch className="h-4 w-4" />}
                onClick={() =>
                  navigate(
                    `/doctor/referrals?action=create&patient_id=${encodeURIComponent(report.patient_id)}`,
                  )
                }
              >
                Create Specialist Referral
              </Button>
            </div>
          </Card>
        </div>

        {/* Review Submission Form + Immutable Review History */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Record Clinical Review"
              description="Update the report review status and record a clinician-only review note. The patient receives a privacy-safe status update without raw clinical note text."
            />

            <form
              onSubmit={(event) => void handleSubmitReview(event)}
              className="space-y-4"
            >
              <Select
                label="Review Decision"
                options={REVIEW_DECISION_OPTIONS}
                value={decision}
                onChange={(event) =>
                  setDecision(event.target.value as DoctorReportReviewDecision)
                }
              />

              <Textarea
                label="Clinical Review Note (Clinician Portal Only)"
                placeholder="Summarize key clinical observations, verification notes, or follow-up considerations..."
                rows={4}
                maxLength={2000}
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                helperText={`${reviewNote.length}/2000 characters · Preserved in immutable report review history.`}
                error={formError ?? undefined}
              />

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="inline-flex items-center gap-1.5 text-xs text-[var(--cb-text-muted)]">
                  <Lock
                    className="h-3.5 w-3.5 text-[var(--cb-secondary)]"
                    aria-hidden="true"
                  />
                  Uploaded document is never modified or overwritten
                </span>
                <Button
                  type="submit"
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  isLoading={isSubmitting}
                >
                  Save Review Decision
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader
              title="Clinical Review History"
              description="Complete chronological log of clinician reviews for this report"
            />
            {report.reviews.length === 0 ? (
              <EmptyState
                icon={<Clock className="h-5 w-5" />}
                title="No clinician reviews recorded yet"
                description="Download the file to examine it and submit your first review entry above."
              />
            ) : (
              <ol className="space-y-3">
                {report.reviews.map((entry) => {
                  const badge =
                    DOCTOR_REVIEW_DECISION_BADGES[entry.review_status];
                  return (
                    <li
                      key={entry.id}
                      className="rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)]/60 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={badge.variant} dot>
                            {badge.label}
                          </Badge>
                          <span className="text-xs font-semibold text-[var(--cb-text)]">
                            {entry.doctor_name ?? 'Authorized Clinician'}
                          </span>
                        </div>
                        <span className="text-xs text-[var(--cb-text-muted)] cb-tabular">
                          {formatDateTime(entry.reviewed_at)}
                        </span>
                      </div>
                      {entry.review_note ? (
                        <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-[var(--cb-text)]">
                          {entry.review_note}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs italic text-[var(--cb-text-muted)]">
                          Status updated without an additional clinical note.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
