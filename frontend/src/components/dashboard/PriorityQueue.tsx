import { useCallback, useEffect, useState } from 'react';
import { Button, Card, ErrorState } from '@/components/common';
import { apiClient, extractApiErrorMessage } from '@/services/api';

type Assessment = {
  category: string;
  reasons: { source: string; detail: string }[];
  explanation: string;
  recommended_action: string;
  review_status: string;
  stale: boolean;
};
type Row = {
  patient_id: string;
  patient_name: string;
  assessment: Assessment | null;
};

export function PriorityQueue() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('MODERATE');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get<{ items: Row[]; total: number }>(
        '/doctor/priority',
        { params: { category: filter || undefined, limit: 100 } },
      );
      setRows(data.items);
      setError('');
    } catch (err) {
      setError(
        extractApiErrorMessage(err, 'Unable to load the priority queue.'),
      );
    } finally {
      setLoading(false);
    }
  }, [filter]);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);
  async function change(patientId: string, action: 'recalculate' | 'override') {
    setBusy(true);
    try {
      await apiClient.post(
        `/doctor/patients/${patientId}/priority/${action}`,
        action === 'override' ? { category, reason } : {},
      );
      setReason('');
      await load();
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to update priority.'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="space-y-4">
      <h2 className="font-semibold">Operational priority queue</h2>
      <p className="text-sm">
        Priority indicates workflow attention, not a diagnosis or validated
        prediction. Recalculate after source records change; a stale label means
        the saved assessment is out of date.
      </p>
      <label className="block text-sm">
        Filter priority{' '}
        <select
          aria-label="Filter priority"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="ml-2 rounded border border-[var(--cb-border)] bg-[var(--cb-surface)] p-2"
        >
          <option value="">All</option>
          {['LOW', 'MODERATE', 'HIGH', 'URGENT_REVIEW'].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {loading && <p role="status">Loading priority queue…</p>}
      {!loading && rows.length === 0 && (
        <p>No assigned patients in this view.</p>
      )}
      {rows.map((row) => (
        <div
          key={row.patient_id}
          className="space-y-2 rounded-lg border border-[var(--cb-border)] p-4 text-sm"
        >
          <h3 className="font-semibold">{row.patient_name}</h3>
          {row.assessment ? (
            <>
              <p>
                {row.assessment.category} · {row.assessment.review_status}{' '}
                {row.assessment.stale && '· STALE — recalculate'}
              </p>
              <ul className="list-inside list-disc">
                {row.assessment.reasons.map((r, i) => (
                  <li key={i}>
                    {r.detail} ({r.source})
                  </li>
                ))}
              </ul>
              <p>
                {row.assessment.explanation} {row.assessment.recommended_action}
              </p>
            </>
          ) : (
            <p>No saved operational assessment.</p>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void change(row.patient_id, 'recalculate')}
          >
            Recalculate
          </Button>
          <details>
            <summary className="cursor-pointer">Override priority</summary>
            <div className="mt-2 space-y-2">
              <label>
                Category{' '}
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="ml-2 rounded border border-[var(--cb-border)] bg-[var(--cb-surface)] p-2"
                >
                  {['LOW', 'MODERATE', 'HIGH', 'URGENT_REVIEW'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                Reason{' '}
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded border border-[var(--cb-border)] bg-[var(--cb-surface)] p-2"
                  maxLength={500}
                />
              </label>
              <Button
                size="sm"
                disabled={busy || reason.trim().length < 5}
                onClick={() => void change(row.patient_id, 'override')}
              >
                Save override
              </Button>
            </div>
          </details>
        </div>
      ))}
    </Card>
  );
}
