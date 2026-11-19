import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  GitBranch,
  Lock,
  Phone,
  ShieldAlert,
  Users,
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
import { PageHeader } from '@/components/navigation';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { extractApiErrorMessage } from '@/services/api';
import {
  downloadDoctorReport,
  fetchDoctorPatientDetail,
} from '@/services/doctor';
import {
  CLINICAL_REVIEW_STATUS_BADGES,
  DOCTOR_REVIEW_DECISION_BADGES,
  PATIENT_GENDER_LABELS,
  PATIENT_LANGUAGE_LABELS,
  RISK_SOURCE_BADGES,
  RISK_STATUS_BADGES,
  type DoctorPatientDetail,
} from '@/types/doctor';
import {
  APPOINTMENT_STATUS_BADGES,
  FOLLOW_UP_STATUS_BADGES,
  REFERRAL_STATUS_BADGES,
  REPORT_REVIEW_BADGES,
  RISK_CATEGORY_BADGES,
  formatAppointmentType,
} from '@/types/patient';
import { cn } from '@/utils/cn';
import {
  formatDate,
  formatDateTime,
  formatFileSize,
  getInitials,
} from '@/utils/format';

type PatientTabId =
  'summary' | 'reports' | 'risk' | 'appointments' | 'care-plan';

export function DoctorPatientDetailsPage() {
  useDocumentTitle('Patient Details');
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { showToast } = useDemo();

  const [detail, setDetail] = useState<DoctorPatientDetail | null>(null);
  const [activeTab, setActiveTab] = useState<PatientTabId>('summary');
  const [isLoading, setIsLoading] = useState(Boolean(patientId));
  const [error, setError] = useState<string | null>(null);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(
    null,
  );

  const loadDetail = useCallback(async () => {
    if (!patientId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchDoctorPatientDetail(patientId);
      setDetail(data);
    } catch (err) {
      setError(
        extractApiErrorMessage(
          err,
          'Unable to load this patient record or verify an active assignment.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        void loadDetail();
      }
    });
    return () => {
      active = false;
    };
  }, [loadDetail]);

  const handleDownloadReport = async (reportId: string, filename: string) => {
    if (downloadingReportId) return;
    setDownloadingReportId(reportId);
    try {
      await downloadDoctorReport(reportId, filename);
      showToast(
        'Report downloaded',
        `Downloaded ${filename} for authorized clinical review.`,
        'info',
      );
    } catch (err) {
      showToast(
        'Download failed',
        extractApiErrorMessage(err, 'Unable to download this report.'),
        'warning',
      );
    } finally {
      setDownloadingReportId(null);
    }
  };

  if (!patientId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Patient Details"
          subtitle="Select a patient from your assigned roster to inspect their authorized clinical dossier."
        />
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No patient selected"
          description="Open your assigned patients list to view medical reports, clinical reviews, appointments, referrals, and follow-up plans."
          action={
            <Button onClick={() => navigate('/doctor/patients')}>
              Open My Patients
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Patient Details"
          subtitle="Loading authorized patient chart and care history..."
        />
        <LoadingState rows={6} />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Patient Details"
          subtitle="Assignment-verified patient record"
          actions={
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate('/doctor/patients')}
            >
              Back to My Patients
            </Button>
          }
        />
        <ErrorState
          title="Patient record unavailable"
          message={
            error ??
            'This patient does not exist or is not actively assigned to your care panel.'
          }
          onRetry={() => void loadDetail()}
        />
      </div>
    );
  }

  const { profile } = detail;

  const tabs: { id: PatientTabId; label: string; count?: number }[] = [
    { id: 'summary', label: 'Summary & Profile' },
    { id: 'reports', label: 'Reports & Notes', count: detail.reports.length },
    {
      id: 'risk',
      label: 'Risk Assessments',
      count: detail.risk_assessments.length,
    },
    {
      id: 'appointments',
      label: 'Appointments',
      count: detail.appointments.length,
    },
    {
      id: 'care-plan',
      label: 'Referrals & Follow-ups',
      count: detail.referrals.length + detail.follow_ups.length,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={profile.full_name}
        subtitle={`Assigned to your care panel since ${formatDate(profile.assigned_at)}`}
        badge={
          <Badge
            variant={detail.requires_attention ? 'warning' : 'success'}
            dot
          >
            {detail.requires_attention ? 'Needs Attention' : 'Up to Date'}
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate('/doctor/patients')}
            >
              My Patients
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<GitBranch className="h-4 w-4" />}
              onClick={() =>
                navigate(
                  `/doctor/referrals?action=create&patient_id=${encodeURIComponent(profile.patient_id)}`,
                )
              }
            >
              Create Referral
            </Button>
            <Button
              size="sm"
              leftIcon={<ClipboardCheck className="h-4 w-4" />}
              onClick={() =>
                navigate(
                  `/doctor/follow-ups?action=create&patient_id=${encodeURIComponent(profile.patient_id)}`,
                )
              }
            >
              Schedule Follow-up
            </Button>
          </div>
        }
      />

      {/* Attention Banner when real items require clinician follow-up */}
      {detail.requires_attention && detail.attention_reasons.length > 0 && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-[var(--cb-warning)]/35 bg-[var(--cb-warning-soft)] px-4 py-3 text-sm text-[var(--cb-text)]"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cb-warning)]"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold">Clinical items awaiting your action</p>
            <p className="mt-0.5 text-xs text-[var(--cb-text-secondary)]">
              {detail.attention_reasons.join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Section Tabs */}
      <div
        role="tablist"
        aria-label="Patient chart sections"
        className="flex flex-wrap gap-1.5 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-1.5"
      >
        {tabs.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(tab.id)}
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

      {/* Tab 1: Summary & Profile + Recent Activity */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader
              title="Patient Profile"
              description="Authorized demographic & contact information"
            />
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--cb-primary-soft)] text-sm font-bold text-[var(--cb-primary)]">
                {getInitials(profile.full_name)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-[var(--cb-text)]">
                  {profile.full_name}
                </p>
                <p className="truncate text-xs text-[var(--cb-text-muted)]">
                  {profile.email}
                </p>
              </div>
            </div>

            <dl className="divide-y divide-[var(--cb-border)] text-xs sm:text-sm">
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[var(--cb-text-muted)]">Date of Birth</dt>
                <dd className="font-medium text-[var(--cb-text)]">
                  {profile.date_of_birth
                    ? formatDate(profile.date_of_birth)
                    : 'Not provided'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[var(--cb-text-muted)]">Gender</dt>
                <dd className="font-medium text-[var(--cb-text)]">
                  {profile.gender
                    ? PATIENT_GENDER_LABELS[profile.gender]
                    : 'Not provided'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[var(--cb-text-muted)]">Phone</dt>
                <dd className="font-medium text-[var(--cb-text)] cb-tabular">
                  {profile.phone_number ?? 'Not provided'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[var(--cb-text-muted)]">Location</dt>
                <dd className="font-medium text-[var(--cb-text)]">
                  {[profile.city, profile.state].filter(Boolean).join(', ') ||
                    'Not provided'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[var(--cb-text-muted)]">Language</dt>
                <dd className="font-medium text-[var(--cb-text)]">
                  {PATIENT_LANGUAGE_LABELS[profile.preferred_language]}
                </dd>
              </div>
            </dl>

            <div className="mt-4 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)] p-3 text-xs">
              <p className="flex items-center gap-1.5 font-semibold text-[var(--cb-text)]">
                <Phone className="h-3.5 w-3.5 text-[var(--cb-primary)]" />
                Emergency Contact
              </p>
              {profile.emergency_contact_name ||
              profile.emergency_contact_phone ? (
                <p className="mt-1 text-[var(--cb-text-secondary)]">
                  {profile.emergency_contact_name ?? 'Name not recorded'}
                  {profile.emergency_contact_phone
                    ? ` · ${profile.emergency_contact_phone}`
                    : ''}
                </p>
              ) : (
                <p className="mt-1 text-[var(--cb-text-muted)]">
                  No emergency contact added by patient yet.
                </p>
              )}
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader
              title="Recent Activity & Timeline"
              description="Recorded milestones from reports, clinician reviews, appointments, referrals, and follow-ups"
            />
            {detail.recent_activity.length === 0 ? (
              <EmptyState
                icon={<Activity className="h-5 w-5" />}
                title="No clinical activity recorded yet"
                description="Uploaded medical reports, visits, referrals, and follow-up updates for this patient will appear here chronologically."
              />
            ) : (
              <ol className="divide-y divide-[var(--cb-border)]">
                {detail.recent_activity.map((event) => (
                  <li
                    key={event.id}
                    className="flex flex-col justify-between gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0">
                      <Link
                        to={event.link_path}
                        className="text-sm font-semibold text-[var(--cb-text)] hover:text-[var(--cb-primary)]"
                      >
                        {event.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-[var(--cb-text-secondary)]">
                        {event.description}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-[var(--cb-text-muted)] cb-tabular">
                      {formatDateTime(event.occurred_at)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      )}

      {/* Tab 2: Patient Uploaded Reports vs Separated Clinician Review Notes */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Patient-Uploaded Medical Reports"
              description="Diagnostic files submitted directly by the patient"
            />
            {detail.reports.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-5 w-5" />}
                title="No medical reports uploaded yet"
                description="This patient has not uploaded any PDF, PNG, or JPG medical reports yet."
              />
            ) : (
              <ul className="divide-y divide-[var(--cb-border)]">
                {detail.reports.map((report) => {
                  const badge = REPORT_REVIEW_BADGES[report.review_status];
                  return (
                    <li
                      key={report.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--cb-text)]">
                          {report.original_filename}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--cb-text-muted)] cb-tabular">
                          {report.file_type} ·{' '}
                          {formatFileSize(report.file_size)} · Uploaded{' '}
                          {formatDateTime(report.uploaded_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={badge.variant} dot>
                          {badge.label}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<Download className="h-3.5 w-3.5" />}
                          isLoading={downloadingReportId === report.id}
                          onClick={() =>
                            void handleDownloadReport(
                              report.id,
                              report.original_filename,
                            )
                          }
                        >
                          Download
                        </Button>
                        <Button
                          size="sm"
                          leftIcon={<Eye className="h-3.5 w-3.5" />}
                          onClick={() =>
                            navigate(`/doctor/reports/${report.id}`)
                          }
                        >
                          Review
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Clinician Report Review History"
              description="Separated clinician-authored review decisions and protected clinical notes"
              action={
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--cb-text-muted)]">
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  Clinician-only notes
                </span>
              }
            />
            {detail.report_reviews.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-5 w-5" />}
                title="No report review notes yet"
                description="Clinician review decisions and observations will be recorded here once a report is evaluated."
              />
            ) : (
              <ol className="space-y-3">
                {detail.report_reviews.map((review) => {
                  const badge =
                    DOCTOR_REVIEW_DECISION_BADGES[review.review_status];
                  return (
                    <li
                      key={review.id}
                      className="rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)]/60 p-3.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={badge.variant} dot>
                            {badge.label}
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
                        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--cb-text)]">
                          {review.review_note}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>
      )}

      {/* Tab 3: Risk Assessment History */}
      {activeTab === 'risk' && (
        <Card>
          <CardHeader
            title="Risk Assessment & Clinical Review History"
            description={detail.risk_disclaimer}
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  navigate(
                    `/doctor/risk-review?patient_id=${encodeURIComponent(profile.patient_id)}`,
                  )
                }
              >
                Open Risk Review
              </Button>
            }
          />
          {detail.risk_assessments.length === 0 ? (
            <EmptyState
              icon={<ShieldAlert className="h-5 w-5" />}
              title="No risk assessment records available"
              description="CareBridge AI does not fabricate risk scores or diagnoses. Valid screening or clinical assessment records appear here once recorded."
            />
          ) : (
            <div className="space-y-4">
              {detail.risk_assessments.map((item) => {
                const statusBadge = RISK_STATUS_BADGES[item.status];
                const categoryBadge = item.risk_category
                  ? RISK_CATEGORY_BADGES[item.risk_category]
                  : null;
                const sourceBadge = item.source
                  ? RISK_SOURCE_BADGES[item.source]
                  : null;
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[var(--cb-border)] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
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
                      <span className="text-xs text-[var(--cb-text-muted)] cb-tabular">
                        Assessed {formatDateTime(item.assessed_at)}
                      </span>
                    </div>
                    {item.explanation && (
                      <p className="mt-2.5 text-sm text-[var(--cb-text-secondary)]">
                        {item.explanation}
                      </p>
                    )}
                    {item.clinical_reviews.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-[var(--cb-border)] pt-3">
                        <p className="text-xs font-semibold text-[var(--cb-text-muted)] uppercase">
                          Verified Clinician Reviews
                        </p>
                        {item.clinical_reviews.map((cr) => {
                          const crBadge =
                            CLINICAL_REVIEW_STATUS_BADGES[cr.review_status];
                          return (
                            <div
                              key={cr.id}
                              className="rounded-lg bg-[var(--cb-surface-subtle)] p-3 text-xs"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-semibold text-[var(--cb-text)]">
                                  {cr.doctor_name ?? 'Authorized Clinician'} ·{' '}
                                  {crBadge.label}
                                </span>
                                <span className="text-[var(--cb-text-muted)] cb-tabular">
                                  {formatDateTime(cr.reviewed_at)}
                                </span>
                              </div>
                              {cr.review_note && (
                                <p className="mt-1.5 text-[var(--cb-text)]">
                                  {cr.review_note}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Tab 4: Appointment History */}
      {activeTab === 'appointments' && (
        <Card>
          <CardHeader
            title="Appointment History"
            description="All pending, scheduled, completed, and cancelled visits for this patient"
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  navigate(
                    `/doctor/appointments?patient_id=${encodeURIComponent(profile.patient_id)}`,
                  )
                }
              >
                Manage Appointments
              </Button>
            }
          />
          {detail.appointments.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-5 w-5" />}
              title="No appointments recorded"
              description="Patient appointment requests and confirmed clinic visits will appear here."
            />
          ) : (
            <ul className="divide-y divide-[var(--cb-border)]">
              {detail.appointments.map((appt) => {
                const badge = APPOINTMENT_STATUS_BADGES[appt.status];
                return (
                  <li
                    key={appt.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--cb-text)]">
                        {formatAppointmentType(appt.appointment_type)}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--cb-text-muted)]">
                        <span className="cb-tabular">
                          {formatDateTime(appt.scheduled_at)}
                        </span>
                        {appt.location_or_mode
                          ? ` · ${appt.location_or_mode}`
                          : ''}
                      </p>
                      {appt.status_note && (
                        <p className="mt-1 text-xs text-[var(--cb-text-secondary)]">
                          Scheduling note: {appt.status_note}
                        </p>
                      )}
                    </div>
                    <Badge variant={badge.variant} dot>
                      {badge.label}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {/* Tab 5: Referral History & Follow-up Schedule */}
      {activeTab === 'care-plan' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Specialist Referrals"
              description="Recorded internal referral coordination history"
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    navigate(
                      `/doctor/referrals?action=create&patient_id=${encodeURIComponent(profile.patient_id)}`,
                    )
                  }
                >
                  New Referral
                </Button>
              }
            />
            {detail.referrals.length === 0 ? (
              <EmptyState
                icon={<GitBranch className="h-5 w-5" />}
                title="No referrals recorded"
                description="Create a specialist referral whenever multidisciplinary evaluation is clinically warranted."
              />
            ) : (
              <ul className="divide-y divide-[var(--cb-border)]">
                {detail.referrals.map((ref) => {
                  const badge = REFERRAL_STATUS_BADGES[ref.status];
                  return (
                    <li
                      key={ref.id}
                      className="space-y-1.5 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--cb-text)]">
                          {ref.referred_department}
                        </p>
                        <Badge variant={badge.variant} dot>
                          {badge.label}
                        </Badge>
                      </div>
                      {ref.reason && (
                        <p className="text-xs text-[var(--cb-text-secondary)]">
                          {ref.reason}
                        </p>
                      )}
                      <p className="text-[11px] text-[var(--cb-text-muted)] cb-tabular">
                        Created {formatDateTime(ref.created_at)}
                        {ref.referring_doctor_name
                          ? ` · ${ref.referring_doctor_name}`
                          : ''}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Follow-up Schedule"
              description="Pending, overdue, and completed continuity-of-care tasks"
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    navigate(
                      `/doctor/follow-ups?action=create&patient_id=${encodeURIComponent(profile.patient_id)}`,
                    )
                  }
                >
                  Schedule
                </Button>
              }
            />
            {detail.follow_ups.length === 0 ? (
              <EmptyState
                icon={<ClipboardCheck className="h-5 w-5" />}
                title="No follow-ups scheduled"
                description="Schedule a structured follow-up plan to track next visits or post-report monitoring."
              />
            ) : (
              <ul className="divide-y divide-[var(--cb-border)]">
                {detail.follow_ups.map((item) => {
                  const badge = FOLLOW_UP_STATUS_BADGES[item.status];
                  return (
                    <li
                      key={item.id}
                      className="space-y-1.5 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--cb-text)]">
                          {item.follow_up_type}
                        </p>
                        <Badge
                          variant={item.is_overdue ? 'critical' : badge.variant}
                          dot
                        >
                          {item.is_overdue ? 'Overdue' : badge.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-[var(--cb-text-muted)] cb-tabular">
                        Due {formatDateTime(item.scheduled_at)}
                      </p>
                      {item.notes && (
                        <p className="text-xs text-[var(--cb-text-secondary)]">
                          {item.notes}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
