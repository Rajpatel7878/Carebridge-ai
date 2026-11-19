import {
  AlertTriangle,
  Building2,
  Calendar,
  GitBranch,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  CategoryBarChart,
  RiskDistributionChart,
  TrendAreaChart,
} from '@/components/charts';
import { Button, Card, CardHeader } from '@/components/common';
import { ActivityFeed, StatCard } from '@/components/dashboard';
import { PageHeader } from '@/components/navigation';
import {
  MOCK_ACTIVITY_FEED,
  MOCK_APPOINTMENT_BREAKDOWN,
  MOCK_MONTHLY_TRENDS,
  MOCK_RISK_DISTRIBUTION,
  POPULATION_KPI_SUMMARY,
} from '@/data';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatNumber } from '@/utils/format';

export function AdminOverviewPage() {
  useDocumentTitle('Administrator Overview');
  const kpi = POPULATION_KPI_SUMMARY;
  const adminActivity = MOCK_ACTIVITY_FEED.filter(
    (item) => item.roleScope === 'admin',
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Population Health Command Center"
        subtitle="Network-wide screening coverage, risk stratification, referral operations, and follow-up closure across 18 fictional partner clinics."
        actions={
          <>
            <Link to="/admin/population-health">
              <Button variant="outline" size="sm">
                District Coverage
              </Button>
            </Link>
            <Link to="/admin/analytics">
              <Button size="sm">View Analytics</Button>
            </Link>
          </>
        }
      />

      {/* Core Network KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Patients"
          value={formatNumber(kpi.totalPatients)}
          trend={kpi.totalPatientsDelta}
          trendTone="positive"
          tone="primary"
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Total Doctors"
          value={kpi.totalDoctors}
          subtitle={`${kpi.activeFacilities} partner facilities`}
          tone="teal"
          icon={<Building2 className="h-4 w-4" />}
        />
        <StatCard
          label="High & Critical Risk"
          value={formatNumber(kpi.highRiskPatients)}
          trend={`${kpi.highRiskSharePercent}% of cohort`}
          trendTone="critical"
          tone="critical"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="Pending Referrals"
          value={kpi.pendingReferrals}
          trend={`${kpi.urgentReferrals} urgent`}
          trendTone="warning"
          subtitle={`Median ${kpi.medianReferralDays}d`}
          tone="warning"
          icon={<GitBranch className="h-4 w-4" />}
        />
      </div>

      {/* Risk Distribution & Population Health Overview */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-6">
          <CardHeader
            title="Risk Distribution"
            description="Cohort breakdown across clinical risk stratification tiers (mock data)."
            action={
              <Link
                to="/admin/risk-distribution"
                className="text-xs font-semibold text-[var(--cb-primary)] hover:underline"
              >
                Details
              </Link>
            }
          />
          <RiskDistributionChart data={MOCK_RISK_DISTRIBUTION} />
        </Card>

        <Card className="xl:col-span-6">
          <CardHeader
            title="Population Health Overview"
            description="Monthly preventive screenings compared with verified follow-up completions."
            action={
              <Link
                to="/admin/population-health"
                className="text-xs font-semibold text-[var(--cb-primary)] hover:underline"
              >
                Explore
              </Link>
            }
          />
          <TrendAreaChart
            data={MOCK_MONTHLY_TRENDS.map((m) => ({ ...m }))}
            xKey="month"
            series={[
              {
                dataKey: 'screenings',
                label: 'Screenings',
                colorKey: 'primary',
              },
              {
                dataKey: 'followUpsCompleted',
                label: 'Follow-ups Closed',
                colorKey: 'secondary',
              },
            ]}
          />
        </Card>
      </div>

      {/* Appointment Statistics & Recent Platform Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader
            title="Appointment Statistics"
            description={`${formatNumber(kpi.monthlyAppointments)} monthly appointments · ${kpi.appointmentCompletionRate}% completion rate (demo).`}
            action={
              <Link
                to="/admin/appointments"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--cb-primary)] hover:underline"
              >
                <Calendar className="h-3.5 w-3.5" />
                Manage
              </Link>
            }
          />
          <CategoryBarChart
            data={MOCK_APPOINTMENT_BREAKDOWN}
            categoryKey="category"
            series={[
              {
                dataKey: 'count',
                label: 'Appointments',
                colorKey: 'primary',
              },
            ]}
          />
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader
            title="Recent Platform Activity"
            description="Operational events across regional screening clinics."
          />
          <ActivityFeed events={adminActivity} />
        </Card>
      </div>
    </div>
  );
}
