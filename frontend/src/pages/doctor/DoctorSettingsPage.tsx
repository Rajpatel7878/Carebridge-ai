import { useState } from 'react';
import { Button, Card, CardHeader, ThemeToggle } from '@/components/common';
import { ToggleSwitch } from '@/components/forms';
import { PageHeader } from '@/components/navigation';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function DoctorSettingsPage() {
  useDocumentTitle('Doctor Settings');
  const { showToast } = useDemo();

  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [referralUpdates, setReferralUpdates] = useState(true);
  const [overdueDigest, setOverdueDigest] = useState(true);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace Settings"
        subtitle="Configure clinical alert prioritization and display preferences for your doctor workspace."
      />

      <Card>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold text-[var(--cb-text)]">
              Interface Theme
            </h2>
            <p className="mt-0.5 text-sm text-[var(--cb-text-muted)]">
              Switch between light and dark mode for clinic rooms or evening
              chart review.
            </p>
          </div>
          <ThemeToggle showLabel />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Clinical Workflow Alerts (Demo)"
          description="Customize triage and care-coordination notifications."
        />
        <div className="divide-y divide-[var(--cb-border)]">
          <ToggleSwitch
            label="Immediate Critical Risk Escalations"
            description="Pin critical biomarker and blood pressure alerts to the top of your queue."
            checked={criticalAlerts}
            onChange={setCriticalAlerts}
          />
          <ToggleSwitch
            label="Specialist Referral Status Updates"
            description="Notify me when receiving specialists accept or schedule referred patients."
            checked={referralUpdates}
            onChange={setReferralUpdates}
          />
          <ToggleSwitch
            label="Daily Overdue Follow-up Digest"
            description="Highlight high-risk patients whose follow-up labs or check-ins pass their due date."
            checked={overdueDigest}
            onChange={setOverdueDigest}
          />
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            onClick={() =>
              showToast('Doctor workspace preferences saved (Demo)')
            }
          >
            Save Settings
          </Button>
        </div>
      </Card>
    </div>
  );
}
