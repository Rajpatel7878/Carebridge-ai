function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!configured) {
    return '/api';
  }

  // If accessed via a non-localhost domain (e.g. a remote preview URL) while
  // VITE_API_BASE_URL points to localhost, fall back to relative /api proxying.
  if (typeof window !== 'undefined') {
    const isBrowserLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    const isTargetLocal =
      configured.includes('://localhost') ||
      configured.includes('://127.0.0.1');

    if (!isBrowserLocal && isTargetLocal) {
      return '/api';
    }
  }

  return configured.replace(/\/+$/, '');
}

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const;
