import { useState } from 'react';
import {
  Activity,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  HeartPulse,
  MapPin,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  NotificationItem,
  RiskBadge,
} from '@/components/common';
import {
  AppointmentStatusBadge,
  FollowUpStatusBadge,
  ReportDetailModal,
  ReportStatusBadge,
  StatCard,
} from '@/components/dashboard';
import { PageHeader } from '@/components/navigation';
import {
  ACTIVE_DEMO_PATIENT,
  MOCK_APPOINTMENTS,
  MOCK_FOLLOW_UPS,
  MOCK_REPORTS,
} from '@/data';
import { useAuth } from '@/hooks/useAuth';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { MedicalReport } from '@/types/domain';
import { formatDate } from '@/utils/format';

export function PatientOverviewPage() {
  useDocumentTitle('Patient Overview');
  const { user } = useAuth();
  const { getRoleNotifications, markNotificationRead } = useDemo();
  const [selectedReport, setSelectedReport] = useState<MedicalReport | null>(
    null,
  );

  const patient = ACTIVE_DEMO_PATIENT;
  const firstName = (user?.full_name ?? patient.fullName)
    .trim()
    .split(/\s+/)[0];
  const reports = MOCK_REPORTS.filter((r) => r.patientId === patient.id);
  const appointments = MOCK_APPOINTMENTS.filter(
    (a) => a.patientId === patient.id && a.status !== 'completed',
  );
  const followUps = MOCK_FOLLOW_UPS.filter((f) => f.patientId === patient.id);
  const notifications = getRoleNotifications('patient').slice(0, 3);
  const nextAppointment = appointments[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle={`Primary care with ${patient.assignedDoctorName} at ${patient.facility}. Here is your current care overview.`}
        badge={<RiskBadge level={patient.riskLevel} />}
        actions={
          <>
            <Link to="/patient/reports">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<FileText className="h-4 w-4" />}
              >
                My Reports
              </Button>
            </Link>
            <Link to="/patient/appointments">
              <Button size="sm" leftIcon={<Calendar className="h-4 w-4" />}>
                Appointments
              </Button>
            </Link>
          </>
        }
      />

      {/* Health Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Risk Status"
          value="Moderate (54)"
          trend="-6 pts"
          trendTone="positive"
          subtitle="vs. prior quarter"
          tone="warning"
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Latest HbA1c"
          value={`${patient.vitals.hba1cPercent}%`}
          trend="Down from 7.6%"
          trendTone="positive"
          subtitle="Goal < 7.0%"
          tone="teal"
          icon={<HeartPulse className="h-4 w-4" />}
        />
        <StatCard
          label="Upcoming Visit"
          value={nextAppointment ? formatDate(nextAppointment.date) : 'None'}
          subtitle={
            nextAppointment
              ? `${nextAppointment.time} · ${nextAppointment.mode}`
              : 'All visits complete'
          }
          tone="primary"
          icon={<Calendar className="h-4 w-4" />}
        />
        <StatCard
          label="Follow-up Progress"
          value={`${patient.adherencePercent}%`}
          trend="1 due soon"
          trendTone="warning"
          subtitle={`${reports.length} reports on file`}
          tone="success"
          icon={<ClipboardCheck className="h-4 w-4" />}
        />
      </div>

      {/* Clear Next-Step Actions */}
      <Card className="border-[var(--cb-primary-border)] bg-[var(--cb-primary-soft)]/35">
        <CardHeader
          title="Recommended Next Steps"
          description="Actionable items coordinated with your care team to keep your treatment plan on track."
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Link
            to="/patient/follow-ups"
            className="flex items-start justify-between gap-3 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-4 transition-colors hover:border-[var(--cb-primary)]"
          >
            <div>
              <Badge variant="warning">Due Nov 22</Badge>
              <p className="mt-2 text-sm font-semibold text-[var(--cb-text)]">
                Complete 14-day BP &amp; glucose log
              </p>
              <p className="mt-1 text-xs text-[var(--cb-text-muted)]">
                Share home readings ahead of your clinic visit.
              </p>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--cb-primary)]" />
          </Link>

          <Link
            to="/patient/appointments"
            className="flex items-start justify-between gap-3 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-4 transition-colors hover:border-[var(--cb-primary)]"
          >
            <div>
              <Badge variant="primary">Nov 24 · 10:30 AM</Badge>
              <p className="mt-2 text-sm font-semibold text-[var(--cb-text)]">
                Attend Report Review consult
              </p>
              <p className="mt-1 text-xs text-[var(--cb-text-muted)]">
                Review HbA1c and LDL cholesterol plan with Dr. Kulkarni.
              </p>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--cb-primary)]" />
          </Link>

          <Link
            to="/patient/referrals"
            className="flex items-start justify-between gap-3 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-4 transition-colors hover:border-[var(--cb-primary)]"
          >
            <div>
              <Badge variant="teal">Dec 3 · Teleconsult</Badge>
              <p className="mt-2 text-sm font-semibold text-[var(--cb-text)]">
                Prepare for Endocrinology referral
              </p>
              <p className="mt-1 text-xs text-[var(--cb-text-muted)]">
                Scheduled specialist visit with Dr. Arvind Menon.
              </p>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--cb-primary)]" />
          </Link>
        </div>
      </Card>

      {/* Recent Reports & Upcoming Appointment */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader
            title="Recent Health Reports"
            description="Select any report to inspect biomarkers and clinician notes."
            action={
              <Link
                to="/patient/reports"
                className="text-xs font-semibold text-[var(--cb-primary)] hover:underline"
              >
                View all
              </Link>
            }
          />
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-[var(--cb-border)] p-4 transition-colors hover:bg-[var(--cb-surface-hover)] sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--cb-text)]">
                      {report.title}
                    </span>
                    <ReportStatusBadge status={report.reviewStatus} />
                  </div>
                  <p className="mt-1 text-xs text-[var(--cb-text-muted)] cb-tabular">
                    {formatDate(report.uploadedDate)} &middot;{' '}
                    {report.labFacility}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedReport(report)}
                >
                  Inspect
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader
            title="Upcoming Appointment"
            description="Your next confirmed consultation and preparation details."
            action={
              <Link
                to="/patient/appointments"
                className="text-xs font-semibold text-[var(--cb-primary)] hover:underline"
              >
                Manage
              </Link>
            }
          />
          {nextAppointment && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)]/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <AppointmentStatusBadge status={nextAppointment.status} />
                  <Badge variant="neutral">{nextAppointment.mode}</Badge>
                </div>
                <h3 className="mt-3 text-base font-semibold text-[var(--cb-text)]">
                  {nextAppointment.doctorName}
                </h3>
                <p className="text-xs text-[var(--cb-text-muted)]">
                  {nextAppointment.specialty} &middot; {nextAppointment.type}
                </p>

                <div className="mt-4 space-y-2 text-xs text-[var(--cb-text-secondary)] cb-tabular">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-[var(--cb-primary)]" />
                    <span>
                      {formatDate(nextAppointment.date)} at{' '}
                      {nextAppointment.time} ({nextAppointment.durationMinutes}{' '}
                      min)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-[var(--cb-primary)]" />
                    <span>{nextAppointment.facility}</span>
                  </div>
                </div>

                <p className="mt-3 border-t border-[var(--cb-border)] pt-3 text-xs leading-relaxed text-[var(--cb-text-muted)]">
                  {nextAppointment.notes}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-lg border border-[var(--cb-border)] p-3">
                  <span className="text-[var(--cb-text-muted)]">
                    Blood Pressure
                  </span>
                  <p className="mt-0.5 font-semibold text-[var(--cb-text)] cb-tabular">
                    {patient.vitals.bloodPressure}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--cb-border)] p-3">
                  <span className="text-[var(--cb-text-muted)]">
                    Fasting Glucose
                  </span>
                  <p className="mt-0.5 font-semibold text-[var(--cb-text)] cb-tabular">
                    {patient.vitals.fastingGlucoseMgDl} mg/dL
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Follow-up Status & Notifications */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-6">
          <CardHeader
            title="Follow-up Status"
            description="Ongoing care checklist coordinated with your clinicians."
            action={
              <Link
                to="/patient/follow-ups"
                className="text-xs font-semibold text-[var(--cb-primary)] hover:underline"
              >
                Open checklist
              </Link>
            }
          />
          <div className="space-y-3">
            {followUps.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-[var(--cb-border)] p-3.5"
              >
                <div className="flex items-start gap-2.5">
                  <CheckCircle2
                    aria-hidden="true"
                    className={
                      item.status === 'completed'
                        ? 'mt-0.5 h-4 w-4 shrink-0 text-[var(--cb-success)]'
                        : 'mt-0.5 h-4 w-4 shrink-0 text-[var(--cb-text-muted)]'
                    }
                  />
                  <div>
                    <p className="text-sm font-medium text-[var(--cb-text)]">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--cb-text-muted)] cb-tabular">
                      Due {formatDate(item.dueDate)} &middot; {item.channel}
                    </p>
                  </div>
                </div>
                <FollowUpStatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-6">
          <CardHeader
            title="Recent Notifications"
            description="Updates on your reports, visits, and care plan reminders."
            action={
              <Link
                to="/patient/notifications"
                className="text-xs font-semibold text-[var(--cb-primary)] hover:underline"
              >
                All alerts
              </Link>
            }
          />
          <div className="space-y-2.5">
            {notifications.map((item) => (
              <NotificationItem
                key={item.id}
                notification={item}
                onMarkRead={markNotificationRead}
                compact
              />
            ))}
          </div>
        </Card>
      </div>

      <ReportDetailModal
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
        viewerRole="patient"
      />
    </div>
  );
}
