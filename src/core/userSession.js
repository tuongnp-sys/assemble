import {
  clearAdminToken,
  getAdminToken,
  isAdminFeatureEnabled,
  loginAdminRemote,
  verifyAdminSessionRemote,
} from './adminAuthService.js';

const SESSION_KEY = 'tretramdot_session';

/** @typedef {{ userId: string, nickname: string, role: 'player'|'admin' }} UserSession */

/**
 * @param {string} nickname
 */
function makePlayerId(nickname) {
  const norm = nickname.trim().toLowerCase().replace(/\s+/g, '_').slice(0, 24);
  let h = 0;
  for (let i = 0; i < norm.length; i++) {
    h = (h * 31 + norm.charCodeAt(i)) >>> 0;
  }
  return `p_${h.toString(36)}`;
}

/** @returns {UserSession|null} */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d?.userId || !d?.nickname) return null;
    const role = d.role === 'admin' ? 'admin' : 'player';
    if (role === 'admin' && !getAdminToken()) {
      return null;
    }
    return {
      userId: String(d.userId),
      nickname: String(d.nickname),
      role,
    };
  } catch {
    return null;
  }
}

/** @param {UserSession} session */
function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * @param {string} nickname
 * @returns {{ ok: boolean, errorKey?: string, user?: UserSession }}
 */
export function loginPlayer(nickname) {
  const name = nickname?.trim();
  if (!name || name.length < 2) {
    return { ok: false, errorKey: 'login.err_short' };
  }
  if (name.length > 16) {
    return { ok: false, errorKey: 'login.err_long' };
  }
  const user = {
    userId: makePlayerId(name),
    nickname: name,
    role: /** @type {const} */ ('player'),
  };
  saveSession(user);
  return { ok: true, user };
}

/**
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ ok: boolean, errorKey?: string, user?: UserSession }>}
 */
export async function loginAdmin(username, password) {
  if (!isAdminFeatureEnabled()) {
    return { ok: false, errorKey: 'admin.auth.disabled' };
  }
  const remote = await loginAdminRemote(username, password);
  if (!remote.ok) {
    return { ok: false, errorKey: remote.errorKey ?? 'login.err_admin' };
  }
  const user = {
    userId: 'admin',
    nickname: 'Admin',
    role: /** @type {const} */ ('admin'),
  };
  saveSession(user);
  return { ok: true, user };
}

export function logout() {
  clearAdminToken();
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} baseKey
 * @returns {string}
 */
export function userStorageKey(baseKey) {
  const user = getCurrentUser();
  if (!user) return baseKey;
  return `${baseKey}_${user.userId}`;
}

/** @returns {boolean} */
export function isAdminSession() {
  const user = getCurrentUser();
  return user?.role === 'admin' && !!getAdminToken();
}

/** @returns {boolean} */
export function isLoggedIn() {
  return getCurrentUser() != null;
}

/**
 * Khôi phục phiên admin sau F5 — xác thực token với server.
 * @returns {Promise<void>}
 */
export async function reconcileAdminSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return;
  try {
    const d = JSON.parse(raw);
    if (d?.role !== 'admin') return;
    if (!getAdminToken()) {
      logout();
      return;
    }
    const valid = await verifyAdminSessionRemote();
    if (!valid) {
      logout();
    }
  } catch {
    logout();
  }
}

/**
 * @returns {'LoginScene'|'MenuScene'|'AdminHubScene'}
 */
export function getPostLoginScene() {
  const user = getCurrentUser();
  if (!user) return 'LoginScene';
  if (user.role === 'admin' && isAdminSession()) return 'AdminHubScene';
  return 'MenuScene';
}

export { isAdminFeatureEnabled };
