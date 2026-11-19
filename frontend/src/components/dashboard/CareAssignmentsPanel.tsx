import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { Link2, Plus, RefreshCw, XCircle } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
} from '@/components/common';
import { Input, Select } from '@/components/forms';
import { useDemo } from '@/hooks/useDemo';
import { extractApiErrorMessage } from '@/services/api';
import {
  createAdminAssignment,
  fetchAdminAssignments,
  updateAdminAssignment,
} from '@/services/doctor';
import type { AuthUser } from '@/types/auth';
import type { CareAssignment } from '@/types/doctor';
import { formatDateTime } from '@/utils/format';

export interface CareAssignmentsPanelProps {
  accounts: AuthUser[];
}

export function CareAssignmentsPanel({ accounts }: CareAssignmentsPanelProps) {
  const { showToast } = useDemo();

  const [assignments, setAssignments] = useState<CareAssignment[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState<CareAssignment | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const activeDoctors = useMemo(
    () =>
      accounts.filter(
        (u) => u.role === 'DOCTOR' && u.is_active && u.is_verified,
      ),
    [accounts],
  );
  const activePatients = useMemo(
    () => accounts.filter((u) => u.role === 'PATIENT' && u.is_active),
    [accounts],
  );

  const loadAssignments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchAdminAssignments({ status: 'ACTIVE' });
      setAssignments(response.items);
      setActiveCount(response.active_count);
    } catch (err) {
      setError(
        extractApiErrorMessage(
          err,
          'Could not load patient–doctor assignments.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchAdminAssignments({ status: 'ACTIVE' })
      .then((response) => {
        if (!active) return;
        setAssignments(response.items);
        setActiveCount(response.active_count);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          extractApiErrorMessage(
            err,
            'Could not load patient–doctor assignments.',
          ),
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const openCreateModal = () => {
    setPatientId(activePatients[0]?.id ?? '');
    setDoctorId(activeDoctors[0]?.id ?? '');
    setNotes('');
    setFormError(null);
    setModalOpen(true);
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (isCreating || !patientId || !doctorId) return;
    setFormError(null);
    setIsCreating(true);
    try {
      const created = await createAdminAssignment({
        patient_id: patientId,
        doctor_id: doctorId,
        notes: notes.trim() || null,
      });
      setModalOpen(false);
      showToast(
        'Patient assigned to doctor',
        `${created.patient_name} is now assigned to ${created.doctor_name}.`,
        'success',
      );
      await loadAssignments();
    } catch (err) {
      setFormError(
        extractApiErrorMessage(err, 'Could not create care assignment.'),
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokeTarget || isRevoking) return;
    setIsRevoking(true);
    try {
      await updateAdminAssignment(revokeTarget.id, { status: 'REVOKED' });
      const target = revokeTarget;
      setRevokeTarget(null);
      showToast(
        'Assignment revoked',
        `Removed ${target.patient_name} from ${target.doctor_name}'s active care panel.`,
        'info',
      );
      await loadAssignments();
    } catch (err) {
      showToast(
        'Could not revoke assignment',
        extractApiErrorMessage(err, 'Please try again.'),
        'warning',
      );
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Authorized Patient–Doctor Care Assignments"
        description="Control which verified clinicians are authorized to access and manage specific patient records."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary" dot>
              {activeCount} active
            </Badge>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={() => void loadAssignments()}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={openCreateModal}
              disabled={
                activeDoctors.length === 0 || activePatients.length === 0
              }
            >
              Assign Patient
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <LoadingState rows={2} />
      ) : error ? (
        <ErrorState
          title="Could not load care assignments"
          message={error}
          onRetry={() => void loadAssignments()}
        />
      ) : assignments.length === 0 ? (
        <EmptyState
          icon={<Link2 className="h-5 w-5" />}
          title="No active patient–doctor assignments"
          description="Assign registered patients to verified doctor accounts to authorize clinician review and care coordination."
        />
      ) : (
        <ul className="divide-y divide-[var(--cb-border)]">
          {assignments.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--cb-text)]">
                  {item.patient_name}{' '}
                  <span className="font-normal text-[var(--cb-text-muted)]">
                    →
                  </span>{' '}
                  {item.doctor_name}
                </p>
                <p className="mt-0.5 text-xs text-[var(--cb-text-muted)] cb-tabular">
                  Assigned {formatDateTime(item.assigned_at)}
                  {item.notes ? ` · ${item.notes}` : ''}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<XCircle className="h-3.5 w-3.5" />}
                onClick={() => setRevokeTarget(item)}
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          if (!isCreating) setModalOpen(false);
        }}
        title="Assign Patient to Verified Doctor"
        description="Grants the selected clinician authorized access to this patient's reports, visits, referrals, and follow-up plans."
        footer={
          <>
            <Button
              variant="outline"
              disabled={isCreating}
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="admin-care-assignment-form"
              isLoading={isCreating}
            >
              Confirm Assignment
            </Button>
          </>
        }
      >
        <form
          id="admin-care-assignment-form"
          onSubmit={(event) => void handleCreate(event)}
          className="space-y-4"
        >
          <Select
            label="Patient Account"
            options={activePatients.map((p) => ({
              value: p.id,
              label: `${p.full_name} (${p.email})`,
            }))}
            value={patientId}
            onChange={(event) => setPatientId(event.target.value)}
          />
          <Select
            label="Verified Doctor Account"
            options={activeDoctors.map((d) => ({
              value: d.id,
              label: `${d.full_name} (${d.email})`,
            }))}
            value={doctorId}
            onChange={(event) => setDoctorId(event.target.value)}
          />
          <Input
            label="Administrative Note (Optional)"
            placeholder="e.g., Assigned to Internal Medicine care panel"
            maxLength={500}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            error={formError ?? undefined}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        onClose={() => {
          if (!isRevoking) setRevokeTarget(null);
        }}
        title="Revoke patient–doctor assignment?"
        description={
          revokeTarget
            ? `Revoke ${revokeTarget.doctor_name}'s active care assignment for ${revokeTarget.patient_name}? The clinician will immediately lose access to this patient's records.`
            : ''
        }
        confirmLabel="Revoke Assignment"
        intent="danger"
        isLoading={isRevoking}
        onConfirm={() => void handleConfirmRevoke()}
      />
    </Card>
  );
}
