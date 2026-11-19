import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button, Card, CardHeader } from '@/components/common';
import { ToggleSwitch } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/utils/cn';

export function PatientSettingsPage() {
  useDocumentTitle('Settings');
  const { theme, setTheme } = useTheme();
  const { showToast } = useDemo();

  const [reportAlerts, setReportAlerts] = useState(true);
  const [visitReminders, setVisitReminders] = useState(true);
  const [followUpNudges, setFollowUpNudges] = useState(true);
  const [plainLanguageDefault, setPlainLanguageDefault] = useState(true);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your interface theme, reminder preferences, and report display options."
      />

      <Card>
        <CardHeader
          title="Appearance"
          description="Your selected theme applies across CareBridge AI and persists automatically."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              {
                id: 'light',
                label: 'Light Mode',
                detail: 'Soft clinical neutral background with dark navy text',
                icon: Sun,
              },
              {
                id: 'dark',
                label: 'Dark Mode',
                detail: 'Low-glare dark slate palette with crisp contrast',
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
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--cb-surface)] text-[var(--cb-primary)] border border-[var(--cb-border)]">
                  <Icon className="h-4 w-4" />
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

      <Card>
        <CardHeader
          title="Care Alerts & Accessibility (Demo)"
          description="Control how CareBridge AI presents updates in your workspace."
        />
        <div className="divide-y divide-[var(--cb-border)]">
          <ToggleSwitch
            label="Report Review Notifications"
            description="Notify me when a clinician finishes reviewing a screening or lab report."
            checked={reportAlerts}
            onChange={setReportAlerts}
          />
          <ToggleSwitch
            label="Appointment Reminders"
            description="Show reminders 24 hours before clinic and teleconsult visits."
            checked={visitReminders}
            onChange={setVisitReminders}
          />
          <ToggleSwitch
            label="Follow-up Care Check-ins"
            description="Highlight upcoming vitals logs and repeat lab milestones."
            checked={followUpNudges}
            onChange={setFollowUpNudges}
          />
          <ToggleSwitch
            label="Show Plain-Language Summaries First"
            description="Display patient-friendly report summaries above technical biomarker tables."
            checked={plainLanguageDefault}
            onChange={setPlainLanguageDefault}
          />
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            onClick={() =>
              showToast(
                'Settings updated (Demo)',
                'Theme preference is persisted in your browser storage.',
              )
            }
          >
            Save Preferences
          </Button>
        </div>
      </Card>
    </div>
  );
}
