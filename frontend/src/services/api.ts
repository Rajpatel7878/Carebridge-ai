import axios, { type InternalAxiosRequestConfig } from 'axios';
import type {
  ApiErrorResponse,
  DatabaseHealthResponse,
  HealthResponse,
} from '@/types/api';
import { env } from '@/utils/env';

export const CSRF_COOKIE_NAME = 'cb_csrf_token';
export const CSRF_HEADER_NAME = 'X-CSRF-Token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);
const AUTH_SKIP_REFRESH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
];

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export function readCookie(name: string): string | null {
  if (typeof document === 'undefined' || !document.cookie) {
    return null;
  }
  const encodedName = `${encodeURIComponent(name)}=`;
  const cookies = document.cookie.split(';');
  for (const entry of cookies) {
    const trimmed = entry.trim();
    if (trimmed.startsWith(encodedName)) {
      return decodeURIComponent(trimmed.slice(encodedName.length));
    }
  }
  return null;
}

type SessionExpiredListener = () => void;
let sessionExpiredListener: SessionExpiredListener | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function setSessionExpiredListener(
  listener: SessionExpiredListener | null,
): void {
  sessionExpiredListener = listener;
}

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 10_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const method = (config.method ?? 'GET').toUpperCase();
  if (!SAFE_METHODS.has(method)) {
    const csrfToken = readCookie(CSRF_COOKIE_NAME);
    if (csrfToken) {
      config.headers.set(CSRF_HEADER_NAME, csrfToken);
    }
  }
  return config;
});

async function attemptSilentRefresh(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const csrfToken = readCookie(CSRF_COOKIE_NAME);
  if (!csrfToken) {
    return false;
  }

  refreshPromise = apiClient
    .post(
      '/auth/refresh',
      {},
      {
        headers: { [CSRF_HEADER_NAME]: csrfToken },
      },
    )
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetryableRequestConfig;
    const status = error.response?.status;
    const requestUrl = originalRequest.url ?? '';
    const shouldSkip = AUTH_SKIP_REFRESH_PATHS.some((path) =>
      requestUrl.includes(path),
    );

    if (status === 401 && !originalRequest._retry && !shouldSkip) {
      originalRequest._retry = true;
      const refreshed = await attemptSilentRefresh();
      if (refreshed) {
        return apiClient(originalRequest);
      }
      if (!requestUrl.includes('/auth/me')) {
        sessionExpiredListener?.();
      }
    }

    return Promise.reject(error);
  },
);

export function extractApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const apiMessage = error.response?.data?.error?.message;
    if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
      return apiMessage;
    }
    if (!error.response) {
      return 'Unable to reach the CareBridge AI server. Check your connection and try again.';
    }
  }
  return fallback;
}

export async function fetchApiHealth(): Promise<HealthResponse> {
  const { data } = await apiClient.get<HealthResponse>('/health');
  return data;
}

export async function fetchDatabaseHealth(): Promise<DatabaseHealthResponse> {
  const { data } =
    await apiClient.get<DatabaseHealthResponse>('/health/database');
  return data;
}
