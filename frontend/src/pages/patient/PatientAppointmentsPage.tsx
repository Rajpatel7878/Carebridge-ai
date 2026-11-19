import { useMemo, useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { Badge, Button, ConfirmDialog, Modal } from '@/components/common';
import {
  AppointmentStatusBadge,
  DataTable,
  type DataTableColumn,
} from '@/components/dashboard';
import { FilterControls, Input, Select } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { ACTIVE_DEMO_PATIENT, MOCK_APPOINTMENTS, MOCK_DOCTORS } from '@/data';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { AppointmentRecord } from '@/types/domain';
import { formatDate } from '@/utils/format';

export function PatientAppointmentsPage() {
  useDocumentTitle('Appointments');
  const { showToast } = useDemo();
  const [appointments, setAppointments] = useState<AppointmentRecord[]>(() =>
    MOCK_APPOINTMENTS.filter((a) => a.patientId === ACTIVE_DEMO_PATIENT.id),
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<AppointmentRecord | null>(
    null,
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appointments.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.doctorName.toLowerCase().includes(q) ||
        item.specialty.toLowerCase().includes(q) ||
        item.facility.toLowerCase().includes(q)
      );
    });
  }, [appointments, search, statusFilter]);

  const columns: DataTableColumn<AppointmentRecord>[] = [
    {
      key: 'doctor',
      header: 'Clinician & Specialty',
      render: (row) => (
        <div>
          <p className="font-semibold text-[var(--cb-text)]">
            {row.doctorName}
          </p>
          <p className="text-xs text-[var(--cb-text-muted)]">
            {row.specialty} &middot; {row.type}
          </p>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Date & Time',
      render: (row) => (
        <div className="whitespace-nowrap cb-tabular">
          <p className="font-medium text-[var(--cb-text)]">
            {formatDate(row.date)}
          </p>
          <p className="text-xs text-[var(--cb-text-muted)]">
            {row.time} ({row.durationMinutes} min)
          </p>
        </div>
      ),
    },
    {
      key: 'mode',
      header: 'Mode & Location',
      render: (row) => (
        <div>
          <Badge variant={row.mode === 'Teleconsult' ? 'teal' : 'neutral'}>
            {row.mode}
          </Badge>
          <p className="mt-1 text-xs text-[var(--cb-text-muted)]">
            {row.facility}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <AppointmentStatusBadge status={row.status} />,
    },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: (row) =>
        row.status === 'confirmed' || row.status === 'pending' ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCancelTarget(row)}
          >
            Cancel
          </Button>
        ) : (
          <span className="text-xs text-[var(--cb-text-muted)]">Archived</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        subtitle="Review your scheduled clinic visits, teleconsultations, and past appointment history."
        actions={
          <Button
            size="sm"
            leftIcon={<CalendarPlus className="h-4 w-4" />}
            onClick={() => setRequestModalOpen(true)}
          >
            Request Visit (Demo)
          </Button>
        }
      />

      <FilterControls
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search doctor, specialty, or clinic..."
        filters={[
          {
            id: 'status',
            label: 'Filter by appointment status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'all', label: 'All Statuses' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'pending', label: 'Pending' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
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
        caption="Patient appointments"
      />

      <Modal
        open={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title="Request Appointment (UI Demo)"
        description="Live appointment booking will be connected in a later phase."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setRequestModalOpen(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setRequestModalOpen(false);
                showToast(
                  'Demo visit request previewed',
                  'No live hospital appointment is created during Phase 2.',
                  'info',
                );
              }}
            >
              Submit Preview Request
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Preferred Clinician"
            options={MOCK_DOCTORS.slice(0, 4).map((doc) => ({
              value: doc.id,
              label: `${doc.fullName} — ${doc.specialty}`,
            }))}
          />
          <Select
            label="Consultation Mode"
            options={[
              { value: 'In-Person', label: 'In-Person Clinic Visit' },
              { value: 'Teleconsult', label: 'Video Teleconsultation' },
            ]}
          />
          <Input label="Preferred Date" type="date" defaultValue="2026-12-08" />
          <Input
            label="Reason for Visit"
            placeholder="e.g., Follow-up blood pressure and lab review"
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Cancel demo appointment?"
        description={
          cancelTarget
            ? `This will mark your mock ${formatDate(cancelTarget.date)} visit with ${cancelTarget.doctorName} as cancelled in the local UI preview.`
            : ''
        }
        confirmLabel="Cancel Visit"
        intent="danger"
        onConfirm={() => {
          if (!cancelTarget) return;
          setAppointments((prev) =>
            prev.map((item) =>
              item.id === cancelTarget.id
                ? { ...item, status: 'cancelled' }
                : item,
            ),
          );
          showToast('Demo appointment marked cancelled');
          setCancelTarget(null);
        }}
      />
    </div>
  );
}
