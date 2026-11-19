import { useMemo, useState } from 'react';
import {
  DataTable,
  ReferralPriorityBadge,
  ReferralStatusBadge,
  type DataTableColumn,
} from '@/components/dashboard';
import { FilterControls } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { MOCK_REFERRALS } from '@/data';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { ReferralRecord } from '@/types/domain';
import { formatDate } from '@/utils/format';

export function AdminReferralsPage() {
  useDocumentTitle('Referral Management');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_REFERRALS.filter((ref) => {
      if (statusFilter !== 'all' && ref.status !== statusFilter) return false;
      if (!q) return true;
      return (
        ref.patientName.toLowerCase().includes(q) ||
        ref.toSpecialty.toLowerCase().includes(q) ||
        ref.toFacility.toLowerCase().includes(q) ||
        ref.id.toLowerCase().includes(q)
      );
    });
  }, [search, statusFilter]);

  const columns: DataTableColumn<ReferralRecord>[] = [
    {
      key: 'id',
      header: 'Referral & Patient',
      render: (row) => (
        <div>
          <p className="font-semibold text-[var(--cb-text)]">
            {row.patientName}
          </p>
          <p className="text-xs text-[var(--cb-text-muted)] cb-tabular">
            {row.id} &middot; Created {formatDate(row.createdDate)}
          </p>
        </div>
      ),
    },
    {
      key: 'pathway',
      header: 'Pathway',
      render: (row) => (
        <div className="text-xs">
          <p className="font-medium text-[var(--cb-text)]">
            {row.toSpecialty} &middot; {row.toDoctorName}
          </p>
          <p className="text-[var(--cb-text-muted)]">
            From {row.fromFacility} &rarr; {row.toFacility}
          </p>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => <ReferralPriorityBadge priority={row.priority} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <ReferralStatusBadge status={row.status} />,
    },
    {
      key: 'target',
      header: 'SLA Target',
      align: 'right',
      render: (row) => (
        <span className="whitespace-nowrap text-xs cb-tabular">
          {formatDate(row.targetDate)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Referral Management"
        subtitle="Track inter-facility specialist referrals, monitor urgent handoffs, and identify scheduling bottlenecks."
      />

      <FilterControls
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search referral ID, patient, specialty, or clinic..."
        filters={[
          {
            id: 'status',
            label: 'Filter by referral status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'all', label: 'All Statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'accepted', label: 'Accepted' },
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'completed', label: 'Completed' },
            ],
          },
        ]}
        hasActiveFilters={Boolean(search) || statusFilter !== 'all'}
        onReset={() => {
          setSearch('');
          setStatusFilter('all');
        }}
      />

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(row) => row.id}
        caption="Admin referral management table"
      />
    </div>
  );
}
