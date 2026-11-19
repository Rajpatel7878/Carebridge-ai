import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Modal } from '@/components/common';
import {
  DataTable,
  ReferralPriorityBadge,
  ReferralStatusBadge,
  type DataTableColumn,
} from '@/components/dashboard';
import { FilterControls, Input, Select } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { MOCK_DOCTORS, MOCK_PATIENTS, MOCK_REFERRALS } from '@/data';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { ReferralRecord } from '@/types/domain';
import { formatDate } from '@/utils/format';

export function DoctorReferralsPage() {
  useDocumentTitle('Clinical Referrals');
  const { showToast } = useDemo();
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('all');
  const [newOpen, setNewOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_REFERRALS.filter((item) => {
      if (priority !== 'all' && item.priority !== priority) return false;
      if (!q) return true;
      return (
        item.patientName.toLowerCase().includes(q) ||
        item.toSpecialty.toLowerCase().includes(q) ||
        item.toDoctorName.toLowerCase().includes(q)
      );
    });
  }, [search, priority]);

  const columns: DataTableColumn<ReferralRecord>[] = [
    {
      key: 'patient',
      header: 'Patient & Reason',
      render: (row) => (
        <div>
          <p className="font-semibold text-[var(--cb-text)]">
            {row.patientName}
          </p>
          <p className="text-xs text-[var(--cb-text-muted)]">
            {row.id} &middot; {row.reason}
          </p>
        </div>
      ),
    },
    {
      key: 'specialist',
      header: 'Receiving Specialist',
      render: (row) => (
        <div>
          <p className="font-medium text-[var(--cb-text)]">
            {row.toDoctorName}
          </p>
          <p className="text-xs text-[var(--cb-text-muted)]">
            {row.toSpecialty} &middot; {row.toFacility}
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
      header: 'Target Date',
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
        title="Referrals"
        subtitle="Coordinate outgoing specialist handoffs and track acceptance across partner clinics."
        actions={
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setNewOpen(true)}
          >
            New Referral (Demo)
          </Button>
        }
      />

      <FilterControls
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search patient, specialty, or specialist..."
        filters={[
          {
            id: 'priority',
            label: 'Filter by urgency',
            value: priority,
            onChange: setPriority,
            options: [
              { value: 'all', label: 'All Priorities' },
              { value: 'urgent', label: 'Urgent' },
              { value: 'priority', label: 'Priority' },
              { value: 'routine', label: 'Routine' },
            ],
          },
        ]}
        hasActiveFilters={Boolean(search) || priority !== 'all'}
        onReset={() => {
          setSearch('');
          setPriority('all');
        }}
      />

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(row) => row.id}
        caption="Doctor referrals table"
      />

      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="Initiate Specialist Referral (UI Demo)"
        description="Referral submission workflow will connect to backend APIs in a later phase."
        footer={
          <>
            <Button variant="outline" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setNewOpen(false);
                showToast(
                  'Demo referral draft previewed',
                  'No real clinical referral is transmitted in Phase 2.',
                  'info',
                );
              }}
            >
              Preview Referral
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Patient"
            options={MOCK_PATIENTS.map((p) => ({
              value: p.id,
              label: `${p.fullName} (${p.id})`,
            }))}
          />
          <Select
            label="Specialist"
            options={MOCK_DOCTORS.slice(1).map((d) => ({
              value: d.id,
              label: `${d.fullName} — ${d.specialty}`,
            }))}
          />
          <Select
            label="Urgency Level"
            options={[
              { value: 'routine', label: 'Routine (within 30 days)' },
              { value: 'priority', label: 'Priority (within 14 days)' },
              { value: 'urgent', label: 'Urgent (within 72 hours)' },
            ]}
          />
          <Input
            label="Clinical Reason"
            placeholder="Summarize screening findings and specialist question"
          />
        </div>
      </Modal>
    </div>
  );
}
