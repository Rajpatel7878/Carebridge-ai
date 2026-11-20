import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useLanguage } from '@/hooks/useLanguage';
import { LANGUAGE_STORAGE_KEY } from '@/i18n';
import { LoginPage } from '@/pages/auth/LoginPage';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ login: vi.fn() }) }));
vi.mock('@/hooks/useDemo', () => ({ useDemo: () => ({ showToast: vi.fn() }) }));

it('switches login labels and validates in Hindi without refreshing', async () => {
  localStorage.removeItem(LANGUAGE_STORAGE_KEY);
  function Switcher() {
    const { setLanguage } = useLanguage();
    return <button onClick={() => setLanguage('hi')}>हिन्दी</button>;
  }
  const view = render(
    <LanguageProvider>
      <MemoryRouter>
        <Switcher />
        <LoginPage />
      </MemoryRouter>
    </LanguageProvider>,
  );
  expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'हिन्दी' }));
  expect(screen.getByLabelText('ईमेल पता')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /^साइन इन$/ }));
  expect(await screen.findByText('ईमेल पता आवश्यक है।')).toBeInTheDocument();
  expect(screen.getByText('पासवर्ड आवश्यक है।')).toBeInTheDocument();
  expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('hi');
  view.unmount();
  localStorage.removeItem(LANGUAGE_STORAGE_KEY);
});
