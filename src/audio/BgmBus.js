import audioConfig from '../data/audio.json' with { type: 'json' };
import { audioManager } from './AudioManager.js';
import { loadMutedPreference, saveMutedPreference } from './bgmMuteStorage.js';
import { isUserPaused, isSystemPaused } from '../gameSession.js';

export const BGM_ELEMENT_ID = 'tretramdot-bgm';

const BUS_KEY = '__tretramdotBgmBus';
const SKIP_PRELOAD = new Set(audioConfig.skipPreload ?? []);

/** @type {Set<string>} */
const BGM_KEYS = new Set(
  Object.keys(audioConfig.tracks)
    .filter((id) => id !== 'khacnhap' && id !== 'khacxuat')
    .map((id) => `audio_${id}`)
);

/** @param {string} trackId */
function trackUrl(trackId) {
  const fileKey = audioConfig.tracks[trackId];
  if (!fileKey) return null;
  const base = (import.meta.env?.BASE_URL ?? '/').replace(/\/?$/, '/');
  return `${base}${audioConfig.basePath}/${fileKey}.mp3`;
}

/** @param {string} trackId */
function isPlayableTrack(trackId) {
  if (!trackId || trackId === 'khacnhap' || trackId === 'khacxuat') return false;
  if (SKIP_PRELOAD.has(trackId)) return false;
  return Boolean(audioConfig.tracks[trackId]);
}

/**
 * BgmBus — một state machine, một điểm apply().
 * RAM `enabled` là nguồn sự thật; mute = volume 0 + pause (đồng bộ).
 */
class BgmBus {
  constructor() {
    /** @type {boolean} Bật nhạc nền (ngược với muted pref) */
    this.enabled = true;
    /** @type {string|null} */
    this.wantedTrack = null;
    /** @type {boolean} Tạm dừng (pause game / tab ẩn) — giữ wantedTrack */
    this.suspended = false;
    /** @type {number} */
    this._trackVolume = 0.5;
    /** @type {import('phaser').Game|null} */
    this._game = null;
    /** @type {HTMLAudioElement|null} */
    this._audio = null;

    this.enabled = !loadMutedPreference();
  }

  /** @returns {boolean} */
  isEnabled() {
    return this.enabled;
  }

  /** @returns {string|null} */
  getWantedTrack() {
    return this.wantedTrack;
  }

  /** Đọc localStorage → RAM (boot / wire scene). */
  syncFromStorage() {
    this.enabled = !loadMutedPreference();
    this._applyOutputState();
  }

  /**
   * Bật/tắt nhạc nền — đồng bộ, không đợi Promise.
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    saveMutedPreference(!enabled);
    this._applyOutputState();
    if (enabled && !this.suspended) {
      this.apply();
    }
  }

  /**
   * Scene khai báo track — không gọi play() trực tiếp.
   * @param {string} trackId
   */
  requestTrack(trackId) {
    this.wantedTrack = trackId;
    this.apply();
  }

  /** Tạm dừng phát (pause overlay / tab ẩn). */
  suspend() {
    this.suspended = true;
    this._applyOutputState();
  }

  /** Tiếp tục sau suspend — tôn trọng enabled. */
  resumePlayback() {
    this.suspended = false;
    if (!this.enabled) {
      this._applyOutputState();
      return;
    }
    this.apply();
  }

  /** Dừng hẳn — chuyển màn không còn BGM. */
  stop() {
    this.wantedTrack = null;
    this.suspended = false;
    const el = this._getAudio();
    el?.pause();
    this._applyOutputState();
  }

  /**
   * Chỗ duy nhất chạm playback — luôn kiểm tra enabled trước play().
   */
  apply() {
    const el = this._getAudio();
    if (!el) return;

    if (!this.enabled || this.suspended) {
      this._applyOutputState();
      return;
    }

    if (!this.wantedTrack || !isPlayableTrack(this.wantedTrack)) {
      return;
    }

    if (isUserPaused() || isSystemPaused()) {
      this.suspended = true;
      this._applyOutputState();
      return;
    }

    const trackId = this.wantedTrack;
    const url = trackUrl(trackId);
    if (!url) return;

    void audioManager.unlock();

    this._trackVolume = audioConfig.volume[trackId] ?? 0.5;
    el.loop = audioConfig.loop[trackId] ?? false;

    const current = el.currentSrc || el.src || '';
    if (current !== url) {
      el.src = url;
    }

    if (!this.enabled || this.suspended) {
      this._applyOutputState();
      return;
    }

    el.volume = this._trackVolume;
    el.muted = false;

    const playPromise = el.play();
    if (playPromise) {
      playPromise
        .then(() => {
          if (!this.enabled || this.suspended) {
            this._applyOutputState();
          }
        })
        .catch(() => {
          /* autoplay — chờ gesture (nút mute/unmute) */
        });
    }
  }

  /** @param {import('phaser').Game} game */
  bindGame(game) {
    this._game = game;
    this._purgePhaserBgm(game);
    this.syncFromStorage();
  }

  destroy() {
    this.suspended = true;
    this._applyOutputState();
  }

  ensureSfxUnlocked() {
    void audioManager.unlock();
  }

  /**
   * @param {import('phaser').Game|null} game
   */
  purgePhaserBgm(game) {
    this._purgePhaserBgm(game ?? this._game);
  }

  /** @returns {HTMLAudioElement|null} */
  _getAudio() {
    if (typeof document === 'undefined') return null;
    if (this._audio?.isConnected) return this._audio;
    const el = document.getElementById(BGM_ELEMENT_ID);
    if (!el || typeof /** @type {HTMLAudioElement} */ (el).pause !== 'function') {
      return null;
    }
    this._audio = /** @type {HTMLAudioElement} */ (el);
    return this._audio;
  }

  /** Đồng bộ output âm thanh theo RAM — không race. */
  enforceOutput() {
    this._applyOutputState();
  }

  /** @private */
  _applyOutputState() {
    const el = this._getAudio();
    if (!el) return;

    const audible = this.enabled && !this.suspended;

    if (!audible) {
      el.volume = 0;
      el.pause();
      return;
    }

    el.volume = this._trackVolume;
  }

  /**
   * @param {import('phaser').Game|null} game
   */
  _purgePhaserBgm(game) {
    if (!game?.scene) return;
    const scenes = game.scene.getScenes?.(true) ?? game.scene.scenes ?? [];
    for (const s of scenes) {
      const mgr = s.sound;
      if (!mgr?.sounds) continue;
      for (const snd of [...mgr.sounds]) {
        if (!BGM_KEYS.has(snd.key)) continue;
        try {
          snd.stop();
          snd.destroy();
        } catch {
          /* ignore */
        }
      }
      try {
        mgr.stopAll?.();
      } catch {
        /* ignore */
      }
    }
  }
}

/** @type {BgmBus|null} */
let moduleBus = null;

/** @returns {BgmBus} */
export function getBgmBus() {
  if (typeof window !== 'undefined') {
    if (!window[BUS_KEY]) {
      window[BUS_KEY] = new BgmBus();
    }
    return window[BUS_KEY];
  }
  if (!moduleBus) {
    moduleBus = new BgmBus();
  }
  return moduleBus;
}

export const bgmBus = getBgmBus();

if (import.meta.hot?.data?.bgmState) {
  const s = import.meta.hot.data.bgmState;
  bgmBus.enabled = s.enabled;
  bgmBus.wantedTrack = s.wantedTrack;
  bgmBus.suspended = s.suspended;
  bgmBus._applyOutputState();
}

if (import.meta.hot) {
  import.meta.hot.dispose((data) => {
    bgmBus._applyOutputState();
    data.bgmState = {
      enabled: bgmBus.enabled,
      wantedTrack: bgmBus.wantedTrack,
      suspended: bgmBus.suspended,
    };
  });

  import.meta.hot.accept(() => {
    const bus = getBgmBus();
    bus._applyOutputState();
    if (bus.enabled && !bus.suspended && bus.wantedTrack) {
      bus.apply();
    }
  });
}
