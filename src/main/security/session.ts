import { randomBytes, createHash } from 'node:crypto';
import type { DatabaseInstance } from '../db/types';

export const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createSession(db: DatabaseInstance, userId: string): { session: Session; token: string } {
  const token = randomBytes(32).toString('hex');
  const now = new Date();
  const id = randomBytes(16).toString('hex');
  const expiresAt = new Date(now.getTime() + INACTIVITY_TIMEOUT_MS).toISOString();

  db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, created_at, last_activity_at, expires_at)
     VALUES (@id, @userId, @tokenHash, @now, @now, @expiresAt)`
  ).run({ id, userId, tokenHash: hashToken(token), now: now.toISOString(), expiresAt });

  return { session: { id, userId, expiresAt }, token };
}

/**
 * Call on every authenticated IPC request. Returns null if the session is missing,
 * already invalidated, or has been idle past INACTIVITY_TIMEOUT_MS — callers must
 * force re-authentication in that case. On success, slides the expiry window forward.
 */
export function touchSession(db: DatabaseInstance, token: string): Session | null {
  const tokenHash = hashToken(token);
  const row = db
    .prepare(
      `SELECT id, user_id as userId, last_activity_at as lastActivityAt, invalidated_at as invalidatedAt
       FROM sessions WHERE token_hash = ?`
    )
    .get(tokenHash) as { id: string; userId: string; lastActivityAt: string; invalidatedAt: string | null } | undefined;

  if (!row || row.invalidatedAt) return null;

  const now = new Date();
  const idleSince = new Date(row.lastActivityAt);
  if (now.getTime() - idleSince.getTime() > INACTIVITY_TIMEOUT_MS) {
    db.prepare('UPDATE sessions SET invalidated_at = ? WHERE id = ?').run(now.toISOString(), row.id);
    return null;
  }

  const expiresAt = new Date(now.getTime() + INACTIVITY_TIMEOUT_MS).toISOString();
  db.prepare('UPDATE sessions SET last_activity_at = ?, expires_at = ? WHERE id = ?').run(
    now.toISOString(),
    expiresAt,
    row.id
  );

  return { id: row.id, userId: row.userId, expiresAt };
}

export function invalidateSession(db: DatabaseInstance, token: string): void {
  db.prepare('UPDATE sessions SET invalidated_at = ? WHERE token_hash = ?').run(
    new Date().toISOString(),
    hashToken(token)
  );
}
