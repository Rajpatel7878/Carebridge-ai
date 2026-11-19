import { createContext } from 'react';
import type { DoctorNotification } from '@/types/doctor';

export interface DoctorPortalContextValue {
  notifications: DoctorNotification[];
  unreadCount: number;
  isLoadingNotifications: boolean;
  refreshNotifications: () => Promise<void>;
  markOneRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<number>;
}

export const DoctorPortalContext = createContext<DoctorPortalContextValue>({
  notifications: [],
  unreadCount: 0,
  isLoadingNotifications: false,
  refreshNotifications: async () => {},
  markOneRead: async () => {},
  markAllRead: async () => 0,
});
