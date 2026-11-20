import { useEffect } from 'react';
import { Home, LogOut, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Badge } from '@/components/common/Badge';
import { Logo } from '@/components/common/Logo';
import { useLanguage } from '@/hooks/useLanguage';
import { DASHBOARD_NAV_HI } from '@/i18n/dashboard-navigation';
import { ROLE_PORTALS, type NavItemConfig } from '@/routes/navigation';
import type { UserRole } from '@/types/domain';
import { cn } from '@/utils/cn';
import { getInitials } from '@/utils/format';

export interface SidebarProps {
  role: UserRole;
  userName: string;
  roleLabel: string;
  unreadCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => Promise<void> | void;
}

function isItemActive(item: NavItemConfig, pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (item.exact) {
    return clean === item.path;
  }
  if (clean === item.path || clean.startsWith(`${item.path}/`)) {
    return true;
  }
  if (item.matchPrefix && clean.startsWith(item.matchPrefix)) {
    return true;
  }
  return false;
}

const roleBadgeVariant = {
  patient: 'teal',
  doctor: 'primary',
  admin: 'neutral',
} as const;

export function Sidebar({
  role,
  userName,
  roleLabel,
  unreadCount,
  mobileOpen,
  onCloseMobile,
  onLogout,
}: SidebarProps) {
  const { pathname } = useLocation();
  const { language } = useLanguage();
  const portal = ROLE_PORTALS[role];

  useEffect(() => {
    if (!mobileOpen) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseMobile();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [mobileOpen, onCloseMobile]);

  const primaryItems = portal.items.filter((i) => i.section === 'clinical');
  const secondaryItems = portal.items.filter((i) => i.section === 'account');

  const renderLink = (item: NavItemConfig) => {
    const Icon = item.icon;
    const active = isItemActive(item, pathname);

    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={onCloseMobile}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group flex items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          active
            ? 'bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]'
            : 'text-[var(--cb-text-secondary)] hover:bg-[var(--cb-surface-subtle)] hover:text-[var(--cb-text)]',
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <Icon
            aria-hidden="true"
            className={cn(
              'h-4 w-4 shrink-0 transition-colors',
              active
                ? 'text-[var(--cb-primary)]'
                : 'text-[var(--cb-text-muted)] group-hover:text-[var(--cb-text)]',
            )}
          />
          <span className="truncate">
            {language === 'hi'
              ? (DASHBOARD_NAV_HI[item.label] ?? item.label)
              : item.label}
          </span>
        </span>
        {item.showUnreadBadge && unreadCount > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--cb-primary)] px-1.5 text-[11px] font-semibold text-white cb-tabular">
            {unreadCount}
          </span>
        )}
      </Link>
    );
  };

  const renderSidebarContent = (isMobile: boolean) => (
    <div className="flex h-full flex-col bg-[var(--cb-surface)]">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--cb-border)] px-4">
        <Link to="/" onClick={onCloseMobile} aria-label="CareBridge AI Home">
          <Logo size="sm" />
        </Link>
        {isMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
            className="rounded-lg p-1.5 text-[var(--cb-text-muted)] hover:bg-[var(--cb-surface-subtle)] hover:text-[var(--cb-text)]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="border-b border-[var(--cb-border)] px-4 py-3">
        <Badge variant={roleBadgeVariant[role]} dot>
          {portal.portalLabel}
        </Badge>
      </div>

      <nav
        aria-label={`${portal.portalLabel} navigation`}
        className="flex-1 space-y-5 overflow-y-auto px-3 py-4"
      >
        <div>
          <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-[var(--cb-text-muted)] uppercase">
            {role === 'admin' ? 'Management' : 'Care Workspace'}
          </p>
          <div className="space-y-0.5">{primaryItems.map(renderLink)}</div>
        </div>

        <div>
          <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-[var(--cb-text-muted)] uppercase">
            {role === 'admin' ? 'Insights & System' : 'Account & Alerts'}
          </p>
          <div className="space-y-0.5">{secondaryItems.map(renderLink)}</div>
        </div>
      </nav>

      <div className="shrink-0 space-y-1 border-t border-[var(--cb-border)] p-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-[var(--cb-surface-subtle)] px-2.5 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--cb-primary-soft)] text-xs font-bold text-[var(--cb-primary)]">
            {getInitials(userName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[var(--cb-text)]">
              {userName}
            </p>
            <p className="truncate text-[11px] text-[var(--cb-text-muted)]">
              {roleLabel}
            </p>
          </div>
        </div>

        <Link
          to="/"
          onClick={onCloseMobile}
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--cb-text-muted)] transition-colors hover:bg-[var(--cb-surface-subtle)] hover:text-[var(--cb-text)]"
        >
          <Home className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Public Home
        </Link>

        <button
          type="button"
          onClick={() => {
            onCloseMobile();
            void onLogout();
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[var(--cb-critical)] transition-colors hover:bg-[var(--cb-critical-soft)]"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-[260px] lg:flex-col lg:border-r lg:border-[var(--cb-border)]">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            aria-hidden="true"
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/55 backdrop-blur-[1px]"
          />
          <aside className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col border-r border-[var(--cb-border)] shadow-[var(--cb-shadow-lg)]">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
