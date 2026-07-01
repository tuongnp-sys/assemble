import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword, verifyPassword } from './password.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(__dirname, '../../.data/admin-credentials.json');
const KV_KEY = 'tretram:admin';

/**
 * @returns {Promise<{ username: string, passwordHash: string, updatedAt?: string }|null>}
 */
async function readFromKv() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null;
  }
  try {
    const { kv } = await import('@vercel/kv');
    const record = await kv.get(KV_KEY);
    if (!record || typeof record !== 'object') return null;
    if (typeof record.username !== 'string' || typeof record.passwordHash !== 'string') {
      return null;
    }
    return record;
  } catch (err) {
    console.warn('[adminStore] KV read failed', err);
    return null;
  }
}

/**
 * @param {{ username: string, passwordHash: string }} record
 */
async function writeToKv(record) {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return false;
  }
  const { kv } = await import('@vercel/kv');
  await kv.set(KV_KEY, {
    username: record.username,
    passwordHash: record.passwordHash,
    updatedAt: new Date().toISOString(),
  });
  return true;
}

/**
 * @returns {Promise<{ username: string, passwordHash: string, updatedAt?: string }|null>}
 */
async function readFromFile() {
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    const record = JSON.parse(raw);
    if (typeof record.username !== 'string' || typeof record.passwordHash !== 'string') {
      return null;
    }
    return record;
  } catch {
    return null;
  }
}

/**
 * @param {{ username: string, passwordHash: string }} record
 */
async function writeToFile(record) {
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  await writeFile(
    DATA_FILE,
    JSON.stringify(
      {
        username: record.username,
        passwordHash: record.passwordHash,
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    ),
    'utf8'
  );
}

/**
 * @returns {Promise<{ username: string, passwordHash: string }|null>}
 */
export async function getStoredAdmin() {
  const kv = await readFromKv();
  if (kv) return kv;
  return readFromFile();
}

/**
 * @param {{ username: string, password: string }} cred
 */
async function bootstrapFromEnv(cred) {
  const username = (process.env.ADMIN_USERNAME || 'admin').trim();
  const envHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const envPlain = process.env.ADMIN_PASSWORD?.trim();

  if (cred.username?.trim() !== username) return false;

  if (envHash) {
    return verifyPassword(cred.password, envHash);
  }
  if (envPlain) {
    return cred.password === envPlain;
  }
  return false;
}

/**
 * @param {{ username: string, password: string }} cred
 */
export async function verifyAdminLogin(cred) {
  const stored = await getStoredAdmin();
  if (stored) {
    if (cred.username?.trim() !== stored.username) return false;
    return verifyPassword(cred.password, stored.passwordHash);
  }
  return bootstrapFromEnv(cred);
}

/**
 * @param {{ username: string, password: string }} cred
 */
export async function saveAdminCredentials(cred) {
  const passwordHash = await hashPassword(cred.password);
  const record = { username: cred.username.trim(), passwordHash };

  const kvOk = await writeToKv(record);
  if (kvOk) return record;

  await writeToFile(record);
  return record;
}

/**
 * @param {{ currentPassword: string, newUsername?: string, newPassword: string }} input
 */
export async function changeAdminCredentials(input) {
  const stored = await getStoredAdmin();
  const username = stored?.username ?? process.env.ADMIN_USERNAME ?? 'admin';

  let currentValid = false;
  if (stored) {
    currentValid = await verifyPassword(input.currentPassword, stored.passwordHash);
  } else {
    currentValid = await bootstrapFromEnv({
      username,
      password: input.currentPassword,
    });
  }
  if (!currentValid) {
    return { ok: false, error: 'login.err_admin' };
  }

  const nextUsername = (input.newUsername?.trim() || username).slice(0, 32);
  const record = await saveAdminCredentials({
    username: nextUsername,
    password: input.newPassword,
  });
  return { ok: true, username: record.username };
}
