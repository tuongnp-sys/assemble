# Agent Brief — tretramdotgame (Tre Trăm Đốt)

Đọc file này **trước khi sửa code**. Chi tiết thiết kế: [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md). Kỹ thuật H5: [docs/AGENT_BRIEF.md](docs/AGENT_BRIEF.md). i18n: [docs/I18N_MULTISCENE_PLAYBOOK.md](docs/I18N_MULTISCENE_PLAYBOOK.md). **Admin auth:** [docs/ADMIN_AUTH_PLAYBOOK.md](docs/ADMIN_AUTH_PLAYBOOK.md) (playbook) · [docs/ADMIN_AUTH.md](docs/ADMIN_AUTH.md) (setup nhanh).

---

## Dự án là gì?

- **H5 mini-game** *Tre Trăm Đốt — Khắc Nhập* — Phaser 3 + Vite, portrait **375×812**.
- Thể loại: **Collect** (tap lóng tre) + **Assemble** (ghép mắt âm/dương) + **Ritual** (hold Khắc Nhập / fail Khắc Xuất).
- Scene (Sprint 0): `BootScene` → `MenuScene` → `GameScene`. Sprint 1+: `HowToPlayScene`, `GameOverScene.launch()`.

---

## Quy tắc vàng

1. **Một nguồn sự thật** — `src/data/balance.json` + `getActConfig()`; không hardcode thời gian act trong UI.
2. **Logic tách khỏi Phaser** — `GameController` / engines; scene chỉ render + input.
3. **Không commit** trừ khi user yêu cầu.
4. Sau thay đổi lớn: `npm run build` + `npm run test:segments` + `npm run test:audio`.
5. **Admin auth:** server API + JWT — playbook [docs/ADMIN_AUTH_PLAYBOOK.md](docs/ADMIN_AUTH_PLAYBOOK.md). Chạy `npm run dev` (web + API). Không PostgreSQL; store = KV / file / env.

---

## Core logic (đã có Sprint 0)

| File | Vai trò |
|------|---------|
| `src/core/SegmentGenerator.js` | Sinh chain, decoy, pool; `validateColumn()` |
| `src/core/actConfig.js` | `getActConfig(balance, actId)` |
| `src/core/SegmentTypes.js` | JSDoc types, `ALL_JOINT_PATTERNS` |
| `src/data/balance.json` | Acts, collect, assemble, ritual, items |
| `src/data/sabotage.json` | Phú ông events (Sprint 2+) |

### Admin (server-side auth)

| File | Vai trò |
|------|---------|
| `api/lib/adminStore.js` | Credential: Vercel KV → `.data/admin-credentials.json` → env |
| `api/lib/handlers.js` | login / me / change-password |
| `src/core/adminAuthService.js` | JWT trong `sessionStorage` |
| `src/core/userSession.js` | `loginAdmin()`, gate `role` + token |
| `src/ui/AdminCredentialsPanel.js` | Form đổi MK (DOM + tắt Phaser input) |

### Audio (MP3 + procedural SFX)

| File | Vai trò |
|------|---------|
| `public/audio/bgm_*.mp3` | BGM — tên **khớp** `src/data/audio.json` (không `.mp3.mp3`) |
| `src/audio/BgmController.js` | MP3 qua Phaser; `play()` chỉ swap track, `stop()` dừng hết |
| `src/audio/AudioManager.js` | SFX 8-bit (Web Audio); cần `ensureSfxUnlocked()` |
| `src/ui/GameChromeView.js` | In-game: MENU, BỤT, ⏸, 🔊 (🔊 = **BGM only**; SFX luôn bật) |

`npm run test:audio` — kiểm tra 3 file BGM bắt buộc. Sau đổi file: **hard refresh**.

---

## File quan trọng (Sprint 1+)

```
src/GameScene.js
src/core/GameController.js      — tạo Sprint 1
src/core/CollectEngine.js
src/core/AssembleEngine.js
src/core/RitualEngine.js
src/core/SaboteurDirector.js
src/GameOverScene.js
src/data/content/legend.json
```

---

## Checklist trước khi coi task xong

- [ ] `npm run test:segments` pass
- [ ] `npm run build` pass
- [ ] How to Play khớp mechanics (Sprint 2+)
- [ ] i18n: `subscribeLangChange` → `unsub` trong `destroy()`
- [ ] Admin: `npm run dev` (cả API); đổi MK không đóng form khi focus input
- [ ] `npm run test:audio` pass (3 BGM: menu, collect, assemble)
- [ ] Một vòng: menu → act → game over
- [ ] Admin: Hub → Act 1 → chrome (⏸ 🔊) + BGM collect→assemble; MENU về Hub

---

## Sprint status

| Sprint | Nội dung | Trạng thái |
|--------|----------|------------|
| 0 | Scaffold + segment logic | ✅ |
| 1 | Collect + Assemble + Ritual Act 1 | ✅ |
| 2 | Act 2–3 + i18n + items | Pending |
| 3 | Finale + portal + leaderboard | Pending |
