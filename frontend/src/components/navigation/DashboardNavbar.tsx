import { Bell, ChevronRight, LogOut, Menu, Settings, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Dropdown, type DropdownMenuItem } from '@/components/common/Dropdown';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useDemo } from '@/hooks/useDemo';
import { ROLE_PORTALS, resolveBreadcrumbs } from '@/routes/navigation';
import type { UserRole } from '@/types/domain';
import { getInitials } from '@/utils/format';

export interface DashboardNavbarProps {
  role: UserRole;
  userName: string;
  userSubtitle: string;
  onOpenMobileSidebar: () => void;
  onLogout: () => Promise<void> | void;
}

export function DashboardNavbar({
  role,
  userName,
  userSubtitle,
  onOpenMobileSidebar,
  onLogout,
}: DashboardNavbarProps) {
  const { pathname } = useLocation();
  const { getRoleNotifications, getUnreadCount, markNotificationRead } =
    useDemo();

  const portal = ROLE_PORTALS[role];
  const breadcrumbs = resolveBreadcrumbs(role, pathname);
  const roleNotifications = getRoleNotifications(role);
  const unreadCount = getUnreadCount(role);

  const notificationItems: DropdownMenuItem[] = roleNotifications
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      label: item.title,
      description: item.timestamp,
      to: item.actionPath,
      onSelect: () => markNotificationRead(item.id),
    }));

  if (role !== 'admin') {
    notificationItems.push({
      id: 'view-all',
      label: 'View all notifications',
      to: portal.notificationsPath,
      dividerBefore: true,
    });
  } else {
    notificationItems.push({
      id: 'view-followups',
      label: 'Open Follow-up Monitoring',
      to: '/admin/follow-ups',
      dividerBefore: true,
    });
  }

  const profileMenuItems: DropdownMenuItem[] = [];
  if (portal.profilePath) {
    profileMenuItems.push({
      id: 'profile',
      label: 'My Profile',
      icon: <User className="h-4 w-4" />,
      to: portal.profilePath,
    });
  }
  profileMenuItems.push(
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="h-4 w-4" />,
      to: portal.settingsPath,
    },
    {
      id: 'signout',
      label: 'Sign Out',
      icon: <LogOut className="h-4 w-4" />,
      danger: true,
      dividerBefore: true,
      onSelect: () => {
        void onLogout();
      },
    },
  );

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-[var(--cb-border)] bg-[var(--cb-surface)]/92 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open sidebar navigation"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--cb-border)] bg-[var(--cb-surface)] text-[var(--cb-text)] hover:bg-[var(--cb-surface-subtle)] lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-1.5 text-sm"
        >
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <span
                key={`${crumb.label}-${index}`}
                className="flex min-w-0 items-center gap-1.5"
              >
                {index > 0 && (
                  <ChevronRight
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0 text-[var(--cb-text-muted)]"
                  />
                )}
                {!isLast && crumb.path ? (
                  <Link
                    to={crumb.path}
                    className="hidden truncate text-[var(--cb-text-muted)] transition-colors hover:text-[var(--cb-text)] sm:inline"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="truncate font-semibold text-[var(--cb-text)]">
                    {crumb.label}
                  </span>
                )}
              </span>
            );
          })}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        <span className="hidden items-center gap-1.5 rounded-full border border-[var(--cb-border)] bg-[var(--cb-surface-subtle)] px-2.5 py-1 text-[11px] font-medium text-[var(--cb-text-muted)] xl:inline-flex">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-[var(--cb-secondary)]"
          />
          Sample Clinical Data
        </span>

        <ThemeToggle />

        <Dropdown
          ariaLabel="Open notifications"
          widthClassName="w-80 max-w-[calc(100vw-2rem)]"
          header={
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--cb-text)]">
                Notifications
              </span>
              <span className="text-xs text-[var(--cb-text-muted)] cb-tabular">
                {unreadCount} unread
              </span>
            </div>
          }
          trigger={() => (
            <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--cb-border)] bg-[var(--cb-surface)] text-[var(--cb-text-secondary)] transition-colors hover:bg-[var(--cb-surface-subtle)] hover:text-[var(--cb-text)]">
              <Bell className="h-4 w-4" aria-hidden="true" />
              {unreadCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--cb-critical)] ring-2 ring-[var(--cb-surface)]"
                />
              )}
            </span>
          )}
          items={notificationItems}
        />

        <Dropdown
          ariaLabel="Open account menu"
          widthClassName="w-64"
          header={
            <div>
              <p className="truncate text-sm font-semibold text-[var(--cb-text)]">
                {userName}
              </p>
              <p className="truncate text-xs text-[var(--cb-text-muted)]">
                {userSubtitle}
              </p>
            </div>
          }
          trigger={() => (
            <span className="inline-flex items-center gap-2.5 rounded-lg border border-[var(--cb-border)] bg-[var(--cb-surface)] py-1 pr-2.5 pl-1 transition-colors hover:bg-[var(--cb-surface-subtle)]">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--cb-primary-soft)] text-xs font-bold text-[var(--cb-primary)]">
                {getInitials(userName)}
              </span>
              <span className="hidden max-w-[130px] truncate text-xs font-semibold text-[var(--cb-text)] md:inline">
                {userName}
              </span>
            </span>
          )}
          items={profileMenuItems}
        />
      </div>
    </header>
  );
}
