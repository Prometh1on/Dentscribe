import type { DatabaseInstance } from '../db/types';
import { touchSession } from '../security/session';
import { findUserById } from './usersRepo';
import { SessionExpiredError } from './errors';

export interface AuthenticatedSession {
  sessionId: string;
  userId: string;
}

/** Re-checks the user still exists on every call, not just that the token is valid. */
export function requireSession(db: DatabaseInstance, token: string | undefined | null): AuthenticatedSession {
  if (!token) throw new SessionExpiredError();

  const session = touchSession(db, token);
  if (!session) throw new SessionExpiredError();

  const user = findUserById(db, session.userId);
  if (!user) throw new SessionExpiredError();

  return { sessionId: session.id, userId: user.id };
}
