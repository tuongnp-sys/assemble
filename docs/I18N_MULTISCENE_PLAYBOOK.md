# Playbook — Song ngữ (VN/EN) + nhiều màn chơi (Phaser 3)

Tài liệu kinh nghiệm từ hai dự án H5 Phaser + Vite:

| Repo | Thể loại | Đặc trưng |
|------|----------|-----------|
| **Sương Mù Lịch Sử** (`suvietgame`) | Chapter × mechanic | Hub, Runner, HTML modal gắn `body` |
| **Tre Trăm Đốt** (`tretramdot` / `assemble`) | Campaign 4 act | `wireSceneLang`, DOM scroll truyện, `skipSideEffects` GameOver |

Áp dụng cho agent Cursor / dev làm game **cùng kiểu**: UI song ngữ runtime, nhiều scene, overlay Phaser + modal HTML.

Đọc kèm: [AGENTS.md](../AGENTS.md) (entry nhanh), [GAMEPIX_INTEGRATION.md](./GAMEPIX_INTEGRATION.md) (portal).

---

## 1. Kiến trúc i18n (bắt buộc nắm)

| Thành phần | File | Vai trò |
|------------|------|---------|
| Ngôn ngữ lưu trữ | `src/core/locale.js` | `getLang()`, `setLang()`, `subscribeLangChange()`, `pickBilingual()` |
| Chuỗi UI | `src/data/uiStrings.json` | `t('key')`, `tFmt('key', vars)` qua `src/core/i18n.js` |
| Nội dung JSON | `src/data/content/*.json` | Field `{ "vi": "...", "en": "..." }` — dùng `pickBilingual()` |
| Toggle VN/EN | `src/ui/LangToggle.js` | Pill góc trái (52, 48); `wireSceneLang()` cho scene |

**suvietgame thêm:** `src/ui/langOverlayHelper.js` — `wireOverlayLang()`.

**Nguyên tắc:** Song ngữ là **vòng đời runtime**, không phải task dịch string một lần. Mọi màn phải trả lời: *“User bấm VN/EN thì UI cập nhật thế nào?”*

### Ba tầng chuỗi (Tre Trăm Đốt — không trộn)

| Tầng | API | Dữ liệu / nguồn |
|------|-----|-----------------|
| UI ngắn | `t('menu.start')`, `tFmt(...)` | `uiStrings.json` |
| Nội dung dài | `pickBilingual(block)` | `legend.json`, `how-to-play.json`, `folk-story.json` |
| Logic / validation | Trả **`errorKey`**, view gọi `t(errorKey)` | `userSession.js`, không hardcode tiếng Việt trong service |
| Game events | Emit **`messageKey`**, view map sang `t()` | `SaboteurDirector` → `GameScene` toast |

Legacy: controller có thể còn label tiếng Việt (`GHÉP LÓNG`) — **view là lớp map duy nhất** sang key i18n (`toast.bonus_assemble`).

### Hai chiến lược đổi ngôn ngữ (Tre Trăm Đốt)

| Loại màn | Cách xử lý | Ví dụ |
|----------|------------|-------|
| Tĩnh / ít state | `scene.restart(payload)` giữ state cần thiết | `MenuScene`, `LeaderboardScene` (`boardActId`), `HowToPlayScene`, `AdminHubScene` |
| Đang chơi | `_refreshLang()` cascade child views — **không** restart | `GameScene` → `hud`, `chrome`, `poolView`, … |
| `create()` có side-effect | Restart + `skipSideEffects: true` | `GameOverScene` — tránh ghi điểm/vàng lần 2 |
| Form DOM + overlay | `_refreshLang()` + `overlay.refreshLang()` | `LoginScene` (placeholder + `StoryScrollOverlay`) |

```javascript
// Tre Trăm Đốt — scene tĩnh
wireSceneLang(this, () => this.scene.restart({ boardActId: this.boardActId }), 55);

// Tre Trăm Đốt — đang chơi
wireSceneLang(this, () => this._refreshLang(), 62);
```

### Pattern chuẩn cho scene (suvietgame)

```javascript
createLangToggle(this, depth);
const unsub = subscribeLangChange(() => this._refreshLang());
this.events.once('shutdown', unsub);
```

### Pattern chuẩn cho overlay Phaser

```javascript
// suvietgame
wireOverlayLang(scene, overlay, depth + 20, onClose);

// overlay.refreshLang() { ... cập nhật text / rebuild panel an toàn ... }
// overlay.destroy() phải idempotent (_done guard)
```

### `setLang` và `locale.js` an toàn

- Mọi listener trong `locale.js` bọc `try/catch` — một listener crash không làm sập chuỗi i18n còn lại.
- **Guard `localStorage` + `document`** khi import module — `npm run test:*` chạy Node sẽ crash nếu thiếu guard (đã gặp ở `test:scoring`).

```javascript
if (typeof localStorage !== 'undefined') { /* get/set */ }
if (typeof document !== 'undefined') {
  document.documentElement.lang = lang === 'vi' ? 'vi' : 'en';
}
```

### Ai subscribe `subscribeLangChange`?

| Mô hình | Owner | Ví dụ |
|---------|-------|-------|
| Tự subscribe + `unsub` trong `destroy()` | Panel / overlay | `HowToPlayPanel`, `ActBriefingView`, `StoryScrollOverlay`, `LangToggle` |
| Parent cascade | Scene gọi `child.refreshLang()` | `GameScene._refreshLang()` — views **không** tự subscribe |

**Quy tắc:** Một view chỉ một trong hai — tránh double listener.

`wireSceneLang` cleanup toggle + unsub trên `shutdown`:

```javascript
wireSceneLang(scene, onLangChange, toggleDepth);
// → createLangToggle + subscribeLangChange
// → scene.events.once('shutdown', () => { unsub(); toggle.destroy(); })
```

---

## 2. Hai lớp UI: Phaser canvas vs HTML

| Lớp | suvietgame | Tre Trăm Đốt |
|-----|------------|--------------|
| Phaser | Hub, Chapter, HowTo, Victory | Menu, Game, GameOver, Login buttons |
| HTML trên `body` | `HistoryScrollOverlayView`, `MilestoneMomentOverlayView` | — |
| HTML qua `add.dom` | — | `LoginScene` input, `StoryScrollOverlay` cuộn truyện |

**Hai thế giới không chia sẻ input.** HTML che visually nhưng Phaser vẫn nhận pointer nếu modal biến mất cùng frame với click.

### Pattern bắt buộc (HTML modal — suvietgame)

File: `src/ui/htmlModalHelper.js`

1. **`lockPhaserInput(scene)`** khi mở modal
2. **`unlockPhaserInput(scene)`** trong `destroy()`
3. **`deferredAfterPointer(fn)`** — double `requestAnimationFrame` trước destroy
4. Nút đóng: `preventDefault()` + `stopPropagation()`
5. Guard `_closing` / `_done` chống double-click

**Bug đã gặp (suvietgame):** Đóng “Lịch sử tóm tắt” → click xuyên nút **Chơi lại**.

**TODO Tre Trăm Đốt:** `StoryScrollOverlay` chưa lock input — đóng truyện có thể click xuyên **Vào chơi**; nên port `htmlModalHelper` hoặc tương đương.

### Pattern `add.dom` scroll (Tre Trăm Đốt — `StoryScrollOverlay`)

| Việc | Pattern |
|------|---------|
| CSS | `.story-parchment` trong `css/style.css` — không inline toàn bộ |
| Font VN/EN | Web font (Noto Serif), tránh Georgia/Times OS |
| `lang` HTML | `scrollEl.lang = getLang()` khi mở / `refreshLang` |
| `refreshLang` | Lưu `scrollTop` trước `innerHTML` rebuild, restore sau |
| Layout JS ↔ CSS | Hằng số `SCROLL_MAX_H` trong JS khớp `max-height` CSS (nút Đóng) |
| Typography | Tránh `text-align: justify` cho tiếng Việt; tránh italic + bold chồng |
| Depth | Backdrop 45–48; LangToggle 55–62 (≥ backdrop + 10) |

---

## 3. Listener leak — bug tinh vi nhất

### LangToggle

`createLangToggle()` đăng ký `subscribeLangChange(syncLabel)`. **Phải `unsub` trong `destroy()` của toggle**, không chỉ khi scene shutdown.

**Triệu chứng:** Spam `[i18n] lang listener failed` + `Cannot read properties of null (reading 'drawImage'/'glTexture')`.

### Quy tắc vàng

> **Mọi `subscribeLangChange` phải có `unsubscribe` trong `destroy()` của đúng owner.**

Áp dụng: LangToggle, overlay Phaser, HTML modal, demo animation (BattleSim), `StoryScrollOverlay`.

---

## 4. Lifecycle overlay & animation

### Destroy checklist

```
destroy() {
  1. alive = false / _done = true
  2. unsub mọi lang listener
  3. stop timers (scene.time) & tweens
  4. destroy children / demo / sim
  5. nodes.length = 0; null refs trên scene cha
  6. onClose?.()
}
```

### Các lỗi P0 đã sửa

| Bug | Repo | Fix |
|-----|------|-----|
| Crash đổi ngôn ngữ trong HowTo demo | suvietgame | `BattleSim` lifecycle, flag `alive` |
| HowTo/Leaderboard không mở lại | suvietgame | `onClose` null ref |
| `const t` shadow import `t()` | suvietgame | Đổi tên biến Text |
| `document is not defined` khi test | tretramdot | Guard `locale.js` |
| GameOver ghi điểm 2 lần khi đổi lang | tretramdot | `skipSideEffects` + `_restartPayload()` |
| Chữ truyện lệch / xấu | tretramdot | Noto Serif, bỏ justify, sync layout |

### Stale ref trên scene

Khi destroy overlay **bắt buộc** null ref qua `onClose`: `this.howTo`, `this.leaderboard`, `this.storyOverlay`, `this._historyOverlay`.

---

## 5. Phaser + JavaScript — cạm bẫy

1. **Shadow import:** Không `const t = scene.add.text` khi dùng `t('key')`.
2. **`setLabel` guard:** `if (!text?.active) return`.
3. **Depth:** LangToggle bị overlay che → “thiếu nút VN/EN”. Tre Trăm Đốt: story 45–48, toggle 55–62.
4. **Passive listener:** Tránh `preventDefault` trên `pointerdown` Phaser.
5. **Rebuild on lang change:** Destroy sim/demo **trước** khi tạo panel mới.
6. **DOM placeholder:** `LoginScene` — `_refreshLang()` cập nhật `input.placeholder`.

---

## 6. Luồng scene (tham chiếu theo repo)

### suvietgame

```
BootScene → IntroScene → HubScene → ChapterScene (×6 mechanic)
```

### Tre Trăm Đốt

```
BootScene → LoginScene → MenuScene → GameScene (×4 act)
  → GameOverScene / FinaleCinematicScene
```

Mỗi mechanic/act cần **`refreshLang()`** riêng hoặc restart có payload. Sửa Menu **không** đảm bảo GameScene ổn.

---

## 7. Ma trận smoke test (trước push / deploy)

Chạy `npm run build` (+ `npm run test:scoring` nếu có) + Console **không đỏ** khi spam VN/EN.

### suvietgame

| Khu vực | Việc cần làm |
|---------|--------------|
| Hub | Start, VN/EN, HowTo mở/đóng/mở lại, Leaderboard |
| Ch.6 runner | Tank intro VN/EN; trượt rào không crash |
| Victory ch.6 | Lịch sử tóm tắt → **ĐÓNG** (không restart trận) |
| Lang spam | 10× VN/EN — không leak listener |

### Tre Trăm Đốt

| Khu vực | Việc cần làm |
|---------|--------------|
| Login | VN/EN placeholder; **Truyện kể** mở/đóng; đổi lang giữ scroll |
| Menu | Restart giữ `adminPreview` |
| Game | Đổi VN/EN **giữa trận** — HUD/toast/saboteur đúng, không reset timer |
| Game Over | Đổi VN/EN **không** cộng vàng/ghi điểm lần 2 |
| Leaderboard | Đổi VN/EN giữ tab (`boardActId`) |
| HowTo | Panel reopen; lang đổi khi đang xem trang |
| Lang spam | 10× VN/EN — không `[i18n] lang listener failed` |

---

## 8. Deploy cho bạn bè test

| Bước | Lệnh / cấu hình |
|------|-----------------|
| Build | `npm run build` → `dist/` |
| Vite base | `base: './'` trong `vite.config.js` |
| Vercel | Framework Vite, output `dist` |

---

## 9. Git — bài học quy trình

- **Không push một cục lớn** khi chưa smoke test.
- Commit theo cụm: `i18n core` → `overlay lifecycle` → scene cụ thể.
- Không `git commit` / `push` trừ khi user yêu cầu.

---

## 10. Definition of done (agent)

Task i18n/overlay coi **xong** khi:

- [ ] Mọi surface mới có `refreshLang` hoặc `scene.restart(payload)` — documented
- [ ] Mọi subscribe có unsub trong destroy
- [ ] HTML modal: lock/unlock Phaser input + deferred close (hoặc TODO ghi rõ)
- [ ] Animation/demo có lifecycle (timer/tween stop)
- [ ] `locale.js` an toàn Node nếu có test script
- [ ] Ma trận smoke test §7 pass (đúng repo)
- [ ] `npm run build` pass

---

## 11. File tham chiếu nhanh

### Chung

```
src/core/locale.js       — lang pub/sub, pickBilingual, guard Node
src/core/i18n.js         — t(), tFmt()
src/ui/LangToggle.js     — toggle, wireSceneLang, unsub on destroy
src/data/uiStrings.json  — chuỗi UI
src/data/content/*.json  — nội dung song ngữ
```

### suvietgame

```
src/ui/langOverlayHelper.js
src/ui/htmlModalHelper.js
src/ui/howTo/BattleSim.js
src/ui/RunnerView.js
src/ui/HistoryScrollOverlayView.js
src/core/sceneTransition.js
```

### Tre Trăm Đốt

```
src/LoginScene.js              — DOM form + StoryScrollOverlay
src/GameScene.js               — _refreshLang cascade
src/GameOverScene.js           — skipSideEffects, wireSceneLang restart
src/ui/StoryScrollOverlay.js   — add.dom scroll, folk-story.json
src/data/content/folk-story.json
src/core/userSession.js        — errorKey pattern
src/core/SaboteurDirector.js   — messageKey pattern
css/style.css                  — .story-parchment
src/ui/AdminCredentialsPanel.js — DOM form; lock Phaser input (xem ADMIN_AUTH_PLAYBOOK)
```

**Admin auth (server, không i18n-only):** [ADMIN_AUTH_PLAYBOOK.md](./ADMIN_AUTH_PLAYBOOK.md)

---

*Cập nhật: 2026-06 — suvietgame beta + Tre Trăm Đốt campaign i18n + admin auth playbook.*
