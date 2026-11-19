import { Outlet } from 'react-router-dom';
import { PublicFooter, PublicNavbar } from '@/components/navigation';

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--cb-bg)] text-[var(--cb-text)]">
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
