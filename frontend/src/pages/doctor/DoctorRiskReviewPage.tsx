import { ArrowRight, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card, RiskBadge } from '@/components/common';
import { CareStatusBadge } from '@/components/dashboard';
import { PageHeader } from '@/components/navigation';
import { MOCK_PATIENTS } from '@/data';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatDate } from '@/utils/format';

export function DoctorRiskReviewPage() {
  useDocumentTitle('Risk Review');
  const { showToast } = useDemo();

  const prioritized = [...MOCK_PATIENTS]
    .filter((p) => p.riskLevel !== 'low')
    .sort((a, b) => b.riskScore - a.riskScore);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Review"
        subtitle="Explainable priority queue surfacing patients with critical, high, and moderate screening risk indicators."
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-4 text-xs text-[var(--cb-text-secondary)]">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cb-primary)]" />
        <span>
          Triage scores shown below are static fictional mock values for Phase 2
          UI review. Algorithmic risk scoring and clinical rule validation will
          connect in a later phase.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {prioritized.map((patient) => (
          <Card key={patient.id}>
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <RiskBadge level={patient.riskLevel} />
                  <CareStatusBadge status={patient.careStatus} />
                  <span className="text-xs font-semibold text-[var(--cb-text-muted)] cb-tabular">
                    Score {patient.riskScore}/100
                  </span>
                </div>
                <h2 className="text-base font-bold text-[var(--cb-text)]">
                  {patient.fullName}{' '}
                  <span className="text-xs font-normal text-[var(--cb-text-muted)] cb-tabular">
                    ({patient.id} &middot; {patient.age}y {patient.gender})
                  </span>
                </h2>
                <p className="text-xs text-[var(--cb-text-secondary)]">
                  Conditions: {patient.primaryConditions.join(' · ')}
                </p>
                <p className="text-xs text-[var(--cb-text-muted)] cb-tabular">
                  BP {patient.vitals.bloodPressure} &middot; HbA1c{' '}
                  {patient.vitals.hba1cPercent}% &middot; SpO2{' '}
                  {patient.vitals.spo2Percent}% &middot; Follow-up due{' '}
                  {formatDate(patient.nextFollowUpDate)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    showToast(
                      `Acknowledged triage alert for ${patient.fullName} (Demo)`,
                    )
                  }
                >
                  Acknowledge
                </Button>
                <Link to={`/doctor/patients/${patient.id}`}>
                  <Button
                    size="sm"
                    rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                  >
                    Open Chart
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
