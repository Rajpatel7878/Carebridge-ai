import { useMemo, useState } from 'react';
import { Badge } from '@/components/common';
import {
  AppointmentStatusBadge,
  DataTable,
  type DataTableColumn,
} from '@/components/dashboard';
import { FilterControls } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { MOCK_APPOINTMENTS } from '@/data';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { AppointmentRecord } from '@/types/domain';
import { formatDate } from '@/utils/format';

export function AdminAppointmentsPage() {
  useDocumentTitle('Appointment Management');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_APPOINTMENTS.filter((apt) => {
      if (status !== 'all' && apt.status !== status) return false;
      if (!q) return true;
      return (
        apt.patientName.toLowerCase().includes(q) ||
        apt.doctorName.toLowerCase().includes(q) ||
        apt.facility.toLowerCase().includes(q)
      );
    });
  }, [search, status]);

  const columns: DataTableColumn<AppointmentRecord>[] = [
    {
      key: 'visit',
      header: 'Patient & Facility',
      render: (row) => (
        <div>
          <p className="font-semibold text-[var(--cb-text)]">
            {row.patientName}
          </p>
          <p className="text-xs text-[var(--cb-text-muted)]">
            {row.id} &middot; {row.facility}
          </p>
        </div>
      ),
    },
    {
      key: 'doctor',
      header: 'Clinician',
      render: (row) => (
        <div>
          <p className="text-sm text-[var(--cb-text)]">{row.doctorName}</p>
          <p className="text-xs text-[var(--cb-text-muted)]">{row.specialty}</p>
        </div>
      ),
    },
    {
      key: 'datetime',
      header: 'Date & Time',
      render: (row) => (
        <span className="whitespace-nowrap text-xs cb-tabular">
          {formatDate(row.date)} &middot; {row.time}
        </span>
      ),
    },
    {
      key: 'mode',
      header: 'Mode',
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
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointment Management"
        subtitle="Oversee scheduled clinic consultations, teleconsult utilization, and completion rates across facilities."
      />

      <FilterControls
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search patient, clinician, or clinic facility..."
        filters={[
          {
            id: 'status',
            label: 'Filter by appointment status',
            value: status,
            onChange: setStatus,
            options: [
              { value: 'all', label: 'All Statuses' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'pending', label: 'Pending' },
              { value: 'rescheduled', label: 'Rescheduled' },
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
        caption="Admin appointment operations table"
      />
    </div>
  );
}
