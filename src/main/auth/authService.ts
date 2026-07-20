import type { DatabaseInstance } from '../db/types';
import type { AuthResult } from '../../common/types/auth';
import { createSession, invalidateSession, touchSession } from '../security/session';
import { hashPassword, verifyPassword } from './passwordHash';
import { AccountLockedError, InvalidCredentialsError } from './errors';
import {
  countUsers,
  createUser,
  findUserByUsername,
  recordLoginFailure,
  recordLoginSuccess,
} from './usersRepo';

/** Crosses the main→preload IPC boundary only; preload strips `token` out before it ever reaches page JS. */
export interface LoginResult extends AuthResult {
  token: string;
}

export async function login(db: DatabaseInstance, username: string, password: string): Promise<LoginResult> {
  const user = findUserByUsername(db, username);

  if (!user) {
    // Same generic error as a bad password — don't reveal whether the username exists.
    throw new InvalidCredentialsError();
  }

  if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
    throw new AccountLockedError(user.lockedUntil);
  }

  const passwordValid = await verifyPassword(user.passwordHash, password);
  if (!passwordValid) {
    recordLoginFailure(db, user.id);
    throw new InvalidCredentialsError();
  }

  recordLoginSuccess(db, user.id);
  const { token } = createSession(db, user.id);

  return { token, userId: user.id, username: user.username };
}

export function logout(db: DatabaseInstance, token: string): void {
  invalidateSession(db, token);
}

/** Only succeeds when zero users exist — first-run setup for the initial account. */
export async function bootstrapFirstUser(db: DatabaseInstance, username: string, password: string): Promise<LoginResult> {
  if (countUsers(db) > 0) {
    throw new Error('Setup already completed; an account already exists.');
  }

  const passwordHash = await hashPassword(password);
  const user = createUser(db, { username, passwordHash });

  const { token } = createSession(db, user.id);

  return { token, userId: user.id, username: user.username };
}
