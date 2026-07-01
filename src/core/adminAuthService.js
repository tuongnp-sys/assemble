import { apiGet, apiPost } from './apiClient.js';

const TOKEN_KEY = 'tretramdot_admin_token';

export function isAdminFeatureEnabled() {
  return import.meta.env.VITE_ENABLE_ADMIN !== 'false';
}

/**
 * @returns {string|null}
 */
export function getAdminToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * @param {string} token
 */
export function setAdminToken(token) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearAdminToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} username
 * @param {string} password
 */
export async function loginAdminRemote(username, password) {
  const res = await apiPost('/api/admin/login', { username, password });
  if (!res.ok || !res.data || typeof res.data !== 'object') {
    return { ok: false, errorKey: res.errorKey ?? 'admin.auth.network' };
  }
  const data = /** @type {{ token?: string }} */ (res.data);
  if (!data.token) {
    return { ok: false, errorKey: 'admin.auth.server' };
  }
  setAdminToken(data.token);
  return { ok: true };
}

/**
 * @returns {Promise<boolean>}
 */
export async function verifyAdminSessionRemote() {
  const token = getAdminToken();
  if (!token) return false;
  const res = await apiGet('/api/admin/me', { token });
  if (!res.ok) {
    clearAdminToken();
    return false;
  }
  return true;
}

/**
 * @param {{
 *   currentPassword: string,
 *   newPassword: string,
 *   confirmPassword: string,
 *   newUsername?: string,
 * }} input
 */
export async function changeAdminCredentialsRemote(input) {
  const token = getAdminToken();
  if (!token) {
    return { ok: false, errorKey: 'admin.auth.session' };
  }
  const res = await apiPost('/api/admin/change-password', input, { token });
  if (!res.ok || !res.data || typeof res.data !== 'object') {
    return { ok: false, errorKey: res.errorKey ?? 'admin.auth.server' };
  }
  const data = /** @type {{ token?: string, errorKey?: string }} */ (res.data);
  if (data.token) {
    setAdminToken(data.token);
  }
  return {
    ok: true,
    messageKey: data.errorKey ?? 'admin.change.ok',
  };
}
