import { createContext } from 'react';
import type { PatientNotification } from '@/types/patient';

export interface PatientPortalContextValue {
  notifications: PatientNotification[];
  unreadCount: number;
  isLoadingNotifications: boolean;
  refreshNotifications: () => Promise<void>;
  markOneRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<number>;
}

export const PatientPortalContext =
  createContext<PatientPortalContextValue | null>(null);
