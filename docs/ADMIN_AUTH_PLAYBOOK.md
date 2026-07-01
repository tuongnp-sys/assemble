# Playbook — Admin auth server-side (Phaser H5 + Vite)

Kinh nghiệm triển khai **đăng nhập admin** cho mini-game H5 (Tre Trăm Đốt / `tretramdotgame`). Dùng lại khi agent làm dự án **cùng stack**: Phaser 3 + Vite frontend, API Node serverless (Vercel) hoặc dev server local.

Đọc kèm: [ADMIN_AUTH.md](./ADMIN_AUTH.md) (setup nhanh), [AGENTS.md](../AGENTS.md) (entry repo).

---

## 1. Mục tiêu & nguyên tắc

| Mục tiêu | Cách đạt |
|----------|----------|
| Không lộ mật khẩu trong bundle client | Xóa `authConfig.js` / hardcode; verify **chỉ trên server** |
| Session admin không fake được từ DevTools | JWT ký bằng `ADMIN_JWT_SECRET`; `role: admin` trong `localStorage` **vô hiệu** nếu không có token hợp lệ |
| Đổi mật khẩu production bền vững | **Vercel KV** (hoặc store tương đương) — không dựa env plain sau bootstrap |
| Dev mượt | `npm run dev` chạy **web + API** song song; Vite proxy `/api` |

**Không dùng PostgreSQL / Neon** cho admin trong repo này. Credential = **một record** (`username` + `passwordHash` bcrypt), không phải bảng users SQL.

---

## 2. Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────┐
│  Client (Phaser)                                            │
│  LoginScene → loginAdmin() → adminAuthService.js            │
│  AdminHubScene → AdminCredentialsPanel (DOM)                  │
│  Token: sessionStorage  │  Player session: localStorage     │
└─────────────────────────┬───────────────────────────────────┘
                          │ fetch /api/admin/*
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  API                                                        │
│  Dev: scripts/api-dev.mjs :8787                             │
│  Prod: api/admin/*.js (Vercel serverless) → handlers.js   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  adminStore.js — thứ tự đọc/ghi                             │
│  1. Vercel KV (key: tretram:admin)                          │
│  2. .data/admin-credentials.json (local file)               │
│  3. Bootstrap: ADMIN_USERNAME + ADMIN_PASSWORD(_HASH)       │
└─────────────────────────────────────────────────────────────┘
```

**JWT:** stateless — `jose` sign/verify, không bảng session DB.

---

## 3. Bản đồ file (copy sang dự án mới)

| Vùng | File | Vai trò |
|------|------|---------|
| API routes | `api/admin/login.js`, `me.js`, `change-password.js` | Export handler Vercel |
| API core | `api/lib/handlers.js` | Login, me, change-password |
| | `api/lib/adminStore.js` | KV → file → env bootstrap |
| | `api/lib/jwt.js` | Sign / verify JWT |
| | `api/lib/password.js` | bcrypt hash + validate độ dài |
| | `api/lib/http.js` | CORS, JSON body, Bearer token |
| Dev server | `scripts/api-dev.mjs` | HTTP local, load `.env`, trim secrets |
| Client HTTP | `src/core/apiClient.js` | `apiFetch` / `apiPost` / `apiGet` |
| Client auth | `src/core/adminAuthService.js` | Token sessionStorage, remote login |
| | `src/core/userSession.js` | `loginAdmin()`, gate `role === 'admin'` |
| UI | `src/ui/AdminCredentialsPanel.js` | Form đổi MK (DOM) |
| | `src/AdminHubScene.js` | Hub test game + nút đổi tài khoản |
| Config | `vite.config.js` | `server.proxy['/api']` → 8787 |
| | `vercel.json` | SPA rewrite, giữ `/api/*` |
| | `.env` / `.env.example` | Secrets (gitignore `.env`) |
| i18n | `src/data/uiStrings.json` | `admin.*`, `login.err_admin` |

**Deps:** `bcryptjs`, `jose`, `@vercel/kv`, `dotenv`, `concurrently` (dev).

---

## 4. Biến môi trường

```env
# Client (Vite — prefix VITE_)
VITE_ENABLE_ADMIN=true          # false = ẩn nút Admin trên build public
VITE_API_BASE=                  # để trống = same-origin /api

# Server
ADMIN_JWT_SECRET=...            # ≥16 ký tự random (prod bắt buộc)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=...              # bootstrap lần đầu; hoặc ADMIN_PASSWORD_HASH
API_DEV_PORT=8787

# Production persistence (khuyến nghị)
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

`scripts/api-dev.mjs` **trim** các biến secret — tránh lỗi copy/paste có khoảng trắng.

---

## 5. Luồng client (bắt buộc nắm)

### Login admin

1. `loginAdmin(username, password)` trong `userSession.js`
2. `loginAdminRemote` → `POST /api/admin/login`
3. Lưu JWT → `sessionStorage` (`tretramdot_admin_token`)
4. Lưu session player-like với `role: 'admin'` vào `localStorage`

### Gate quyền admin

```javascript
// getCurrentUser() — admin không hợp lệ nếu mất token
if (role === 'admin' && !getAdminToken()) {
  return null;
}
```

Không tin `localStorage.role` đơn thuần.

### Đổi mật khẩu

- `AdminCredentialsPanel` → `changeAdminCredentialsRemote`
- Server trả JWT mới → cập nhật `sessionStorage`
- Response dùng `errorKey` / `messageKey` — view gọi `t(key)` (cùng pattern i18n)

### Ẩn admin trên build player

`VITE_ENABLE_ADMIN=false` → `isAdminFeatureEnabled()` false → không hiện entry Admin.

---

## 6. DOM form trên Phaser — pitfall đã gặp

**Vấn đề:** Backdrop Phaser `setInteractive()` + `pointerdown` → click input HTML vẫn kích hoạt backdrop → form đóng.

**Fix (AdminCredentialsPanel):**

1. `scene.input.enabled = false` khi mở panel
2. Khôi phục trong `destroy()`
3. Backdrop **không** interactive (chỉ visual)
4. `stopPropagation` trên `mousedown` / `touchstart` của form
5. CSS `.admin-cred-form { pointer-events: auto }`

Pattern tương tự áp dụng cho `StoryScrollOverlay` nếu có backdrop Phaser.

---

## 7. Local dev — checklist & debug

```bash
npm run dev    # concurrently: Vite :5174 + API :8787
```

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|-------------|------------------------|------------|
| Luôn `login.err_admin` dù đúng MK | API cũ trên 8787 (khởi động trước khi có `.env`) | Kill process 8787, restart `npm run dev` |
| `EADDRINUSE` khi `dev:api` | Port 8787 bị chiếm | `api-dev.mjs` in PID gợi ý; kill rồi chạy lại |
| Proxy 404 / network | Chỉ chạy `dev:web`, không chạy API | Dùng `npm run dev` (cả hai) |
| Đổi MK không nhớ sau restart | Chưa ghi file | Login Admin → ĐỔI TÀI KHOẢN → `.data/admin-credentials.json` |

Log khởi động API nên có dòng bootstrap user (ví dụ `[api-dev] bootstrap user: admin`).

Test trực tiếp:

```bash
curl -X POST http://127.0.0.1:8787/api/admin/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"YOUR_PASSWORD\"}"
```

---

## 8. Production (Vercel)

1. Set env: `ADMIN_JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` (hoặc hash).
2. Gắn **Vercel KV** — `change-password` ghi KV; không KV thì mỗi instance serverless có thể mất sync.
3. `vercel.json`: rewrite SPA nhưng **không** nuốt `/api/*`.
4. Build player public: `VITE_ENABLE_ADMIN=false` trên URL production; admin chỉ trên staging nếu cần.

**Không commit** `.env`, không embed secret trong `src/`.

---

## 9. API contract (ổn định cho client)

| Method | Path | Body | Response OK |
|--------|------|------|-------------|
| POST | `/api/admin/login` | `{ username, password }` | `{ ok, token, username }` |
| GET | `/api/admin/me` | Bearer | `{ ok, username }` |
| POST | `/api/admin/change-password` | Bearer + `{ currentPassword, newPassword, confirmPassword, newUsername? }` | `{ ok, token, username, errorKey }` |

Lỗi: `{ ok: false, errorKey: 'login.err_admin' | 'admin.auth.*' | ... }` — client map sang `t(errorKey)`.

---

## 10. Checklist copy sang dự án H5 mới

- [ ] Tạo `api/lib/*` + `api/admin/*` (hoặc monorepo tương đương)
- [ ] `scripts/api-dev.mjs` + `concurrently` trong `npm run dev`
- [ ] Vite proxy `/api` → port API dev
- [ ] `apiClient.js` + `adminAuthService.js` + sửa `userSession` gate token
- [ ] Xóa mọi verify password phía client / hardcode
- [ ] i18n keys `admin.*`, `login.err_admin`
- [ ] `AdminCredentialsPanel` + tắt Phaser input khi DOM focus
- [ ] `.env.example` + doc; `.data/` trong `.gitignore`
- [ ] Vercel KV hoặc store persistent cho prod
- [ ] `VITE_ENABLE_ADMIN` cho build player vs staging
- [ ] Smoke: login sai/đúng, đổi MK, refresh tab (token session), build production

---

## 11. Mở rộng sau (chưa làm trong repo)

| Nhu cầu | Gợi ý |
|---------|--------|
| Leaderboard server-side | Postgres/Neon + API riêng — **khác** admin store hiện tại |
| Nhiều admin user | Thay `adminStore` bằng bảng users + role |
| Refresh token | Thêm endpoint + rotation; hiện chỉ access JWT |

---

## 12. Liên hệ playbook khác

- **i18n / overlay DOM:** [I18N_MULTISCENE_PLAYBOOK.md](./I18N_MULTISCENE_PLAYBOOK.md) — `errorKey`, `wireSceneLang`, lock Phaser input.
- **Game design / scene flow:** [GAME_DESIGN.md](./GAME_DESIGN.md), [AGENT_BRIEF.md](./AGENT_BRIEF.md).
