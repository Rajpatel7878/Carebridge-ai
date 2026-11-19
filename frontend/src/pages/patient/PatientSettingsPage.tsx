import { useCallback, useEffect, useState } from 'react';
import { Globe, LogOut, Moon, Save, Sun, UserCog } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  LoadingState,
} from '@/components/common';
import { Select } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { extractApiErrorMessage } from '@/services/api';
import { fetchPatientProfile, updatePatientProfile } from '@/services/patient';
import type { PatientProfile, PreferredLanguageCode } from '@/types/patient';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/format';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
];

export function PatientSettingsPage() {
  useDocumentTitle('Settings');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { showToast } = useDemo();

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [preferredLanguage, setPreferredLanguage] =
    useState<PreferredLanguageCode>(language);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPatientProfile();
      setProfile(data);
      setPreferredLanguage(data.preferred_language);
    } catch (err) {
      setError(
        extractApiErrorMessage(
          err,
          'Unable to load your account preferences right now.',
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
        setPreferredLanguage(data.preferred_language);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          extractApiErrorMessage(
            err,
            'Unable to load your account preferences right now.',
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

  const handleSaveLanguage = async () => {
    if (!profile || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updatePatientProfile({
        date_of_birth: profile.date_of_birth,
        phone_number: profile.phone_number,
        gender: profile.gender,
        city: profile.city,
        state: profile.state,
        preferred_language: preferredLanguage,
        emergency_contact_name: profile.emergency_contact_name,
        emergency_contact_phone: profile.emergency_contact_phone,
      });
      setProfile(updated);
      setLanguage(updated.preferred_language);
      showToast(
        'Preferences saved',
        'Your preferred language has been saved to your patient profile.',
      );
    } catch (err) {
      setError(
        extractApiErrorMessage(
          err,
          'Could not save your language preference. Please try again.',
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your preferred language, display theme, profile preferences, and active CareBridge AI session."
      />

      {error && (
        <ErrorState
          title="Settings notice"
          message={error}
          onRetry={() => void loadSettings()}
        />
      )}

      {/* Appearance / Theme */}
      <Card>
        <CardHeader
          title="Appearance"
          description="Select Light or Dark mode across CareBridge AI. Theme preference is saved locally in your browser."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              {
                id: 'light',
                label: 'Light Mode',
                detail:
                  'Soft clinical neutral background with high-contrast text',
                icon: Sun,
              },
              {
                id: 'dark',
                label: 'Dark Mode',
                detail: 'Low-glare dark slate palette designed for evening use',
                icon: Moon,
              },
            ] as const
          ).map((option) => {
            const Icon = option.icon;
            const selected = theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setTheme(option.id)}
                className={cn(
                  'flex items-start gap-3.5 rounded-xl border p-4 text-left transition-colors',
                  selected
                    ? 'border-[var(--cb-primary)] bg-[var(--cb-primary-soft)]/55'
                    : 'border-[var(--cb-border)] hover:bg-[var(--cb-surface-subtle)]',
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--cb-border)] bg-[var(--cb-surface)] text-[var(--cb-primary)]">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--cb-text)]">
                    {option.label}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--cb-text-muted)]">
                    {option.detail}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Preferred Language & Profile Preferences */}
      <Card>
        <CardHeader
          title="Language & Profile Preferences"
          description="Choose your preferred communication and interface language. Updates persist securely on your patient profile."
        />

        {isLoading ? (
          <LoadingState label="Loading saved preferences..." rows={2} />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 max-w-sm">
                <Select
                  label="Preferred Language"
                  value={preferredLanguage}
                  options={LANGUAGE_OPTIONS}
                  helperText="Applies to your patient profile and bilingual interface content."
                  onChange={(e) =>
                    setPreferredLanguage(
                      e.target.value as PreferredLanguageCode,
                    )
                  }
                />
              </div>
              <Button
                type="button"
                isLoading={isSaving}
                disabled={!profile}
                leftIcon={<Save className="h-4 w-4" />}
                onClick={() => void handleSaveLanguage()}
              >
                Save Language
              </Button>
            </div>

            <div className="flex flex-col justify-between gap-3 rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)] p-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <Globe
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cb-secondary)]"
                  aria-hidden="true"
                />
                <div className="text-xs leading-relaxed text-[var(--cb-text-secondary)]">
                  <p className="font-semibold text-[var(--cb-text)]">
                    Contact & Emergency Preferences
                  </p>
                  <p className="mt-0.5">
                    Profile completion:{' '}
                    <span className="font-medium cb-tabular">
                      {profile?.completion_percentage ?? 30}%
                    </span>
                    {profile?.city
                      ? ` · Location: ${profile.city}${profile.state ? `, ${profile.state}` : ''}`
                      : ' · Optional phone, city, and emergency details can be updated anytime.'}
                  </p>
                </div>
              </div>
              <Link to="/patient/profile">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<UserCog className="h-3.5 w-3.5" />}
                >
                  Edit Profile
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Card>

      {/* Account & Session (role strictly read-only, real logout only) */}
      <Card>
        <CardHeader
          title="Account Information & Session"
          description="Your registered identity and portal role are protected by server-side access controls."
        />
        <dl className="divide-y divide-[var(--cb-border)] rounded-xl border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)] px-4 text-xs sm:text-sm">
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-[var(--cb-text-muted)]">Full Name</dt>
            <dd className="font-medium text-[var(--cb-text)]">
              {profile?.full_name ?? user?.full_name ?? '—'}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-[var(--cb-text-muted)]">Email Address</dt>
            <dd className="truncate font-medium text-[var(--cb-text)]">
              {profile?.email ?? user?.email ?? '—'}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-[var(--cb-text-muted)]">Account Role</dt>
            <dd>
              <Badge variant="teal" dot>
                Patient (Locked)
              </Badge>
            </dd>
          </div>
          {profile?.account_created_at && (
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-[var(--cb-text-muted)]">Account Created</dt>
              <dd className="font-medium text-[var(--cb-text)] cb-tabular">
                {formatDate(profile.account_created_at)}
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--cb-text-muted)]">
            Sign out when finished on shared or clinic computers.
          </p>
          <Button
            type="button"
            variant="danger"
            isLoading={isLoggingOut}
            leftIcon={<LogOut className="h-4 w-4" />}
            onClick={() => void handleLogout()}
          >
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  );
}
