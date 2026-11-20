import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { CategoryBarChart, TrendAreaChart } from '@/components/charts';
import {
  Button,
  Card,
  CardHeader,
  ErrorState,
  LoadingState,
} from '@/components/common';
import { PrioritySummary } from '@/components/dashboard/PrioritySummary';
import { StatCard } from '@/components/dashboard/StatCard';
import { PageHeader } from '@/components/navigation';
import { apiClient, extractApiErrorMessage } from '@/services/api';

type Distribution = { category: string; count: number }[];
type Analytics = {
  totals: Record<string, number>;
  timeline: { date: string; registrations: number; reports: number }[];
  appointments: Distribution;
  referrals: Distribution;
  follow_ups: Distribution;
  risk_assessments: Distribution;
};

export function LiveAnalytics({ overview = false }: { overview?: boolean }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient
      .get<Analytics>('/admin/analytics', { params: { days } })
      .then(({ data: result }) => {
        if (active) setData(result);
      })
      .catch((err: unknown) => {
        if (active)
          setError(extractApiErrorMessage(err, 'Could not load analytics.'));
      });
    return () => {
      active = false;
    };
  }, [days, retry]);

  async function download() {
    setExporting(true);
    try {
      const response = await apiClient.get<Blob>('/admin/analytics/export', {
        params: { days },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `carebridge-aggregate-${days}d.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Could not export analytics.'));
    } finally {
      setExporting(false);
    }
  }

  const cards: [string, string][] = [
    ['patients', 'Registered patients'],
    ['doctors', 'Doctors'],
    ['approved_doctors', 'Approved active doctors'],
    ['pending_verifications', 'Pending verification'],
    ['reports', 'Reports'],
    ['reports_awaiting_review', 'Reports awaiting review'],
    ['appointments', 'Appointments'],
    ['pending_appointments', 'Pending appointments'],
    ['referrals', 'Referrals'],
    ['pending_referrals', 'Pending referrals'],
    ['follow_ups', 'Follow-ups'],
    ['pending_follow_ups', 'Pending follow-ups'],
  ];
  const distributions: [keyof Analytics, string][] = [
    ['appointments', 'Appointments by status'],
    ['referrals', 'Referrals by status'],
    ['follow_ups', 'Follow-ups by status'],
    ['risk_assessments', 'Saved assessments by category'],
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        title={overview ? 'Population Health Command Center' : 'Analytics'}
        subtitle="Database-backed operational counts. Priority and assessment categories are not diagnoses."
      />
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="analytics-days" className="text-sm font-medium">
          Reporting period
        </label>
        <select
          id="analytics-days"
          value={days}
          onChange={(event) => {
            setData(null);
            setError('');
            setDays(Number(event.target.value));
          }}
          className="rounded-lg border border-[var(--cb-border)] bg-[var(--cb-surface)] px-3 py-2 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
        <Button
          variant="outline"
          size="sm"
          disabled={exporting}
          onClick={download}
        >
          Export aggregate CSV
        </Button>
      </div>
      {error && (
        <ErrorState
          message={error}
          onRetry={() => {
            setError('');
            setData(null);
            setRetry((n) => n + 1);
          }}
        />
      )}
      {!data && !error && <LoadingState label="Loading live analytics…" />}
      <PrioritySummary />
      {data && (
        <>
          <p className="text-sm text-[var(--cb-text-secondary)]">
            Summary cards are all-time totals. Charts show records created or
            assessed in the selected rolling UTC period; statuses are current.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(([key, label]) => (
              <StatCard
                key={key}
                label={label}
                value={data.totals[key] ?? 0}
                icon={<Activity className="h-4 w-4" />}
              />
            ))}
          </div>
          <Card>
            <CardHeader
              title="Registrations and report uploads"
              description="Daily counts in UTC. No screening activity is inferred from uploads."
            />
            <TrendAreaChart
              data={data.timeline}
              xKey="date"
              series={[
                {
                  dataKey: 'registrations',
                  label: 'Patient registrations',
                  colorKey: 'primary',
                },
                { dataKey: 'reports', label: 'Reports', colorKey: 'secondary' },
              ]}
            />
          </Card>
          <div className="grid gap-6 lg:grid-cols-2">
            {distributions.map(([key, title]) => {
              const rows = data[key] as Distribution;
              return (
                <Card key={key}>
                  <CardHeader
                    title={title}
                    description="Counts of records, not unique patients."
                  />
                  {rows.length ? (
                    <CategoryBarChart
                      data={rows}
                      categoryKey="category"
                      series={[
                        {
                          dataKey: 'count',
                          label: 'Records',
                          colorKey: 'primary',
                        },
                      ]}
                    />
                  ) : (
                    <p className="py-8 text-sm text-[var(--cb-text-secondary)]">
                      No records in this period.
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
