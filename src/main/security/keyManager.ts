import { randomBytes } from 'node:crypto';
import { hasSecret, readSecret, writeSecret } from './secretStore';

const DB_PASSPHRASE_SECRET_NAME = 'db-passphrase';

export function getOrCreateDatabaseKey(): string {
  if (hasSecret(DB_PASSPHRASE_SECRET_NAME)) {
    return readSecret(DB_PASSPHRASE_SECRET_NAME) as string;
  }

  const passphrase = randomBytes(32).toString('hex');
  writeSecret(DB_PASSPHRASE_SECRET_NAME, passphrase);
  return passphrase;
}
