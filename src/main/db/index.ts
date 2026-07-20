import Database from 'better-sqlite3-multiple-ciphers';
import { app } from 'electron';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOrCreateDatabaseKey } from '../security/keyManager';
import type { DatabaseInstance } from './types';

let db: DatabaseInstance | null = null;

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

  db = instance;
  return db;
}

export function closeDatabase(): void {
  db?.close();
  db = null;
}
