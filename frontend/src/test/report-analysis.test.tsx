import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { ReportAnalysisPanel } from '@/components/dashboard/ReportAnalysisPanel';

const get = vi.fn();
const post = vi.fn();
vi.mock('@/services/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
  },
  extractApiErrorMessage: () => 'Unable to process this report.',
}));

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

it('requires explicit consent for external processing and displays mock mode', async () => {
  get.mockResolvedValue({ data: { items: [] } });
  post.mockResolvedValue({
    data: {
      id: '1',
      provider: 'MOCK',
      processing_mode: 'SIMULATED',
      status: 'SIMULATED',
      failure_reason: null,
      created_at: '2026-11-01T00:00:00Z',
      result: {
        summary: 'Automated analysis is unavailable in demo mode.',
        report_type: 'Unknown',
        observations: [],
        missing_information: [],
        questions: [],
        limitations: ['Simulated'],
        disclaimer: 'Not a diagnosis.',
      },
    },
  });
  render(<ReportAnalysisPanel reportId="r1" role="patient" />);
  await screen.findByText('No analysis is available yet.');
  const external = screen.getByRole('button', {
    name: 'Run / retry external analysis',
  });
  expect(external).toBeDisabled();
  await userEvent.click(
    screen.getByRole('button', { name: 'Run simulated analysis' }),
  );
  expect(await screen.findByText('SIMULATED ANALYSIS')).toBeInTheDocument();
  expect(post).toHaveBeenCalledWith(
    '/patient/reports/r1/analyses',
    {
      mode: 'SIMULATED',
      external_consent: false,
    },
    { timeout: 130_000 },
  );
  await userEvent.click(screen.getByRole('checkbox'));
  expect(external).toBeEnabled();
  await userEvent.click(external);
  expect(post).toHaveBeenCalledWith(
    '/patient/reports/r1/analyses',
    {
      mode: 'EXTERNAL',
      external_consent: true,
    },
    { timeout: 130_000 },
  );
});

it('does not offer processing controls to doctors', async () => {
  get.mockResolvedValue({ data: { items: [] } });
  render(<ReportAnalysisPanel reportId="r1" role="doctor" />);
  await screen.findByText('No analysis is available yet.');
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(get).toHaveBeenCalledWith('/doctor/reports/r1/analyses');
});

it('shows consent and analysis controls in Hindi without changing source text', async () => {
  const { LanguageProvider } = await import('@/contexts/LanguageContext');
  const { LANGUAGE_STORAGE_KEY } = await import('@/i18n');
  localStorage.setItem(LANGUAGE_STORAGE_KEY, 'hi');
  get.mockResolvedValue({
    data: {
      items: [
        {
          id: '1',
          provider: 'MOCK',
          processing_mode: 'SIMULATED',
          status: 'SIMULATED',
          failure_reason: null,
          created_at: '2026-11-01T00:00:00Z',
          result: {
            summary: 'Synthetic summary',
            report_type: 'Unknown',
            observations: [],
            missing_information: [],
            questions: [],
            limitations: [],
            disclaimer: 'Not a diagnosis.',
            extraction: {
              pages: [{ page: 1, method: 'OCR', text: 'SYNTHETIC SOURCE' }],
              limitations: [],
            },
          },
        },
      ],
    },
  });
  const view = render(
    <LanguageProvider>
      <ReportAnalysisPanel reportId="r1" role="patient" />
    </LanguageProvider>,
  );
  expect(await screen.findByText('सिमुलेटेड विश्लेषण')).toBeInTheDocument();
  expect(screen.getByText('SYNTHETIC SOURCE')).toBeInTheDocument();
  expect(screen.getByRole('checkbox')).toHaveAccessibleName(/सहमति/);
  expect(screen.getByRole('button', { name: /बाहरी विश्लेषण/ })).toBeDisabled();
  view.unmount();
  localStorage.removeItem(LANGUAGE_STORAGE_KEY);
});
