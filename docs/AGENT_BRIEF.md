# Agent Brief — sontinhgame (chi tiết)

Tài liệu này bổ sung [AGENTS.md](../AGENTS.md) ở root repo. Dành cho agent Cursor / AI tiếp quản dự án hoặc làm game **cùng thể loại** với ít rework nhất.

---

## 1. Bối cảnh kỹ thuật

| Hạng mục | Giá trị |
|----------|---------|
| Engine | Phaser 3.80 |
| Build | Vite 5 |
| Kích thước | 375 × 812 (portrait mobile) |
| Ngôn ngữ UI chính | English (content có EN/VN trong JSON) |
| Entry | `src/main.js` |

**Luồng scene:**

```
BootScene (load atlas + audio)
  → MenuScene
  → HowToPlayScene (optional)
  → GameScene
  → GameOverScene.launch()   ← vẫn giữ GameScene phía dưới
```

---

## 2. Kiến trúc logic (bắt buộc tôn trọng)

### Tách lớp

```
GameScene (view)
    ↓ handleTap / handleHoldRelease / update(dt)
GameController (orchestrator)
    ├── GameState      — mountainPeak, waterLevel, combo, timers
    ├── RhythmEngine   — notes, hold, poison, hit windows
    ├── FloodSystem    — water rise
    ├── ComboSystem    — spirit beasts x10/x25/x50
    ├── DisruptorSystem — ink blind, flash flood triggers
    └── Director       — intensity phases, events
```

**Không** nhét công thức thắng/thua vào scene. `safetyGap = mountainPeak - waterLevel`.

### Config

- `src/data/balance.json` — toàn bộ số: gap, poison, combo, invasion, acts, **levels.1/2/3**
- `src/core/levelConfig.js` — `getLevelConfig(balance, level)`
- `src/data/disruptors.json` — event director
- `src/data/audio.json` — track keys, loop, volume

**Quy tắc:** Nếu thêm key vào `balance.json` thì implement ngay hoặc đừng thêm.

---

## 3. Rhythm — hành vi đầy đủ

### Spawn (`RhythmEngine._spawnNote`)

- Mặc định: `earth` (cao tần suất), `wood`, `fire`
- `poison`: xác suất `poisonSpawnChance` (tăng L2/L3)
- `hold`: Act ≥ 2, ~10% (không trong calm phase)
- `poison_burst` event: ép spawn poison tiếp theo

### Input

- `pointerdown` → `handleTap()`
- `pointerup` → `handleHoldRelease()` (quan trọng cho hold)
- Space: keydown tap, keyup release hold
- Pause đang hold → auto release hold

### Hold

- Tap trong cửa sổ timing → `_startHold` (nhận perfect/great/good gap một lần)
- Giữ ngón: `holdGapPerSecond` mỗi frame
- `holdMaxSeconds` ~1.8s, `holdMinSeconds` ~0.12s
- Nhả sớm → miss; hết thời gian hoặc nhả hợp lệ → `hold_complete`

### Poison

- Tap → penalty gap, combo lock 3s
- Trôi qua vòng **không** tap → không phạt (khác miss nốt thường)

---

## 4. Âm thanh — thiết kế đúng từ đầu (bài học đắt giá)

### Phases thực tế

| Màn | Music | Ambient | One-shot |
|-----|-------|---------|----------|
| Menu | menu (loop) | — | — |
| Game L1 | gameplay | — | — |
| Game L2+ | gameplay | rain | — |
| GameOver thắng | victory | — | ngochoa @1.2s (L2+) |
| GameOver thua | defeat | — | — |

### `BgmController` state

Lưu riêng:

- `_trackId` + `_sound` (music)
- `_ambientTrackId` + `_ambientSound`
- `_oneShotTrackId` + `_oneShotSound`
- `_musicFadedForOneShot` khi ngochoa

### Các lỗi đã từng xảy ra (tránh lặp lại)

1. **Mute unmute restart track** → mất ngochoa, victory phát lại từ đầu, chồng nhạc.
2. **`playOneShot` return khi muted** → one-shot scheduled bị bỏ lỡ vĩnh viễn.
3. **Chỉ `stopAll` trên một scene** khi GameOver launch → orphan trên GameScene.
4. **Duck victory** thay vì fade/stop khi ngochoa → user nghe victory thay vì giọng Ngọc Hoa.

### Fix pattern hiện tại

- `setMuted`: `_applyVolumes()` only
- `stopUnderlyingSceneAudio(overlayScene)` khi mở GameOver
- Ngochoa: `_fadeMusicForNgochoa` rồi `stopMusic` khi one-shot xong

---

## 5. UI & UX conventions

### Depth

- Gameplay lane/hit zone: 8–12
- HUD (gap bar trên, timer): 15
- Balance bar dưới vòng: 11
- GameOver overlay: 40–55
- Modal (legend, leaderboard): **88–90**
- Mute toggle GameOver: 60

### Modal pattern

Tham khảo `LegendSummaryView`, `LeaderboardOverlayView`:

- Backdrop full screen `setInteractive()`
- Panel + CLOSE
- `destroy()` cleanup trong `shutdown()` của scene cha

### HUD gameplay

- Gap bar **trên** (tổng quan)
- Balance bar **dưới vòng** (S đỏ / T xanh) — `state.gapRatio`
- `_hideGameplayUi()` khi kết thúc trận

---

## 6. Game flow theo level

### `gameLevel` routing (`GameOverScene.create`)

| Level | Thắng | Thua |
|-------|-------|------|
| 1 | Banner + YES/NO defiance | NgocHoaCall + SAVE |
| 2 | Submission scroll + delayed VictoryFinale | Tương tự L2 defeat |
| 3 (MAX) | Submission + finale đầy đủ | Farewell cinematic |

### Audio on victory L2+

```javascript
bgmController.play(this, 'victory');
delayedCall(1200, () => bgmController.playOneShot(this, 'ngochoa'));
// VictoryFinaleView ~2800ms — UI only
```

---

## 7. Content & đa ngôn ngữ

- Legend: `src/data/content/legend.json`
- Poem Ngọc Hoa: `src/data/content/poem-ngochoa.json`
- Styles: `contentStyles.json`
- Render: `src/ui/contentRender.js` — tên màu, vocab EN/VN
- Nguồn gốc docs: `docs/truyenthuyet_TT.txt`, `docs/ngochoa.txt`

Không nhúng paragraph dài trực tiếp trong scene.

---

## 8. Invasion (cá xanh)

- Sprite `monster_fish` — **không** phải nốt rhythm
- Spawn từ đáy màn lên `waterSurfaceY` khi không calm phase
- Bị đuổi bởi combo gà; đóng băng khi voi
- Không cần tap — chỉ áp lực thị giác

---

## 9. Platform & pause

- `platform/` — wrapper portal (loading, score, interstitial)
- `systemPause.js` — tab hidden pause
- `gameSession.js` — phase MENU | PLAYING

---

## 10. Testing matrix (tối thiểu)

### Gameplay

- [ ] Tap perfect/great/good/miss
- [ ] Poison tap vs ignore
- [ ] Hold tap + giữ + nhả sớm/muộn
- [ ] Combo 10/25/50 beasts
- [ ] Thắng L1 → YES path
- [ ] Thắng L2 → scroll + finale + ngochoa

### Audio

- [ ] Menu → game → game over, không orphan
- [ ] Mute ON/OFF ×5 trên victory+ngochoa
- [ ] L2 rain ambient + gameplay

### UI

- [ ] TOP RUNS overlay đọc được hết
- [ ] Legend scroll EN/VN
- [ ] Một mute visible mỗi màn

### Build

```bash
npm run build
```

---

## 11. Template brief cho game mới cùng genre

Khi user yêu cầu game tương tự, agent nên xác nhận trước:

1. **Note table** — type, color, faction, input (tap/hold/ignore)
2. **Win/lose** — timer + resource (gap) điều kiện
3. **Audio phase diagram** — trước khi viết `BgmController`
4. **Scene stack** — start vs launch overlay
5. **UI depth sheet**
6. **Single guide source** — `gameGuide.ts` hoặc derive từ balance
7. **Level param table** — không ghi 90s trong UI nếu L2 là 120s

---

## 12. Git

- Không `git commit` / `push` trừ khi user yêu cầu rõ.
- Không sửa `git config`.

---

*Tài liệu cập nhật theo kinh nghiệm phát triển sontinhgame — rhythm + flood + legend IP Việt Nam.*
