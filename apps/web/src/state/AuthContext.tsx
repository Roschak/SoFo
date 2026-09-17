import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiRequestError } from '../lib/api';
import {
  clearSession,
  loadSession,
  saveSession,
  type AuthSession,
  type User,
} from '../lib/types';

interface AuthContextValue {
  session: AuthSession | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, displayName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => loadSession());

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<{ user?: User; token: string; id?: string; email?: string; displayName?: string }>(
      '/auth/login',
      { method: 'POST', body: { email, password } },
    );
    let user: User;
    if (data.user) {
      user = data.user;
    } else {
      user = await api<User>('/users/me', {
        method: 'GET',
        token: data.token,
      });
    }
    const next = { user, token: data.token };
    saveSession(next);
    setSession(next);
  }, []);

  const register = useCallback(
    async (email: string, displayName: string, password: string) => {
      await api('/auth/register', { method: 'POST', body: { email, displayName, password } });
      await login(email, password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    const current = loadSession();
    if (current) {
      await api('/auth/session', { method: 'DELETE', token: current.token }).catch(
        (error: unknown) => {
          if (!(error instanceof ApiRequestError && error.code === 'UNAUTHENTICATED')) {
            throw error;
          }
        },
      );
    }
    clearSession();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, login, register, logout }),
    [session, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
