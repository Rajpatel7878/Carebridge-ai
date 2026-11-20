import { LiveAnalytics } from '@/components/dashboard/LiveAnalytics';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function AdminAnalyticsPage() {
  useDocumentTitle('Analytics');
  return <LiveAnalytics />;
}
