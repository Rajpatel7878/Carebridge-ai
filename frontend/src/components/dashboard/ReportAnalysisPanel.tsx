import { useEffect, useState } from 'react';
import { ANALYSIS_COPY } from '@/i18n/analysis';
import { useLanguage } from '@/hooks/useLanguage';
import { Button, ErrorState } from '@/components/common';
import { apiClient, extractApiErrorMessage } from '@/services/api';

type Observation = {
  test_name: string;
  value: string | null;
  unit: string | null;
  reference_range: string | null;
  reported_flag: string | null;
  source_quote: string;
};
type Analysis = {
  id: string;
  provider: string;
  processing_mode: string;
  status: string;
  failure_reason: string | null;
  created_at: string;
  result: {
    summary: string;
    report_type: string;
    observations: Observation[];
    missing_information: string[];
    questions: string[];
    limitations: string[];
    disclaimer: string;
    extraction?: {
      pages: { page: number; method: string; text: string }[];
      limitations: string[];
    };
  };
};

export function ReportAnalysisPanel({
  reportId,
  role,
}: {
  reportId: string;
  role: 'patient' | 'doctor';
}) {
  const { language } = useLanguage();
  const copy = ANALYSIS_COPY[language];
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  useEffect(() => {
    let active = true;
    apiClient
      .get<{ items: Analysis[] }>(`/${role}/reports/${reportId}/analyses`)
      .then(({ data }) => {
        if (active) setAnalysis(data.items[0] ?? null);
      })
      .catch((err: unknown) => {
        if (active) setError(extractApiErrorMessage(err, copy.loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reportId, role, copy.loadError]);
  async function run(mode: 'SIMULATED' | 'EXTERNAL') {
    setBusy(true);
    setError('');
    try {
      const { data } = await apiClient.post<Analysis>(
        `/patient/reports/${reportId}/analyses`,
        { mode, external_consent: mode === 'EXTERNAL' && consent },
        { timeout: 130_000 },
      );
      setAnalysis(data);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, copy.processError));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="space-y-3 rounded-xl border border-[var(--cb-border)] p-4 text-sm"
      aria-label={copy.title}
    >
      <h2 className="font-semibold">{copy.title}</h2>
      <p className="text-[var(--cb-text-secondary)]">{copy.disclaimer}</p>
      {role === 'patient' && (
        <>
          <p>{copy.privacy}</p>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            {copy.consent}
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy || loading}
              onClick={() => void run('SIMULATED')}
            >
              {copy.simulatedButton}
            </Button>
            <Button
              size="sm"
              disabled={busy || loading || !consent}
              onClick={() => void run('EXTERNAL')}
            >
              {copy.externalButton}
            </Button>
          </div>
        </>
      )}
      {loading && <p role="status">{copy.loading}</p>}
      {error && <ErrorState message={error} />}
      {!loading && !analysis && <p>{copy.empty}</p>}
      {analysis && (
        <div className="space-y-3 break-words">
          <strong>
            {analysis.status === 'SIMULATED'
              ? copy.simulated
              : analysis.status === 'FAILED'
                ? copy.failed
                : copy.completed}
          </strong>
          <p>
            {copy.provider}: {analysis.provider} · {copy.mode}:{' '}
            {analysis.processing_mode} ·{copy.status}: {analysis.status}
          </p>
          {analysis.failure_reason && <p>{analysis.failure_reason}</p>}
          <p>
            <b>{copy.summary}:</b> {analysis.result.summary}
          </p>
          <p>
            <b>{copy.reportType}:</b> {analysis.result.report_type}
          </p>
          <div>
            <b>{copy.observations}:</b>
            {analysis.result.observations.length ? (
              <ul className="list-inside list-disc">
                {analysis.result.observations.map((o, i) => (
                  <li key={i}>
                    {o.test_name}: {o.value ?? copy.unknown} {o.unit ?? ''}{' '}
                    {o.reference_range
                      ? `· ${copy.range}: ${o.reference_range}`
                      : ''}{' '}
                    {o.reported_flag
                      ? `· ${copy.flag}: ${o.reported_flag}`
                      : ''}
                    <blockquote>
                      {copy.source}: {o.source_quote}
                    </blockquote>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{copy.noObservations}</p>
            )}
          </div>
          {analysis.result.extraction && (
            <div className="space-y-2">
              <b>{copy.extracted}</b>
              {analysis.result.extraction.pages.map((page) => (
                <div
                  key={page.page}
                  className="rounded border border-[var(--cb-border)] p-2"
                >
                  <p>
                    {copy.page} {page.page} ·{' '}
                    {page.method === 'OCR' ? copy.ocr : copy.pdfText}
                  </p>
                  <pre className="whitespace-pre-wrap break-words font-sans">
                    {page.text || copy.noText}
                  </pre>
                </div>
              ))}
              {analysis.result.extraction.limitations.map((item, i) => (
                <p key={i}>{item}</p>
              ))}
            </div>
          )}
          <div>
            <b>{copy.limitations}:</b>
            <ul className="list-inside list-disc">
              {analysis.result.limitations.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <b>{copy.missing}:</b>{' '}
            {analysis.result.missing_information.join(' ') || copy.none}
          </div>
          <div>
            <b>{copy.questions}:</b>{' '}
            {analysis.result.questions.join(' ') || copy.none}
          </div>
          <p>{analysis.result.disclaimer}</p>
          <p>
            {copy.processed}:{' '}
            {new Date(
              analysis.created_at.endsWith('Z') ||
                analysis.created_at.includes('+')
                ? analysis.created_at
                : analysis.created_at + 'Z',
            ).toLocaleString()}
          </p>
        </div>
      )}
    </section>
  );
}
