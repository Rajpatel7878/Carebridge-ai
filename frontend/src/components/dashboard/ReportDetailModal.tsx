import { Button, Modal, RiskBadge } from '@/components/common';
import type { MedicalReport } from '@/types/domain';
import { formatDate } from '@/utils/format';
import { BiomarkerFlagBadge, ReportStatusBadge } from './StatusPill';

export interface ReportDetailModalProps {
  report: MedicalReport | null;
  onClose: () => void;
  viewerRole: 'patient' | 'doctor';
  onMarkReviewed?: (report: MedicalReport) => void;
}

export function ReportDetailModal({
  report,
  onClose,
  viewerRole,
  onMarkReviewed,
}: ReportDetailModalProps) {
  if (!report) return null;

  return (
    <Modal
      open={Boolean(report)}
      onClose={onClose}
      title={report.title}
      description={`${report.id} · ${report.patientName} · ${report.labFacility} · ${formatDate(report.uploadedDate)}`}
      size="lg"
      footer={
        <>
          {viewerRole === 'doctor' &&
            report.reviewStatus !== 'reviewed' &&
            onMarkReviewed && (
              <Button
                variant="secondary"
                onClick={() => {
                  onMarkReviewed(report);
                  onClose();
                }}
              >
                Mark Reviewed (Demo)
              </Button>
            )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <ReportStatusBadge status={report.reviewStatus} />
          <RiskBadge level={report.riskFlag} />
          <span className="text-xs text-[var(--cb-text-muted)]">
            Reviewing Clinician: {report.doctorName}
          </span>
        </div>

        <div className="rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)]/65 p-4">
          <h3 className="text-xs font-semibold tracking-wider text-[var(--cb-text)] uppercase">
            Plain-Language Report Summary (Mock Preview)
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--cb-text-secondary)]">
            {report.plainLanguageSummary}
          </p>
        </div>

        <div>
          <h3 className="mb-2.5 text-xs font-semibold tracking-wider text-[var(--cb-text)] uppercase">
            Key Biomarkers
          </h3>
          <div className="overflow-x-auto rounded-xl border border-[var(--cb-border)]">
            <table className="w-full min-w-[440px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--cb-border)] bg-[var(--cb-surface-subtle)]/75 text-left text-xs font-semibold text-[var(--cb-text-muted)]">
                  <th className="px-3.5 py-2.5">Marker</th>
                  <th className="px-3.5 py-2.5">Observed</th>
                  <th className="px-3.5 py-2.5">Reference Range</th>
                  <th className="px-3.5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--cb-border)]">
                {report.biomarkers.map((marker) => (
                  <tr key={marker.name}>
                    <td className="px-3.5 py-2.5 font-medium text-[var(--cb-text)]">
                      {marker.name}
                    </td>
                    <td className="px-3.5 py-2.5 font-semibold text-[var(--cb-text)] cb-tabular">
                      {marker.value}
                    </td>
                    <td className="px-3.5 py-2.5 text-xs text-[var(--cb-text-muted)] cb-tabular">
                      {marker.referenceRange}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <BiomarkerFlagBadge flag={marker.flag} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--cb-border)] p-3.5">
            <h4 className="text-xs font-semibold text-[var(--cb-text)]">
              Clinician Note
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-[var(--cb-text-secondary)]">
              {report.clinicalNote}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--cb-primary-border)] bg-[var(--cb-primary-soft)]/45 p-3.5">
            <h4 className="text-xs font-semibold text-[var(--cb-text)]">
              Recommended Next Step
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-[var(--cb-text-secondary)]">
              {report.recommendedNextStep}
            </p>
          </div>
        </div>

        <p className="text-[11px] text-[var(--cb-text-muted)]">
          Fictional demonstration record. Assistive report analysis will be
          integrated in a later phase and never replaces qualified medical
          diagnosis.
        </p>
      </div>
    </Modal>
  );
}
