import { useState, type FormEvent } from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  RiskBadge,
} from '@/components/common';
import { Input, Select } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { ACTIVE_DEMO_PATIENT } from '@/data';
import { useAuth } from '@/hooks/useAuth';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getRoleDisplayName } from '@/types/auth';
import { formatDate, getInitials } from '@/utils/format';

export function PatientProfilePage() {
  useDocumentTitle('Patient Profile');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useDemo();
  const patient = ACTIVE_DEMO_PATIENT;

  const displayName = user?.full_name ?? patient.fullName;
  const displayEmail = user?.email ?? patient.email;
  const displayRole = user ? getRoleDisplayName(user.role) : 'Patient';

  const [phone, setPhone] = useState(patient.phone);
  const [district, setDistrict] = useState(patient.district);
  const [emergencyContact, setEmergencyContact] = useState(
    patient.emergencyContact,
  );
  const [language, setLanguage] = useState<string>(patient.preferredLanguage);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    showToast(
      'Communication preferences saved locally',
      'Extended clinical profile fields connect in a future phase.',
    );
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
        title="Profile"
        subtitle="Review your authenticated account details, care assignment, and communication preferences."
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
                <Badge variant="teal" dot>
                  {displayRole}
                </Badge>
                {user?.is_verified && (
                  <Badge variant="success">
                    <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                    Verified
                  </Badge>
                )}
                {user?.requested_role === 'DOCTOR' && (
                  <Badge variant="warning">Doctor Approval Pending</Badge>
                )}
              </div>
            </div>
          </div>

          <dl className="mt-6 space-y-3 border-t border-[var(--cb-border)] pt-5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--cb-text-muted)]">Account Role</dt>
              <dd className="font-medium text-[var(--cb-text)]">
                {displayRole}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--cb-text-muted)]">Account Status</dt>
              <dd className="font-medium text-[var(--cb-success)]">
                {user?.is_active === false ? 'Inactive' : 'Active'}
              </dd>
            </div>
            {user?.created_at && (
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--cb-text-muted)]">Member Since</dt>
                <dd className="font-medium text-[var(--cb-text)] cb-tabular">
                  {formatDate(user.created_at)}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-3 border-t border-[var(--cb-border)] pt-3">
              <dt className="text-[var(--cb-text-muted)]">
                Primary Doctor (Sample)
              </dt>
              <dd className="font-medium text-[var(--cb-text)]">
                {patient.assignedDoctorName}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--cb-text-muted)]">
                Home Clinic (Sample)
              </dt>
              <dd className="text-right font-medium text-[var(--cb-text)]">
                {patient.facility}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[var(--cb-text-muted)]">Sample Risk Tier</dt>
              <dd>
                <RiskBadge level={patient.riskLevel} />
              </dd>
            </div>
            <div>
              <dt className="text-[var(--cb-text-muted)]">Sample Conditions</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {patient.primaryConditions.map((condition) => (
                  <Badge key={condition} variant="primary">
                    {condition}
                  </Badge>
                ))}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader
            title="Account & Communication Preferences"
            description="Your name, email, and role come from your authenticated CareBridge AI account."
          />
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Full Name" value={displayName} disabled />
              <Input label="Email Address" value={displayEmail} disabled />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Phone Number"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
              <Input
                label="District"
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
              />
            </div>
            <Select
              label="Preferred Communication Language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              options={[
                { value: 'English', label: 'English' },
                { value: 'Hindi', label: 'Hindi (Multilingual phase ready)' },
              ]}
            />
            <Input
              label="Emergency Contact"
              value={emergencyContact}
              onChange={(event) => setEmergencyContact(event.target.value)}
            />
            <div className="flex justify-end pt-2">
              <Button type="submit">Save Profile Preferences</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
