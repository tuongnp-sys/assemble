/**
 * HTTP client — mọi call API server đi qua đây.
 */

const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');

/**
 * @param {string} path
 */
function apiUrl(path) {
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}

/**
 * @param {string} path
 * @param {RequestInit & { token?: string }} [opts]
 */
export async function apiFetch(path, opts = {}) {
  const { token, headers: extraHeaders, ...rest } = opts;
  /** @type {Record<string, string>} */
  const headers = {
    Accept: 'application/json',
    ...(extraHeaders ?? {}),
  };
  if (rest.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(apiUrl(path), { ...rest, headers });
  } catch {
    return { ok: false, status: 0, errorKey: 'admin.auth.network', data: null };
  }

  /** @type {unknown} */
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
    errorKey:
      data && typeof data === 'object' && 'errorKey' in data
        ? String(/** @type {{ errorKey: string }} */ (data).errorKey)
        : res.ok
          ? null
          : 'admin.auth.server',
  };
}

/**
 * @param {string} path
 * @param {object} body
 * @param {{ token?: string }} [opts]
 */
export async function apiPost(path, body, opts = {}) {
  return apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
    token: opts.token,
  });
}

/**
 * @param {string} path
 * @param {{ token?: string }} [opts]
 */
export async function apiGet(path, opts = {}) {
  return apiFetch(path, { method: 'GET', token: opts.token });
}
