/**
 * Local dev API — proxies via Vite to http://127.0.0.1:8787
 * Production: Vercel serverless /api/admin/*
 */
import { createServer } from 'node:http';
import { config } from 'dotenv';
import {
  handleAdminChangePassword,
  handleAdminLogin,
  handleAdminMe,
} from '../api/lib/handlers.js';

config({ path: '.env' });
config({ path: '.env.local', override: true });

for (const key of [
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
  'ADMIN_PASSWORD_HASH',
  'ADMIN_JWT_SECRET',
]) {
  if (process.env[key]) {
    process.env[key] = process.env[key].trim();
  }
}

const PORT = Number(process.env.API_DEV_PORT || 8787);

/** @type {Record<string, (req: import('http').IncomingMessage, res: import('http').ServerResponse) => Promise<void>>} */
const routes = {
  'POST /api/admin/login': handleAdminLogin,
  'GET /api/admin/me': handleAdminMe,
  'POST /api/admin/change-password': handleAdminChangePassword,
};

const server = createServer(async (req, res) => {
  const key = `${req.method} ${req.url?.split('?')[0]}`;
  const handler = routes[key];
  if (!handler) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, errorKey: 'admin.auth.server' }));
    return;
  }
  try {
    await handler(req, res);
  } catch (err) {
    console.error('[api-dev]', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, errorKey: 'admin.auth.server' }));
  }
});

server.on('error', (err) => {
  if (err && /** @type {NodeJS.ErrnoException} */ (err).code === 'EADDRINUSE') {
    console.error(
      `[api-dev] Port ${PORT} đang bị chiếm — có thể là API cũ (không đọc .env).`
    );
    console.error('[api-dev] Windows: netstat -ano | findstr :8787  rồi taskkill /PID <pid> /F');
    console.error('[api-dev] Sau đó chạy lại: npm run dev');
  } else {
    console.error('[api-dev] listen error', err);
  }
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[api-dev] http://127.0.0.1:${PORT} (admin auth)`);
  const user = (process.env.ADMIN_USERNAME || 'admin').trim();
  console.log(`[api-dev] bootstrap user: ${user}`);
  if (!process.env.ADMIN_JWT_SECRET) {
    console.warn('[api-dev] ADMIN_JWT_SECRET missing — set in .env');
  }
  if (!process.env.ADMIN_PASSWORD && !process.env.ADMIN_PASSWORD_HASH) {
    console.warn('[api-dev] ADMIN_PASSWORD or ADMIN_PASSWORD_HASH missing — login will fail');
  }
});
