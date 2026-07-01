import { getLang, setLang, subscribeLangChange } from '../core/locale.js';
import {
  loadMutedPreference,
  toggleMutedPreference,
  subscribeBgmMute,
} from '../audio/audioPreferences.js';
import { bgmBus } from '../audio/BgmBus.js';
import { bindHtmlOverlayToCanvas } from './htmlOverlaySync.js';

/** @type {GlobalHtmlChrome|null} */
let chromeInstance = null;

/**
 * Chrome HTML toàn cục — VN/EN + mute BGM (một nút, mọi màn).
 */
class GlobalHtmlChrome {
  /**
   * @param {import('phaser').Game} game
   */
  constructor(game) {
    this.game = game;
    /** @type {import('phaser').Scene|null} */
    this.activeScene = null;
    /** @type {(() => void)|null} */
    this._onLangChange = null;

    this.root = document.createElement('div');
    this.root.className = 'global-html-chrome';
    this.root.hidden = true;
    this.root.innerHTML = `
      <header class="global-chrome-bar">
        <div class="global-chrome-lang" role="group" aria-label="Language">
          <button type="button" class="global-chrome-lang-btn" data-lang="vi">VN</button>
          <span class="global-chrome-lang-sep">|</span>
          <button type="button" class="global-chrome-lang-btn" data-lang="en">EN</button>
        </div>
        <button type="button" class="global-chrome-mute" aria-label="Toggle music">🔊</button>
      </header>
    `;

    document.body.appendChild(this.root);
    this._bindRefs();
    this._bindEvents();

    this._unbindSync = bindHtmlOverlayToCanvas(game, this.root);
    this._unsubLang = subscribeLangChange(() => this._syncUi());
    this._unsubMute = subscribeBgmMute((m) => this._syncMuteIcon(m));

    this._syncUi();
  }

  _bindRefs() {
    this.langBtns = /** @type {NodeListOf<HTMLButtonElement>} */ (
      this.root.querySelectorAll('.global-chrome-lang-btn')
    );
    this.muteBtn = /** @type {HTMLButtonElement} */ (
      this.root.querySelector('.global-chrome-mute')
    );
  }

  _bindEvents() {
    for (const btn of this.langBtns) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const lang = btn.dataset.lang;
        if (lang === 'vi' || lang === 'en') {
          setLang(lang);
          this._onLangChange?.();
        }
      });
    }

    this.muteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const muted = toggleMutedPreference(this._resolveScene());
      this._syncMuteIcon(muted);
    });
  }

  /** @returns {import('phaser').Scene|null} */
  _resolveScene() {
    if (this.activeScene) return this.activeScene;
    const scenes = this.game.scene.getScenes(true);
    return scenes.length > 0 ? scenes[scenes.length - 1] : null;
  }

  _syncUi() {
    const vi = getLang() === 'vi';
    for (const btn of this.langBtns) {
      const on = btn.dataset.lang === (vi ? 'vi' : 'en');
      btn.classList.toggle('is-active', on);
    }
    this._syncMuteIcon();
  }

  /** @param {boolean} [muted] */
  _syncMuteIcon(muted) {
    const m = muted ?? loadMutedPreference();
    this.muteBtn.textContent = m ? '🔇' : '🔊';
    this.muteBtn.setAttribute('aria-label', m ? 'Bật nhạc nền' : 'Tắt nhạc nền');
  }

  /** @param {boolean} visible */
  setVisible(visible) {
    this.root.hidden = !visible;
  }

  /**
   * @param {import('phaser').Scene} scene
   * @param {() => void} [onLangChange]
   */
  wireScene(scene, onLangChange) {
    this.activeScene = scene;
    this._onLangChange = onLangChange ?? null;
    this.root.dataset.scene = scene.scene.key;
    this.setVisible(scene.scene.key !== 'BootScene');
    bgmBus.syncFromStorage();

    scene.events.once('shutdown', () => {
      if (this.activeScene === scene) {
        this.activeScene = null;
        this._onLangChange = null;
        delete this.root.dataset.scene;
      }
    });
  }

  destroy() {
    this._unsubLang?.();
    this._unsubMute?.();
    this._unbindSync?.();
    this.root.remove();
  }
}

/**
 * @param {import('phaser').Game} game
 */
export function initGlobalChrome(game) {
  chromeInstance?.destroy();
  chromeInstance = new GlobalHtmlChrome(game);
}

/** @returns {GlobalHtmlChrome|null} */
export function getGlobalChrome() {
  return chromeInstance;
}

/**
 * @param {import('phaser').Scene} scene
 * @param {() => void} [onLangChange]
 */
export function wireSceneLang(scene, onLangChange) {
  chromeInstance?.wireScene(scene, onLangChange);
}
