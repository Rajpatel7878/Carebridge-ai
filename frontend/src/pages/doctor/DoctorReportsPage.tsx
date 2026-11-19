import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Download,
  Eye,
  FileImage,
  FileText,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Badge, Button, Card, Pagination } from '@/components/common';
import { DataTable, type DataTableColumn } from '@/components/dashboard';
import { SearchBar, Select } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { extractApiErrorMessage } from '@/services/api';
import { downloadDoctorReport, fetchDoctorReports } from '@/services/doctor';
import type { DoctorReportSummary } from '@/types/doctor';
import {
  REPORT_REVIEW_BADGES,
  type ReportFileType,
  type ReportReviewStatus,
} from '@/types/patient';
import { formatDateTime, formatFileSize } from '@/utils/format';

const REVIEW_STATUS_OPTIONS = [
  { value: 'all', label: 'All Review Statuses' },
  { value: 'PENDING_REVIEW', label: 'Pending Review' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'NEEDS_FOLLOW_UP', label: 'Needs Follow-up' },
  { value: 'REVIEWED', label: 'Reviewed' },
];

const FILE_TYPE_OPTIONS = [
  { value: 'all', label: 'All Formats' },
  { value: 'PDF', label: 'PDF Document' },
  { value: 'PNG', label: 'PNG Image' },
  { value: 'JPG', label: 'JPG Image' },
];

const PAGE_SIZE = 10;

export function DoctorReportsPage() {
  useDocumentTitle('Medical Reports');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useDemo();

  const patientIdFilter = searchParams.get('patient_id') ?? '';

  const [reports, setReports] = useState<DoctorReportSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [inReviewCount, setInReviewCount] = useState(0);
  const [needsFollowUpCount, setNeedsFollowUpCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 220);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchDoctorReports({
        patient_id: patientIdFilter || undefined,
        review_status:
          statusFilter !== 'all'
            ? (statusFilter as ReportReviewStatus)
            : undefined,
        file_type:
          typeFilter !== 'all' ? (typeFilter as ReportFileType) : undefined,
        search: debouncedSearch || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setReports(data.items);
      setTotal(data.total);
      setPendingCount(data.pending_count);
      setInReviewCount(data.in_review_count);
      setNeedsFollowUpCount(data.needs_follow_up_count);
      setReviewedCount(data.reviewed_count);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError(
        extractApiErrorMessage(
          err,
          'Unable to load patient medical reports right now.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [patientIdFilter, statusFilter, typeFilter, debouncedSearch, page]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        void loadReports();
      }
    });
    return () => {
      active = false;
    };
  }, [loadReports]);

  const handleDownload = useCallback(
    async (report: DoctorReportSummary) => {
      if (downloadingId) return;
      setDownloadingId(report.id);
      try {
        await downloadDoctorReport(report.id, report.original_filename);
        showToast(
          'Report downloaded',
          `Downloaded ${report.original_filename} through your authorized clinician session.`,
          'info',
        );
      } catch (err) {
        showToast(
          'Download failed',
          extractApiErrorMessage(
            err,
            'Could not download this medical report right now.',
          ),
          'warning',
        );
      } finally {
        setDownloadingId(null);
      }
    },
    [downloadingId, showToast],
  );

  const columns: DataTableColumn<DoctorReportSummary>[] = useMemo(
    () => [
      {
        key: 'report',
        header: 'Report File',
        render: (row) => (
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]">
              {row.file_type === 'PDF' ? (
                <FileText className="h-4 w-4" aria-hidden="true" />
              ) : (
                <FileImage className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0">
              <p className="max-w-[260px] truncate font-semibold text-[var(--cb-text)]">
                {row.original_filename}
              </p>
              <p className="text-xs text-[var(--cb-text-muted)] cb-tabular">
                {row.file_type} · {formatFileSize(row.file_size)}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'patient',
        header: 'Patient',
        render: (row) => (
          <Link
            to={`/doctor/patients/${row.patient_id}`}
            onClick={(event) => event.stopPropagation()}
            className="font-medium text-[var(--cb-text)] hover:text-[var(--cb-primary)] hover:underline"
          >
            {row.patient_name}
          </Link>
        ),
      },
      {
        key: 'uploaded',
        header: 'Uploaded',
        render: (row) => (
          <span className="text-xs text-[var(--cb-text-muted)] cb-tabular">
            {formatDateTime(row.uploaded_at)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Review Status',
        render: (row) => {
          const badge = REPORT_REVIEW_BADGES[row.review_status];
          return (
            <div className="space-y-0.5">
              <Badge variant={badge.variant} dot>
                {badge.label}
              </Badge>
              {row.review_count > 0 && (
                <p className="text-[11px] text-[var(--cb-text-muted)] cb-tabular">
                  {row.review_count} logged review
                  {row.review_count === 1 ? '' : 's'}
                </p>
              )}
            </div>
          );
        },
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <div
            className="inline-flex items-center justify-end gap-1.5"
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Download className="h-3.5 w-3.5" />}
              isLoading={downloadingId === row.id}
              onClick={() => void handleDownload(row)}
              aria-label={`Download ${row.original_filename}`}
            >
              Download
            </Button>
            <Button
              size="sm"
              leftIcon={<Eye className="h-3.5 w-3.5" />}
              onClick={() => navigate(`/doctor/reports/${row.id}`)}
            >
              Review
            </Button>
          </div>
        ),
      },
    ],
    [downloadingId, handleDownload, navigate],
  );

  const hasFilters =
    Boolean(debouncedSearch) ||
    statusFilter !== 'all' ||
    typeFilter !== 'all' ||
    Boolean(patientIdFilter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medical Reports"
        subtitle="Inspect uploaded diagnostic documents from your assigned patients, record clinical review decisions, and preserve full review history."
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void loadReports()}
            disabled={isLoading}
          >
            Refresh
          </Button>
        }
      />

      {/* Status summary strip */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="warning" dot>
          Pending: {pendingCount}
        </Badge>
        <Badge variant="primary" dot>
          In Review: {inReviewCount}
        </Badge>
        <Badge variant="critical" dot>
          Needs Follow-up: {needsFollowUpCount}
        </Badge>
        <Badge variant="success" dot>
          Reviewed: {reviewedCount}
        </Badge>
      </div>

      {/* Search & Filters */}
      <Card padding="sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1">
            <SearchBar
              value={search}
              onChange={(next) => {
                setSearch(next);
                setPage(1);
              }}
              placeholder="Search by report filename or patient name..."
              ariaLabel="Search medical reports"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[420px]">
            <Select
              aria-label="Filter by review status"
              options={REVIEW_STATUS_OPTIONS}
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            />
            <Select
              aria-label="Filter by file format"
              options={FILE_TYPE_OPTIONS}
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value);
                setPage(1);
              }}
            />
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setDebouncedSearch('');
                setStatusFilter('all');
                setTypeFilter('all');
                setPage(1);
                if (patientIdFilter) {
                  setSearchParams({}, { replace: true });
                }
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={reports}
        rowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/doctor/reports/${row.id}`)}
        isLoading={isLoading}
        error={error}
        onRetry={() => void loadReports()}
        caption="Assigned patient medical reports"
        emptyTitle={
          hasFilters
            ? 'No reports match your filters'
            : 'No medical reports awaiting review'
        }
        emptyDescription={
          hasFilters
            ? 'Clear or adjust the active filters to view all uploaded reports from your assigned patients.'
            : 'Medical reports uploaded by patients assigned to your care panel will appear here automatically.'
        }
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        itemLabel="reports"
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] px-4 py-3 text-xs text-[var(--cb-text-muted)]">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cb-secondary)]"
          aria-hidden="true"
        />
        <p>
          Uploaded report files are immutable and served only over
          authenticated, assignment-verified clinician downloads. Clinician
          review notes remain protected within the doctor portal.
        </p>
      </div>
    </div>
  );
}
