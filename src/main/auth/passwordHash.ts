import argon2 from 'argon2';

/**
 * OWASP-recommended baseline for argon2id (2023 cheat sheet): m=19456 KiB (~19 MiB),
 * t=2, p=1. argon2.verify() reads these back out of the stored PHC string, so they
 * only need to be specified on hash(), not on verify().
 */
const ARGON2ID_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2ID_OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // Malformed/foreign hash string — treat as a failed verification, not a crash.
    return false;
  }
}
