import { ShieldAlert } from 'lucide-react';
import { TrendAreaChart } from '@/components/charts';
import { Badge, Card, CardHeader, RiskBadge } from '@/components/common';
import { PageHeader } from '@/components/navigation';
import {
  ACTIVE_DEMO_PATIENT,
  MOCK_PATIENT_HBA1C_HISTORY,
  MOCK_PATIENT_RISK_FACTORS,
} from '@/data';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const statusBadgeMap = {
  optimal: { label: 'Within Target', variant: 'success' as const },
  watch: { label: 'Monitor Closely', variant: 'warning' as const },
  elevated: { label: 'Above Target', variant: 'critical' as const },
};

export function PatientRiskPage() {
  useDocumentTitle('Risk Overview');
  const patient = ACTIVE_DEMO_PATIENT;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Overview"
        subtitle="Understand the health indicators shaping your care priority level and track progress over time."
        badge={<RiskBadge level={patient.riskLevel} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader
            title="Current Priority Summary"
            description="Illustrative risk profile derived from fictional screening data."
          />
          <div className="rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)]/65 p-5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold tracking-wider text-[var(--cb-text-muted)] uppercase">
                Composite Index
              </span>
              <RiskBadge level={patient.riskLevel} />
            </div>
            <p className="mt-2 text-4xl font-bold text-[var(--cb-text)] cb-tabular">
              {patient.riskScore}
              <span className="text-base font-medium text-[var(--cb-text-muted)]">
                {' '}
                / 100
              </span>
            </p>
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[var(--cb-border)]">
              <div
                className="h-full rounded-full bg-[var(--cb-warning)]"
                style={{ width: `${patient.riskScore}%` }}
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--cb-text-secondary)]">
              Your profile sits in the <strong>Moderate</strong> tier due to
              mildly elevated HbA1c (7.2%) and LDL cholesterol (136 mg/dL).
              Kidney health, retinal screening, and visit adherence remain
              strong.
            </p>
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[var(--cb-border)] p-3.5 text-xs text-[var(--cb-text-muted)]">
            <ShieldAlert
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cb-primary)]"
            />
            <span>
              Mock risk visualization for Phase 2 UI only. Risk indicators are
              educational and reviewed with a licensed physician — never a
              standalone medical diagnosis.
            </span>
          </div>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader
            title="Systolic Blood Pressure Trend (mmHg)"
            description="Steady improvement across the last four quarterly check-ins (demo data)."
          />
          <TrendAreaChart
            data={MOCK_PATIENT_HBA1C_HISTORY}
            xKey="month"
            series={[
              {
                dataKey: 'systolicBp',
                label: 'Systolic BP (mmHg)',
                colorKey: 'primary',
              },
            ]}
          />
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Contributing Health Indicators"
          description="Each indicator compares your most recent screening measurement with your care team's target range."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {MOCK_PATIENT_RISK_FACTORS.map((item) => {
            const meta = statusBadgeMap[item.status];
            return (
              <div
                key={item.factor}
                className="rounded-xl border border-[var(--cb-border)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[var(--cb-text)]">
                    {item.factor}
                  </h3>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>
                <div className="mt-2.5 flex items-center gap-4 text-xs cb-tabular">
                  <span className="font-semibold text-[var(--cb-text)]">
                    Observed: {item.reading}
                  </span>
                  <span className="text-[var(--cb-text-muted)]">
                    Target: {item.target}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[var(--cb-text-muted)]">
                  {item.explanation}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
