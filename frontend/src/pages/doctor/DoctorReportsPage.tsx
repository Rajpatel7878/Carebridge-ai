import { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { Badge, Button, RiskBadge } from '@/components/common';
import {
  DataTable,
  ReportDetailModal,
  ReportStatusBadge,
  type DataTableColumn,
} from '@/components/dashboard';
import { FilterControls } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { MOCK_REPORTS } from '@/data';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { MedicalReport } from '@/types/domain';
import { formatDate } from '@/utils/format';

export function DoctorReportsPage() {
  useDocumentTitle('Medical Reports');
  const { showToast } = useDemo();
  const [reports, setReports] = useState<MedicalReport[]>(MOCK_REPORTS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<MedicalReport | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (statusFilter !== 'all' && r.reviewStatus !== statusFilter)
        return false;
      if (!q) return true;
      return (
        r.patientName.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    });
  }, [reports, search, statusFilter]);

  const handleMarkReviewed = (target: MedicalReport) => {
    setReports((prev) =>
      prev.map((item) =>
        item.id === target.id ? { ...item, reviewStatus: 'reviewed' } : item,
      ),
    );
    showToast(`Report ${target.id} marked as reviewed (Demo)`);
  };

  const columns: DataTableColumn<MedicalReport>[] = [
    {
      key: 'patient',
      header: 'Patient & Report',
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
      key: 'category',
      header: 'Category',
      render: (row) => <Badge variant="neutral">{row.category}</Badge>,
    },
    {
      key: 'date',
      header: 'Uploaded',
      render: (row) => (
        <span className="whitespace-nowrap text-xs cb-tabular">
          {formatDate(row.uploadedDate)}
        </span>
      ),
    },
    {
      key: 'risk',
      header: 'Risk Flag',
      render: (row) => <RiskBadge level={row.riskFlag} />,
    },
    {
      key: 'status',
      header: 'Review State',
      render: (row) => <ReportStatusBadge status={row.reviewStatus} />,
    },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          leftIcon={<Eye className="h-3.5 w-3.5" />}
          onClick={(e) => {
            e.stopPropagation();
            setSelected(row);
          }}
        >
          Review
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medical Reports"
        subtitle="Examine uploaded diagnostic panels, inspect flagged biomarkers, and record clinical review status."
      />

      <FilterControls
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search patient, report title, or report ID..."
        filters={[
          {
            id: 'status',
            label: 'Filter by review status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'all', label: 'All Review States' },
              { value: 'action-required', label: 'Action Required' },
              { value: 'pending-review', label: 'Pending Review' },
              { value: 'reviewed', label: 'Reviewed' },
            ],
          },
        ]}
        hasActiveFilters={Boolean(search) || statusFilter !== 'all'}
        onReset={() => {
          setSearch('');
          setStatusFilter('all');
        }}
        resultCountLabel={`Showing ${filtered.length} of ${reports.length} screening reports`}
      />

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(row) => row.id}
        onRowClick={setSelected}
        caption="Clinician report review queue"
      />

      <ReportDetailModal
        report={selected}
        onClose={() => setSelected(null)}
        viewerRole="doctor"
        onMarkReviewed={handleMarkReviewed}
      />
    </div>
  );
}
