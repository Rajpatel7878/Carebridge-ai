import { Badge, type BadgeVariant } from '@/components/common/Badge';
import type {
  AppointmentStatus,
  BiomarkerFlag,
  DoctorRecord,
  FollowUpStatus,
  PatientCareStatus,
  ReferralPriority,
  ReferralStatus,
  ReportReviewStatus,
} from '@/types/domain';

interface PillMeta {
  label: string;
  variant: BadgeVariant;
}

const careStatusMap: Record<PatientCareStatus, PillMeta> = {
  stable: { label: 'Stable', variant: 'success' },
  'follow-up-due': { label: 'Follow-up Due', variant: 'warning' },
  'attention-needed': { label: 'Needs Attention', variant: 'critical' },
  'newly-screened': { label: 'Newly Screened', variant: 'primary' },
};

const appointmentStatusMap: Record<AppointmentStatus, PillMeta> = {
  confirmed: { label: 'Confirmed', variant: 'primary' },
  pending: { label: 'Pending', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  rescheduled: { label: 'Rescheduled', variant: 'teal' },
  cancelled: { label: 'Cancelled', variant: 'neutral' },
};

const referralStatusMap: Record<ReferralStatus, PillMeta> = {
  pending: { label: 'Pending', variant: 'warning' },
  accepted: { label: 'Accepted', variant: 'primary' },
  scheduled: { label: 'Scheduled', variant: 'teal' },
  completed: { label: 'Completed', variant: 'success' },
};

const referralPriorityMap: Record<ReferralPriority, PillMeta> = {
  routine: { label: 'Routine', variant: 'neutral' },
  priority: { label: 'Priority', variant: 'warning' },
  urgent: { label: 'Urgent', variant: 'critical' },
};

const followUpStatusMap: Record<FollowUpStatus, PillMeta> = {
  'on-track': { label: 'On Track', variant: 'primary' },
  'due-soon': { label: 'Due Soon', variant: 'warning' },
  overdue: { label: 'Overdue', variant: 'critical' },
  completed: { label: 'Completed', variant: 'success' },
};

const reportReviewMap: Record<ReportReviewStatus, PillMeta> = {
  reviewed: { label: 'Reviewed', variant: 'success' },
  'pending-review': { label: 'Pending Review', variant: 'warning' },
  'action-required': { label: 'Action Required', variant: 'critical' },
};

const biomarkerFlagMap: Record<BiomarkerFlag, PillMeta> = {
  normal: { label: 'Normal', variant: 'success' },
  borderline: { label: 'Borderline', variant: 'warning' },
  elevated: { label: 'Elevated', variant: 'warning' },
  critical: { label: 'Critical', variant: 'critical' },
};

const doctorAvailabilityMap: Record<
  DoctorRecord['availabilityStatus'],
  PillMeta
> = {
  available: { label: 'Available', variant: 'success' },
  'in-clinic': { label: 'In Clinic', variant: 'primary' },
  'on-call': { label: 'On Call', variant: 'warning' },
  'off-duty': { label: 'Off Duty', variant: 'neutral' },
};

export function CareStatusBadge({ status }: { status: PatientCareStatus }) {
  const meta = careStatusMap[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function AppointmentStatusBadge({
  status,
}: {
  status: AppointmentStatus;
}) {
  const meta = appointmentStatusMap[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function ReferralStatusBadge({ status }: { status: ReferralStatus }) {
  const meta = referralStatusMap[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function ReferralPriorityBadge({
  priority,
}: {
  priority: ReferralPriority;
}) {
  const meta = referralPriorityMap[priority];
  return (
    <Badge variant={meta.variant} dot={priority === 'urgent'}>
      {meta.label}
    </Badge>
  );
}

export function FollowUpStatusBadge({ status }: { status: FollowUpStatus }) {
  const meta = followUpStatusMap[status];
  return (
    <Badge variant={meta.variant} dot={status === 'overdue'}>
      {meta.label}
    </Badge>
  );
}

export function ReportStatusBadge({ status }: { status: ReportReviewStatus }) {
  const meta = reportReviewMap[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function BiomarkerFlagBadge({ flag }: { flag: BiomarkerFlag }) {
  const meta = biomarkerFlagMap[flag];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function DoctorAvailabilityBadge({
  status,
}: {
  status: DoctorRecord['availabilityStatus'];
}) {
  const meta = doctorAvailabilityMap[status];
  return (
    <Badge variant={meta.variant} dot>
      {meta.label}
    </Badge>
  );
}
