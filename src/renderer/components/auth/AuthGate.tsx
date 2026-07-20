'use client';

import { useCallback } from 'react';
import { useSession } from './SessionContext';
import { useInactivityLogout } from '../../hooks/useInactivityLogout';
import { LoginScreen } from './LoginScreen';
import { DashboardShell } from '../DashboardShell';

export function AuthGate() {
  const { session, logout } = useSession();

  const handleInactivityTimeout = useCallback(() => {
    void logout();
  }, [logout]);

  useInactivityLogout(session !== null, handleInactivityTimeout);

  if (!session) return <LoginScreen />;
  return <DashboardShell username={session.username} onLogout={logout} />;
}
