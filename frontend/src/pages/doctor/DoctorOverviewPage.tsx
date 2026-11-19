import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  ClipboardCheck,
  FileText,
  GitBranch,
  RefreshCw,
  Stethoscope,
  UserCheck,
  Users,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/common';
import { StatCard } from '@/components/dashboard';
import { PageHeader } from '@/components/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { extractApiErrorMessage } from '@/services/api';
import { fetchDoctorOverview } from '@/services/doctor';
import {
  DOCTOR_VERIFICATION_BADGES,
  formatDoctorDisplayName,
  type DoctorOverviewResponse,
} from '@/types/doctor';
import {
  APPOINTMENT_STATUS_BADGES,
  FOLLOW_UP_STATUS_BADGES,
  REPORT_REVIEW_BADGES,
  formatAppointmentType,
} from '@/types/patient';
import { formatDateTime, formatFileSize } from '@/utils/format';

export function DoctorOverviewPage() {
  useDocumentTitle('Doctor Dashboard');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [overview, setOverview] = useState<DoctorOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchDoctorOverview();
      setOverview(data);
    } catch (err) {
      setError(
        extractApiErrorMessage(
          err,
          'Unable to load your clinician dashboard right now.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        void loadOverview();
      }
    });
    return () => {
      active = false;
    };
  }, [loadOverview]);

  const greetingName =
    overview?.display_name ??
    formatDoctorDisplayName(user?.full_name ?? 'Clinician');
  const stats = overview?.statistics;
  const verificationBadge = overview
    ? DOCTOR_VERIFICATION_BADGES[overview.verification_status]
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${greetingName}`}
        subtitle="Authorized clinical workspace for your assigned patients, pending report reviews, scheduled visits, specialist referrals, and follow-up coordination."
        badge={
          verificationBadge ? (
            <Badge variant={verificationBadge.variant} dot>
              {verificationBadge.label}
            </Badge>
          ) : undefined
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => void loadOverview()}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              leftIcon={<FileText className="h-4 w-4" />}
              onClick={() => navigate('/doctor/reports')}
            >
              Review Reports
            </Button>
          </div>
        }
      />

      {/* Quick Clinical Actions */}
      <Card padding="sm" className="bg-[var(--cb-surface)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[var(--cb-text-muted)] uppercase">
            <Stethoscope
              className="h-4 w-4 text-[var(--cb-primary)]"
              aria-hidden="true"
            />
            <span>Quick Actions</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Users className="h-3.5 w-3.5" />}
              onClick={() => navigate('/doctor/patients')}
            >
              View Patients
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FileText className="h-3.5 w-3.5" />}
              onClick={() => navigate('/doctor/reports')}
            >
              Review Reports
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Calendar className="h-3.5 w-3.5" />}
              onClick={() => navigate('/doctor/appointments')}
            >
              Manage Appointments
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<GitBranch className="h-3.5 w-3.5" />}
              onClick={() => navigate('/doctor/referrals?action=create')}
            >
              Create Referral
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ClipboardCheck className="h-3.5 w-3.5" />}
              onClick={() => navigate('/doctor/follow-ups?action=create')}
            >
              Schedule Follow-up
            </Button>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <LoadingState rows={5} />
      ) : error || !overview || !stats ? (
        <ErrorState
          title="Could not load dashboard overview"
          message={
            error ?? 'Unable to load your clinician dashboard right now.'
          }
          onRetry={() => void loadOverview()}
        />
      ) : (
        <>
          {/* Six Real Database-Backed Summary Cards */}
          <section
            aria-label="Clinical workload summary"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            <StatCard
              label="Assigned Patients"
              value={stats.total_assigned_patients}
              icon={<Users className="h-5 w-5" />}
              tone="primary"
              trend={
                stats.total_assigned_patients === 0
                  ? 'Awaiting admin patient assignment'
                  : 'Active authorized care panel'
              }
              trendTone="neutral"
            />
            <StatCard
              label="Pending Report Reviews"
              value={stats.pending_report_reviews}
              icon={<FileText className="h-5 w-5" />}
              tone={stats.pending_report_reviews > 0 ? 'warning' : 'teal'}
              trend={
                stats.pending_report_reviews > 0
                  ? 'Reports awaiting review or follow-up'
                  : 'All assigned reports reviewed'
              }
              trendTone={
                stats.pending_report_reviews > 0 ? 'warning' : 'positive'
              }
            />
            <StatCard
              label="Upcoming Appointments"
              value={stats.upcoming_appointments}
              icon={<Calendar className="h-5 w-5" />}
              tone="teal"
              trend={
                overview.todays_appointments.length > 0
                  ? `${overview.todays_appointments.length} scheduled today`
                  : 'No remaining visits scheduled today'
              }
              trendTone="neutral"
            />
            <StatCard
              label="Patients Requiring Attention"
              value={stats.patients_requiring_attention}
              icon={<AlertTriangle className="h-5 w-5" />}
              tone={
                stats.patients_requiring_attention > 0 ? 'critical' : 'success'
              }
              trend={
                stats.patients_requiring_attention > 0
                  ? 'Pending reports, visits, or overdue follow-ups'
                  : 'No urgent pending patient items'
              }
              trendTone={
                stats.patients_requiring_attention > 0 ? 'critical' : 'positive'
              }
            />
            <StatCard
              label="Pending Referrals"
              value={stats.pending_referrals}
              icon={<GitBranch className="h-5 w-5" />}
              tone={stats.pending_referrals > 0 ? 'warning' : 'primary'}
              trend={
                stats.pending_referrals > 0
                  ? 'Active specialist referrals to coordinate'
                  : 'No pending specialist referrals'
              }
              trendTone="neutral"
            />
            <StatCard
              label="Pending Follow-ups"
              value={stats.pending_follow_ups}
              icon={<ClipboardCheck className="h-5 w-5" />}
              tone={stats.overdue_follow_ups > 0 ? 'critical' : 'success'}
              trend={
                stats.overdue_follow_ups > 0
                  ? `${stats.overdue_follow_ups} overdue requiring attention`
                  : 'Follow-up schedule up to date'
              }
              trendTone={stats.overdue_follow_ups > 0 ? 'critical' : 'positive'}
            />
          </section>

          {/* Today's Appointments + Reports Awaiting Review */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Today's Appointments"
                description="Scheduled and pending visits for today (UTC schedule)"
                action={
                  <Link
                    to="/doctor/appointments"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--cb-primary)] hover:underline"
                  >
                    Manage all
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                }
              />
              {overview.todays_appointments.length === 0 ? (
                <EmptyState
                  icon={<Calendar className="h-5 w-5" />}
                  title="No appointments scheduled today"
                  description="Upcoming or pending patient appointment requests will appear here once scheduled."
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/doctor/appointments')}
                    >
                      Open Appointments
                    </Button>
                  }
                />
              ) : (
                <ul className="divide-y divide-[var(--cb-border)]">
                  {overview.todays_appointments.map((appt) => {
                    const badge = APPOINTMENT_STATUS_BADGES[appt.status];
                    return (
                      <li
                        key={appt.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <Link
                            to={`/doctor/patients/${appt.patient_id}`}
                            className="truncate text-sm font-semibold text-[var(--cb-text)] hover:text-[var(--cb-primary)]"
                          >
                            {appt.patient_name}
                          </Link>
                          <p className="mt-0.5 text-xs text-[var(--cb-text-muted)]">
                            {formatAppointmentType(appt.appointment_type)} ·{' '}
                            <span className="cb-tabular">
                              {formatDateTime(appt.scheduled_at)}
                            </span>
                            {appt.location_or_mode
                              ? ` · ${appt.location_or_mode}`
                              : ''}
                          </p>
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

            <Card>
              <CardHeader
                title="Reports Awaiting Review"
                description="Uploaded medical reports from your assigned patients"
                action={
                  <Link
                    to="/doctor/reports"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--cb-primary)] hover:underline"
                  >
                    View queue
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                }
              />
              {overview.reports_awaiting_review.length === 0 ? (
                <EmptyState
                  icon={<FileText className="h-5 w-5" />}
                  title="No reports awaiting review"
                  description="New medical reports uploaded by your assigned patients appear here automatically."
                />
              ) : (
                <ul className="divide-y divide-[var(--cb-border)]">
                  {overview.reports_awaiting_review.map((report) => {
                    const badge = REPORT_REVIEW_BADGES[report.review_status];
                    return (
                      <li
                        key={report.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/doctor/reports/${report.id}`}
                            className="block truncate text-sm font-semibold text-[var(--cb-text)] hover:text-[var(--cb-primary)]"
                          >
                            {report.original_filename}
                          </Link>
                          <p className="mt-0.5 text-xs text-[var(--cb-text-muted)]">
                            {report.patient_name} · {report.file_type} ·{' '}
                            {formatFileSize(report.file_size)} ·{' '}
                            <span className="cb-tabular">
                              {formatDateTime(report.uploaded_at)}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={badge.variant} dot>
                            {badge.label}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
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
          </div>

          {/* Recently Assigned Patients + Follow-ups Requiring Attention */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Recently Assigned Patients"
                description="Patients actively assigned to your clinical panel"
                action={
                  <Link
                    to="/doctor/patients"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--cb-primary)] hover:underline"
                  >
                    All patients
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                }
              />
              {overview.recently_assigned_patients.length === 0 ? (
                <EmptyState
                  icon={<UserCheck className="h-5 w-5" />}
                  title="No patients assigned yet"
                  description="Patients appear here as soon as an authorized administrator assigns them to your care panel."
                />
              ) : (
                <ul className="divide-y divide-[var(--cb-border)]">
                  {overview.recently_assigned_patients.map((patient) => (
                    <li
                      key={patient.patient_id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <Link
                          to={`/doctor/patients/${patient.patient_id}`}
                          className="truncate text-sm font-semibold text-[var(--cb-text)] hover:text-[var(--cb-primary)]"
                        >
                          {patient.full_name}
                        </Link>
                        <p className="mt-0.5 text-xs text-[var(--cb-text-muted)]">
                          {[patient.city, patient.state]
                            .filter(Boolean)
                            .join(', ') || 'Location not specified'}{' '}
                          · Assigned{' '}
                          <span className="cb-tabular">
                            {formatDateTime(patient.assigned_at)}
                          </span>
                        </p>
                      </div>
                      <Badge
                        variant={
                          patient.requires_attention ? 'warning' : 'success'
                        }
                        dot
                      >
                        {patient.requires_attention
                          ? (patient.attention_reasons[0] ?? 'Needs review')
                          : 'Up to date'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader
                title="Follow-ups Requiring Attention"
                description="Overdue and upcoming follow-up plans across assigned patients"
                action={
                  <Link
                    to="/doctor/follow-ups"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--cb-primary)] hover:underline"
                  >
                    Manage follow-ups
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                }
              />
              {overview.follow_ups_requiring_attention.length === 0 ? (
                <EmptyState
                  icon={<ClipboardCheck className="h-5 w-5" />}
                  title="No pending follow-ups"
                  description="Schedule a follow-up after reviewing a report, visit, or referral to track continuity of care."
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate('/doctor/follow-ups?action=create')
                      }
                    >
                      Schedule Follow-up
                    </Button>
                  }
                />
              ) : (
                <ul className="divide-y divide-[var(--cb-border)]">
                  {overview.follow_ups_requiring_attention.map((item) => {
                    const badge = FOLLOW_UP_STATUS_BADGES[item.status];
                    return (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--cb-text)]">
                            {item.follow_up_type}
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--cb-text-muted)]">
                            {item.patient_name} · Due{' '}
                            <span className="cb-tabular">
                              {formatDateTime(item.scheduled_at)}
                            </span>
                          </p>
                        </div>
                        <Badge
                          variant={item.is_overdue ? 'critical' : badge.variant}
                          dot
                        >
                          {item.is_overdue ? 'Overdue' : badge.label}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          {/* Recent Patient Activity Timeline */}
          <Card>
            <CardHeader
              title="Recent Patient Activity"
              description="Chronological updates from reports, appointments, referrals, and follow-ups for your assigned panel"
            />
            {overview.recent_activity.length === 0 ? (
              <EmptyState
                icon={<Activity className="h-5 w-5" />}
                title="No recent clinical activity"
                description="Once patients are assigned and interact with reports, visits, referrals, or follow-ups, their activity timeline appears here."
              />
            ) : (
              <ul className="divide-y divide-[var(--cb-border)]">
                {overview.recent_activity.map((event) => (
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
                        <span className="font-medium text-[var(--cb-text)]">
                          {event.patient_name}
                        </span>{' '}
                        — {event.description}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-[var(--cb-text-muted)] cb-tabular">
                      {formatDateTime(event.occurred_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
