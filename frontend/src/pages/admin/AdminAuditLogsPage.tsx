import { useCallback, useEffect, useState } from 'react';
import { Button, Card, ErrorState, LoadingState } from '@/components/common';
import { PageHeader } from '@/components/navigation';
import { apiClient, extractApiErrorMessage } from '@/services/api';
import { AUDIT_COPY } from '@/i18n/audit';
import { useLanguage } from '@/hooks/useLanguage';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type Event = {
  id: string;
  actor_id: string | null;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  timestamp: string;
  outcome: string;
  metadata: Record<string, unknown>;
};
type Response = { items: Event[]; total: number };
const pageSize = 20;

export function AdminAuditLogsPage() {
  const { language } = useLanguage();
  const copy = AUDIT_COPY[language];
  useDocumentTitle(copy.title);
  const [filters, setFilters] = useState({
    action: '',
    actor_id: '',
    actor_role: '',
    resource_type: '',
    from_date: '',
    to_date: '',
  });
  const [query, setQuery] = useState(filters);
  const [offset, setOffset] = useState(0);
  const [result, setResult] = useState<Response | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = Object.fromEntries(
        Object.entries(query).filter(([, value]) => value),
      );
      const { data } = await apiClient.get<Response>('/admin/audit-logs', {
        params: { ...params, limit: pageSize, offset },
      });
      setResult(data);
    } catch (err) {
      setError(extractApiErrorMessage(err, copy.loadError));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [query, offset, copy.loadError]);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);
  const field = (key: keyof typeof filters, label: string, type = 'text') => (
    <label className="space-y-1 text-sm">
      <span className="block font-medium">{label}</span>
      <input
        className="w-full rounded-lg border border-[var(--cb-border)] bg-[var(--cb-surface)] p-2"
        type={type}
        value={filters[key]}
        onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
      />
    </label>
  );
  return (
    <div className="space-y-6">
      <PageHeader title={copy.title} subtitle={copy.subtitle} />
      <Card>
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            setOffset(0);
            setQuery({ ...filters });
          }}
        >
          {field('action', copy.action)}
          {field('actor_id', copy.actorId)}
          {field('actor_role', copy.actorRole)}
          {field('resource_type', copy.resourceType)}
          {field('from_date', copy.from, 'date')}
          {field('to_date', copy.through, 'date')}
          <div>
            <Button type="submit">{copy.apply}</Button>
          </div>
        </form>
      </Card>
      {loading && <LoadingState label={copy.loading} />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && result && (
        <Card>
          <p className="mb-4 text-sm">
            {result.total} {copy.events}
          </p>
          {result.items.length === 0 ? (
            <p>{copy.empty}</p>
          ) : (
            <div className="space-y-3">
              {result.items.map((event) => (
                <details
                  key={event.id}
                  className="rounded-lg border border-[var(--cb-border)] p-4"
                >
                  <summary className="cursor-pointer font-semibold">
                    {event.action} ·{' '}
                    {new Date(
                      event.timestamp.endsWith('Z') ||
                        event.timestamp.includes('+')
                        ? event.timestamp
                        : event.timestamp + 'Z',
                    ).toLocaleString(undefined, { timeZone: 'UTC' })}{' '}
                    UTC
                  </summary>
                  <dl className="mt-3 space-y-1 break-all text-sm">
                    <div>
                      {copy.actor}: {event.actor_id ?? copy.deleted} (
                      {event.actor_role})
                    </div>
                    <div>
                      {copy.resource}: {event.resource_type} /{' '}
                      {event.resource_id}
                    </div>
                    <div>
                      {copy.outcome}: {event.outcome}
                    </div>
                    <div>
                      {copy.metadata}: {JSON.stringify(event.metadata)}
                    </div>
                  </dl>
                </details>
              ))}
            </div>
          )}
          <div className="mt-4 flex items-center gap-3">
            <Button
              variant="outline"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - pageSize))}
            >
              {copy.previous}
            </Button>
            <span className="text-sm">
              {copy.page} {Math.floor(offset / pageSize) + 1}
            </span>
            <Button
              variant="outline"
              disabled={offset + pageSize >= result.total}
              onClick={() => setOffset(offset + pageSize)}
            >
              {copy.next}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
