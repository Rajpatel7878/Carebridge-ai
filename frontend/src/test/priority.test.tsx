import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { PriorityQueue } from '@/components/dashboard/PriorityQueue';

const get = vi.fn();
const post = vi.fn();
vi.mock('@/services/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
  },
  extractApiErrorMessage: () => 'Request failed.',
}));

it('recalculates and requires a reason for override', async () => {
  get.mockResolvedValue({
    data: {
      items: [
        {
          patient_id: 'p1',
          patient_name: 'Synthetic patient',
          assessment: null,
        },
      ],
      total: 1,
    },
  });
  post.mockResolvedValue({ data: {} });
  render(<PriorityQueue />);
  expect(await screen.findByText('Synthetic patient')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Recalculate' }));
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith(
      '/doctor/patients/p1/priority/recalculate',
      {},
    ),
  );
  await userEvent.click(screen.getByText('Override priority'));
  const save = screen.getByRole('button', { name: 'Save override' });
  expect(save).toBeDisabled();
  await userEvent.type(screen.getByLabelText('Reason'), 'Synthetic review');
  await userEvent.click(save);
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith('/doctor/patients/p1/priority/override', {
      category: 'MODERATE',
      reason: 'Synthetic review',
    }),
  );
});
