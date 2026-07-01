import { changeAdminCredentials, verifyAdminLogin } from './adminStore.js';
import { applyCors, getBearerToken, readJsonBody, sendJson } from './http.js';
import { signAdminToken, verifyAdminToken } from './jwt.js';
import { validateNewPassword } from './password.js';

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export async function handleAdminLogin(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, errorKey: 'admin.auth.server' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '');

    if (!username || !password) {
      sendJson(res, 401, { ok: false, errorKey: 'login.err_admin' });
      return;
    }

    const valid = await verifyAdminLogin({ username, password });
    if (!valid) {
      sendJson(res, 401, { ok: false, errorKey: 'login.err_admin' });
      return;
    }

    const token = await signAdminToken({ username });
    sendJson(res, 200, { ok: true, token, username });
  } catch (err) {
    console.error('[admin/login]', err);
    sendJson(res, 500, { ok: false, errorKey: 'admin.auth.server' });
  }
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export async function handleAdminMe(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'GET') {
    sendJson(res, 405, { ok: false, errorKey: 'admin.auth.server' });
    return;
  }

  try {
    const token = getBearerToken(req);
    if (!token) {
      sendJson(res, 401, { ok: false, errorKey: 'admin.auth.session' });
      return;
    }
    const { username } = await verifyAdminToken(token);
    sendJson(res, 200, { ok: true, username });
  } catch {
    sendJson(res, 401, { ok: false, errorKey: 'admin.auth.session' });
  }
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export async function handleAdminChangePassword(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, errorKey: 'admin.auth.server' });
    return;
  }

  try {
    const token = getBearerToken(req);
    if (!token) {
      sendJson(res, 401, { ok: false, errorKey: 'admin.auth.session' });
      return;
    }
    await verifyAdminToken(token);

    const body = await readJsonBody(req);
    const currentPassword = String(body.currentPassword ?? '');
    const newPassword = String(body.newPassword ?? '');
    const confirmPassword = String(body.confirmPassword ?? newPassword);
    const newUsername = body.newUsername != null ? String(body.newUsername) : undefined;

    if (!currentPassword || !newPassword) {
      sendJson(res, 400, { ok: false, errorKey: 'admin.change.invalid' });
      return;
    }
    if (newPassword !== confirmPassword) {
      sendJson(res, 400, { ok: false, errorKey: 'admin.change.mismatch' });
      return;
    }
    const pwCheck = validateNewPassword(newPassword);
    if (!pwCheck.ok) {
      sendJson(res, 400, { ok: false, errorKey: pwCheck.error });
      return;
    }

    const result = await changeAdminCredentials({
      currentPassword,
      newPassword,
      newUsername,
    });
    if (!result.ok) {
      sendJson(res, 401, { ok: false, errorKey: result.error ?? 'login.err_admin' });
      return;
    }

    const nextToken = await signAdminToken({ username: result.username });
    sendJson(res, 200, {
      ok: true,
      token: nextToken,
      username: result.username,
      errorKey: 'admin.change.ok',
    });
  } catch (err) {
    console.error('[admin/change-password]', err);
    sendJson(res, 500, { ok: false, errorKey: 'admin.auth.server' });
  }
}
