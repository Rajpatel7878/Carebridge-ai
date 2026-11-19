import { ArrowLeft, Compass, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo, ThemeToggle } from '@/components/common';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle('Page Not Found');

  return (
    <div className="flex min-h-screen flex-col bg-[var(--cb-bg)] text-[var(--cb-text)]">
      <header className="flex h-16 items-center justify-between border-b border-[var(--cb-border)] bg-[var(--cb-surface)] px-4 sm:px-8">
        <Link to="/" aria-label="CareBridge AI Home">
          <Logo size="sm" />
        </Link>
        <ThemeToggle showLabel />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface)] p-8 text-center shadow-[var(--cb-shadow-sm)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]">
            <Compass className="h-6 w-6" aria-hidden="true" />
          </div>

          <p className="mt-4 text-xs font-bold tracking-wider text-[var(--cb-primary)] uppercase cb-tabular">
            Error 404
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--cb-text)]">
            Page not found
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--cb-text-muted)]">
            The route you requested does not exist or may have moved. Choose a
            destination below to return to CareBridge AI.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1769AA] px-4 text-sm font-medium text-white transition-colors hover:bg-[#12568B] dark:bg-[#2B82C9]"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              Back to Home
            </Link>
            <Link
              to="/login"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--cb-border-strong)] bg-[var(--cb-surface)] px-4 text-sm font-medium text-[var(--cb-text)] transition-colors hover:bg-[var(--cb-surface-subtle)]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Sign In
            </Link>
          </div>

          <div className="mt-6 border-t border-[var(--cb-border)] pt-5">
            <p className="text-xs font-medium text-[var(--cb-text-muted)]">
              Or jump directly to a workspace:
            </p>
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-[var(--cb-primary)]">
              <Link to="/patient" className="hover:underline">
                Patient Dashboard
              </Link>
              <Link to="/doctor" className="hover:underline">
                Doctor Workspace
              </Link>
              <Link to="/admin" className="hover:underline">
                Admin Console
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
