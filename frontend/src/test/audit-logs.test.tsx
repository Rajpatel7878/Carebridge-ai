import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { AdminAuditLogsPage } from '@/pages/admin/AdminAuditLogsPage';

const get = vi.fn();
vi.mock('@/services/api', () => ({
  apiClient: { get: (...args: unknown[]) => get(...args) },
  extractApiErrorMessage: () => 'Unable to load audit logs.',
}));

beforeEach(() => {
  get.mockReset();
});

it('loads audit events and applies action search', async () => {
  get.mockResolvedValue({
    data: {
      total: 1,
      items: [
        {
          id: 'e1',
          actor_id: 'a1',
          actor_role: 'ADMIN',
          action: 'user.updated',
          resource_type: 'user',
          resource_id: 'u1',
          timestamp: '2026-11-18T12:00:00Z',
          outcome: 'SUCCESS',
          metadata: {},
        },
      ],
    },
  });
  render(<AdminAuditLogsPage />);
  expect(await screen.findByText(/user.updated/)).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText('Action contains'), 'user');
  await userEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
  await waitFor(() =>
    expect(get).toHaveBeenCalledWith('/admin/audit-logs', {
      params: expect.objectContaining({ action: 'user', limit: 20, offset: 0 }),
    }),
  );
});

it('surfaces and retries a loading error', async () => {
  get
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ data: { total: 0, items: [] } });
  render(<AdminAuditLogsPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Unable to load audit logs.',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(
    await screen.findByText('No events match these filters.'),
  ).toBeInTheDocument();
});

it('switches audit page copy immediately and restores the choice after remount', async () => {
  const { LanguageProvider } = await import('@/contexts/LanguageContext');
  const { useLanguage } = await import('@/hooks/useLanguage');
  const { LANGUAGE_STORAGE_KEY } = await import('@/i18n');
  function Switcher() {
    const { setLanguage } = useLanguage();
    return <button onClick={() => setLanguage('hi')}>हिन्दी</button>;
  }
  localStorage.removeItem(LANGUAGE_STORAGE_KEY);
  get.mockResolvedValue({ data: { total: 0, items: [] } });
  const view = render(
    <LanguageProvider>
      <Switcher />
      <AdminAuditLogsPage />
    </LanguageProvider>,
  );
  expect(
    await screen.findByText('Administrative audit logs'),
  ).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'हिन्दी' }));
  expect(screen.getByText('प्रशासनिक ऑडिट लॉग')).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'फ़िल्टर लागू करें' }),
  ).toBeInTheDocument();
  expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('hi');
  view.unmount();
  const restored = render(
    <LanguageProvider>
      <AdminAuditLogsPage />
    </LanguageProvider>,
  );
  expect(screen.getByText('प्रशासनिक ऑडिट लॉग')).toBeInTheDocument();
  restored.unmount();
  localStorage.removeItem(LANGUAGE_STORAGE_KEY);
});
