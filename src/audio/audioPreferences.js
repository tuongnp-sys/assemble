import { bgmBus } from './BgmBus.js';
import { loadMutedPreference, saveMutedPreference } from './bgmMuteStorage.js';

export { loadMutedPreference, saveMutedPreference } from './bgmMuteStorage.js';

/** @type {Set<(muted: boolean) => void>} */
const listeners = new Set();

/**
 * @param {(muted: boolean) => void} fn
 * @returns {() => void}
 */
export function subscribeBgmMute(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** @param {boolean} muted */
function notifyBgmMute(muted) {
  for (const fn of listeners) {
    try {
      fn(muted);
    } catch {
      /* ignore */
    }
  }
}

/** @returns {boolean} muted */
export function applyMutedPreference() {
  const muted = loadMutedPreference();
  bgmBus.setEnabled(!muted);
  notifyBgmMute(muted);
  return muted;
}

/**
 * @returns {boolean} new muted state
 */
export function toggleMutedPreference() {
  const nextEnabled = !bgmBus.isEnabled();
  bgmBus.setEnabled(nextEnabled);
  const muted = !nextEnabled;
  notifyBgmMute(muted);
  return muted;
}
