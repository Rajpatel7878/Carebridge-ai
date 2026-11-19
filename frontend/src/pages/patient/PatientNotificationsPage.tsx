import { NotificationsCenter } from '@/components/dashboard';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function PatientNotificationsPage() {
  useDocumentTitle('Notifications');

  return (
    <NotificationsCenter
      role="patient"
      subtitle="Timely updates about your screening reports, scheduled visits, referrals, and follow-up tasks."
    />
  );
}
