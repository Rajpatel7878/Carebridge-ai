import { createContext } from 'react';
import type { AppNotification, UserRole } from '@/types/domain';

export type ToastTone = 'success' | 'info' | 'warning';

export interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

export interface DemoContextValue {
  notifications: AppNotification[];
  getRoleNotifications: (role: UserRole) => AppNotification[];
  getUnreadCount: (role: UserRole) => number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (role: UserRole) => void;
  showToast: (title: string, description?: string, tone?: ToastTone) => void;
}

export const DemoContext = createContext<DemoContextValue | undefined>(
  undefined,
);
