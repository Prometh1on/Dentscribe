import Database from 'better-sqlite3-multiple-ciphers';
import { app } from 'electron';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOrCreateDatabaseKey } from '../security/keyManager';
import type { DatabaseInstance } from './types';

let db: DatabaseInstance | null = null;

/**
 * `schema.sql`'s `CREATE TABLE IF NOT EXISTS` is a no-op against a table that already
 * exists on disk, so a new column added there never reaches an existing install — there's
 * no migration framework in this project (not needed yet for anything but this one case).
 * This adds columns that were introduced after a table already shipped; it's a no-op once
 * the column exists.
 */
function runColumnMigrations(instance: DatabaseInstance): void {
  const styleExampleColumns = instance.prepare('PRAGMA table_info(style_examples)').all() as Array<{
    name: string;
  }>;
  const hasCategoryColumn = styleExampleColumns.some((column) => column.name === 'category');
  if (!hasCategoryColumn) {
    instance.exec('ALTER TABLE style_examples ADD COLUMN category TEXT');
  }
}

export function getDatabase(): DatabaseInstance {
  if (db) return db;

  const dbPath = join(app.getPath('userData'), 'dentiscribe.sqlite');
  const instance = new Database(dbPath);

  // SQLCipher-compatible AES-256 encryption at rest, keyed by keyManager.
  // .key() takes a Buffer, not a string — passing the passphrase directly was a real type error.
  instance.pragma(`cipher='sqlcipher'`);
  instance.key(Buffer.from(getOrCreateDatabaseKey(), 'utf-8'));

  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');

  const schemaPath = join(__dirname, 'schema.sql');
  instance.exec(readFileSync(schemaPath, 'utf-8'));
  runColumnMigrations(instance);

  db = instance;
  return db;
}

export function closeDatabase(): void {
  db?.close();
  db = null;
}
