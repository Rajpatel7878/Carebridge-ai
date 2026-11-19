import { useState } from 'react';
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Stethoscope,
  User,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Dropdown } from '@/components/common/Dropdown';
import { Logo } from '@/components/common/Logo';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardPathForRole } from '@/types/auth';

const SECTION_LINKS = [
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Care Roles', href: '/#roles' },
  { label: 'Features', href: '/#features' },
  { label: 'Impact', href: '/#impact' },
  { label: 'Security', href: '/#security' },
];

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const dashboardPath = user ? getDashboardPathForRole(user.role) : '/login';

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--cb-border)] bg-[var(--cb-surface)]/92 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="CareBridge AI Home">
          <Logo />
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-1 lg:flex"
        >
          {SECTION_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--cb-text-secondary)] transition-colors hover:bg-[var(--cb-surface-subtle)] hover:text-[var(--cb-text)]"
            >
              {item.label}
            </a>
          ))}

          <Dropdown
            ariaLabel="Explore role portals"
            widthClassName="w-64"
            trigger={({ open }) => (
              <span className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-[var(--cb-text-secondary)] transition-colors hover:bg-[var(--cb-surface-subtle)] hover:text-[var(--cb-text)]">
                Portals
                <ChevronDown
                  aria-hidden="true"
                  className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </span>
            )}
            items={[
              {
                id: 'patient-portal',
                label: 'Patient Dashboard',
                description: 'Reports, appointments & follow-ups',
                icon: <User className="h-4 w-4" />,
                to: '/patient',
              },
              {
                id: 'doctor-portal',
                label: 'Doctor Workspace',
                description: 'Patient panels, triage & referrals',
                icon: <Stethoscope className="h-4 w-4" />,
                to: '/doctor',
              },
              {
                id: 'admin-portal',
                label: 'Admin Console',
                description: 'Population health & operations',
                icon: <ShieldCheck className="h-4 w-4" />,
                to: '/admin',
              },
            ]}
          />
        </nav>

        <div className="hidden items-center gap-2.5 lg:flex">
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={() => {
                  void handleLogout();
                }}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm font-medium text-[var(--cb-text-secondary)] transition-colors hover:bg-[var(--cb-surface-subtle)] hover:text-[var(--cb-text)]"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign Out
              </button>
              <Link
                to={dashboardPath}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#1769AA] px-4 text-sm font-medium text-white shadow-[var(--cb-shadow-xs)] transition-colors hover:bg-[#12568B] dark:bg-[#2B82C9] dark:hover:bg-[#3B9AE1]"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-sm font-medium text-[var(--cb-text-secondary)] transition-colors hover:bg-[var(--cb-surface-subtle)] hover:text-[var(--cb-text)]"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-[#1769AA] px-4 text-sm font-medium text-white shadow-[var(--cb-shadow-xs)] transition-colors hover:bg-[#12568B] dark:bg-[#2B82C9] dark:hover:bg-[#3B9AE1]"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={
              mobileOpen ? 'Close navigation menu' : 'Open navigation menu'
            }
            aria-expanded={mobileOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--cb-border)] bg-[var(--cb-surface)] text-[var(--cb-text)] hover:bg-[var(--cb-surface-subtle)]"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[var(--cb-border)] bg-[var(--cb-surface)] px-4 pt-3 pb-5 lg:hidden">
          <nav aria-label="Mobile navigation" className="space-y-1">
            {SECTION_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-[var(--cb-text-secondary)] hover:bg-[var(--cb-surface-subtle)] hover:text-[var(--cb-text)]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mt-3 border-t border-[var(--cb-border)] pt-3">
            <p className="px-3 pb-1.5 text-xs font-semibold tracking-wide text-[var(--cb-text-muted)] uppercase">
              Role Workspaces
            </p>
            <div className="grid grid-cols-1 gap-1">
              <Link
                to="/patient"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--cb-text-secondary)] hover:bg-[var(--cb-surface-subtle)] hover:text-[var(--cb-text)]"
              >
                <LayoutDashboard className="h-4 w-4 text-[var(--cb-primary)]" />
                Patient Dashboard
              </Link>
              <Link
                to="/doctor"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--cb-text-secondary)] hover:bg-[var(--cb-surface-subtle)] hover:text-[var(--cb-text)]"
              >
                <Stethoscope className="h-4 w-4 text-[var(--cb-secondary)]" />
                Doctor Workspace
              </Link>
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--cb-text-secondary)] hover:bg-[var(--cb-surface-subtle)] hover:text-[var(--cb-text)]"
              >
                <ShieldCheck className="h-4 w-4 text-[var(--cb-primary)]" />
                Admin Console
              </Link>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-[var(--cb-border)] pt-4">
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    void handleLogout();
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--cb-border-strong)] bg-[var(--cb-surface)] text-sm font-medium text-[var(--cb-text)]"
                >
                  Sign Out
                </button>
                <Link
                  to={dashboardPath}
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[#1769AA] text-sm font-medium text-white dark:bg-[#2B82C9]"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--cb-border-strong)] bg-[var(--cb-surface)] text-sm font-medium text-[var(--cb-text)]"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[#1769AA] text-sm font-medium text-white dark:bg-[#2B82C9]"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
