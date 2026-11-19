import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, X } from 'lucide-react';
import { MOCK_NOTIFICATIONS } from '@/data';
import type { AppNotification, UserRole } from '@/types/domain';
import {
  DemoContext,
  type DemoContextValue,
  type ToastMessage,
} from './demo-context';

export function DemoProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] =
    useState<AppNotification[]>(MOCK_NOTIFICATIONS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextToastId = useRef(1);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (
      title: string,
      description?: string,
      tone: 'success' | 'info' = 'success',
    ) => {
      const id = nextToastId.current++;
      setToasts((prev) => [
        ...prev.slice(-2),
        { id, title, description, tone },
      ]);
      window.setTimeout(() => {
        dismissToast(id);
      }, 4200);
    },
    [dismissToast],
  );

  const getRoleNotifications = useCallback(
    (role: UserRole) => notifications.filter((item) => item.role === role),
    [notifications],
  );

  const getUnreadCount = useCallback(
    (role: UserRole) =>
      notifications.filter((item) => item.role === role && !item.read).length,
    [notifications],
  );

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  }, []);

  const markAllNotificationsRead = useCallback((role: UserRole) => {
    setNotifications((prev) =>
      prev.map((item) => (item.role === role ? { ...item, read: true } : item)),
    );
  }, []);

  const value = useMemo<DemoContextValue>(
    () => ({
      notifications,
      getRoleNotifications,
      getUnreadCount,
      markNotificationRead,
      markAllNotificationsRead,
      showToast,
    }),
    [
      notifications,
      getRoleNotifications,
      getUnreadCount,
      markNotificationRead,
      markAllNotificationsRead,
      showToast,
    ],
  );

  return (
    <DemoContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2.5 px-2 sm:px-0"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-[var(--cb-border-strong)] bg-[var(--cb-surface-elevated)] p-3.5 shadow-[var(--cb-shadow-lg)]"
            >
              {toast.tone === 'success' ? (
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-[var(--cb-success)]"
                  aria-hidden="true"
                />
              ) : (
                <Info
                  className="mt-0.5 h-5 w-5 shrink-0 text-[var(--cb-primary)]"
                  aria-hidden="true"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--cb-text)]">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="mt-0.5 text-xs leading-relaxed text-[var(--cb-text-muted)]">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="rounded-md p-1 text-[var(--cb-text-muted)] transition-colors hover:bg-[var(--cb-surface-subtle)] hover:text-[var(--cb-text)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </DemoContext.Provider>
  );
}
