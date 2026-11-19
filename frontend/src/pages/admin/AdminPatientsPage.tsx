import { useMemo, useState } from 'react';
import { Button, Modal, RiskBadge } from '@/components/common';
import {
  CareStatusBadge,
  DataTable,
  type DataTableColumn,
} from '@/components/dashboard';
import { FilterControls } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { MOCK_PATIENTS } from '@/data';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { PatientRecord } from '@/types/domain';
import { formatDate } from '@/utils/format';

export function AdminPatientsPage() {
  useDocumentTitle('Patient Management');
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [selected, setSelected] = useState<PatientRecord | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_PATIENTS.filter((p) => {
      if (riskFilter !== 'all' && p.riskLevel !== riskFilter) return false;
      if (!q) return true;
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        p.assignedDoctorName.toLowerCase().includes(q)
      );
    });
  }, [search, riskFilter]);

  const columns: DataTableColumn<PatientRecord>[] = [
    {
      key: 'patient',
      header: 'Patient',
      render: (row) => (
        <div>
          <p className="font-semibold text-[var(--cb-text)]">{row.fullName}</p>
          <p className="text-xs text-[var(--cb-text-muted)] cb-tabular">
            {row.id} &middot; {row.age}y {row.gender}
          </p>
        </div>
      ),
    },
    {
      key: 'district',
      header: 'District & Facility',
      render: (row) => (
        <div>
          <p className="text-sm text-[var(--cb-text)]">{row.district}</p>
          <p className="text-xs text-[var(--cb-text-muted)]">{row.facility}</p>
        </div>
      ),
    },
    {
      key: 'doctor',
      header: 'Assigned Clinician',
      render: (row) => row.assignedDoctorName,
    },
    {
      key: 'risk',
      header: 'Risk Tier',
      render: (row) => <RiskBadge level={row.riskLevel} />,
    },
    {
      key: 'status',
      header: 'Care Status',
      render: (row) => <CareStatusBadge status={row.careStatus} />,
    },
    {
      key: 'action',
      header: 'Record',
      align: 'right',
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            setSelected(row);
          }}
        >
          Summary
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Management"
        subtitle="Audit patient enrollments, primary clinician assignments, and care-continuity status across clinics."
      />

      <FilterControls
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search patient, ID, district, or clinician..."
        filters={[
          {
            id: 'risk',
            label: 'Filter by risk level',
            value: riskFilter,
            onChange: setRiskFilter,
            options: [
              { value: 'all', label: 'All Risk Tiers' },
              { value: 'critical', label: 'Critical Risk' },
              { value: 'high', label: 'High Risk' },
              { value: 'moderate', label: 'Moderate Risk' },
              { value: 'low', label: 'Low Risk' },
            ],
          },
        ]}
        hasActiveFilters={Boolean(search) || riskFilter !== 'all'}
        onReset={() => {
          setSearch('');
          setRiskFilter('all');
        }}
        resultCountLabel={`Displaying ${filtered.length} of ${MOCK_PATIENTS.length} sample registry entries`}
      />

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(row) => row.id}
        onRowClick={setSelected}
        caption="Admin patient management registry"
      />

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.fullName} (${selected.id})` : 'Patient'}
        description={selected?.facility}
        footer={
          <Button variant="outline" onClick={() => setSelected(null)}>
            Close
          </Button>
        }
      >
        {selected && (
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--cb-border)] p-3.5">
              <dt className="text-xs text-[var(--cb-text-muted)]">
                Assigned Clinician
              </dt>
              <dd className="mt-0.5 font-semibold text-[var(--cb-text)]">
                {selected.assignedDoctorName}
              </dd>
            </div>
            <div className="rounded-xl border border-[var(--cb-border)] p-3.5">
              <dt className="text-xs text-[var(--cb-text-muted)]">
                Adherence Rate
              </dt>
              <dd className="mt-0.5 font-semibold text-[var(--cb-text)] cb-tabular">
                {selected.adherencePercent}%
              </dd>
            </div>
            <div className="rounded-xl border border-[var(--cb-border)] p-3.5">
              <dt className="text-xs text-[var(--cb-text-muted)]">
                Last Screened
              </dt>
              <dd className="mt-0.5 font-semibold text-[var(--cb-text)] cb-tabular">
                {formatDate(selected.lastScreeningDate)}
              </dd>
            </div>
            <div className="rounded-xl border border-[var(--cb-border)] p-3.5">
              <dt className="text-xs text-[var(--cb-text-muted)]">
                Next Follow-up
              </dt>
              <dd className="mt-0.5 font-semibold text-[var(--cb-text)] cb-tabular">
                {formatDate(selected.nextFollowUpDate)}
              </dd>
            </div>
          </dl>
        )}
      </Modal>
    </div>
  );
}
