import { useState } from 'react';
import { ArrowLeft, GitBranch } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  RiskBadge,
} from '@/components/common';
import {
  CareStatusBadge,
  FollowUpStatusBadge,
  ReferralStatusBadge,
  ReportDetailModal,
  ReportStatusBadge,
} from '@/components/dashboard';
import { Select } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import {
  MOCK_FOLLOW_UPS,
  MOCK_PATIENTS,
  MOCK_REFERRALS,
  MOCK_REPORTS,
} from '@/data';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { MedicalReport } from '@/types/domain';
import { formatDate, getInitials } from '@/utils/format';

export function DoctorPatientDetailsPage() {
  const { patientId } = useParams<{ patientId?: string }>();
  const navigate = useNavigate();
  const { showToast } = useDemo();
  const [selectedReport, setSelectedReport] = useState<MedicalReport | null>(
    null,
  );

  const patient = patientId
    ? MOCK_PATIENTS.find((p) => p.id === patientId)
    : MOCK_PATIENTS[1]; // Default highlight: Harpreet Gill (PT-1043)

  useDocumentTitle(patient ? `${patient.fullName} — Chart` : 'Patient Details');

  if (!patient) {
    return (
      <EmptyState
        title="Patient chart not found"
        description={`No fictional patient record matches ID "${patientId}".`}
        action={
          <Link to="/doctor/patients">
            <Button variant="outline">Back to My Patients</Button>
          </Link>
        }
      />
    );
  }

  const patientReports = MOCK_REPORTS.filter((r) => r.patientId === patient.id);
  const patientReferrals = MOCK_REFERRALS.filter(
    (r) => r.patientId === patient.id,
  );
  const patientFollowUps = MOCK_FOLLOW_UPS.filter(
    (f) => f.patientId === patient.id,
  );

  const vitalItems = [
    { label: 'Blood Pressure', value: patient.vitals.bloodPressure },
    { label: 'Heart Rate', value: `${patient.vitals.heartRateBpm} bpm` },
    { label: 'HbA1c', value: `${patient.vitals.hba1cPercent}%` },
    {
      label: 'Fasting Glucose',
      value: `${patient.vitals.fastingGlucoseMgDl} mg/dL`,
    },
    { label: 'BMI', value: `${patient.vitals.bmi} kg/m²` },
    { label: 'SpO2', value: `${patient.vitals.spo2Percent}%` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/doctor/patients"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--cb-text-secondary)] hover:text-[var(--cb-text)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to My Patients
        </Link>

        <Select
          aria-label="Switch patient chart"
          value={patient.id}
          onChange={(e) => navigate(`/doctor/patients/${e.target.value}`)}
          containerClassName="w-full sm:w-64"
          options={MOCK_PATIENTS.map((item) => ({
            value: item.id,
            label: `${item.fullName} (${item.id})`,
          }))}
        />
      </div>

      <PageHeader
        title={patient.fullName}
        subtitle={`${patient.id} · ${patient.age} yrs · ${patient.gender} · Blood ${patient.bloodGroup} · ${patient.facility}`}
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <RiskBadge level={patient.riskLevel} />
            <CareStatusBadge status={patient.careStatus} />
          </div>
        }
        actions={
          <Button
            size="sm"
            leftIcon={<GitBranch className="h-4 w-4" />}
            onClick={() => navigate('/doctor/referrals')}
          >
            Manage Referrals
          </Button>
        }
      />

      {/* Clinical Vitals Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {vitalItems.map((vital) => (
          <div
            key={vital.label}
            className="rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-3.5"
          >
            <p className="text-[11px] font-medium text-[var(--cb-text-muted)]">
              {vital.label}
            </p>
            <p className="mt-1 text-base font-bold text-[var(--cb-text)] cb-tabular">
              {vital.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--cb-primary-soft)] text-sm font-bold text-[var(--cb-primary)]">
              {getInitials(patient.fullName)}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--cb-text)]">
                Risk Score: {patient.riskScore}/100
              </p>
              <p className="text-xs text-[var(--cb-text-muted)] cb-tabular">
                Care Adherence: {patient.adherencePercent}% &middot; Screened{' '}
                {formatDate(patient.lastScreeningDate)}
              </p>
            </div>
          </div>

          <dl className="mt-5 space-y-3 border-t border-[var(--cb-border)] pt-4 text-xs sm:text-sm">
            <div>
              <dt className="text-xs text-[var(--cb-text-muted)]">
                Clinical Conditions
              </dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {patient.primaryConditions.map((cond) => (
                  <Badge key={cond} variant="primary">
                    {cond}
                  </Badge>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--cb-text-muted)]">Allergies</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {patient.allergies.map((allergy) => (
                  <Badge
                    key={allergy}
                    variant={
                      allergy === 'None reported' ? 'neutral' : 'critical'
                    }
                  >
                    {allergy}
                  </Badge>
                ))}
              </dd>
            </div>
            <div className="flex justify-between gap-2 pt-1">
              <dt className="text-[var(--cb-text-muted)]">Assigned Doctor</dt>
              <dd className="font-medium text-[var(--cb-text)]">
                {patient.assignedDoctorName}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--cb-text-muted)]">Phone (Fictional)</dt>
              <dd className="font-medium text-[var(--cb-text)] cb-tabular">
                {patient.phone}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--cb-text-muted)]">Next Follow-up</dt>
              <dd className="font-medium text-[var(--cb-text)] cb-tabular">
                {formatDate(patient.nextFollowUpDate)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader
            title="Diagnostic & Screening Reports"
            description="Linked laboratory and screening reports for this patient."
          />
          {patientReports.length === 0 ? (
            <p className="text-sm text-[var(--cb-text-muted)]">
              No screening reports attached to this fictional patient in the
              sample subset.
            </p>
          ) : (
            <div className="space-y-3">
              {patientReports.map((report) => (
                <div
                  key={report.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-[var(--cb-border)] p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--cb-text)]">
                        {report.title}
                      </span>
                      <ReportStatusBadge status={report.reviewStatus} />
                    </div>
                    <p className="mt-1 text-xs text-[var(--cb-text-muted)] cb-tabular">
                      {report.id} &middot; {formatDate(report.uploadedDate)}{' '}
                      &middot; {report.labFacility}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedReport(report)}
                  >
                    Examine
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-[var(--cb-border)] pt-5 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold tracking-wider text-[var(--cb-text-muted)] uppercase">
                Active Referrals ({patientReferrals.length})
              </h3>
              <div className="mt-2.5 space-y-2">
                {patientReferrals.length === 0 ? (
                  <p className="text-xs text-[var(--cb-text-muted)]">
                    No specialist referrals recorded.
                  </p>
                ) : (
                  patientReferrals.map((ref) => (
                    <div
                      key={ref.id}
                      className="rounded-lg border border-[var(--cb-border)] p-3 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[var(--cb-text)]">
                          {ref.toSpecialty}
                        </span>
                        <ReferralStatusBadge status={ref.status} />
                      </div>
                      <p className="mt-1 text-[var(--cb-text-muted)]">
                        {ref.toDoctorName} &middot; {formatDate(ref.targetDate)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold tracking-wider text-[var(--cb-text-muted)] uppercase">
                Follow-up Tasks ({patientFollowUps.length})
              </h3>
              <div className="mt-2.5 space-y-2">
                {patientFollowUps.length === 0 ? (
                  <p className="text-xs text-[var(--cb-text-muted)]">
                    No active follow-up items recorded.
                  </p>
                ) : (
                  patientFollowUps.map((fup) => (
                    <div
                      key={fup.id}
                      className="rounded-lg border border-[var(--cb-border)] p-3 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[var(--cb-text)]">
                          {fup.category}
                        </span>
                        <FollowUpStatusBadge status={fup.status} />
                      </div>
                      <p className="mt-1 text-[var(--cb-text-muted)] cb-tabular">
                        Due {formatDate(fup.dueDate)} &middot; {fup.channel}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <ReportDetailModal
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
        viewerRole="doctor"
        onMarkReviewed={(report) =>
          showToast(`Marked ${report.id} reviewed (Demo preview)`)
        }
      />
    </div>
  );
}
