import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DoctorPortalContext,
  type DoctorPortalContextValue,
} from '@/contexts/doctor-portal-context';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchDoctorNotifications,
  markAllDoctorNotificationsRead,
  markDoctorNotificationRead,
} from '@/services/doctor';
import type { DoctorNotification } from '@/types/doctor';

/**
 * In-memory authenticated notification coordinator for the Doctor Portal.
 * Never persists clinician or patient data to web storage.
 */
export function DoctorPortalProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();
  const isActiveDoctor = enabled && isAuthenticated && user?.role === 'DOCTOR';

  const [notifications, setNotifications] = useState<DoctorNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  const refreshNotifications = useCallback(async () => {
    if (!isActiveDoctor) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    setIsLoadingNotifications(true);
    try {
      const response = await fetchDoctorNotifications(false);
      setNotifications(response.items);
      setUnreadCount(response.unread_count);
    } catch {
      // Individual pages surface ErrorState with retry controls.
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [isActiveDoctor]);

  useEffect(() => {
    if (!isActiveDoctor) {
      return;
    }
    let cancelled = false;
    fetchDoctorNotifications(false)
      .then((response) => {
        if (cancelled) return;
        setNotifications(response.items);
        setUnreadCount(response.unread_count);
      })
      .catch(() => {
        // Individual pages surface ErrorState with retry controls.
      })
      .finally(() => {
        if (!cancelled) setIsLoadingNotifications(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isActiveDoctor]);

  const markOneRead = useCallback(
    async (notificationId: string) => {
      if (!isActiveDoctor) return;
      const response = await markDoctorNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? response.notification : item,
        ),
      );
      setUnreadCount(response.unread_count);
    },
    [isActiveDoctor],
  );

  const markAllRead = useCallback(async (): Promise<number> => {
    if (!isActiveDoctor) return 0;
    const response = await markAllDoctorNotificationsRead();
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, is_read: true })),
    );
    setUnreadCount(response.unread_count);
    return response.marked_count;
  }, [isActiveDoctor]);

  const value = useMemo<DoctorPortalContextValue>(
    () => ({
      notifications: isActiveDoctor ? notifications : [],
      unreadCount: isActiveDoctor ? unreadCount : 0,
      isLoadingNotifications,
      refreshNotifications,
      markOneRead,
      markAllRead,
    }),
    [
      isActiveDoctor,
      notifications,
      unreadCount,
      isLoadingNotifications,
      refreshNotifications,
      markOneRead,
      markAllRead,
    ],
  );

  return (
    <DoctorPortalContext.Provider value={value}>
      {children}
    </DoctorPortalContext.Provider>
  );
}
