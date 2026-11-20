import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  ClipboardCheck,
  FileText,
  GitBranch,
  Globe2,
  LayoutDashboard,
  PieChart,
  Settings,
  ShieldAlert,
  Stethoscope,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/types/domain';

export interface NavItemConfig {
  label: string;
  path: string;
  icon: LucideIcon;
  section: 'clinical' | 'account';
  exact?: boolean;
  matchPrefix?: string;
  showUnreadBadge?: boolean;
}

export interface RolePortalMeta {
  role: UserRole;
  portalLabel: string;
  shortLabel: string;
  basePath: string;
  notificationsPath: string;
  profilePath?: string;
  settingsPath: string;
  items: NavItemConfig[];
}

export const PATIENT_NAV_ITEMS: NavItemConfig[] = [
  {
    label: 'Overview',
    path: '/patient',
    icon: LayoutDashboard,
    section: 'clinical',
    exact: true,
  },
  {
    label: 'My Health Reports',
    path: '/patient/reports',
    icon: FileText,
    section: 'clinical',
  },
  {
    label: 'Risk Overview',
    path: '/patient/risk',
    icon: Activity,
    section: 'clinical',
  },
  {
    label: 'Appointments',
    path: '/patient/appointments',
    icon: Calendar,
    section: 'clinical',
  },
  {
    label: 'Referrals',
    path: '/patient/referrals',
    icon: GitBranch,
    section: 'clinical',
  },
  {
    label: 'Follow-ups',
    path: '/patient/follow-ups',
    icon: ClipboardCheck,
    section: 'clinical',
  },
  {
    label: 'Notifications',
    path: '/patient/notifications',
    icon: Bell,
    section: 'account',
    showUnreadBadge: true,
  },
  {
    label: 'Profile',
    path: '/patient/profile',
    icon: User,
    section: 'account',
  },
  {
    label: 'Settings',
    path: '/patient/settings',
    icon: Settings,
    section: 'account',
  },
];

export const DOCTOR_NAV_ITEMS: NavItemConfig[] = [
  {
    label: 'Overview',
    path: '/doctor',
    icon: LayoutDashboard,
    section: 'clinical',
    exact: true,
  },
  {
    label: 'My Patients',
    path: '/doctor/patients',
    icon: Users,
    section: 'clinical',
    matchPrefix: '/doctor/patients/',
  },
  {
    label: 'Medical Reports',
    path: '/doctor/reports',
    icon: FileText,
    section: 'clinical',
    matchPrefix: '/doctor/reports/',
  },
  {
    label: 'Risk Review',
    path: '/doctor/risk-review',
    icon: ShieldAlert,
    section: 'clinical',
  },
  {
    label: 'Appointments',
    path: '/doctor/appointments',
    icon: Calendar,
    section: 'clinical',
  },
  {
    label: 'Referrals',
    path: '/doctor/referrals',
    icon: GitBranch,
    section: 'clinical',
  },
  {
    label: 'Follow-ups',
    path: '/doctor/follow-ups',
    icon: ClipboardCheck,
    section: 'clinical',
  },
  {
    label: 'Notifications',
    path: '/doctor/notifications',
    icon: Bell,
    section: 'account',
    showUnreadBadge: true,
  },
  {
    label: 'Profile',
    path: '/doctor/profile',
    icon: Stethoscope,
    section: 'account',
  },
  {
    label: 'Settings',
    path: '/doctor/settings',
    icon: Settings,
    section: 'account',
  },
];

export const ADMIN_NAV_ITEMS: NavItemConfig[] = [
  {
    label: 'Overview',
    path: '/admin',
    icon: LayoutDashboard,
    section: 'clinical',
    exact: true,
  },
  {
    label: 'Population Health',
    path: '/admin/population-health',
    icon: Globe2,
    section: 'clinical',
  },
  {
    label: 'Patient Management',
    path: '/admin/patients',
    icon: Users,
    section: 'clinical',
  },
  {
    label: 'Doctor Management',
    path: '/admin/doctors',
    icon: Building2,
    section: 'clinical',
  },
  {
    label: 'Risk Distribution',
    path: '/admin/risk-distribution',
    icon: PieChart,
    section: 'clinical',
  },
  {
    label: 'Referral Management',
    path: '/admin/referrals',
    icon: GitBranch,
    section: 'clinical',
  },
  {
    label: 'Appointment Management',
    path: '/admin/appointments',
    icon: Calendar,
    section: 'clinical',
  },
  {
    label: 'Follow-up Monitoring',
    path: '/admin/follow-ups',
    icon: ClipboardCheck,
    section: 'clinical',
  },
  {
    label: 'Analytics',
    path: '/admin/analytics',
    icon: BarChart3,
    section: 'account',
  },
  {
    label: 'Audit Logs',
    path: '/admin/audit-logs',
    icon: ClipboardCheck,
    section: 'account',
  },
  {
    label: 'Settings',
    path: '/admin/settings',
    icon: Settings,
    section: 'account',
  },
];

export const ROLE_PORTALS: Record<UserRole, RolePortalMeta> = {
  patient: {
    role: 'patient',
    portalLabel: 'Patient Portal',
    shortLabel: 'Patient',
    basePath: '/patient',
    notificationsPath: '/patient/notifications',
    profilePath: '/patient/profile',
    settingsPath: '/patient/settings',
    items: PATIENT_NAV_ITEMS,
  },
  doctor: {
    role: 'doctor',
    portalLabel: 'Doctor Workspace',
    shortLabel: 'Doctor',
    basePath: '/doctor',
    notificationsPath: '/doctor/notifications',
    profilePath: '/doctor/profile',
    settingsPath: '/doctor/settings',
    items: DOCTOR_NAV_ITEMS,
  },
  admin: {
    role: 'admin',
    portalLabel: 'Admin Console',
    shortLabel: 'Administrator',
    basePath: '/admin',
    notificationsPath: '/admin/notifications',
    settingsPath: '/admin/settings',
    items: ADMIN_NAV_ITEMS,
  },
};

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export function resolveBreadcrumbs(
  role: UserRole,
  pathname: string,
): BreadcrumbItem[] {
  const portal = ROLE_PORTALS[role];
  const normalized = pathname.replace(/\/+$/, '') || '/';
  const crumbs: BreadcrumbItem[] = [
    { label: portal.portalLabel, path: portal.basePath },
  ];

  if (
    role === 'doctor' &&
    (normalized.startsWith('/doctor/patients/') ||
      normalized === '/doctor/patient-details')
  ) {
    crumbs.push({ label: 'My Patients', path: '/doctor/patients' });
    crumbs.push({ label: 'Patient Details' });
    return crumbs;
  }

  if (role === 'doctor' && normalized.startsWith('/doctor/reports/')) {
    crumbs.push({ label: 'Medical Reports', path: '/doctor/reports' });
    crumbs.push({ label: 'Report Review' });
    return crumbs;
  }

  const matched = portal.items.find((item) => item.path === normalized);
  if (matched) {
    crumbs.push({ label: matched.label });
  }
  return crumbs;
}
