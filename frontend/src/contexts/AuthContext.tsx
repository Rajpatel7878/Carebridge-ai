import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AuthContext, type AuthStatus } from '@/contexts/auth-context';
import { setSessionExpiredListener } from '@/services/api';
import {
  fetchCurrentUser,
  loginAccount,
  logoutAccount,
  registerAccount,
} from '@/services/auth';
import type {
  AuthUser,
  LoginPayload,
  RegisterPayload,
  RegisterResponse,
} from '@/types/auth';

export interface AuthProviderProps {
  children: ReactNode;
  /** Optional initial user override used strictly in isolated UI unit tests. */
  initialUser?: AuthUser | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const hasInitialOverride = initialUser !== undefined;
  const [user, setUser] = useState<AuthUser | null>(initialUser ?? null);
  const [status, setStatus] = useState<AuthStatus>(() => {
    if (!hasInitialOverride) return 'loading';
    return initialUser ? 'authenticated' : 'unauthenticated';
  });

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
      setStatus('authenticated');
      return currentUser;
    } catch {
      setUser(null);
      setStatus('unauthenticated');
      return null;
    }
  }, []);

  useEffect(() => {
    setSessionExpiredListener(() => {
      setUser(null);
      setStatus('unauthenticated');
    });
    return () => setSessionExpiredListener(null);
  }, []);

  useEffect(() => {
    if (hasInitialOverride) {
      return;
    }

    let active = true;
    fetchCurrentUser()
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setStatus('unauthenticated');
      });

    return () => {
      active = false;
    };
  }, [hasInitialOverride]);

  const login = useCallback(
    async (payload: LoginPayload): Promise<AuthUser> => {
      const response = await loginAccount(payload);
      setUser(response.user);
      setStatus('authenticated');
      return response.user;
    },
    [],
  );

  const register = useCallback(
    async (payload: RegisterPayload): Promise<RegisterResponse> => {
      return registerAccount(payload);
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutAccount();
    } finally {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated' && user !== null,
      isLoading: status === 'loading',
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, status, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
