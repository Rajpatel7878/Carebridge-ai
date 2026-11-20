import { useEffect, useState } from 'react';
import { Card } from '@/components/common';
import { apiClient } from '@/services/api';

type Summary = {
  counts: Record<string, number>;
  assessed_patients: number;
  note: string;
};
export function PrioritySummary() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    apiClient
      .get<Summary>('/admin/priority')
      .then((r) => {
        if (active) setData(r.data);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <Card>
      <h2 className="font-semibold">Saved operational priorities</h2>
      <p className="mt-2 text-sm">
        Latest saved assessments only. They may be stale and are not clinical
        diagnoses.
      </p>
      {error && <p role="alert">Unable to load priority counts.</p>}
      {data ? (
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          {Object.entries(data.counts).map(([key, count]) => (
            <span key={key}>
              {key}: <b>{count}</b>
            </span>
          ))}
          <span>Assessed patients: {data.assessed_patients}</span>
        </div>
      ) : (
        !error && <p role="status">Loading counts…</p>
      )}
    </Card>
  );
}
