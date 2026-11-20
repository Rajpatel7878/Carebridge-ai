import { LiveAnalytics } from '@/components/dashboard/LiveAnalytics';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function AdminOverviewPage() {
  useDocumentTitle('Administrator Overview');
  return <LiveAnalytics overview />;
}
