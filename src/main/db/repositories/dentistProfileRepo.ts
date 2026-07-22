import type { DatabaseInstance } from '../types';
import type {
  AbbreviationPolicy,
  DentistProfile,
  ToothNumberingSystem,
} from '../../../common/types/dentistProfile';

interface DentistProfileRow {
  style_notes: string;
  tooth_numbering: string;
  abbreviation_policy: string;
  specialty: string;
}

const DEFAULT_PROFILE: DentistProfile = {
  styleNotes: '',
  toothNumbering: 'universal',
  abbreviationPolicy: 'preserve',
  specialty: '',
};

function rowToProfile(row: DentistProfileRow): DentistProfile {
  return {
    styleNotes: row.style_notes,
    toothNumbering: row.tooth_numbering as ToothNumberingSystem,
    abbreviationPolicy: row.abbreviation_policy as AbbreviationPolicy,
    specialty: row.specialty,
  };
}

/** Returns the dentist's profile, or sensible defaults if they've never saved one. */
export function getDentistProfile(db: DatabaseInstance, userId: string): DentistProfile {
  const row = db
    .prepare('SELECT style_notes, tooth_numbering, abbreviation_policy, specialty FROM dentist_profiles WHERE user_id = ?')
    .get(userId) as DentistProfileRow | undefined;
  return row ? rowToProfile(row) : DEFAULT_PROFILE;
}

/** Upserts the single per-user profile row and returns the resulting profile. */
export function updateDentistProfile(
  db: DatabaseInstance,
  userId: string,
  patch: Partial<DentistProfile>
): DentistProfile {
  const current = getDentistProfile(db, userId);
  const next: DentistProfile = { ...current, ...patch };

  db.prepare(
    `INSERT INTO dentist_profiles (user_id, style_notes, tooth_numbering, abbreviation_policy, specialty, updated_at)
     VALUES (@userId, @styleNotes, @toothNumbering, @abbreviationPolicy, @specialty, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
     ON CONFLICT(user_id) DO UPDATE SET
       style_notes = @styleNotes,
       tooth_numbering = @toothNumbering,
       abbreviation_policy = @abbreviationPolicy,
       specialty = @specialty,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
  ).run({
    userId,
    styleNotes: next.styleNotes,
    toothNumbering: next.toothNumbering,
    abbreviationPolicy: next.abbreviationPolicy,
    specialty: next.specialty,
  });

  return next;
}
