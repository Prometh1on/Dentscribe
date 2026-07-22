import { randomBytes } from 'node:crypto';
import type { DatabaseInstance } from '../types';
import type { AbbreviationPreference, CreateAbbreviationPreferenceInput } from '../../../common/types/dentistProfile';

interface AbbreviationPreferenceRow {
  id: string;
  abbreviation: string;
  expansion: string;
}

function rowToPreference(row: AbbreviationPreferenceRow): AbbreviationPreference {
  return { id: row.id, abbreviation: row.abbreviation, expansion: row.expansion };
}

export function listAbbreviationPreferences(db: DatabaseInstance, userId: string): AbbreviationPreference[] {
  const rows = db
    .prepare('SELECT id, abbreviation, expansion FROM abbreviation_preferences WHERE user_id = ? ORDER BY created_at')
    .all(userId) as AbbreviationPreferenceRow[];
  return rows.map(rowToPreference);
}

export function createAbbreviationPreference(
  db: DatabaseInstance,
  userId: string,
  input: CreateAbbreviationPreferenceInput
): AbbreviationPreference {
  const id = randomBytes(16).toString('hex');
  db.prepare(
    'INSERT INTO abbreviation_preferences (id, user_id, abbreviation, expansion) VALUES (@id, @userId, @abbreviation, @expansion)'
  ).run({ id, userId, abbreviation: input.abbreviation, expansion: input.expansion });

  const row = db
    .prepare('SELECT id, abbreviation, expansion FROM abbreviation_preferences WHERE id = ?')
    .get(id) as AbbreviationPreferenceRow;
  return rowToPreference(row);
}

export function deleteAbbreviationPreference(db: DatabaseInstance, userId: string, id: string): void {
  db.prepare('DELETE FROM abbreviation_preferences WHERE id = ? AND user_id = ?').run(id, userId);
}
