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

export function AdminFollowUpsPage() {
  useDocumentTitle('Follow-up Monitoring');
  const { showToast } = useDemo();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [escalateTarget, setEscalateTarget] = useState<FollowUpRecord | null>(
    null,
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_FOLLOW_UPS.filter((item) => {
      if (status !== 'all' && item.status !== status) return false;
      if (!q) return true;
      return (
        item.patientName.toLowerCase().includes(q) ||
        item.doctorName.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q)
      );
    });
  }, [search, status]);

  const columns: DataTableColumn<FollowUpRecord>[] = [
    {
      key: 'task',
      header: 'Patient & Follow-up',
      render: (row) => (
        <div>
          <p className="font-semibold text-[var(--cb-text)]">
            {row.patientName}
          </p>
          <p className="text-xs text-[var(--cb-text-muted)]">
            {row.id} &middot; {row.title}
          </p>
        </div>
      ),
    },
    {
      key: 'clinician',
      header: 'Owner & Channel',
      render: (row) => (
        <div className="text-xs">
          <p className="font-medium text-[var(--cb-text)]">{row.doctorName}</p>
          <p className="text-[var(--cb-text-muted)]">{row.channel}</p>
        </div>
      ),
    },
    {
      key: 'due',
      header: 'Target Date',
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
      header: 'Outreach',
      align: 'right',
      render: (row) =>
        row.status === 'overdue' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEscalateTarget(row)}
          >
            Escalate
          </Button>
        ) : (
          <span className="text-xs text-[var(--cb-text-muted)]">Monitored</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-up Monitoring"
        subtitle="Track post-screening adherence SLAs and flag overdue high-risk follow-ups for care coordinator outreach."
      />

      <FilterControls
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search patient, clinician, or follow-up item..."
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
        caption="Admin follow-up SLA monitoring"
      />

      <ConfirmDialog
        open={Boolean(escalateTarget)}
        onClose={() => setEscalateTarget(null)}
        title="Flag follow-up for priority outreach?"
        description={
          escalateTarget
            ? `Queue a mock outreach escalation note for ${escalateTarget.patientName} (${escalateTarget.id})? No live message or notification is sent in Phase 2.`
            : ''
        }
        confirmLabel="Flag Priority (Demo)"
        onConfirm={() => {
          if (!escalateTarget) return;
          showToast(
            `Flagged ${escalateTarget.id} for coordinator review (Demo)`,
            undefined,
            'info',
          );
          setEscalateTarget(null);
        }}
      />
    </div>
  );
}
