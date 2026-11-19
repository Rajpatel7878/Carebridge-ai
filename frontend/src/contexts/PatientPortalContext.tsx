import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  PatientPortalContext,
  type PatientPortalContextValue,
} from '@/contexts/patient-portal-context';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchPatientNotifications,
  markAllPatientNotificationsRead,
  markPatientNotificationRead,
} from '@/services/patient';
import type { PatientNotification } from '@/types/patient';

/**
 * In-memory authenticated notification coordinator for the Patient Portal.
 * Never persists any patient data to localStorage or sessionStorage.
 */
export function PatientPortalProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();
  const isActivePatient =
    enabled && isAuthenticated && user?.role === 'PATIENT';

  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  const refreshNotifications = useCallback(async () => {
    if (!isActivePatient) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    setIsLoadingNotifications(true);
    try {
      const response = await fetchPatientNotifications(false);
      setNotifications(response.items);
      setUnreadCount(response.unread_count);
    } catch {
      // Page-level views render actionable ErrorState components on failure.
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [isActivePatient]);

  useEffect(() => {
    if (!isActivePatient) {
      return;
    }
    let cancelled = false;
    fetchPatientNotifications(false)
      .then((response) => {
        if (cancelled) return;
        setNotifications(response.items);
        setUnreadCount(response.unread_count);
      })
      .catch(() => {
        // Page-level views render actionable ErrorState components on failure.
      })
      .finally(() => {
        if (!cancelled) setIsLoadingNotifications(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isActivePatient]);

  const markOneRead = useCallback(
    async (notificationId: string) => {
      if (!isActivePatient) return;
      const response = await markPatientNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? response.notification : item,
        ),
      );
      setUnreadCount(response.unread_count);
    },
    [isActivePatient],
  );

  const markAllRead = useCallback(async (): Promise<number> => {
    if (!isActivePatient) return 0;
    const response = await markAllPatientNotificationsRead();
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, is_read: true })),
    );
    setUnreadCount(response.unread_count);
    return response.marked_count;
  }, [isActivePatient]);

  const value = useMemo<PatientPortalContextValue>(
    () => ({
      notifications: isActivePatient ? notifications : [],
      unreadCount: isActivePatient ? unreadCount : 0,
      isLoadingNotifications,
      refreshNotifications,
      markOneRead,
      markAllRead,
    }),
    [
      isActivePatient,
      notifications,
      unreadCount,
      isLoadingNotifications,
      refreshNotifications,
      markOneRead,
      markAllRead,
    ],
  );

  return (
    <PatientPortalContext.Provider value={value}>
      {children}
    </PatientPortalContext.Provider>
  );
}
