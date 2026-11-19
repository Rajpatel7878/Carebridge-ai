import { useState } from 'react';
import { ArrowRight, Building2 } from 'lucide-react';
import { Button, Card, Modal } from '@/components/common';
import {
  ReferralPriorityBadge,
  ReferralStatusBadge,
} from '@/components/dashboard';
import { PageHeader } from '@/components/navigation';
import { ACTIVE_DEMO_PATIENT, MOCK_REFERRALS } from '@/data';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { ReferralRecord } from '@/types/domain';
import { formatDate } from '@/utils/format';

export function PatientReferralsPage() {
  useDocumentTitle('My Referrals');
  const [selected, setSelected] = useState<ReferralRecord | null>(null);

  const referrals = MOCK_REFERRALS.filter(
    (item) => item.patientId === ACTIVE_DEMO_PATIENT.id,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Referrals"
        subtitle="Track specialist referrals initiated by your primary care clinician and see what to expect next."
      />

      <div className="grid grid-cols-1 gap-4">
        {referrals.map((referral) => (
          <Card key={referral.id}>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--cb-text-muted)] cb-tabular">
                    {referral.id}
                  </span>
                  <ReferralStatusBadge status={referral.status} />
                  <ReferralPriorityBadge priority={referral.priority} />
                </div>
                <h2 className="text-base font-semibold text-[var(--cb-text)]">
                  {referral.toSpecialty} — {referral.reason}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--cb-text-secondary)]">
                  <span>{referral.fromDoctorName}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[var(--cb-text-muted)]" />
                  <span className="font-semibold text-[var(--cb-text)]">
                    {referral.toDoctorName}
                  </span>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-[var(--cb-text-muted)] cb-tabular">
                  <Building2 className="h-3.5 w-3.5" />
                  {referral.toFacility} &middot; Target date{' '}
                  {formatDate(referral.targetDate)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelected(referral)}
              >
                View Summary
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Referral ${selected.id}` : 'Referral Details'}
        description={selected?.reason}
        footer={
          <Button variant="outline" onClick={() => setSelected(null)}>
            Close
          </Button>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <ReferralStatusBadge status={selected.status} />
              <ReferralPriorityBadge priority={selected.priority} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--cb-border)] p-3.5">
                <p className="text-xs text-[var(--cb-text-muted)]">
                  Referred By
                </p>
                <p className="mt-0.5 font-semibold text-[var(--cb-text)]">
                  {selected.fromDoctorName}
                </p>
                <p className="text-xs text-[var(--cb-text-muted)]">
                  {selected.fromFacility}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--cb-border)] p-3.5">
                <p className="text-xs text-[var(--cb-text-muted)]">
                  Receiving Specialist
                </p>
                <p className="mt-0.5 font-semibold text-[var(--cb-text)]">
                  {selected.toDoctorName}
                </p>
                <p className="text-xs text-[var(--cb-text-muted)]">
                  {selected.toSpecialty} &middot; {selected.toFacility}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)]/60 p-4">
              <p className="text-xs font-semibold text-[var(--cb-text)]">
                Clinical Handoff Note (Demo)
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--cb-text-secondary)]">
                {selected.clinicalSummary}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
