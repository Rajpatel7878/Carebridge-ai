import { useMemo, useState } from 'react';
import { Badge, Button } from '@/components/common';
import {
  AppointmentStatusBadge,
  DataTable,
  type DataTableColumn,
} from '@/components/dashboard';
import { FilterControls } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { MOCK_APPOINTMENTS } from '@/data';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { AppointmentRecord } from '@/types/domain';
import { formatDate } from '@/utils/format';

export function DoctorAppointmentsPage() {
  useDocumentTitle('Doctor Appointments');
  const { showToast } = useDemo();
  const [appointments, setAppointments] =
    useState<AppointmentRecord[]>(MOCK_APPOINTMENTS);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appointments.filter((item) => {
      if (mode !== 'all' && item.mode !== mode) return false;
      if (!q) return true;
      return (
        item.patientName.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        item.facility.toLowerCase().includes(q)
      );
    });
  }, [appointments, search, mode]);

  const columns: DataTableColumn<AppointmentRecord>[] = [
    {
      key: 'patient',
      header: 'Patient & Visit Type',
      render: (row) => (
        <div>
          <p className="font-semibold text-[var(--cb-text)]">
            {row.patientName}
          </p>
          <p className="text-xs text-[var(--cb-text-muted)]">
            {row.type} &middot; {row.facility}
          </p>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Schedule',
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
      header: 'Channel',
      render: (row) => (
        <Badge variant={row.mode === 'Teleconsult' ? 'teal' : 'neutral'}>
          {row.mode}
        </Badge>
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
        row.status === 'pending' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setAppointments((prev) =>
                prev.map((a) =>
                  a.id === row.id ? { ...a, status: 'confirmed' } : a,
                ),
              );
              showToast(`Confirmed demo appointment for ${row.patientName}`);
            }}
          >
            Confirm
          </Button>
        ) : (
          <span className="text-xs text-[var(--cb-text-muted)] cb-tabular">
            {row.id}
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        subtitle="Manage in-person clinic consultations and teleconsultation slots across your patient panel."
      />

      <FilterControls
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search patient name, visit type, or clinic..."
        filters={[
          {
            id: 'mode',
            label: 'Filter by consultation channel',
            value: mode,
            onChange: setMode,
            options: [
              { value: 'all', label: 'All Channels' },
              { value: 'In-Person', label: 'In-Person' },
              { value: 'Teleconsult', label: 'Teleconsult' },
            ],
          },
        ]}
        hasActiveFilters={Boolean(search) || mode !== 'all'}
        onReset={() => {
          setSearch('');
          setMode('all');
        }}
      />

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(row) => row.id}
        caption="Doctor schedule"
      />
    </div>
  );
}
