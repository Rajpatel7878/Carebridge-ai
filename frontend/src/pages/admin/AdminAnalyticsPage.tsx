import { Download } from 'lucide-react';
import { CategoryBarChart, TrendAreaChart } from '@/components/charts';
import { Button, Card, CardHeader } from '@/components/common';
import { PageHeader } from '@/components/navigation';
import { MOCK_DISTRICT_METRICS, MOCK_MONTHLY_TRENDS } from '@/data';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function AdminAnalyticsPage() {
  useDocumentTitle('Analytics');
  const { showToast } = useDemo();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Longitudinal throughput metrics across screenings, specialist referrals, and district care completion (fictional dataset)."
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() =>
              showToast(
                'Analytics export preview',
                'Live database reporting exports will connect in a later phase.',
                'info',
              )
            }
          >
            Export Summary (Demo)
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Screening & Follow-up Velocity"
            description="Six-month comparison of completed screenings and closed follow-ups."
          />
          <TrendAreaChart
            data={MOCK_MONTHLY_TRENDS.map((m) => ({ ...m }))}
            xKey="month"
            heightClassName="h-72"
            series={[
              {
                dataKey: 'screenings',
                label: 'Screenings',
                colorKey: 'primary',
              },
              {
                dataKey: 'followUpsCompleted',
                label: 'Follow-ups Completed',
                colorKey: 'success',
              },
            ]}
          />
        </Card>

        <Card>
          <CardHeader
            title="District Screening vs. Follow-up (%)"
            description="Coverage and care-loop closure percentages by district."
          />
          <CategoryBarChart
            data={MOCK_DISTRICT_METRICS.map((d) => ({ ...d }))}
            categoryKey="district"
            heightClassName="h-72"
            series={[
              {
                dataKey: 'screeningCoverage',
                label: 'Screening %',
                colorKey: 'primary',
              },
              {
                dataKey: 'followUpCompletion',
                label: 'Follow-up %',
                colorKey: 'secondary',
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
