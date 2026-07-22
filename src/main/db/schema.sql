-- DentiScribe AI — encrypted local schema (SQLCipher via better-sqlite3-multiple-ciphers)
-- This file is applied after `PRAGMA key = '<passphrase>'` is set by src/main/db/index.ts.
--
-- Scope (trimmed 2026-07-20): this app is a transcript-formatting tool, not a patient
-- record system. It never persists patient data — no patients/encounters/transcripts/
-- notes tables exist. The only things stored locally, ever, are: user accounts (to gate
-- access to the tool) and a handful of style-example notes the dentist supplies so the
-- LLM can match their preferred formatting. Everything else is processed in memory for
-- one session and discarded once the dentist copies the formatted result out.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id                    TEXT PRIMARY KEY,
  username              TEXT NOT NULL UNIQUE,
  password_hash         TEXT NOT NULL, -- Argon2id PHC string (src/main/auth/passwordHash.ts)
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until          TEXT, -- set after MAX_FAILED_ATTEMPTS consecutive failures, see src/main/auth/usersRepo.ts
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_login_at         TEXT
);

-- 15-minute inactivity invalidation is enforced in src/main/security/session.ts by
-- comparing now() against last_activity_at on every IPC call; expired sessions are
-- marked invalidated_at and rejected regardless of expires_at.
CREATE TABLE IF NOT EXISTS sessions (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id),
  token_hash       TEXT NOT NULL UNIQUE,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_activity_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at       TEXT NOT NULL,
  invalidated_at   TEXT
);

-- The dentist's own example notes, used as few-shot style guidance when formatting a
-- new transcript (src/main/ai/formatting/noteFormatter.ts). More examples can be added
-- at any time — there is no training/fine-tuning step, just more prompt context.
CREATE TABLE IF NOT EXISTS style_examples (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  category        TEXT, -- one of common/types/category.ts's ConversationCategory values, or NULL
  extracted_style TEXT, -- LLM-derived plain-language style summary, or NULL — see styleAnalyzer.ts
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_style_examples_user ON style_examples(user_id);

-- One row per user: free-form + structured formatting preferences, folded into the
-- system prompt on every formatting request (src/main/ai/formatting/noteFormatter.ts).
-- Deliberately not per-example — these are practice-wide conventions, not tied to any
-- one style example.
CREATE TABLE IF NOT EXISTS dentist_profiles (
  user_id             TEXT PRIMARY KEY REFERENCES users(id),
  style_notes         TEXT NOT NULL DEFAULT '',
  tooth_numbering     TEXT NOT NULL DEFAULT 'universal', -- ToothNumberingSystem
  abbreviation_policy TEXT NOT NULL DEFAULT 'preserve',   -- AbbreviationPolicy
  specialty           TEXT NOT NULL DEFAULT '',
  updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- "Avoid X, prefer Y" terminology pairs (e.g. avoid "filling", prefer "restoration"),
-- folded into the system prompt the same way as dentist_profiles.
CREATE TABLE IF NOT EXISTS terminology_preferences (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  avoid_term  TEXT NOT NULL,
  prefer_term TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_terminology_preferences_user ON terminology_preferences(user_id);

-- Explicit abbreviation → expansion pairs the dentist wants recognized regardless of
-- the general abbreviation_policy above (e.g. always expand "RCT" to "root canal
-- treatment" even if the policy is otherwise "preserve").
CREATE TABLE IF NOT EXISTS abbreviation_preferences (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  abbreviation TEXT NOT NULL,
  expansion    TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_abbreviation_preferences_user ON abbreviation_preferences(user_id);

-- The dentist's own remembered assisting-staff names (e.g. "which nurse was in the
-- room"), for a quick add/select/remove list attached to the formatting prompt context.
-- Not a staff/roles system — just short-lived, dentist-owned free text, same trust
-- level and lifecycle as style_examples.
CREATE TABLE IF NOT EXISTS staff_names (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_staff_names_user ON staff_names(user_id);
