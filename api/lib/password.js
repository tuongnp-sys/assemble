import bcrypt from 'bcryptjs';

const ROUNDS = 12;

/**
 * @param {string} plain
 */
export async function hashPassword(plain) {
  return bcrypt.hash(plain, ROUNDS);
}

/**
 * @param {string} plain
 * @param {string} hash
 */
export async function verifyPassword(plain, hash) {
  if (!plain || !hash) return false;
  return bcrypt.compare(plain, hash);
}

/**
 * @param {string} password
 */
export function validateNewPassword(password) {
  if (!password || password.length < 8) {
    return { ok: false, error: 'admin.change.short' };
  }
  return { ok: true };
}
