import { Link } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';

export function PublicFooter() {
  return (
    <footer className="border-t border-[var(--cb-border)] bg-[var(--cb-surface)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo showTagline />
            <p className="mt-3.5 max-w-sm text-sm leading-relaxed text-[var(--cb-text-muted)]">
              Connecting Every Patient to the Care They Need. An AI-assisted
              population health platform uniting early screening, risk
              visibility, referrals, and closed-loop follow-up care.
            </p>
            <p className="mt-4 text-xs font-medium text-[var(--cb-text-secondary)]">
              Developed by{' '}
              <span className="font-semibold text-[var(--cb-text)]">
                Team ALPHA
              </span>{' '}
              &middot; Future Health Challenge
            </p>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold tracking-wider text-[var(--cb-text)] uppercase">
              Platform
            </h3>
            <ul className="mt-3.5 space-y-2.5 text-sm text-[var(--cb-text-muted)]">
              <li>
                <a
                  href="/#how-it-works"
                  className="hover:text-[var(--cb-text)]"
                >
                  How It Works
                </a>
              </li>
              <li>
                <a href="/#roles" className="hover:text-[var(--cb-text)]">
                  Care Roles
                </a>
              </li>
              <li>
                <a href="/#features" className="hover:text-[var(--cb-text)]">
                  Key Features
                </a>
              </li>
              <li>
                <a href="/#impact" className="hover:text-[var(--cb-text)]">
                  Population Impact
                </a>
              </li>
              <li>
                <a href="/#security" className="hover:text-[var(--cb-text)]">
                  Privacy &amp; Security
                </a>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h3 className="text-xs font-semibold tracking-wider text-[var(--cb-text)] uppercase">
              Role Workspaces
            </h3>
            <ul className="mt-3.5 space-y-2.5 text-sm text-[var(--cb-text-muted)]">
              <li>
                <Link to="/patient" className="hover:text-[var(--cb-text)]">
                  Patient Dashboard
                </Link>
              </li>
              <li>
                <Link to="/doctor" className="hover:text-[var(--cb-text)]">
                  Doctor Workspace
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-[var(--cb-text)]">
                  Administrator Console
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/population-health"
                  className="hover:text-[var(--cb-text)]"
                >
                  Population Health Overview
                </Link>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h3 className="text-xs font-semibold tracking-wider text-[var(--cb-text)] uppercase">
              Access &amp; Notice
            </h3>
            <ul className="mt-3.5 space-y-2.5 text-sm text-[var(--cb-text-muted)]">
              <li>
                <Link to="/login" className="hover:text-[var(--cb-text)]">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-[var(--cb-text)]">
                  Create Account
                </Link>
              </li>
              <li>
                <Link
                  to="/forgot-password"
                  className="hover:text-[var(--cb-text)]"
                >
                  Reset Password
                </Link>
              </li>
            </ul>
            <p className="mt-4 rounded-lg border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)] p-2.5 text-[11px] leading-relaxed text-[var(--cb-text-muted)]">
              Prototype notice: All patient, clinician, and regional records
              shown in this UI preview are fictional demonstration data and do
              not constitute medical advice.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-[var(--cb-border)] pt-6 text-xs text-[var(--cb-text-muted)] sm:flex-row sm:items-center">
          <p>&copy; 2026 CareBridge AI &middot; Team ALPHA. MIT License.</p>
          <p>Category: Population Health &middot; Future Health Challenge</p>
        </div>
      </div>
    </footer>
  );
}
