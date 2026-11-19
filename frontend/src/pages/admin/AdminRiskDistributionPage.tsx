import { RiskDistributionChart, TrendAreaChart } from '@/components/charts';
import { Card, CardHeader } from '@/components/common';
import { PageHeader } from '@/components/navigation';
import {
  MOCK_CONDITION_PREVALENCE,
  MOCK_MONTHLY_TRENDS,
  MOCK_RISK_DISTRIBUTION,
} from '@/data';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function AdminRiskDistributionPage() {
  useDocumentTitle('Risk Distribution');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Distribution"
        subtitle="Analyze cohort risk tier composition, escalation guidelines, and monthly high-risk screening trends."
      />

      <Card>
        <CardHeader
          title="Network Risk Stratification Breakdown"
          description="Fictional distribution across all 4,820 enrolled population health participants."
        />
        <RiskDistributionChart data={MOCK_RISK_DISTRIBUTION} showDescriptions />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader
            title="High-Risk Identifications per Month"
            description="Newly identified high and critical risk cases from outreach screenings."
          />
          <TrendAreaChart
            data={MOCK_MONTHLY_TRENDS.map((item) => ({ ...item }))}
            xKey="month"
            series={[
              {
                dataKey: 'highRiskIdentified',
                label: 'High-Risk Identified',
                colorKey: 'critical',
              },
              {
                dataKey: 'referralsClosed',
                label: 'Specialist Referrals Closed',
                colorKey: 'secondary',
              },
            ]}
          />
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader
            title="Condition Control Benchmarks"
            description="Percentage of enrolled patients meeting target clinical control."
          />
          <div className="space-y-3.5">
            {MOCK_CONDITION_PREVALENCE.map((item) => (
              <div key={item.condition}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--cb-text)]">
                    {item.condition}
                  </span>
                  <span className="font-semibold text-[var(--cb-text-secondary)] cb-tabular">
                    {item.controlledRate}% controlled
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--cb-surface-subtle)]">
                  <div
                    className="h-full rounded-full bg-[var(--cb-primary)]"
                    style={{ width: `${item.controlledRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
