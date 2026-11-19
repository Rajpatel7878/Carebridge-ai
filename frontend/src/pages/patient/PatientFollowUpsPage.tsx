import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog } from '@/components/common';
import { FollowUpStatusBadge } from '@/components/dashboard';
import { PageHeader } from '@/components/navigation';
import { ACTIVE_DEMO_PATIENT, MOCK_FOLLOW_UPS } from '@/data';
import { useDemo } from '@/hooks/useDemo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { FollowUpRecord } from '@/types/domain';
import { formatDate } from '@/utils/format';

export function PatientFollowUpsPage() {
  useDocumentTitle('Follow-ups');
  const { showToast } = useDemo();
  const [tasks, setTasks] = useState<FollowUpRecord[]>(() =>
    MOCK_FOLLOW_UPS.filter((item) => item.patientId === ACTIVE_DEMO_PATIENT.id),
  );
  const [confirmTask, setConfirmTask] = useState<FollowUpRecord | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-ups"
        subtitle="Stay current on post-screening check-ins, home vitals logs, and repeat laboratory tasks."
      />

      <div className="space-y-4">
        {tasks.map((task) => (
          <Card key={task.id}>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <FollowUpStatusBadge status={task.status} />
                  <Badge variant="neutral">{task.category}</Badge>
                  <Badge variant="neutral">{task.channel}</Badge>
                </div>
                <h2 className="text-base font-semibold text-[var(--cb-text)]">
                  {task.title}
                </h2>
                <p className="text-sm leading-relaxed text-[var(--cb-text-secondary)]">
                  {task.instructions}
                </p>
                <p className="text-xs text-[var(--cb-text-muted)] cb-tabular">
                  Due {formatDate(task.dueDate)} &middot; Assigned by{' '}
                  {task.doctorName}
                </p>
              </div>
              {task.status !== 'completed' ? (
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={() => setConfirmTask(task)}
                >
                  Mark Complete
                </Button>
              ) : (
                <span className="text-xs font-semibold text-[var(--cb-success)]">
                  Verified Complete
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(confirmTask)}
        onClose={() => setConfirmTask(null)}
        title="Mark follow-up completed?"
        description={
          confirmTask
            ? `Mark "${confirmTask.title}" as completed in this demo workspace? Changes are local to this browser session.`
            : ''
        }
        confirmLabel="Mark Completed"
        onConfirm={() => {
          if (!confirmTask) return;
          setTasks((prev) =>
            prev.map((item) =>
              item.id === confirmTask.id
                ? { ...item, status: 'completed' }
                : item,
            ),
          );
          showToast('Demo follow-up task marked completed');
          setConfirmTask(null);
        }}
      />
    </div>
  );
}
