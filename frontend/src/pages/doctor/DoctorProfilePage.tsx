import { useState, type FormEvent } from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, CardHeader } from '@/components/common';
import { DoctorAvailabilityBadge } from '@/components/dashboard';
import { Input, Select } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { ACTIVE_DEMO_DOCTOR } from '@/data';
import { useAuth } from '@/hooks/useAuth';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getRoleDisplayName } from '@/types/auth';
import type { DoctorRecord } from '@/types/domain';
import { formatDate, getInitials } from '@/utils/format';

export function DoctorProfilePage() {
  useDocumentTitle('Doctor Profile');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useDemo();
  const doctor = ACTIVE_DEMO_DOCTOR;

  const displayName = user?.full_name ?? doctor.fullName;
  const displayEmail = user?.email ?? doctor.email;
  const displayRole = user ? getRoleDisplayName(user.role) : 'Doctor';

  const [availability, setAvailability] = useState<
    DoctorRecord['availabilityStatus']
  >(doctor.availabilityStatus);
  const [phone, setPhone] = useState(doctor.phone);
  const [facility, setFacility] = useState(doctor.facility);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    showToast('Clinician preferences saved locally');
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      showToast('Signed out successfully', undefined, 'info');
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinician Profile"
        subtitle="Review your authenticated clinician account, panel metrics, and clinic availability preferences."
        actions={
          <Button
            variant="outline"
            size="sm"
            isLoading={isLoggingOut}
            leftIcon={<LogOut className="h-4 w-4" />}
            onClick={handleLogout}
          >
            Sign Out
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--cb-primary-soft)] text-lg font-bold text-[var(--cb-primary)]">
              {getInitials(displayName)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-[var(--cb-text)]">
                {displayName}
              </h2>
              <p className="truncate text-xs text-[var(--cb-text-muted)]">
                {displayEmail}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge variant="primary" dot>
                  {displayRole}
                </Badge>
                {user?.is_verified && (
                  <Badge variant="success">
                    <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                    Verified
                  </Badge>
                )}
                <DoctorAvailabilityBadge status={availability} />
              </div>
            </div>
          </div>

          <dl className="mt-6 space-y-3 border-t border-[var(--cb-border)] pt-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--cb-text-muted)]">Account Role</dt>
              <dd className="font-medium text-[var(--cb-text)]">
                {displayRole}
              </dd>
            </div>
            {user?.created_at && (
              <div className="flex justify-between">
                <dt className="text-[var(--cb-text-muted)]">Member Since</dt>
                <dd className="font-medium text-[var(--cb-text)] cb-tabular">
                  {formatDate(user.created_at)}
                </dd>
              </div>
            )}
            <div className="flex justify-between border-t border-[var(--cb-border)] pt-3">
              <dt className="text-[var(--cb-text-muted)]">
                Specialty (Sample)
              </dt>
              <dd className="font-medium text-[var(--cb-text)]">
                {doctor.specialty}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--cb-text-muted)]">
                Assigned Panel (Sample)
              </dt>
              <dd className="font-medium text-[var(--cb-text)] cb-tabular">
                {doctor.assignedPatientsCount} patients
              </dd>
            </div>
            <div>
              <dt className="text-[var(--cb-text-muted)]">
                Consultation Modes
              </dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {doctor.consultationModes.map((mode) => (
                  <Badge key={mode} variant="teal">
                    {mode}
                  </Badge>
                ))}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader
            title="Clinic & Availability Settings"
            description="Adjust on-duty status and primary facility contact preferences."
          />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Clinician Name" value={displayName} disabled />
              <Input label="Work Email" value={displayEmail} disabled />
            </div>
            <Select
              label="Current Availability Status"
              value={availability}
              onChange={(e) =>
                setAvailability(
                  e.target.value as DoctorRecord['availabilityStatus'],
                )
              }
              options={[
                { value: 'available', label: 'Available for Consults' },
                { value: 'in-clinic', label: 'In Clinic Session' },
                { value: 'on-call', label: 'On-Call Urgent Only' },
                { value: 'off-duty', label: 'Off Duty' },
              ]}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Primary Facility"
                value={facility}
                onChange={(e) => setFacility(e.target.value)}
              />
              <Input
                label="Clinic Direct Line"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit">Update Clinician Profile</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
