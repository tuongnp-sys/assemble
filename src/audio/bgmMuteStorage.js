export const BGM_MUTE_STORAGE_KEY = 'tretramdot_bgm_muted';

const LEGACY_MUTE_KEY = 'tretramdot_muted';

function migrateLegacyMute() {
  try {
    const legacy = localStorage.getItem(LEGACY_MUTE_KEY);
    if (legacy === null) return;
    if (localStorage.getItem(BGM_MUTE_STORAGE_KEY) === null) {
      localStorage.setItem(BGM_MUTE_STORAGE_KEY, legacy);
    }
    localStorage.removeItem(LEGACY_MUTE_KEY);
  } catch {
    /* ignore */
  }
}

/** @returns {boolean} */
export function loadMutedPreference() {
  migrateLegacyMute();
  try {
    return localStorage.getItem(BGM_MUTE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** @param {boolean} muted */
export function saveMutedPreference(muted) {
  try {
    localStorage.setItem(BGM_MUTE_STORAGE_KEY, muted ? '1' : '0');
    localStorage.removeItem(LEGACY_MUTE_KEY);
  } catch {
    /* ignore */
  }
}
