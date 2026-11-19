import { useContext } from 'react';
import {
  DoctorPortalContext,
  type DoctorPortalContextValue,
} from '@/contexts/doctor-portal-context';

export function useDoctorPortal(): DoctorPortalContextValue {
  return useContext(DoctorPortalContext);
}
