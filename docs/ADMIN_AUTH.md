# Admin authentication (server-side)

Admin login uses **API + JWT** — credentials are not stored in client source.

**Playbook đầy đủ (copy sang dự án khác):** [ADMIN_AUTH_PLAYBOOK.md](./ADMIN_AUTH_PLAYBOOK.md)  
**Cursor rule:** `.cursor/rules/admin-auth-playbook.mdc`

## Local development

1. Create **`.env`** in project root (gitignored):

```env
VITE_ENABLE_ADMIN=true
VITE_API_BASE=
ADMIN_JWT_SECRET=your-random-secret-min-16-chars
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-initial-password
API_DEV_PORT=8787
```

2. Run **`npm run dev`** (Vite `:5174` + API `127.0.0.1:8787` via `concurrently`).
3. Login → Admin → **ĐỔI TÀI KHOẢN** to persist hash in `.data/admin-credentials.json`.

### Troubleshooting

| Issue | Fix |
|-------|-----|
| Always `login.err_admin` with correct password | Stale API on port 8787 (started before `.env`). Kill process, restart `npm run dev`. |
| `EADDRINUSE` on `dev:api` | Free port 8787, restart. |
| Network error on login | Run full `npm run dev`, not only `dev:web`. |

## Production (Vercel)

1. Set environment variables in Vercel Dashboard (never commit):
   - `ADMIN_JWT_SECRET`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD` (bootstrap) **or** `ADMIN_PASSWORD_HASH`
2. **Recommended:** connect **Vercel KV** (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) so password changes persist across serverless instances.
3. Set `VITE_ENABLE_ADMIN=false` on public player builds if you only need admin on a staging URL.

**Not used:** PostgreSQL / Neon — admin credential is a single KV/file record, not SQL.

## API routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/admin/login` | Returns JWT |
| GET | `/api/admin/me` | Validate token |
| POST | `/api/admin/change-password` | Update credentials (requires Bearer token) |

## Client

- Token: `sessionStorage` (`tretramdot_admin_token`)
- `role: admin` in localStorage is ignored without a valid token
- Services: `src/core/adminAuthService.js`, `src/core/userSession.js`
- HTTP: `src/core/apiClient.js`
- Change-password UI: `src/ui/AdminCredentialsPanel.js` (disable Phaser input while open)

## Key files

```
api/admin/*.js          → Vercel routes
api/lib/adminStore.js   → KV → .data/admin-credentials.json → env
scripts/api-dev.mjs     → local API server
vite.config.js          → proxy /api → 8787
```
