import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  FileSearch,
  Users,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  RiskBadge,
} from '@/components/common';
import {
  ActivityFeed,
  AppointmentStatusBadge,
  CareStatusBadge,
  DataTable,
  StatCard,
  type DataTableColumn,
} from '@/components/dashboard';
import { PageHeader } from '@/components/navigation';
import {
  ACTIVE_DEMO_DOCTOR,
  MOCK_ACTIVITY_FEED,
  MOCK_APPOINTMENTS,
  MOCK_PATIENTS,
  MOCK_REPORTS,
} from '@/data';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { PatientRecord } from '@/types/domain';
import { formatDate } from '@/utils/format';

export function DoctorOverviewPage() {
  useDocumentTitle('Doctor Workspace');
  const navigate = useNavigate();
  const { user } = useAuth();
  const doctor = ACTIVE_DEMO_DOCTOR;
  const clinicianTitle = user?.full_name ?? doctor.fullName;

  const assignedPatients = MOCK_PATIENTS.filter(
    (p) => p.assignedDoctorId === doctor.id,
  );
  const attentionCount = MOCK_PATIENTS.filter(
    (p) => p.riskLevel === 'critical' || p.riskLevel === 'high',
  ).length;
  const upcomingAppointments = MOCK_APPOINTMENTS.filter(
    (a) => a.status === 'confirmed' || a.status === 'pending',
  ).slice(0, 4);
  const pendingReports = MOCK_REPORTS.filter(
    (r) => r.reviewStatus !== 'reviewed',
  );
  const recentActivity = MOCK_ACTIVITY_FEED.filter(
    (item) => item.roleScope === 'doctor',
  );

  const patientColumns: DataTableColumn<PatientRecord>[] = [
    {
      key: 'patient',
      header: 'Patient',
      render: (row) => (
        <div>
          <p className="font-semibold text-[var(--cb-text)]">{row.fullName}</p>
          <p className="text-xs text-[var(--cb-text-muted)] cb-tabular">
            {row.id} &middot; {row.age}y {row.gender[0]}
          </p>
        </div>
      ),
    },
    {
      key: 'condition',
      header: 'Primary Focus',
      render: (row) => (
        <span className="text-xs text-[var(--cb-text-secondary)]">
          {row.primaryConditions[0]}
        </span>
      ),
    },
    {
      key: 'risk',
      header: 'Risk Tier',
      render: (row) => <RiskBadge level={row.riskLevel} />,
    },
    {
      key: 'status',
      header: 'Care Status',
      render: (row) => <CareStatusBadge status={row.careStatus} />,
    },
    {
      key: 'next',
      header: 'Next Follow-up',
      render: (row) => (
        <span className="whitespace-nowrap text-xs cb-tabular">
          {formatDate(row.nextFollowUpDate)}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Chart',
      align: 'right',
      render: (row) => (
        <Link
          to={`/doctor/patients/${row.id}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--cb-primary)] hover:underline"
        >
          Open
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={clinicianTitle}
        subtitle={`${doctor.specialty} · ${doctor.facility}. Prioritized clinical panel and report review summary.`}
        badge={
          <Badge variant="success" dot>
            In Active Session (Demo)
          </Badge>
        }
        actions={
          <>
            <Link to="/doctor/reports">
              <Button variant="outline" size="sm">
                Review Reports ({pendingReports.length})
              </Button>
            </Link>
            <Link to="/doctor/risk-review">
              <Button size="sm">Open Risk Triage</Button>
            </Link>
          </>
        }
      />

      {/* Clinician KPI Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Assigned Patients"
          value={doctor.assignedPatientsCount}
          subtitle={`${assignedPatients.length} highlighted in demo list`}
          tone="primary"
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Requiring Attention"
          value={doctor.highRiskPatientsCount}
          trend={`${attentionCount} active alerts`}
          trendTone="critical"
          subtitle="High & critical priority"
          tone="critical"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="Upcoming Appointments"
          value={upcomingAppointments.length}
          subtitle="Next 14 days (demo schedule)"
          tone="teal"
          icon={<Calendar className="h-4 w-4" />}
        />
        <StatCard
          label="Pending Report Reviews"
          value={pendingReports.length}
          trend="2 action-required"
          trendTone="warning"
          subtitle="Awaiting clinician sign-off"
          tone="warning"
          icon={<FileSearch className="h-4 w-4" />}
        />
      </div>

      {/* Patient List with Status Indicators */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--cb-text)]">
              Assigned Patient Panel
            </h2>
            <p className="text-xs text-[var(--cb-text-muted)]">
              Select any patient row to inspect clinical vitals, reports, and
              care actions.
            </p>
          </div>
          <Link
            to="/doctor/patients"
            className="text-xs font-semibold text-[var(--cb-primary)] hover:underline"
          >
            All patients
          </Link>
        </div>

        <DataTable
          columns={patientColumns}
          data={assignedPatients}
          rowKey={(row) => row.id}
          onRowClick={(row) => navigate(`/doctor/patients/${row.id}`)}
          caption="Assigned patient panel"
        />
      </div>

      {/* Upcoming Appointments & Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader
            title="Upcoming Consultations"
            description="Confirmed and pending clinical appointments across care sites."
            action={
              <Link
                to="/doctor/appointments"
                className="text-xs font-semibold text-[var(--cb-primary)] hover:underline"
              >
                Full schedule
              </Link>
            }
          />
          <div className="space-y-3">
            {upcomingAppointments.map((apt) => (
              <div
                key={apt.id}
                className="flex flex-col justify-between gap-2 rounded-xl border border-[var(--cb-border)] p-3.5 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--cb-text)]">
                    {apt.patientName}{' '}
                    <span className="text-xs font-normal text-[var(--cb-text-muted)]">
                      &middot; {apt.type}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--cb-text-muted)] cb-tabular">
                    {formatDate(apt.date)} at {apt.time} &middot; {apt.mode}{' '}
                    &middot; {apt.facility}
                  </p>
                </div>
                <AppointmentStatusBadge status={apt.status} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader
            title="Recent Patient Activity"
            description="Latest screening uploads, referrals, and triage events."
          />
          <ActivityFeed events={recentActivity} />
        </Card>
      </div>
    </div>
  );
}
