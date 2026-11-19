import { Outlet } from 'react-router-dom';
import { PublicFooter, PublicNavbar } from '@/components/navigation';
import { useLanguage } from '@/hooks/useLanguage';

export function PublicLayout() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--cb-bg)] text-[var(--cb-text)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-[#1769AA] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-[var(--cb-shadow-md)]"
      >
        {t.meta.skipToContent}
      </a>
      <PublicNavbar />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 focus:outline-none"
      >
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
