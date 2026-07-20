export interface AuthResult {
  userId: string;
  username: string;
}

/**
 * Shared message constants so main (src/main/auth/errors.ts) and renderer
 * (session error handling) agree on exact text — Electron's IPC error
 * serialization only reliably preserves `.message`, not custom error classes
 * or codes, so string-matching against a shared constant is the practical
 * way to distinguish error types across the boundary.
 */
export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid username or password',
  SESSION_EXPIRED: 'Session expired or invalid; please log in again',
  ACCOUNT_LOCKED: 'Account temporarily locked due to repeated failed login attempts',
} as const;
