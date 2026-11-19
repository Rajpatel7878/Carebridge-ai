import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { LogOut, Save, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  LoadingState,
} from '@/components/common';
import { Input, Select } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLanguage } from '@/hooks/useLanguage';
import { extractApiErrorMessage } from '@/services/api';
import { fetchPatientProfile, updatePatientProfile } from '@/services/patient';
import type {
  PatientGender,
  PatientProfile,
  PreferredLanguageCode,
} from '@/types/patient';
import { formatDate, getInitials } from '@/utils/format';

const GENDER_OPTIONS = [
  { value: '', label: 'Prefer not to specify (Optional)' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'MALE', label: 'Male' },
  { value: 'NON_BINARY', label: 'Non-binary' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
];

const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{5,24}$/;

interface ProfileFormState {
  date_of_birth: string;
  phone_number: string;
  gender: string;
  city: string;
  state: string;
  preferred_language: PreferredLanguageCode;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

function profileToForm(profile: PatientProfile): ProfileFormState {
  return {
    date_of_birth: profile.date_of_birth ?? '',
    phone_number: profile.phone_number ?? '',
    gender: profile.gender ?? '',
    city: profile.city ?? '',
    state: profile.state ?? '',
    preferred_language: profile.preferred_language,
    emergency_contact_name: profile.emergency_contact_name ?? '',
    emergency_contact_phone: profile.emergency_contact_phone ?? '',
  };
}

function validatePhoneInput(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!PHONE_PATTERN.test(trimmed)) {
    return 'Use digits, spaces, hyphens, or a leading + sign.';
  }
  const digits = trimmed.replace(/\D/g, '').length;
  if (digits < 7 || digits > 15) {
    return 'Phone number must include 7 to 15 digits.';
  }
  return undefined;
}

export function PatientProfilePage() {
  useDocumentTitle('My Profile');
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { showToast } = useDemo();
  const { setLanguage } = useLanguage();

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [form, setForm] = useState<ProfileFormState>({
    date_of_birth: '',
    phone_number: '',
    gender: '',
    city: '',
    state: '',
    preferred_language: 'en',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ProfileFormState, string>>
  >({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchPatientProfile();
      setProfile(data);
      setForm(profileToForm(data));
    } catch (err) {
      setLoadError(
        extractApiErrorMessage(
          err,
          'Unable to load your profile information right now.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchPatientProfile()
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setForm(profileToForm(data));
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          extractApiErrorMessage(
            err,
            'Unable to load your profile information right now.',
          ),
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof ProfileFormState, string>> = {};
    if (form.date_of_birth) {
      const parsed = new Date(`${form.date_of_birth}T00:00:00Z`);
      if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
        errors.date_of_birth = 'Date of birth cannot be in the future.';
      } else if (parsed.getUTCFullYear() < 1900) {
        errors.date_of_birth = 'Enter a date of birth in 1900 or later.';
      }
    }
    const phoneErr = validatePhoneInput(form.phone_number);
    if (phoneErr) errors.phone_number = phoneErr;

    const emergencyPhoneErr = validatePhoneInput(form.emergency_contact_phone);
    if (emergencyPhoneErr) errors.emergency_contact_phone = emergencyPhoneErr;

    if (form.city.trim() && form.city.trim().length < 2) {
      errors.city = 'City must be at least 2 characters when provided.';
    }
    if (form.state.trim() && form.state.trim().length < 2) {
      errors.state = 'State must be at least 2 characters when provided.';
    }
    if (
      form.emergency_contact_name.trim() &&
      form.emergency_contact_name.trim().length < 2
    ) {
      errors.emergency_contact_name =
        'Contact name must be at least 2 characters when provided.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setSaveError(null);
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const updated = await updatePatientProfile({
        date_of_birth: form.date_of_birth.trim() || null,
        phone_number: form.phone_number.trim() || null,
        gender: form.gender ? (form.gender as PatientGender) : null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        preferred_language: form.preferred_language,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone.trim() || null,
      });
      setProfile(updated);
      setForm(profileToForm(updated));
      setLanguage(updated.preferred_language);
      showToast(
        'Profile saved',
        'Your patient profile details have been updated securely.',
      );
    } catch (err) {
      setSaveError(
        extractApiErrorMessage(
          err,
          'Could not save your profile updates. Please review your entries and try again.',
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      showToast(
        'Signed out successfully',
        'Your CareBridge AI session has ended.',
        'info',
      );
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading && !profile) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My Profile"
          subtitle="Manage your personal contact preferences, preferred language, and emergency contact."
        />
        <LoadingState label="Loading your profile..." rows={4} />
      </div>
    );
  }

  if (loadError && !profile) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My Profile"
          subtitle="Manage your personal contact preferences, preferred language, and emergency contact."
        />
        <ErrorState
          title="Could not load profile"
          message={loadError}
          onRetry={() => void loadProfile()}
        />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        subtitle="Manage your optional contact details, preferred language, and emergency contact. Optional fields are never required to access your portal."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Account & completion summary */}
        <Card className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--cb-primary-soft)] text-lg font-bold text-[var(--cb-primary)]">
              {getInitials(profile.full_name)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-[var(--cb-text)]">
                {profile.full_name}
              </h2>
              <p className="truncate text-xs text-[var(--cb-text-muted)]">
                {profile.email}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge variant="teal" dot>
                  Patient
                </Badge>
                <Badge variant={profile.is_verified ? 'success' : 'neutral'}>
                  {profile.is_verified
                    ? 'Verified Account'
                    : 'Standard Account'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)] p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--cb-text)]">
                Profile Completion
              </span>
              <span className="font-semibold text-[var(--cb-primary)] cb-tabular">
                {profile.completion_percentage}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Profile completion"
              aria-valuenow={profile.completion_percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--cb-border)]"
            >
              <div
                className="h-full rounded-full bg-[var(--cb-primary)] transition-all duration-300"
                style={{ width: `${profile.completion_percentage}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--cb-text-muted)] cb-tabular">
              {profile.completed_fields} of {profile.total_fields} coordination
              fields completed. All demographic and emergency fields are
              optional.
            </p>
          </div>

          <dl className="space-y-2.5 border-t border-[var(--cb-border)] pt-4 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--cb-text-muted)]">Account Role</dt>
              <dd className="font-medium text-[var(--cb-text)]">
                Patient (read-only)
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--cb-text-muted)]">Member Since</dt>
              <dd className="font-medium text-[var(--cb-text)] cb-tabular">
                {formatDate(profile.account_created_at)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--cb-text-muted)]">Last Updated</dt>
              <dd className="font-medium text-[var(--cb-text)] cb-tabular">
                {formatDate(profile.updated_at)}
              </dd>
            </div>
          </dl>

          <div className="flex items-start gap-2 rounded-lg border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)] p-3 text-xs text-[var(--cb-text-secondary)]">
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cb-secondary)]"
              aria-hidden="true"
            />
            <span>
              Your profile is private to your authenticated account and never
              shared with other patients.
            </span>
          </div>

          <div className="border-t border-[var(--cb-border)] pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              fullWidth
              isLoading={isLoggingOut}
              leftIcon={<LogOut className="h-4 w-4" />}
              onClick={() => void handleLogout()}
            >
              Sign Out of Session
            </Button>
          </div>
        </Card>

        {/* Editable profile form */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Personal & Emergency Coordination Details"
            description="Keep only the details you are comfortable sharing. Email and account role are locked for security."
          />

          {saveError && (
            <ErrorState
              title="Unable to update profile"
              message={saveError}
              className="mb-5"
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Full Name"
                value={profile.full_name}
                disabled
                helperText="Registered on your CareBridge AI account."
              />
              <Input
                label="Email Address"
                type="email"
                value={profile.email}
                disabled
                helperText="Used for secure account sign-in."
              />
              <Select
                label="Preferred Language"
                value={form.preferred_language}
                options={LANGUAGE_OPTIONS}
                helperText="Applies to your portal language preference."
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    preferred_language: e.target.value as PreferredLanguageCode,
                  }))
                }
              />
              <Input
                label="Date of Birth (Optional)"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={form.date_of_birth}
                error={fieldErrors.date_of_birth}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    date_of_birth: e.target.value,
                  }))
                }
              />
              <Input
                label="Phone Number (Optional)"
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone_number}
                error={fieldErrors.phone_number}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone_number: e.target.value }))
                }
              />
              <Select
                label="Gender (Optional)"
                value={form.gender}
                options={GENDER_OPTIONS}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, gender: e.target.value }))
                }
              />
              <Input
                label="City (Optional)"
                placeholder="e.g., Pune"
                value={form.city}
                error={fieldErrors.city}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, city: e.target.value }))
                }
              />
              <Input
                label="State / Region (Optional)"
                placeholder="e.g., Maharashtra"
                value={form.state}
                error={fieldErrors.state}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, state: e.target.value }))
                }
              />
            </div>

            <div className="border-t border-[var(--cb-border)] pt-5">
              <h3 className="text-sm font-semibold text-[var(--cb-text)]">
                Emergency Contact (Optional)
              </h3>
              <p className="mt-0.5 text-xs text-[var(--cb-text-muted)]">
                Optional point of contact for urgent clinic coordination.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Emergency Contact Name (Optional)"
                  placeholder="Contact full name"
                  value={form.emergency_contact_name}
                  error={fieldErrors.emergency_contact_name}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      emergency_contact_name: e.target.value,
                    }))
                  }
                />
                <Input
                  label="Emergency Contact Phone (Optional)"
                  type="tel"
                  placeholder="+91 98765 00000"
                  value={form.emergency_contact_phone}
                  error={fieldErrors.emergency_contact_phone}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      emergency_contact_phone: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--cb-border)] pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => {
                  setForm(profileToForm(profile));
                  setFieldErrors({});
                  setSaveError(null);
                }}
              >
                Reset Changes
              </Button>
              <Button
                type="submit"
                isLoading={isSaving}
                leftIcon={<Save className="h-4 w-4" />}
              >
                Save Profile
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
