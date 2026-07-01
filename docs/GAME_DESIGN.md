# Game Design — Tre Trăm Đốt / Khắc Nhập

Tóm tắt thiết kế đã chốt. Thảo luận gốc: [thaoluan_bamboo.md](../thaoluan_bamboo.md). Hướng dẫn người chơi: `src/data/content/how-to-play.json`.

---

## Fantasy

Phú ông hứa gả con cho ai ghép được **cây tre trăm đốt**. Mỗi lóng có **mắt âm / mắt dương** (hoa văn khác nhau). Ghép đúng → thần chú **Khắc nhập** (cây tự hàn). Sai một lóng → **Khắc xuất** (cả cây sụp).

---

## Loop mỗi act

1. **Collect** — lóng trôi, tap gom đúng, tránh decoy (−3s nếu tap sai).
2. **Assemble** — tap lóng trong kho → auto snap nếu khớp mắt đỉnh cột; tap lóng dưới cùng trên cột → trả về kho.
3. **Ritual** — hold nút KHẮC NHẬP → validate toàn chuỗi.

Một đồng hồ chung cho cả act (`timeSec` trong `balance.json`). Thắng màn: điểm = base + thời gian còn − tap sai (+ bonus Phú ông act 3+).

---

## Acts

| Act | Ghép | Thời gian | Nhiễu |
|-----|------|-----------|-------|
| 1 | 10 | 75s | 4 joint types, decoy |
| 2 | 20 | 90s | xoay 180°, Gọi Bụt |
| 3 | 30 | 100s | Phú ông phá, Gọi Bụt |
| Finale | 40 (+60 cinematic) | 110s | full chaos, Gọi Bụt |

---

## Gọi Bụt (Act 2+)

| Chế độ | Lần/act | Hiệu ứng | Điểm |
|--------|---------|----------|------|
| **Chỉ lóng** | 2–3 | Highlight lóng đúng / gợi ý gỡ | Không trừ |
| **Ghép phép** | 1 | Sửa mắt cột + kho, ghép hộ N lóng | **−50% điểm màn** |

Ghép hộ N: Act 2 random 5–10 · Act 3 random 15–20 · **Finale luôn còn 3 lóng tay**. Config: `balance.json` → `butGhep`, `butHelp`.

---

## Dễ chơi / khó thắng

- Tap pool → snap khi khớp mắt; tap decoy khi gom −3s.
- **Một lóng sai** tại ritual = thua cả màn.
- Near-miss: highlight `firstBadIndex` sau Khắc xuất.
- Ghép phép = cứu kẹt mobile, đổi bằng nửa điểm leaderboard.

---

## Kỹ thuật

- Engine: Phaser 3.80 + Vite 5, portrait auto-fit (`gameLayout.js`).
- Config: `balance.json`, `sabotage.json`, `actConfig.js`.
- Validation: `SegmentGenerator.validateColumn()`.
- Bụt: `butHelpService.js`, `butGhepService.js`.

---

## Monetization (sau MVP)

- Rewarded ad: hồi sinh sau Khắc xuất.
- Interstitial: sau Game Over / mỗi 2 act.
- Items (chưa implement): Kính thần, Đồng hồ, Vết Bụt.
