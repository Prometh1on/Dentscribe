import { app, safeStorage } from 'electron';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Generic at-rest secret storage backed by Electron's safeStorage (Windows
 * DPAPI / Credential Manager on this platform). Used for the SQLCipher DB
 * passphrase (src/main/security/keyManager.ts) and for optional cloud provider
 * API keys (Deepgram, OpenAI, Anthropic) — nothing sensitive is ever written
 * to disk in plaintext.
 */

function secretsDir(): string {
  const dir = join(app.getPath('userData'), 'secrets');
  mkdirSync(dir, { recursive: true });
  return dir;
}

function secretPath(name: string): string {
  return join(secretsDir(), `${name}.enc`);
}

function assertEncryptionAvailable(): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS-level credential encryption is unavailable on this machine; refusing to store a secret in plaintext.');
  }
}

export function hasSecret(name: string): boolean {
  return existsSync(secretPath(name));
}

export function readSecret(name: string): string | null {
  const path = secretPath(name);
  if (!existsSync(path)) return null;
  assertEncryptionAvailable();
  return safeStorage.decryptString(readFileSync(path));
}

export function writeSecret(name: string, value: string): void {
  assertEncryptionAvailable();
  writeFileSync(secretPath(name), safeStorage.encryptString(value));
}

export function deleteSecret(name: string): void {
  const path = secretPath(name);
  if (existsSync(path)) unlinkSync(path);
}
