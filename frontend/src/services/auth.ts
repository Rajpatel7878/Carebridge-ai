import { apiClient } from '@/services/api';
import type {
  AccountRole,
  AdminCreateUserPayload,
  AdminUpdateUserPayload,
  AdminUserListResponse,
  AuthUser,
  LoginPayload,
  MessageResponse,
  RegisterPayload,
  RegisterResponse,
  SessionResponse,
} from '@/types/auth';

export async function registerAccount(
  payload: RegisterPayload,
): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>(
    '/auth/register',
    payload,
  );
  return data;
}

export async function loginAccount(
  payload: LoginPayload,
): Promise<SessionResponse> {
  const { data } = await apiClient.post<SessionResponse>(
    '/auth/login',
    payload,
  );
  return data;
}

export async function refreshAuthSession(): Promise<SessionResponse> {
  const { data } = await apiClient.post<SessionResponse>('/auth/refresh', {});
  return data;
}

export async function logoutAccount(): Promise<MessageResponse> {
  const { data } = await apiClient.post<MessageResponse>('/auth/logout', {});
  return data;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>('/auth/me');
  return data;
}

export interface AdminUserQueryParams {
  role?: AccountRole;
  is_active?: boolean;
  pending_doctor_only?: boolean;
  search?: string;
}

export async function fetchAdminUsers(
  params?: AdminUserQueryParams,
): Promise<AdminUserListResponse> {
  const { data } = await apiClient.get<AdminUserListResponse>('/admin/users', {
    params,
  });
  return data;
}

export async function createAdminUser(
  payload: AdminCreateUserPayload,
): Promise<AuthUser> {
  const { data } = await apiClient.post<AuthUser>('/admin/users', payload);
  return data;
}

export async function updateAdminUser(
  userId: string,
  payload: AdminUpdateUserPayload,
): Promise<AuthUser> {
  const { data } = await apiClient.patch<AuthUser>(
    `/admin/users/${encodeURIComponent(userId)}`,
    payload,
  );
  return data;
}
