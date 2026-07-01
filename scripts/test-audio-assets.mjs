/**
 * Kiểm tra file MP3 khớp src/data/audio.json (đường dẫn public/audio/).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const audioDir = join(root, 'public', 'audio');
const config = JSON.parse(readFileSync(join(root, 'src', 'data', 'audio.json'), 'utf8'));

/** @type {string[]} */
const requiredBgm = ['menu', 'collect', 'assemble'];
/** @type {string[]} */
const optionalTracks = [];

let failed = 0;
let passed = 0;

console.log('Audio asset check\n');
console.log(`  dir: public/audio/\n`);

for (const [trackId, fileKey] of Object.entries(config.tracks)) {
  if (trackId === 'khacnhap' || trackId === 'khacxuat') continue;
  if ((config.skipPreload ?? []).includes(trackId)) continue;

  const path = join(audioDir, `${fileKey}.mp3`);
  const exists = existsSync(path);
  const isRequired = requiredBgm.includes(trackId);

  if (exists) {
    passed += 1;
    console.log(`  ✓ ${trackId} → ${fileKey}.mp3`);
  } else if (isRequired) {
    failed += 1;
    console.log(`  ✗ ${trackId} → ${fileKey}.mp3 (REQUIRED)`);
  } else {
    optionalTracks.push(`${trackId} (${fileKey}.mp3)`);
    console.log(`  ○ ${trackId} → ${fileKey}.mp3 (optional, missing)`);
  }
}

// Common mistake: double extension
const badNames = ['bgm_assemble.mp3.mp3', 'bgm_menu.mp3.mp3', 'bgm_collect.mp3.mp3'];
for (const bad of badNames) {
  if (existsSync(join(audioDir, bad))) {
    failed += 1;
    console.log(`\n  ✗ Wrong filename: ${bad} — rename to ${bad.replace('.mp3.mp3', '.mp3')}`);
  }
}

console.log(`\n${passed} found, ${failed} required missing`);
if (optionalTracks.length) {
  console.log(`Optional missing: ${optionalTracks.join(', ')}`);
}

if (failed > 0) {
  process.exit(1);
}

console.log('\nAdmin smoke checklist (manual):');
console.log('  1. npm run dev — web :5174 + API :8787');
console.log('  2. Login admin → Admin Hub');
console.log('  3. Act 1 → chrome: MENU | VN/EN | ⏸ 🔊 | GỌI BỤT');
console.log('  4. Collect → assemble: BGM track switches');
console.log('  5. 🔇 mutes BGM only; SFX (tap/snap/khắc) still play');
