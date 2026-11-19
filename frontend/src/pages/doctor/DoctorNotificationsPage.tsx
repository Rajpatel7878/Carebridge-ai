import { NotificationsCenter } from '@/components/dashboard';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function DoctorNotificationsPage() {
  useDocumentTitle('Doctor Notifications');

  return (
    <NotificationsCenter
      role="doctor"
      subtitle="Clinical risk escalations, newly uploaded screening reports, referral responses, and schedule updates."
    />
  );
}
