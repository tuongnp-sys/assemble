# Game Design — Tre Trăm Đốt / Khắc Nhập

Tóm tắt thiết kế đã chốt. Thảo luận gốc: [thaoluan_bamboo.md](../thaoluan_bamboo.md).

---

## Fantasy

Phú ông hứa gả con cho ai ghép được **cây tre trăm đốt**. Mỗi lóng có **mắt âm / mắt dương** (hoa văn khác nhau). Ghép đúng → thần chú **Khắc nhập** (cây tự hàn). Sai một lóng → **Khắc xuất** (cả cây sụp).

---

## Loop mỗi act

1. **Collect** — lóng trôi, tap gom đúng, tránh decoy.
2. **Assemble** — kéo thả lên cột, snap khi khớp mắt.
3. **Ritual** — hold nút KHẮC NHẬP → validate toàn chuỗi.

Một đồng hồ chung cho cả act (`timeSec` trong `balance.json`).

---

## Acts

| Act | Ghép | Thời gian | Nhiễu |
|-----|------|-----------|-------|
| 1 | 10 | 75s | 4 joint types, decoy |
| 2 | 20 | 90s | xoay 180°, lá che |
| 3 | 30 | 100s | gió, Phú ông phá |
| Finale | 40 (+60 cinematic) | 110s | full chaos |

---

## Dễ chơi / khó thắng

- Snap tolerance 12px; tap decoy −3s.
- **Một lóng sai** tại ritual = thua cả màn.
- Near-miss: highlight `firstBadIndex` sau Khắc xuất.

---

## Kỹ thuật

- Engine: Phaser 3.80 + Vite 5, 375×812 portrait.
- Config: `balance.json`, `sabotage.json`, `actConfig.js`.
- Validation: `SegmentGenerator.validateColumn()`.

---

## Monetization (sau MVP)

- Rewarded ad: hồi sinh sau Khắc xuất.
- Interstitial: sau Game Over / mỗi 2 act.
- Items: Kính thần, Đồng hồ, Vết Bụt, Bụt ghép.
