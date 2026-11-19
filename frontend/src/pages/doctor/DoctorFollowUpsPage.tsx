import { useMemo, useState } from 'react';
import { Button, ConfirmDialog, RiskBadge } from '@/components/common';
import {
  DataTable,
  FollowUpStatusBadge,
  type DataTableColumn,
} from '@/components/dashboard';
import { FilterControls } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { MOCK_FOLLOW_UPS } from '@/data';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { FollowUpRecord } from '@/types/domain';
import { formatDate } from '@/utils/format';

export function DoctorFollowUpsPage() {
  useDocumentTitle('Clinical Follow-ups');
  const { showToast } = useDemo();
  const [items, setItems] = useState<FollowUpRecord[]>(MOCK_FOLLOW_UPS);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<FollowUpRecord | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((f) => {
      if (status !== 'all' && f.status !== status) return false;
      if (!q) return true;
      return (
        f.patientName.toLowerCase().includes(q) ||
        f.title.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
      );
    });
  }, [items, search, status]);

  const columns: DataTableColumn<FollowUpRecord>[] = [
    {
      key: 'patient',
      header: 'Patient & Follow-up Task',
      render: (row) => (
        <div>
          <p className="font-semibold text-[var(--cb-text)]">
            {row.patientName}
          </p>
          <p className="text-xs text-[var(--cb-text-muted)]">
            {row.title} &middot; {row.channel}
          </p>
        </div>
      ),
    },
    {
      key: 'due',
      header: 'Due Date',
      render: (row) => (
        <span className="whitespace-nowrap text-xs cb-tabular">
          {formatDate(row.dueDate)}
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
      header: 'Status',
      render: (row) => <FollowUpStatusBadge status={row.status} />,
    },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: (row) =>
        row.status !== 'completed' ? (
          <Button size="sm" variant="outline" onClick={() => setSelected(row)}>
            Close Loop
          </Button>
        ) : (
          <span className="text-xs text-[var(--cb-success)]">Closed</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-ups"
        subtitle="Track overdue, due-soon, and active follow-up actions to prevent post-screening care drop-offs."
      />

      <FilterControls
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search patient, task, or category..."
        filters={[
          {
            id: 'status',
            label: 'Filter by follow-up status',
            value: status,
            onChange: setStatus,
            options: [
              { value: 'all', label: 'All Statuses' },
              { value: 'overdue', label: 'Overdue' },
              { value: 'due-soon', label: 'Due Soon' },
              { value: 'on-track', label: 'On Track' },
              { value: 'completed', label: 'Completed' },
            ],
          },
        ]}
        hasActiveFilters={Boolean(search) || status !== 'all'}
        onReset={() => {
          setSearch('');
          setStatus('all');
        }}
      />

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(row) => row.id}
        caption="Clinician follow-up monitoring table"
      />

      <ConfirmDialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Verify follow-up completion?"
        description={
          selected
            ? `Record "${selected.title}" for ${selected.patientName} as completed in this local UI preview?`
            : ''
        }
        confirmLabel="Confirm Completion"
        onConfirm={() => {
          if (!selected) return;
          setItems((prev) =>
            prev.map((item) =>
              item.id === selected.id ? { ...item, status: 'completed' } : item,
            ),
          );
          showToast(`Follow-up ${selected.id} marked completed (Demo)`);
          setSelected(null);
        }}
      />
    </div>
  );
}
