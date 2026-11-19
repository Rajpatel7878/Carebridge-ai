import type { UserRole } from '@/types/domain';

export type AccountRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export interface AuthUser {
  id: string;
  full_name: string;
  email: string;
  role: AccountRole;
  is_active: boolean;
  is_verified: boolean;
  requested_role: 'DOCTOR' | null;
  created_at: string;
  updated_at: string;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  role: 'PATIENT' | 'DOCTOR';
}

export interface RegisterResponse {
  user: AuthUser;
  message: string;
  requires_role_approval: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
  remember_session?: boolean;
}

export interface SessionResponse {
  user: AuthUser;
  access_token_expires_in: number;
  session_type: 'session' | 'persistent';
  message: string;
}

export interface MessageResponse {
  message: string;
}

export interface AdminCreateUserPayload {
  full_name: string;
  email: string;
  password: string;
  role: AccountRole;
  is_active?: boolean;
  is_verified?: boolean;
}

export interface AdminUpdateUserPayload {
  role?: AccountRole;
  is_active?: boolean;
  is_verified?: boolean;
  clear_requested_role?: boolean;
}

export interface AdminUserListResponse {
  items: AuthUser[];
  total: number;
}

const ROLE_TO_PORTAL: Record<AccountRole, UserRole> = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  ADMIN: 'admin',
};

const ROLE_TO_BASE_PATH: Record<AccountRole, string> = {
  PATIENT: '/patient',
  DOCTOR: '/doctor',
  ADMIN: '/admin',
};

const ROLE_LABELS: Record<AccountRole, string> = {
  PATIENT: 'Patient',
  DOCTOR: 'Doctor',
  ADMIN: 'Administrator',
};

export function accountRoleToPortalRole(role: AccountRole): UserRole {
  return ROLE_TO_PORTAL[role];
}

export function getDashboardPathForRole(role: AccountRole): string {
  return ROLE_TO_BASE_PATH[role];
}

export function getRoleDisplayName(role: AccountRole): string {
  return ROLE_LABELS[role];
}

export function isPathAllowedForRole(
  pathname: string,
  role: AccountRole,
): boolean {
  if (!pathname.startsWith('/') || pathname.startsWith('//')) {
    return false;
  }
  const basePath = ROLE_TO_BASE_PATH[role];
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}
