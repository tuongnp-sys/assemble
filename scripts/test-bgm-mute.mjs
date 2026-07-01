/**
 * Unit tests cho BgmBus — state machine, mute đồng bộ.
 */
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BGM_ID = 'tretramdot-bgm';

/** @type {Record<string, string>} */
const store = {};

globalThis.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => {
    store[k] = String(v);
  },
  removeItem: (k) => {
    delete store[k];
  },
};

class MockHtmlAudio {
  constructor() {
    this.paused = true;
    this.muted = false;
    this.loop = false;
    this.volume = 1;
    this.src = '';
    this.currentTime = 0;
    this.id = BGM_ID;
    this.isConnected = true;
    this.dataset = {};
    /** @type {Promise<void>|null} */
    this._playPromise = null;
    /** @type {(() => void)|null} */
    this._playResolve = null;
  }

  play() {
    if (this.volume <= 0) {
      this.paused = true;
      return Promise.resolve();
    }
    this.paused = false;
    this._playPromise = new Promise((resolve) => {
      this._playResolve = resolve;
    });
    return this._playPromise;
  }

  resolvePlay() {
    this._playResolve?.();
    this._playResolve = null;
  }

  pause() {
    this.paused = true;
  }

  load() {}

  get currentSrc() {
    return this.src;
  }

  remove() {
    this.isConnected = false;
  }

  setAttribute() {}
}

/** @type {MockHtmlAudio[]} */
const mockDomAudios = [];

function seedFixedBgm() {
  mockDomAudios.length = 0;
  const el = new MockHtmlAudio();
  mockDomAudios.push(el);
  return el;
}

function queryBgmNodes() {
  return mockDomAudios.filter((el) => el.id === BGM_ID && el.isConnected);
}

globalThis.window = globalThis;

globalThis.document = {
  getElementById(id) {
    if (id === 'tretramdot-bgm') return queryBgmNodes()[0] ?? null;
    return null;
  },
  querySelectorAll(sel) {
    if (sel === '#tretramdot-bgm') return queryBgmNodes();
    return [];
  },
  body: {
    querySelectorAll(sel) {
      if (sel === 'audio') return mockDomAudios.filter((el) => el.isConnected);
      return [];
    },
  },
};

delete globalThis.__tretramdotBgmBus;

const { bgmBus, getBgmBus } = await import(
  pathToFileURL(join(root, 'src/audio/BgmBus.js')).href
);
const {
  loadMutedPreference,
  saveMutedPreference,
  toggleMutedPreference,
} = await import(pathToFileURL(join(root, 'src/audio/audioPreferences.js')).href);

let passed = 0;
let failed = 0;

/** @param {boolean} cond @param {string} label */
function assert(cond, label) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

function resetBus() {
  seedFixedBgm();
  const bus = getBgmBus();
  bus.enabled = true;
  bus.wantedTrack = null;
  bus.suspended = false;
  bus._audio = null;
  for (const k of Object.keys(store)) delete store[k];
}

function primaryAudio() {
  return queryBgmNodes()[0] ?? null;
}

console.log('BgmBus tests\n');

{
  resetBus();
  bgmBus.requestTrack('menu');
  assert(bgmBus.getWantedTrack() === 'menu', 'requestTrack sets wanted track');
  assert(primaryAudio() !== null && !primaryAudio().paused, 'apply plays when enabled');
  bgmBus.setEnabled(false);
  assert(!bgmBus.isEnabled(), 'setEnabled(false) disables bus');
  assert(primaryAudio()?.paused === true, 'mute pauses audio');
  assert(primaryAudio()?.volume === 0, 'mute sets volume 0 synchronously');
}

{
  resetBus();
  bgmBus.requestTrack('collect');
  bgmBus.setEnabled(false);
  bgmBus.setEnabled(true);
  assert(bgmBus.isEnabled(), 'unmute enables bus');
  assert(!primaryAudio()?.paused, 'unmute replays via apply');
}

{
  resetBus();
  saveMutedPreference(false);
  bgmBus.requestTrack('menu');
  const muted = toggleMutedPreference();
  assert(muted === true, 'toggle flips to muted');
  assert(loadMutedPreference() === true, 'toggle saves localStorage');
  assert(primaryAudio()?.paused === true, 'toggle mute pauses');
  toggleMutedPreference();
  assert(loadMutedPreference() === false, 'second toggle unmutes');
  assert(!primaryAudio()?.paused, 'second toggle replays');
}

{
  resetBus();
  saveMutedPreference(true);
  bgmBus.syncFromStorage();
  bgmBus.requestTrack('menu');
  assert(!bgmBus.isEnabled(), 'syncFromStorage reads muted pref');
  assert(primaryAudio()?.paused === true, 'requestTrack while muted stays silent');
  assert(bgmBus.getWantedTrack() === 'menu', 'wanted track still set');
}

{
  resetBus();
  saveMutedPreference(false);
  bgmBus.requestTrack('menu');
  const el = primaryAudio();
  assert(el && !el.paused, 'play begins before promise resolves');
  saveMutedPreference(true);
  bgmBus.setEnabled(false);
  el?.resolvePlay();
  await Promise.resolve();
  assert(el?.paused === true, 'late play promise respects disabled bus');
  assert(el?.volume === 0, 'late play promise keeps volume 0');
}

{
  resetBus();
  bgmBus.requestTrack('menu');
  bgmBus.suspend();
  assert(primaryAudio()?.paused === true, 'suspend pauses');
  bgmBus.resumePlayback();
  assert(!primaryAudio()?.paused, 'resumePlayback replays when enabled');
}

{
  resetBus();
  saveMutedPreference(true);
  bgmBus.syncFromStorage();
  bgmBus.requestTrack('menu');
  bgmBus.resumePlayback();
  assert(primaryAudio()?.paused === true, 'resumePlayback respects disabled');
}

{
  resetBus();
  bgmBus.requestTrack('menu');
  bgmBus.stop();
  assert(bgmBus.getWantedTrack() === null, 'stop clears wanted track');
  assert(primaryAudio()?.paused === true, 'stop pauses');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
