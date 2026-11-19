import { useContext } from 'react';
import {
  PatientPortalContext,
  type PatientPortalContextValue,
} from '@/contexts/patient-portal-context';

const NOOP_CONTEXT: PatientPortalContextValue = {
  notifications: [],
  unreadCount: 0,
  isLoadingNotifications: false,
  refreshNotifications: async () => undefined,
  markOneRead: async () => undefined,
  markAllRead: async () => 0,
};

export function usePatientPortal(): PatientPortalContextValue {
  const ctx = useContext(PatientPortalContext);
  return ctx ?? NOOP_CONTEXT;
}
