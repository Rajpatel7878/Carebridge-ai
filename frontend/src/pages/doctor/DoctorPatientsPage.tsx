import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { RiskBadge } from '@/components/common';
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

export function DoctorPatientsPage() {
  useDocumentTitle('My Patients');
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_PATIENTS.filter((p) => {
      if (riskFilter !== 'all' && p.riskLevel !== riskFilter) return false;
      if (statusFilter !== 'all' && p.careStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.primaryConditions.some((c) => c.toLowerCase().includes(q)) ||
        p.district.toLowerCase().includes(q)
      );
    });
  }, [search, riskFilter, statusFilter]);

  const columns: DataTableColumn<PatientRecord>[] = [
    {
      key: 'patient',
      header: 'Patient',
      render: (row) => (
        <div>
          <p className="font-semibold text-[var(--cb-text)]">{row.fullName}</p>
          <p className="text-xs text-[var(--cb-text-muted)] cb-tabular">
            {row.id} &middot; {row.age} yrs &middot; {row.gender} &middot;{' '}
            {row.district}
          </p>
        </div>
      ),
    },
    {
      key: 'conditions',
      header: 'Conditions',
      render: (row) => (
        <span className="text-xs text-[var(--cb-text-secondary)]">
          {row.primaryConditions.join(', ')}
        </span>
      ),
    },
    {
      key: 'vitals',
      header: 'BP / HbA1c',
      render: (row) => (
        <span className="whitespace-nowrap text-xs cb-tabular">
          {row.vitals.bloodPressure} &middot; {row.vitals.hba1cPercent}%
        </span>
      ),
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
      key: 'followup',
      header: 'Next Follow-up',
      render: (row) => (
        <span className="whitespace-nowrap text-xs cb-tabular">
          {formatDate(row.nextFollowUpDate)}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Details',
      align: 'right',
      render: (row) => (
        <Link
          to={`/doctor/patients/${row.id}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--cb-primary)] hover:underline"
        >
          View
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Patients"
        subtitle="Browse, search, and stratify patient records by clinical risk tier and follow-up status."
      />

      <FilterControls
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by patient name, ID, condition, or district..."
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
          {
            id: 'status',
            label: 'Filter by care status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'all', label: 'All Care Statuses' },
              { value: 'attention-needed', label: 'Needs Attention' },
              { value: 'follow-up-due', label: 'Follow-up Due' },
              { value: 'newly-screened', label: 'Newly Screened' },
              { value: 'stable', label: 'Stable' },
            ],
          },
        ]}
        hasActiveFilters={
          Boolean(search) || riskFilter !== 'all' || statusFilter !== 'all'
        }
        onReset={() => {
          setSearch('');
          setRiskFilter('all');
          setStatusFilter('all');
        }}
        resultCountLabel={`Showing ${filtered.length} of ${MOCK_PATIENTS.length} fictional patient charts`}
      />

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/doctor/patients/${row.id}`)}
        caption="Doctor patient list"
      />
    </div>
  );
}
