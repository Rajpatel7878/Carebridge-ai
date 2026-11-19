import { Activity, Building2, CheckCircle2, Globe2 } from 'lucide-react';
import { CategoryBarChart } from '@/components/charts';
import { Badge, Card, CardHeader } from '@/components/common';
import {
  DataTable,
  StatCard,
  type DataTableColumn,
} from '@/components/dashboard';
import { PageHeader } from '@/components/navigation';
import {
  MOCK_CONDITION_PREVALENCE,
  MOCK_DISTRICT_METRICS,
  POPULATION_KPI_SUMMARY,
} from '@/data';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { DistrictHealthMetric } from '@/types/domain';
import { formatNumber } from '@/utils/format';

export function AdminPopulationHealthPage() {
  useDocumentTitle('Population Health');
  const kpi = POPULATION_KPI_SUMMARY;

  const districtColumns: DataTableColumn<DistrictHealthMetric>[] = [
    {
      key: 'district',
      header: 'District',
      render: (row) => (
        <span className="font-semibold text-[var(--cb-text)]">
          {row.district}
        </span>
      ),
    },
    {
      key: 'facilities',
      header: 'Clinics',
      render: (row) => <span className="cb-tabular">{row.facilities}</span>,
    },
    {
      key: 'patients',
      header: 'Enrolled Cohort',
      render: (row) => (
        <span className="font-medium text-[var(--cb-text)] cb-tabular">
          {formatNumber(row.enrolledPatients)}
        </span>
      ),
    },
    {
      key: 'screening',
      header: 'Screening Coverage',
      render: (row) => (
        <Badge variant={row.screeningCoverage >= 82 ? 'success' : 'warning'}>
          {row.screeningCoverage.toFixed(1)}%
        </Badge>
      ),
    },
    {
      key: 'followup',
      header: 'Follow-up Closure',
      render: (row) => (
        <span className="cb-tabular">{row.followUpCompletion.toFixed(1)}%</span>
      ),
    },
    {
      key: 'highrisk',
      header: 'High-Risk Patients',
      align: 'right',
      render: (row) => (
        <span className="font-semibold text-[var(--cb-critical)] cb-tabular">
          {row.highRiskCount}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Population Health"
        subtitle="Evaluate regional screening reach, chronic disease burden, and care-closure equity across participating districts."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Screening Coverage"
          value={`${kpi.screeningCoverageRate}%`}
          trend="+6.2%"
          trendTone="positive"
          subtitle="vs. prior quarter"
          tone="primary"
          icon={<Globe2 className="h-4 w-4" />}
        />
        <StatCard
          label="Follow-up Closure"
          value={`${kpi.followUpClosureRate}%`}
          trend="Target >= 85%"
          trendTone="positive"
          tone="success"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatCard
          label="Participating Clinics"
          value={kpi.activeFacilities}
          subtitle="Across 6 districts"
          tone="teal"
          icon={<Building2 className="h-4 w-4" />}
        />
        <StatCard
          label="Median Referral SLA"
          value={`${kpi.medianReferralDays} days`}
          subtitle="Screening to consult"
          tone="warning"
          icon={<Activity className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardHeader
          title="Chronic Condition Prevalence Across Network"
          description="Fictional cohort counts tracked by primary screening category."
        />
        <CategoryBarChart
          data={MOCK_CONDITION_PREVALENCE.map((c) => ({ ...c }))}
          categoryKey="condition"
          heightClassName="h-72"
          series={[
            {
              dataKey: 'patients',
              label: 'Enrolled Patients',
              colorKey: 'primary',
            },
          ]}
        />
      </Card>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-[var(--cb-text)]">
          District Coverage &amp; Outcomes
        </h2>
        <DataTable
          columns={districtColumns}
          data={MOCK_DISTRICT_METRICS}
          rowKey={(row) => row.district}
          caption="District population health metrics"
        />
      </div>
    </div>
  );
}
