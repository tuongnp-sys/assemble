Drop MP3 files here (names must match src/data/audio.json exactly).

Required for main BGM:

  bgm_menu.mp3
  bgm_collect.mp3
  bgm_assemble.mp3      ← NOT bgm_assemble.mp3.mp3

Optional (add file + remove from skipPreload in audio.json):

  bgm_victory.mp3
  bgm_defeat.mp3
  bgm_finale_merge.mp3
  bgm_finale_confront.mp3
  bgm_finale_wedding.mp3

Verify: npm run test:audio
After adding/renaming files: hard-refresh browser (Ctrl+Shift+R).

SFX: procedural 8-bit in code (no MP3 needed).

Mute: toggles **background music (MP3 via HTML audio)** only — gameplay SFX always play.
