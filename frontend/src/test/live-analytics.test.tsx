import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveAnalytics } from '@/components/dashboard/LiveAnalytics';

const get = vi.fn();
vi.mock('@/services/api', () => ({
  apiClient: { get: (...args: unknown[]) => get(...args) },
  extractApiErrorMessage: () => 'Could not load analytics.',
}));
vi.mock('@/components/dashboard/PrioritySummary', () => ({
  PrioritySummary: () => <div>Priority summary</div>,
}));
vi.mock('@/components/charts', () => ({
  CategoryBarChart: () => <div>Distribution chart</div>,
  TrendAreaChart: () => <div>Timeline chart</div>,
}));

const data = {
  totals: { patients: 10, doctors: 3 },
  timeline: [],
  appointments: [],
  referrals: [],
  follow_ups: [],
  risk_assessments: [],
};

describe('Live administrator analytics', () => {
  beforeEach(() => {
    get.mockReset();
  });
  it('loads live counts and requests selected period', async () => {
    get.mockResolvedValue({ data });
    render(<LiveAnalytics />);
    expect(await screen.findByText('10')).toBeInTheDocument();
    await userEvent.selectOptions(
      screen.getByLabelText('Reporting period'),
      '7',
    );
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('/admin/analytics', {
        params: { days: 7 },
      }),
    );
  });
  it('shows a retryable API error', async () => {
    get.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data });
    render(<LiveAnalytics />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load analytics.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('10')).toBeInTheDocument();
  });
});
