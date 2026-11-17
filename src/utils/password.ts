import bcrypt from 'bcryptjs';
import { env } from '../config/env';

/**
 * Hashes a plaintext password using bcrypt with configurable cost factor (default 12).
 */
export async function hashPassword(plainTextPassword: string): Promise<string> {
  const salt = await bcrypt.genSalt(env.BCRYPT_SALT_ROUNDS);
  return bcrypt.hash(plainTextPassword, salt);
}

/**
 * Constant-time comparison of plaintext password against a stored bcrypt hash.
 */
export async function verifyPassword(
  plainTextPassword: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, passwordHash);
}
