import Database from 'better-sqlite3-multiple-ciphers';

/**
 * The package exports via `export = Database` with its internal namespace
 * named `BetterSqlite3MultipleCiphers` (not `Database`), so neither
 * `import type { Database } from 'better-sqlite3-multiple-ciphers'` (no named
 * export exists) nor `Database.Database` (no namespace merges under that
 * name) resolve to a type. `InstanceType<typeof Database>` is the correct way
 * to get the instance type from an `export =` constructor value. Every other
 * file in this codebase should import `DatabaseInstance` from here rather
 * than reaching into the package directly.
 */
export type DatabaseInstance = InstanceType<typeof Database>;
