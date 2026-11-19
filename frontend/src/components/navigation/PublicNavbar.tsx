import { useEffect, useState, type MouseEvent } from 'react';
import { LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { Logo } from '@/components/common/Logo';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { getDashboardPathForRole } from '@/types/auth';
import { cn } from '@/utils/cn';
import { prefersReducedMotion, scrollToSectionId } from '@/utils/scroll';

const OBSERVED_SECTIONS = [
  'home',
  'how-it-works',
  'features',
  'impact',
  'about',
  'contact',
] as const;

type NavSectionId = (typeof OBSERVED_SECTIONS)[number];

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSectionId>('home');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();

  const isHomePage = location.pathname === '/';
  const dashboardPath = user ? getDashboardPathForRole(user.role) : '/login';

  const navItems: { id: NavSectionId; label: string; href: string }[] = [
    { id: 'home', label: t.nav.home, href: '/#home' },
    { id: 'how-it-works', label: t.nav.howItWorks, href: '/#how-it-works' },
    { id: 'features', label: t.nav.features, href: '/#features' },
    { id: 'impact', label: t.nav.impact, href: '/#impact' },
    { id: 'about', label: t.nav.about, href: '/#about' },
    { id: 'contact', label: t.nav.contact, href: '/#contact' },
  ];

  // Track which landing page section is currently in view
  useEffect(() => {
    if (!isHomePage || typeof window === 'undefined') {
      return;
    }

    if (typeof window.IntersectionObserver !== 'function') {
      return;
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const topEntry = visible[0];
        if (topEntry) {
          const id = topEntry.target.id as NavSectionId;
          if (OBSERVED_SECTIONS.includes(id)) {
            setActiveSection(id);
          }
        }
      },
      {
        rootMargin: '-22% 0px -58% 0px',
        threshold: [0.1, 0.25, 0.5],
      },
    );

    for (const id of OBSERVED_SECTIONS) {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    }

    return () => {
      observer.disconnect();
    };
  }, [isHomePage]);

  // Close mobile menu on Escape key
  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  const handleSectionClick = (
    event: MouseEvent<HTMLAnchorElement>,
    sectionId: NavSectionId,
  ) => {
    setMobileOpen(false);
    setActiveSection(sectionId);

    if (!isHomePage) {
      return;
    }

    event.preventDefault();
    if (sectionId === 'home') {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
      window.history.replaceState(null, '', '/');
      return;
    }

    if (scrollToSectionId(sectionId)) {
      window.history.replaceState(null, '', `/#${sectionId}`);
    }
  };

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--cb-border)] bg-[var(--cb-surface)]/92 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          aria-label="CareBridge AI Home"
          onClick={(event) => handleSectionClick(event, 'home')}
          className="shrink-0 rounded-lg"
        >
          <Logo />
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-0.5 xl:flex"
        >
          {navItems.map((item) => {
            const isActive = isHomePage && activeSection === item.id;
            return (
              <Link
                key={item.id}
                to={item.href}
                aria-current={isActive ? 'location' : undefined}
                onClick={(event) => handleSectionClick(event, item.id)}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]'
                    : 'text-[var(--cb-text-secondary)] hover:bg-[var(--cb-surface-subtle)] hover:text-[var(--cb-text)]',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          <LanguageSwitcher variant="compact" />
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={() => {
                  void handleLogout();
                }}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium text-[var(--cb-text-secondary)] transition-colors hover:bg-[var(--cb-surface-subtle)] hover:text-[var(--cb-text)]"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {t.nav.signOut}
              </button>
              <Link
                to={dashboardPath}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#1769AA] px-4 text-sm font-semibold text-white shadow-[var(--cb-shadow-xs)] transition-colors hover:bg-[#12568B] active:bg-[#0E4470] dark:bg-[#2B82C9] dark:hover:bg-[#3B9AE1]"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                {t.nav.dashboard}
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-sm font-medium text-[var(--cb-text-secondary)] transition-colors hover:bg-[var(--cb-surface-subtle)] hover:text-[var(--cb-text)]"
              >
                {t.nav.login}
              </Link>
              <Link
                to="/register"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-[#1769AA] px-4 text-sm font-semibold text-white shadow-[var(--cb-shadow-xs)] transition-colors hover:bg-[#12568B] active:bg-[#0E4470] dark:bg-[#2B82C9] dark:hover:bg-[#3B9AE1]"
              >
                {t.nav.getStarted}
              </Link>
            </>
          )}
        </div>

        {/* Tablet & Mobile Controls */}
        <div className="flex items-center gap-2 xl:hidden">
          <LanguageSwitcher variant="compact" />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? t.nav.closeMenu : t.nav.openMenu}
            aria-expanded={mobileOpen}
            aria-controls="public-mobile-menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--cb-border)] bg-[var(--cb-surface)] text-[var(--cb-text)] transition-colors hover:bg-[var(--cb-surface-subtle)]"
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
        <div
          id="public-mobile-menu"
          className="border-t border-[var(--cb-border)] bg-[var(--cb-surface)] px-4 pt-3 pb-5 shadow-[var(--cb-shadow-md)] sm:px-6 xl:hidden"
        >
          <nav aria-label="Mobile navigation" className="space-y-1">
            {navItems.map((item) => {
              const isActive = isHomePage && activeSection === item.id;
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  aria-current={isActive ? 'location' : undefined}
                  onClick={(event) => handleSectionClick(event, item.id)}
                  className={cn(
                    'block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]'
                      : 'text-[var(--cb-text-secondary)] hover:bg-[var(--cb-surface-subtle)] hover:text-[var(--cb-text)]',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 grid grid-cols-1 gap-2.5 border-t border-[var(--cb-border)] pt-4 sm:grid-cols-2">
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    void handleLogout();
                  }}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[var(--cb-border-strong)] bg-[var(--cb-surface)] text-sm font-medium text-[var(--cb-text)] transition-colors hover:bg-[var(--cb-surface-subtle)]"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  {t.nav.signOut}
                </button>
                <Link
                  to={dashboardPath}
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#1769AA] text-sm font-semibold text-white transition-colors hover:bg-[#12568B] dark:bg-[#2B82C9] dark:hover:bg-[#3B9AE1]"
                >
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  {t.nav.dashboard}
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--cb-border-strong)] bg-[var(--cb-surface)] text-sm font-medium text-[var(--cb-text)] transition-colors hover:bg-[var(--cb-surface-subtle)]"
                >
                  {t.nav.login}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[#1769AA] text-sm font-semibold text-white transition-colors hover:bg-[#12568B] dark:bg-[#2B82C9] dark:hover:bg-[#3B9AE1]"
                >
                  {t.nav.getStarted}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
