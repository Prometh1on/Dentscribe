import { randomBytes } from 'node:crypto';
import type { DatabaseInstance } from '../types';
import type { CreateTerminologyPreferenceInput, TerminologyPreference } from '../../../common/types/dentistProfile';

interface TerminologyPreferenceRow {
  id: string;
  avoid_term: string;
  prefer_term: string;
}

function rowToPreference(row: TerminologyPreferenceRow): TerminologyPreference {
  return { id: row.id, avoidTerm: row.avoid_term, preferTerm: row.prefer_term };
}

export function listTerminologyPreferences(db: DatabaseInstance, userId: string): TerminologyPreference[] {
  const rows = db
    .prepare('SELECT id, avoid_term, prefer_term FROM terminology_preferences WHERE user_id = ? ORDER BY created_at')
    .all(userId) as TerminologyPreferenceRow[];
  return rows.map(rowToPreference);
}

export function createTerminologyPreference(
  db: DatabaseInstance,
  userId: string,
  input: CreateTerminologyPreferenceInput
): TerminologyPreference {
  const id = randomBytes(16).toString('hex');
  db.prepare(
    'INSERT INTO terminology_preferences (id, user_id, avoid_term, prefer_term) VALUES (@id, @userId, @avoidTerm, @preferTerm)'
  ).run({ id, userId, avoidTerm: input.avoidTerm, preferTerm: input.preferTerm });

  const row = db
    .prepare('SELECT id, avoid_term, prefer_term FROM terminology_preferences WHERE id = ?')
    .get(id) as TerminologyPreferenceRow;
  return rowToPreference(row);
}

export function deleteTerminologyPreference(db: DatabaseInstance, userId: string, id: string): void {
  db.prepare('DELETE FROM terminology_preferences WHERE id = ? AND user_id = ?').run(id, userId);
}
