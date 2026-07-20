'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import type { AuthResult } from '../../../common/types/auth';

interface SessionContextValue {
  session: AuthResult | null;
  login: (username: string, password: string) => Promise<void>;
  bootstrapFirstUser: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Call when a guarded API call reports the session expired server-side, without going through the normal logout flow. */
  forceExpire: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthResult | null>(null);

  const login = useCallback(async (username: string, password: string) => {
    const result = await window.dentiScribe.auth.login(username, password);
    setSession(result);
  }, []);

  const bootstrapFirstUser = useCallback(async (username: string, password: string) => {
    const result = await window.dentiScribe.auth.bootstrapFirstUser(username, password);
    setSession(result);
  }, []);

  const logout = useCallback(async () => {
    await window.dentiScribe.auth.logout();
    setSession(null);
  }, []);

  const forceExpire = useCallback(() => setSession(null), []);

  return (
    <SessionContext.Provider value={{ session, login, bootstrapFirstUser, logout, forceExpire }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
