import { useCallback, useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, RefreshCw, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  LoadingState,
  Modal,
} from '@/components/common';
import {
  CareAssignmentsPanel,
  DataTable,
  DoctorAvailabilityBadge,
  type DataTableColumn,
} from '@/components/dashboard';
import {
  FilterControls,
  Input,
  PasswordInput,
  Select,
} from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { MOCK_DOCTORS } from '@/data';
import { useAuth } from '@/hooks/useAuth';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { extractApiErrorMessage } from '@/services/api';
import {
  createAdminUser,
  fetchAdminUsers,
  updateAdminUser,
} from '@/services/auth';
import {
  getRoleDisplayName,
  type AccountRole,
  type AuthUser,
} from '@/types/auth';
import type { DoctorRecord } from '@/types/domain';
import { formatDate } from '@/utils/format';
import { strongPasswordSchema } from '@/utils/password';

const createClinicianSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Enter a full name (at least 2 characters).')
    .max(150, 'Full name must not exceed 150 characters.'),
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required.')
    .email('Enter a valid email address.'),
  role: z.enum(['DOCTOR', 'PATIENT']),
  password: strongPasswordSchema,
});

type CreateClinicianValues = z.infer<typeof createClinicianSchema>;

export function AdminDoctorsPage() {
  useDocumentTitle('Doctor Management');
  const { user: currentAdmin } = useAuth();
  const { showToast } = useDemo();

  // Live administrative user-access management state
  const [accounts, setAccounts] = useState<AuthUser[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Provision account modal state
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Sample clinician directory filters (preserved from Phase 2)
  const [search, setSearch] = useState('');
  const [availability, setAvailability] = useState('all');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateClinicianValues>({
    resolver: zodResolver(createClinicianSchema),
    defaultValues: {
      fullName: '',
      email: '',
      role: 'DOCTOR',
      password: '',
    },
  });

  const handleRefreshAccounts = useCallback(async () => {
    setAccountsLoading(true);
    setAccountsError(null);
    try {
      const response = await fetchAdminUsers();
      setAccounts(response.items);
    } catch (error) {
      setAccountsError(
        extractApiErrorMessage(
          error,
          'Could not load registered user accounts.',
        ),
      );
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchAdminUsers()
      .then((response) => {
        if (!active) return;
        setAccounts(response.items);
        setAccountsError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setAccountsError(
          extractApiErrorMessage(
            error,
            'Could not load registered user accounts.',
          ),
        );
      })
      .finally(() => {
        if (active) {
          setAccountsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleApproveDoctor = async (target: AuthUser) => {
    setUpdatingId(target.id);
    try {
      const updated = await updateAdminUser(target.id, {
        role: 'DOCTOR',
        is_verified: true,
      });
      setAccounts((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      showToast(
        `Approved ${updated.full_name} as Doctor`,
        'Clinician permissions are now active on their next sign-in.',
        'success',
      );
    } catch (error) {
      showToast(extractApiErrorMessage(error), undefined, 'info');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = async (target: AuthUser) => {
    setUpdatingId(target.id);
    try {
      const updated = await updateAdminUser(target.id, {
        is_active: !target.is_active,
      });
      setAccounts((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      showToast(
        updated.is_active
          ? `Reactivated ${updated.full_name}`
          : `Deactivated ${updated.full_name}`,
      );
    } catch (error) {
      showToast(extractApiErrorMessage(error), undefined, 'info');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRoleChange = async (target: AuthUser, nextRole: AccountRole) => {
    if (nextRole === target.role) return;
    setUpdatingId(target.id);
    try {
      const updated = await updateAdminUser(target.id, { role: nextRole });
      setAccounts((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      showToast(
        `Updated ${updated.full_name} to ${getRoleDisplayName(updated.role)}`,
      );
    } catch (error) {
      showToast(extractApiErrorMessage(error), undefined, 'info');
    } finally {
      setUpdatingId(null);
    }
  };

  const onProvisionSubmit = async (values: CreateClinicianValues) => {
    setProvisionError(null);
    setIsProvisioning(true);
    try {
      const created = await createAdminUser({
        full_name: values.fullName.trim(),
        email: values.email.trim(),
        password: values.password,
        role: values.role,
        is_active: true,
        is_verified: true,
      });
      setAccounts((prev) => [created, ...prev]);
      setProvisionOpen(false);
      reset();
      showToast(
        `Provisioned ${created.full_name}`,
        `Created verified ${getRoleDisplayName(created.role)} account.`,
        'success',
      );
    } catch (error) {
      setProvisionError(
        extractApiErrorMessage(error, 'Failed to provision user account.'),
      );
    } finally {
      setIsProvisioning(false);
    }
  };

  const accountColumns: DataTableColumn<AuthUser>[] = [
    {
      key: 'user',
      header: 'User',
      render: (row) => (
        <div>
          <p className="font-semibold text-[var(--cb-text)]">{row.full_name}</p>
          <p className="text-xs text-[var(--cb-text-muted)]">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role & Requests',
      render: (row) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant={
              row.role === 'ADMIN'
                ? 'neutral'
                : row.role === 'DOCTOR'
                  ? 'primary'
                  : 'teal'
            }
          >
            {getRoleDisplayName(row.role)}
          </Badge>
          {row.requested_role === 'DOCTOR' && (
            <Badge variant="warning">Doctor Requested</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Account Status',
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'critical'} dot>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'created',
      header: 'Joined',
      render: (row) => (
        <span className="text-xs text-[var(--cb-text-muted)] cb-tabular">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => {
        const isSelf = row.id === currentAdmin?.id;
        const busy = updatingId === row.id;

        if (isSelf) {
          return (
            <span className="text-xs font-medium text-[var(--cb-text-muted)]">
              Current admin
            </span>
          );
        }

        return (
          <div className="flex flex-wrap items-center gap-2">
            {row.requested_role === 'DOCTOR' && row.role !== 'DOCTOR' && (
              <Button
                size="sm"
                disabled={busy}
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                onClick={() => {
                  void handleApproveDoctor(row);
                }}
              >
                Approve Doctor
              </Button>
            )}
            <select
              aria-label={`Role for ${row.full_name}`}
              value={row.role}
              disabled={busy}
              onChange={(event) => {
                void handleRoleChange(row, event.target.value as AccountRole);
              }}
              className="h-8 rounded-lg border border-[var(--cb-border-strong)] bg-[var(--cb-surface)] px-2 text-xs text-[var(--cb-text)]"
            >
              <option value="PATIENT">Patient</option>
              <option value="DOCTOR">Doctor</option>
              <option value="ADMIN">Admin</option>
            </select>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                void handleToggleActive(row);
              }}
            >
              {row.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        );
      },
    },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_DOCTORS.filter((doc) => {
      if (availability !== 'all' && doc.availabilityStatus !== availability)
        return false;
      if (!q) return true;
      return (
        doc.fullName.toLowerCase().includes(q) ||
        doc.specialty.toLowerCase().includes(q) ||
        doc.facility.toLowerCase().includes(q)
      );
    });
  }, [search, availability]);

  const columns: DataTableColumn<DoctorRecord>[] = [
    {
      key: 'doctor',
      header: 'Clinician',
      render: (row) => (
        <div>
          <p className="font-semibold text-[var(--cb-text)]">{row.fullName}</p>
          <p className="text-xs text-[var(--cb-text-muted)] cb-tabular">
            {row.id} &middot; {row.licenseCode}
          </p>
        </div>
      ),
    },
    {
      key: 'specialty',
      header: 'Specialty & Facility',
      render: (row) => (
        <div>
          <Badge variant="primary">{row.specialty}</Badge>
          <p className="mt-1 text-xs text-[var(--cb-text-muted)]">
            {row.facility}
          </p>
        </div>
      ),
    },
    {
      key: 'panel',
      header: 'Assigned Panel',
      render: (row) => (
        <span className="font-semibold text-[var(--cb-text)] cb-tabular">
          {row.assignedPatientsCount}
        </span>
      ),
    },
    {
      key: 'highrisk',
      header: 'High-Risk Load',
      render: (row) => (
        <span className="text-xs font-semibold text-[var(--cb-warning)] cb-tabular">
          {row.highRiskPatientsCount} patients
        </span>
      ),
    },
    {
      key: 'pending',
      header: 'Pending Reviews',
      render: (row) => (
        <span className="text-xs cb-tabular">{row.pendingReviewsCount}</span>
      ),
    },
    {
      key: 'status',
      header: 'Availability',
      render: (row) => (
        <DoctorAvailabilityBadge status={row.availabilityStatus} />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor Management"
        subtitle="Approve clinician accounts, manage user roles and account status, and monitor clinical directory coverage."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => {
                void handleRefreshAccounts();
              }}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              leftIcon={<UserPlus className="h-4 w-4" />}
              onClick={() => {
                setProvisionError(null);
                setProvisionOpen(true);
              }}
            >
              Provision Clinician
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader
          title="Registered Accounts & Doctor Approvals"
          description="Protected administrator directory — approve pending clinician requests, manage roles, or activate and deactivate accounts."
        />
        {accountsLoading ? (
          <LoadingState label="Loading registered accounts..." />
        ) : accountsError ? (
          <ErrorState
            title="Unable to load user accounts"
            message={accountsError}
          />
        ) : (
          <DataTable
            columns={accountColumns}
            data={accounts}
            rowKey={(row) => row.id}
            caption="Registered platform user accounts"
            emptyTitle="No registered accounts found"
            emptyDescription="Provision a clinician or register a patient account to view entries here."
          />
        )}
      </Card>

      <CareAssignmentsPanel accounts={accounts} />

      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--cb-text)]">
            Network Specialist Directory (Sample Data)
          </h2>
          <p className="text-xs text-[var(--cb-text-muted)]">
            Illustrative specialist workload metrics pending clinical workflow
            phases.
          </p>
        </div>

        <FilterControls
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search doctor name, specialty, or clinic..."
          filters={[
            {
              id: 'availability',
              label: 'Filter by availability status',
              value: availability,
              onChange: setAvailability,
              options: [
                { value: 'all', label: 'All Statuses' },
                { value: 'available', label: 'Available' },
                { value: 'in-clinic', label: 'In Clinic' },
                { value: 'on-call', label: 'On Call' },
                { value: 'off-duty', label: 'Off Duty' },
              ],
            },
          ]}
          hasActiveFilters={Boolean(search) || availability !== 'all'}
          onReset={() => {
            setSearch('');
            setAvailability('all');
          }}
        />

        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(row) => row.id}
          caption="Doctor management directory"
        />
      </div>

      <Modal
        open={provisionOpen}
        onClose={() => setProvisionOpen(false)}
        title="Provision Verified Account"
        description="Create an administrator-approved clinician or patient account with a strong initial password."
        footer={
          <>
            <Button variant="outline" onClick={() => setProvisionOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="provision-user-form"
              isLoading={isProvisioning}
            >
              Create Account
            </Button>
          </>
        }
      >
        <form
          id="provision-user-form"
          onSubmit={handleSubmit(onProvisionSubmit)}
          noValidate
          className="space-y-4"
        >
          {provisionError && (
            <ErrorState title="Provisioning error" message={provisionError} />
          )}
          <Input
            label="Full Name"
            placeholder="Dr. Raghav Kulkarni"
            error={errors.fullName?.message}
            {...register('fullName')}
          />
          <Input
            label="Institutional Email"
            type="email"
            placeholder="clinician@example.org"
            error={errors.email?.message}
            {...register('email')}
          />
          <Select
            label="Assigned Role"
            options={[
              { value: 'DOCTOR', label: 'Doctor — Verified Clinician' },
              { value: 'PATIENT', label: 'Patient — Standard Access' },
            ]}
            error={errors.role?.message}
            {...register('role')}
          />
          <PasswordInput
            label="Initial Password"
            autoComplete="new-password"
            placeholder="Min 8 chars, upper, lower, number & symbol"
            error={errors.password?.message}
            {...register('password')}
          />
        </form>
      </Modal>
    </div>
  );
}
