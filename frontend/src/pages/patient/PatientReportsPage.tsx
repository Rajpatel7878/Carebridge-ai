import { useMemo, useState } from 'react';
import { Eye, FileUp } from 'lucide-react';
import { Badge, Button, Modal, RiskBadge } from '@/components/common';
import {
  DataTable,
  ReportDetailModal,
  ReportStatusBadge,
  type DataTableColumn,
} from '@/components/dashboard';
import { FilterControls, Input, Select } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { ACTIVE_DEMO_PATIENT, MOCK_REPORTS } from '@/data';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { MedicalReport } from '@/types/domain';
import { formatDate } from '@/utils/format';

export function PatientReportsPage() {
  useDocumentTitle('My Health Reports');
  const { showToast } = useDemo();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedReport, setSelectedReport] = useState<MedicalReport | null>(
    null,
  );
  const [uploadOpen, setUploadOpen] = useState(false);

  const patientReports = useMemo(
    () => MOCK_REPORTS.filter((r) => r.patientId === ACTIVE_DEMO_PATIENT.id),
    [],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patientReports.filter((report) => {
      if (category !== 'all' && report.category !== category) return false;
      if (!q) return true;
      return (
        report.title.toLowerCase().includes(q) ||
        report.labFacility.toLowerCase().includes(q) ||
        report.id.toLowerCase().includes(q)
      );
    });
  }, [patientReports, search, category]);

  const columns: DataTableColumn<MedicalReport>[] = [
    {
      key: 'report',
      header: 'Report',
      render: (row) => (
        <div>
          <p className="font-semibold text-[var(--cb-text)]">{row.title}</p>
          <p className="text-xs text-[var(--cb-text-muted)] cb-tabular">
            {row.id} &middot; {row.labFacility}
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
      header: 'Date',
      render: (row) => (
        <span className="whitespace-nowrap cb-tabular">
          {formatDate(row.uploadedDate)}
        </span>
      ),
    },
    {
      key: 'risk',
      header: 'Risk Indicator',
      render: (row) => <RiskBadge level={row.riskFlag} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <ReportStatusBadge status={row.reviewStatus} />,
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Eye className="h-3.5 w-3.5" />}
          onClick={(event) => {
            event.stopPropagation();
            setSelectedReport(row);
          }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Health Reports"
        subtitle="Access your screening and diagnostic reports, key biomarker readings, and clinician-reviewed explanations."
        actions={
          <Button
            size="sm"
            leftIcon={<FileUp className="h-4 w-4" />}
            onClick={() => setUploadOpen(true)}
          >
            Upload Report (Preview)
          </Button>
        }
      />

      <FilterControls
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by report name, ID, or laboratory..."
        filters={[
          {
            id: 'category',
            label: 'Filter by report category',
            value: category,
            onChange: setCategory,
            options: [
              { value: 'all', label: 'All Categories' },
              { value: 'Metabolic', label: 'Metabolic' },
              { value: 'Cardiovascular', label: 'Cardiovascular' },
              { value: 'Preventive', label: 'Preventive' },
            ],
          },
        ]}
        hasActiveFilters={Boolean(search) || category !== 'all'}
        onReset={() => {
          setSearch('');
          setCategory('all');
        }}
        resultCountLabel={`Showing ${filtered.length} of ${patientReports.length} fictional reports`}
      />

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(row) => row.id}
        onRowClick={setSelectedReport}
        caption="Patient health reports"
      />

      <ReportDetailModal
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
        viewerRole="patient"
      />

      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload Screening Report (Phase 2 UI Preview)"
        description="Real file upload and AI report summarization will connect in a later phase."
        footer={
          <>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setUploadOpen(false);
                showToast(
                  'Upload UI preview acknowledged',
                  'Backend document storage and AI report parsing are scheduled for a later phase.',
                  'info',
                );
              }}
            >
              Simulate Upload Preview
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Report Title"
            placeholder="e.g., Quarterly Fasting Lipid Profile"
          />
          <Select
            label="Report Category"
            options={[
              { value: 'Metabolic', label: 'Metabolic Panel' },
              { value: 'Cardiovascular', label: 'Cardiovascular' },
              { value: 'Renal', label: 'Renal Function' },
              { value: 'Preventive', label: 'Preventive Screening' },
            ]}
          />
          <div className="rounded-xl border border-dashed border-[var(--cb-border-strong)] bg-[var(--cb-surface-subtle)]/55 p-6 text-center text-xs text-[var(--cb-text-muted)]">
            PDF, PNG, or JPG diagnostic report intake will be activated once
            backend upload and AI analyzer modules are implemented.
          </div>
        </div>
      </Modal>
    </div>
  );
}
