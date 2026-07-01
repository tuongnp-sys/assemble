import { bgmBus } from './BgmBus.js';

export { bgmBus, getBgmBus } from './BgmBus.js';

/** @param {import('phaser').Scene} overlayScene */
export function stopUnderlyingSceneAudio(overlayScene) {
  bgmBus.suspend();
  bgmBus.purgePhaserBgm(overlayScene.game);
}

/** Scene menu — chỉ yêu cầu track menu. */
export function playMenuBgmIfAudible() {
  bgmBus.syncFromStorage();
  if (!bgmBus.isEnabled()) {
    bgmBus.enforceOutput();
    return;
  }
  bgmBus.requestTrack('menu');
}

/** Boot — no-op (MP3 qua HTML audio, không preload Phaser). */
export function preloadAudioAssets() {}

/** Boot — no-op. */
export function registerLoadedTracks() {}
