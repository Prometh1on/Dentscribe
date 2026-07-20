'use client';

import { useEffect, useRef } from 'react';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;

/**
 * Client-side mirror of the 15-minute server-side session timeout
 * (src/main/security/session.ts). The server enforces the real cutoff on the
 * next guarded IPC call regardless of this hook; this just gives an immediate,
 * proactive UI redirect to the login screen instead of waiting for the next
 * action to fail with "session expired".
 */
export function useInactivityLogout(active: boolean, onTimeout: () => void): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) return;

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(onTimeout, INACTIVITY_TIMEOUT_MS);
    };

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, reset));
    reset();

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, reset));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, onTimeout]);
}
