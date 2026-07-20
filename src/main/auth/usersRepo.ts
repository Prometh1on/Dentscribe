import { randomBytes } from 'node:crypto';
import type { DatabaseInstance } from '../db/types';

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  failedLoginAttempts: number;
  lockedUntil: string | null;
}

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  failed_login_attempts: number;
  locked_until: string | null;
}

function rowToUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    failedLoginAttempts: row.failed_login_attempts,
    lockedUntil: row.locked_until,
  };
}

export function countUsers(db: DatabaseInstance): number {
  const row = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  return row.count;
}

export function findUserByUsername(db: DatabaseInstance, username: string): UserRecord | null {
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined;
  return row ? rowToUser(row) : null;
}

export function findUserById(db: DatabaseInstance, id: string): UserRecord | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row ? rowToUser(row) : null;
}

export interface CreateUserInput {
  username: string;
  passwordHash: string;
}

export function createUser(db: DatabaseInstance, input: CreateUserInput): UserRecord {
  const id = randomBytes(16).toString('hex');
  db.prepare('INSERT INTO users (id, username, password_hash) VALUES (@id, @username, @passwordHash)').run({
    id,
    username: input.username,
    passwordHash: input.passwordHash,
  });
  return findUserById(db, id) as UserRecord;
}

export function recordLoginSuccess(db: DatabaseInstance, userId: string): void {
  db.prepare(
    'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = ? WHERE id = ?'
  ).run(new Date().toISOString(), userId);
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export function recordLoginFailure(db: DatabaseInstance, userId: string): void {
  const user = findUserById(db, userId);
  if (!user) return;

  const attempts = user.failedLoginAttempts + 1;
  const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString() : null;

  db.prepare('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?').run(
    attempts,
    lockedUntil,
    user.id
  );
}
