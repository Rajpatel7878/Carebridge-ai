import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Lock, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  LoadingState,
} from '@/components/common';
import { Input } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { extractApiErrorMessage } from '@/services/api';
import { fetchDoctorProfile, updateDoctorProfile } from '@/services/doctor';
import { DOCTOR_VERIFICATION_BADGES, type DoctorProfile } from '@/types/doctor';
import { formatDate, getInitials } from '@/utils/format';

interface ProfileFormState {
  specialization: string;
  qualification: string;
  license_number: string;
  department: string;
  hospital_or_clinic: string;
  experience_years: string;
}

function toFormState(profile: DoctorProfile): ProfileFormState {
  return {
    specialization: profile.specialization ?? '',
    qualification: profile.qualification ?? '',
    license_number: profile.license_number ?? '',
    department: profile.department ?? '',
    hospital_or_clinic: profile.hospital_or_clinic ?? '',
    experience_years:
      profile.experience_years !== null ? String(profile.experience_years) : '',
  };
}

export function DoctorProfilePage() {
  useDocumentTitle('Clinician Profile');
  const { showToast } = useDemo();

  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [form, setForm] = useState<ProfileFormState>({
    specialization: '',
    qualification: '',
    license_number: '',
    department: '',
    hospital_or_clinic: '',
    experience_years: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchDoctorProfile();
      setProfile(data);
      setForm(toFormState(data));
    } catch (err) {
      setError(
        extractApiErrorMessage(
          err,
          'Unable to load your clinician profile right now.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        void loadProfile();
      }
    });
    return () => {
      active = false;
    };
  }, [loadProfile]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    setFormError(null);

    let parsedYears: number | null = null;
    if (form.experience_years.trim() !== '') {
      const numeric = Number(form.experience_years.trim());
      if (!Number.isInteger(numeric) || numeric < 0 || numeric > 70) {
        setFormError(
          'Years of experience must be a whole number between 0 and 70.',
        );
        return;
      }
      parsedYears = numeric;
    }

    const trimmedLicense = form.license_number.trim();
    if (
      trimmedLicense &&
      !/^[A-Za-z0-9][A-Za-z0-9\-/.\s]{2,79}$/.test(trimmedLicense)
    ) {
      setFormError(
        'Enter a valid medical license identifier (3–80 letters, numbers, hyphens, or slashes) or leave blank.',
      );
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateDoctorProfile({
        specialization: form.specialization.trim() || null,
        qualification: form.qualification.trim() || null,
        license_number: trimmedLicense || null,
        department: form.department.trim() || null,
        hospital_or_clinic: form.hospital_or_clinic.trim() || null,
        experience_years: parsedYears,
      });
      setProfile(updated);
      setForm(toFormState(updated));
      showToast(
        'Clinician profile updated',
        'Your professional details have been saved.',
        'success',
      );
    } catch (err) {
      setFormError(
        extractApiErrorMessage(
          err,
          'Could not update your clinician profile right now.',
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Clinician Profile"
          subtitle="Loading your professional clinician credentials..."
        />
        <LoadingState rows={5} />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Clinician Profile"
          subtitle="Professional identity and clinic affiliation"
        />
        <ErrorState
          title="Could not load clinician profile"
          message={error ?? 'Unable to load your profile.'}
          onRetry={() => void loadProfile()}
        />
      </div>
    );
  }

  const verification = DOCTOR_VERIFICATION_BADGES[profile.verification_status];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinician Profile"
        subtitle="Manage your specialization, qualifications, clinic affiliation, and access-controlled registration details."
        badge={
          <Badge variant={verification.variant} dot>
            {verification.label}
          </Badge>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void loadProfile()}
            disabled={isSaving}
          >
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Read-only Identity & Admin Verification Card */}
        <Card className="space-y-4 lg:col-span-1">
          <div className="flex items-center gap-3.5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--cb-primary-soft)] text-base font-bold text-[var(--cb-primary)]">
              {getInitials(profile.display_name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[var(--cb-text)]">
                {profile.display_name}
              </p>
              <p className="truncate text-xs text-[var(--cb-text-muted)]">
                {profile.email}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--cb-text-secondary)]">
                Profile Completeness
              </span>
              <span className="font-semibold text-[var(--cb-text)] cb-tabular">
                {profile.completion_percentage}% ({profile.completed_fields}/
                {profile.total_fields})
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--cb-surface-subtle)]">
              <div
                className="h-full rounded-full bg-[var(--cb-primary)] transition-all"
                style={{ width: `${profile.completion_percentage}%` }}
              />
            </div>
          </div>

          <dl className="divide-y divide-[var(--cb-border)] text-xs sm:text-sm">
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-[var(--cb-text-muted)]">Portal Role</dt>
              <dd className="font-semibold text-[var(--cb-text)]">
                {profile.role}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-[var(--cb-text-muted)]">Verification</dt>
              <dd>
                <Badge variant={verification.variant}>
                  {verification.label}
                </Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-[var(--cb-text-muted)]">Account Since</dt>
              <dd className="font-medium text-[var(--cb-text)]">
                {formatDate(profile.account_created_at)}
              </dd>
            </div>
          </dl>

          <div className="rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)] p-3 text-xs text-[var(--cb-text-muted)]">
            <p className="flex items-center gap-1.5 font-semibold text-[var(--cb-text)]">
              <ShieldCheck
                className="h-3.5 w-3.5 text-[var(--cb-secondary)]"
                aria-hidden="true"
              />
              Administrator-Governed Verification
            </p>
            <p className="mt-1 leading-relaxed">
              Account role and clinician verification status are verified solely
              by platform administrators and cannot be modified from this form.
            </p>
          </div>
        </Card>

        {/* Editable Clinician Details Form */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Professional Credentials & Practice Information"
            description="Update your authorized clinician profile fields. Sensitive credential numbers remain restricted and are never displayed publicly."
          />

          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Specialization"
                placeholder="e.g., Internal Medicine"
                maxLength={120}
                value={form.specialization}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    specialization: event.target.value,
                  }))
                }
              />
              <Input
                label="Qualification"
                placeholder="e.g., MBBS, MD (General Medicine)"
                maxLength={160}
                value={form.qualification}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    qualification: event.target.value,
                  }))
                }
              />
              <Input
                label="Department"
                placeholder="e.g., Preventive & Internal Medicine"
                maxLength={120}
                value={form.department}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    department: event.target.value,
                  }))
                }
              />
              <Input
                label="Hospital or Clinic"
                placeholder="e.g., CareBridge Community Health Center"
                maxLength={160}
                value={form.hospital_or_clinic}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    hospital_or_clinic: event.target.value,
                  }))
                }
              />
              <Input
                label="Years of Experience"
                type="number"
                min={0}
                max={70}
                placeholder="e.g., 8"
                value={form.experience_years}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    experience_years: event.target.value,
                  }))
                }
              />
              <Input
                label="Medical License Number (Optional · Restricted)"
                placeholder="e.g., MCI-2019-44821"
                maxLength={80}
                value={form.license_number}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    license_number: event.target.value,
                  }))
                }
                helperText="Access-controlled; never shared on public or patient views."
              />
            </div>

            {formError && (
              <p
                role="alert"
                className="text-xs font-medium text-[var(--cb-critical)]"
              >
                {formError}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--cb-border)] pt-4">
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--cb-text-muted)]">
                <Lock
                  className="h-3.5 w-3.5 text-[var(--cb-secondary)]"
                  aria-hidden="true"
                />
                Protected clinician credential storage
              </span>
              <Button
                type="submit"
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
                isLoading={isSaving}
              >
                Save Profile Changes
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
