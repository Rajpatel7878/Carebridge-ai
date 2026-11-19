import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import {
  Download,
  Eye,
  FileImage,
  FileText,
  Info,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
} from '@/components/common';
import { SearchBar, Select } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePatientPortal } from '@/hooks/usePatientPortal';
import { extractApiErrorMessage } from '@/services/api';
import {
  downloadPatientReport,
  fetchPatientReportDetail,
  fetchPatientReports,
  uploadPatientReport,
} from '@/services/patient';
import {
  REPORT_REVIEW_BADGES,
  type PatientMedicalReport,
  type ReportFileType,
  type ReportReviewStatus,
} from '@/types/patient';
import { cn } from '@/utils/cn';
import { formatDateTime, formatFileSize } from '@/utils/format';

const ALLOWED_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg']);
const DEFAULT_MAX_UPLOAD_MB = 10;

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All File Formats' },
  { value: 'PDF', label: 'PDF Documents' },
  { value: 'PNG', label: 'PNG Images' },
  { value: 'JPG', label: 'JPG Images' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Review Statuses' },
  { value: 'PENDING_REVIEW', label: 'Pending Review' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'REVIEWED', label: 'Reviewed' },
];

function validateClientFile(file: File, maxUploadMb: number): string | null {
  if (file.size === 0) {
    return 'The selected file is empty. Choose a valid PDF, PNG, or JPG report.';
  }
  const parts = file.name.toLowerCase().split('.');
  const ext = parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return 'Unsupported file type. Only PDF, PNG, and JPG medical reports are allowed.';
  }
  const maxBytes = maxUploadMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return `File exceeds the ${maxUploadMb} MB upload limit (${formatFileSize(file.size)} selected).`;
  }
  return null;
}

export function PatientReportsPage() {
  useDocumentTitle('My Medical Reports');
  const { showToast } = useDemo();
  const { refreshNotifications } = usePatientPortal();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [reports, setReports] = useState<PatientMedicalReport[]>([]);
  const [maxUploadMb, setMaxUploadMb] = useState(DEFAULT_MAX_UPLOAD_MB);
  const [search, setSearch] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingFilename, setUploadingFilename] = useState<string | null>(
    null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [selectedReport, setSelectedReport] =
    useState<PatientMedicalReport | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetchPatientReports({
        file_type:
          fileTypeFilter !== 'all'
            ? (fileTypeFilter as ReportFileType)
            : undefined,
        review_status:
          statusFilter !== 'all'
            ? (statusFilter as ReportReviewStatus)
            : undefined,
        search: search.trim() || undefined,
      });
      setReports(response.items);
      setMaxUploadMb(response.max_upload_mb);
    } catch (err) {
      setLoadError(
        extractApiErrorMessage(
          err,
          'Unable to load your uploaded reports right now.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [fileTypeFilter, statusFilter, search]);

  useEffect(() => {
    let cancelled = false;
    fetchPatientReports({
      file_type:
        fileTypeFilter !== 'all'
          ? (fileTypeFilter as ReportFileType)
          : undefined,
      review_status:
        statusFilter !== 'all'
          ? (statusFilter as ReportReviewStatus)
          : undefined,
      search: search.trim() || undefined,
    })
      .then((response) => {
        if (cancelled) return;
        setReports(response.items);
        setMaxUploadMb(response.max_upload_mb);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          extractApiErrorMessage(
            err,
            'Unable to load your uploaded reports right now.',
          ),
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fileTypeFilter, statusFilter, search]);

  const handleFileSelection = async (file: File | undefined) => {
    if (!file || isUploading) return;
    setUploadError(null);

    const validationMessage = validateClientFile(file, maxUploadMb);
    if (validationMessage) {
      setUploadError(validationMessage);
      return;
    }

    setIsUploading(true);
    setUploadingFilename(file.name);
    setUploadProgress(5);

    try {
      const uploaded = await uploadPatientReport(file, (pct) => {
        setUploadProgress(Math.max(5, pct));
      });
      setUploadProgress(100);
      showToast(
        'Report uploaded securely',
        `${uploaded.original_filename} is saved in your private portal.`,
      );
      await Promise.all([loadReports(), refreshNotifications()]);
    } catch (err) {
      setUploadError(
        extractApiErrorMessage(
          err,
          'Report upload failed. Verify the file is a valid PDF, PNG, or JPG under the size limit.',
        ),
      );
    } finally {
      setIsUploading(false);
      setUploadingFilename(null);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    void handleFileSelection(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    void handleFileSelection(file);
  };

  const openFilePicker = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleOpenDetail = async (report: PatientMedicalReport) => {
    setSelectedReport(report);
    setIsLoadingDetail(true);
    try {
      const fresh = await fetchPatientReportDetail(report.id);
      setSelectedReport(fresh);
    } catch (err) {
      showToast(
        'Could not refresh details',
        extractApiErrorMessage(err, 'Showing latest loaded report details.'),
        'warning',
      );
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleDownload = async (report: PatientMedicalReport) => {
    if (downloadingId) return;
    setDownloadingId(report.id);
    try {
      await downloadPatientReport(report.id, report.original_filename);
      showToast(
        'Download started',
        `Downloading ${report.original_filename} via secure session.`,
      );
    } catch (err) {
      showToast(
        'Download failed',
        extractApiErrorMessage(
          err,
          'Unable to download this report right now. Please try again.',
        ),
        'warning',
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const hasActiveFilters =
    search.trim().length > 0 ||
    fileTypeFilter !== 'all' ||
    statusFilter !== 'all';

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Medical Reports"
        subtitle="Upload diagnostic PDFs and scan images securely, track clinical review status, and download your records anytime."
        actions={
          <Button
            leftIcon={<Upload className="h-4 w-4" />}
            onClick={openFilePicker}
            isLoading={isUploading}
          >
            Upload Report
          </Button>
        }
      />

      {/* Hidden accessible file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        onChange={handleInputChange}
        className="sr-only"
        aria-label="Choose medical report file"
        disabled={isUploading}
      />

      {/* Upload & Drag-and-Drop Card */}
      <Card>
        <CardHeader
          title="Upload a Health Report"
          description={`Accepted formats: PDF, PNG, JPG · Maximum file size: ${maxUploadMb} MB · Stored privately and accessible only to authorized sessions.`}
        />

        <div
          role="button"
          tabIndex={0}
          aria-label="Drag and drop a PDF, PNG, or JPG medical report or press Enter to browse"
          onClick={openFilePicker}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openFilePicker();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!isUploading) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--cb-ring)]',
            isDragging
              ? 'border-[var(--cb-primary)] bg-[var(--cb-primary-soft)]/55'
              : 'border-[var(--cb-border-strong)] bg-[var(--cb-surface-subtle)]/55 hover:border-[var(--cb-primary)] hover:bg-[var(--cb-surface-subtle)]',
            isUploading && 'pointer-events-none opacity-80',
          )}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]">
            <Upload className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm font-semibold text-[var(--cb-text)]">
            {isDragging
              ? 'Drop your report file to upload'
              : 'Drag and drop a report file here, or click to browse'}
          </p>
          <p className="mt-1 text-xs text-[var(--cb-text-muted)]">
            PDF, PNG, or JPG up to {maxUploadMb} MB · Files are verified on the
            server before saving
          </p>
        </div>

        {isUploading && (
          <div
            role="status"
            aria-live="polite"
            className="mt-4 rounded-xl border border-[var(--cb-primary-border)] bg-[var(--cb-primary-soft)]/45 p-3.5"
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-semibold text-[var(--cb-text)]">
                Uploading {uploadingFilename ?? 'report'}...
              </span>
              <span className="shrink-0 font-semibold text-[var(--cb-primary)] cb-tabular">
                {uploadProgress}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Report upload progress"
              aria-valuenow={uploadProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--cb-border)]"
            >
              <div
                className="h-full rounded-full bg-[var(--cb-primary)] transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {uploadError && (
          <ErrorState
            title="Report could not be uploaded"
            message={uploadError}
            className="mt-4"
          />
        )}

        <div className="mt-4 flex items-start gap-2.5 text-xs text-[var(--cb-text-muted)]">
          <ShieldCheck
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cb-secondary)]"
            aria-hidden="true"
          />
          <span>
            Reports are stored in private encrypted-session-gated storage and
            queued for clinical review. Automated report interpretation is not
            performed during upload.
          </span>
        </div>
      </Card>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search uploaded reports by filename..."
            ariaLabel="Search uploaded reports"
          />
        </div>
        <Select
          aria-label="Filter reports by file format"
          value={fileTypeFilter}
          options={TYPE_FILTER_OPTIONS}
          onChange={(e) => setFileTypeFilter(e.target.value)}
        />
        <Select
          aria-label="Filter reports by review status"
          value={statusFilter}
          options={STATUS_FILTER_OPTIONS}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
      </div>

      {/* Report Listing */}
      {isLoading ? (
        <LoadingState label="Loading your medical reports..." rows={3} />
      ) : loadError ? (
        <ErrorState
          title="Could not load medical reports"
          message={loadError}
          onRetry={() => void loadReports()}
        />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" aria-hidden="true" />}
          title={
            hasActiveFilters
              ? 'No matching medical reports'
              : 'No medical reports uploaded yet'
          }
          description={
            hasActiveFilters
              ? 'Try clearing your search or status filters to view all of your uploaded documents.'
              : `Upload your first PDF, PNG, or JPG health report (up to ${maxUploadMb} MB) to store it privately and begin clinical review coordination.`
          }
          action={
            hasActiveFilters ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setFileTypeFilter('all');
                  setStatusFilter('all');
                }}
              >
                Clear Filters
              </Button>
            ) : (
              <Button
                size="sm"
                leftIcon={<Upload className="h-4 w-4" />}
                onClick={openFilePicker}
              >
                Upload First Report
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const reviewBadge = REPORT_REVIEW_BADGES[report.review_status];
            const isPdf = report.file_type === 'PDF';
            const FormatIcon = isPdf ? FileText : FileImage;

            return (
              <Card key={report.id}>
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]">
                      <FormatIcon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-sm font-semibold text-[var(--cb-text)] sm:text-base">
                          {report.original_filename}
                        </h2>
                        <Badge variant="neutral">{report.file_type}</Badge>
                        <Badge variant={reviewBadge.variant} dot>
                          {reviewBadge.label}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-[var(--cb-text-muted)] cb-tabular">
                        {formatFileSize(report.file_size)} &middot; Uploaded{' '}
                        {formatDateTime(report.uploaded_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Eye className="h-3.5 w-3.5" />}
                      onClick={() => void handleOpenDetail(report)}
                    >
                      Details
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      isLoading={downloadingId === report.id}
                      leftIcon={<Download className="h-3.5 w-3.5" />}
                      onClick={() => void handleDownload(report)}
                    >
                      Download
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Report Metadata Detail Modal */}
      <Modal
        open={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
        title="Medical Report Details"
        description="Verified record stored in your private CareBridge AI portal."
        footer={
          selectedReport ? (
            <>
              <Button variant="outline" onClick={() => setSelectedReport(null)}>
                Close
              </Button>
              <Button
                isLoading={downloadingId === selectedReport.id}
                leftIcon={<Download className="h-4 w-4" />}
                onClick={() => void handleDownload(selectedReport)}
              >
                Download File
              </Button>
            </>
          ) : undefined
        }
      >
        {selectedReport && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral">{selectedReport.file_type}</Badge>
              <Badge
                variant={
                  REPORT_REVIEW_BADGES[selectedReport.review_status].variant
                }
                dot
              >
                {REPORT_REVIEW_BADGES[selectedReport.review_status].label}
              </Badge>
              <Badge
                variant={
                  selectedReport.upload_status === 'UPLOADED'
                    ? 'success'
                    : 'critical'
                }
              >
                {selectedReport.upload_status === 'UPLOADED'
                  ? 'Stored Privately'
                  : 'Upload Failed'}
              </Badge>
            </div>

            <dl className="divide-y divide-[var(--cb-border)] rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)] px-4 text-xs sm:text-sm">
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[var(--cb-text-muted)]">Document Name</dt>
                <dd className="truncate font-medium text-[var(--cb-text)]">
                  {selectedReport.original_filename}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[var(--cb-text-muted)]">Verified Format</dt>
                <dd className="font-medium text-[var(--cb-text)]">
                  {selectedReport.file_type}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[var(--cb-text-muted)]">File Size</dt>
                <dd className="font-medium text-[var(--cb-text)] cb-tabular">
                  {formatFileSize(selectedReport.file_size)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[var(--cb-text-muted)]">Uploaded At</dt>
                <dd className="font-medium text-[var(--cb-text)] cb-tabular">
                  {formatDateTime(selectedReport.uploaded_at)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[var(--cb-text-muted)]">Last Updated</dt>
                <dd className="font-medium text-[var(--cb-text)] cb-tabular">
                  {formatDateTime(selectedReport.updated_at)}
                </dd>
              </div>
            </dl>

            {isLoadingDetail && (
              <p className="text-xs text-[var(--cb-text-muted)]">
                Syncing latest review status...
              </p>
            )}

            <div className="flex items-start gap-2.5 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-3 text-xs leading-relaxed text-[var(--cb-text-secondary)]">
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cb-primary)]"
                aria-hidden="true"
              />
              <span>
                Uploaded documents are held privately for authorized care
                coordination. Always consult a qualified healthcare professional
                to interpret diagnostic test results.
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
