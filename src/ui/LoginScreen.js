import { t } from '../core/i18n.js';
import { subscribeLangChange } from '../core/locale.js';
import { bindHtmlOverlayToCanvas } from './htmlOverlaySync.js';

/**
 * Màn Login HTML — card + form (chrome VN/EN + mute: GlobalHtmlChrome).
 */
export class LoginScreen {
  /**
   * @param {import('phaser').Scene} scene
   * @param {object} handlers
   * @param {() => void} handlers.onStory
   * @param {() => void} [handlers.onHowTo]
   * @param {(nickname: string) => void} handlers.onPlay
   * @param {(user: string, pass: string) => void | Promise<void>} handlers.onAdminLogin
   * @param {{ showAdminLink?: boolean }} [opts]
   */
  constructor(scene, handlers, opts = {}) {
    this.scene = scene;
    this.handlers = handlers;
    this.mode = 'player';
    this.showAdminLink = opts.showAdminLink !== false;

    this.root = document.createElement('div');
    this.root.className = 'login-screen';
    this.root.innerHTML = `
      <div class="login-card">
        <h1 class="login-title"></h1>
        <p class="login-subtitle login-mode-player-only"></p>
        <p class="login-admin-heading login-mode-admin-only" hidden></p>
        <p class="login-error" role="alert" hidden></p>

        <div class="login-mode login-mode-player">
          <input type="text" class="login-field login-nick" maxlength="16" autocomplete="username" />
          <div class="login-actions login-actions-triple">
            <button type="button" class="login-btn login-btn-story"></button>
            <button type="button" class="login-btn login-btn-howto"></button>
            <button type="button" class="login-btn login-btn-play"></button>
          </div>
        </div>

        <div class="login-mode login-mode-admin" hidden>
          <input type="text" class="login-field login-field-admin login-admin-user" autocomplete="username" />
          <input type="password" class="login-field login-field-admin login-admin-pass" autocomplete="current-password" />
          <div class="login-actions login-actions-split">
            <button type="button" class="login-btn login-btn-secondary login-btn-back"></button>
            <button type="button" class="login-btn login-btn-primary login-btn-admin-submit"></button>
          </div>
        </div>
      </div>

      <button type="button" class="login-admin-link" hidden></button>
    `;

    document.body.appendChild(this.root);
    this._bindRefs();
    this._bindEvents();

    if (!this.showAdminLink) {
      this.adminLink.hidden = true;
    }

    this._unbindSync = bindHtmlOverlayToCanvas(scene.game, this.root);
    this._unsubLang = subscribeLangChange(() => this.refreshLang());

    this.setMode('player');
    this.refreshLang();
  }

  _bindRefs() {
    const r = this.root;
    this.titleEl = /** @type {HTMLHeadingElement} */ (r.querySelector('.login-title'));
    this.subtitleEl = /** @type {HTMLParagraphElement} */ (r.querySelector('.login-subtitle'));
    this.adminHeadingEl = /** @type {HTMLParagraphElement} */ (
      r.querySelector('.login-admin-heading')
    );
    this.errorEl = /** @type {HTMLParagraphElement} */ (r.querySelector('.login-error'));
    this.playerMode = /** @type {HTMLDivElement} */ (r.querySelector('.login-mode-player'));
    this.adminMode = /** @type {HTMLDivElement} */ (r.querySelector('.login-mode-admin'));
    this.nickInput = /** @type {HTMLInputElement} */ (r.querySelector('.login-nick'));
    this.adminUserInput = /** @type {HTMLInputElement} */ (r.querySelector('.login-admin-user'));
    this.adminPassInput = /** @type {HTMLInputElement} */ (r.querySelector('.login-admin-pass'));
    this.storyBtn = /** @type {HTMLButtonElement} */ (r.querySelector('.login-btn-story'));
    this.howtoBtn = /** @type {HTMLButtonElement} */ (r.querySelector('.login-btn-howto'));
    this.playBtn = /** @type {HTMLButtonElement} */ (r.querySelector('.login-btn-play'));
    this.backBtn = /** @type {HTMLButtonElement} */ (r.querySelector('.login-btn-back'));
    this.adminSubmitBtn = /** @type {HTMLButtonElement} */ (
      r.querySelector('.login-btn-admin-submit')
    );
    this.adminLink = /** @type {HTMLButtonElement} */ (r.querySelector('.login-admin-link'));
    this.playerOnlyEls = r.querySelectorAll('.login-mode-player-only');
    this.adminOnlyEls = r.querySelectorAll('.login-mode-admin-only');
  }

  _bindEvents() {
    this.storyBtn.addEventListener('click', () => this.handlers.onStory?.());
    this.howtoBtn.addEventListener('click', () => this.handlers.onHowTo?.());
    this.playBtn.addEventListener('click', () => {
      this.handlers.onPlay?.(this.nickInput.value);
    });

    this.backBtn.addEventListener('click', () => this.setMode('player'));
    this.adminLink.addEventListener('click', () => this.setMode('admin'));
    this.adminSubmitBtn.addEventListener('click', () => {
      void this.handlers.onAdminLogin?.(
        this.adminUserInput.value,
        this.adminPassInput.value
      );
    });

    this.adminPassInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.adminSubmitBtn.click();
      }
    });

    this.nickInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.playBtn.click();
      }
    });
  }

  refreshLang() {
    this.titleEl.textContent = t('login.title');
    this.subtitleEl.textContent = t('login.subtitle');
    this.adminHeadingEl.textContent = t('login.admin_title');
    this.nickInput.placeholder = t('login.nickname_ph');
    this.adminUserInput.placeholder = t('login.admin_user_ph');
    this.adminPassInput.placeholder = t('login.admin_pass_ph');
    this.storyBtn.textContent = t('login.story');
    this.howtoBtn.textContent = t('menu.howto');
    this.playBtn.textContent = t('login.play');
    this.backBtn.textContent = t('login.admin_back');
    this.adminSubmitBtn.textContent = t('login.admin_login');
    this.adminLink.textContent = t('login.admin');
  }

  /**
   * @param {'player'|'admin'} mode
   */
  setMode(mode) {
    this.mode = mode;
    const player = mode === 'player';

    this.playerMode.hidden = !player;
    this.adminMode.hidden = player;

    for (const el of this.playerOnlyEls) {
      el.hidden = !player;
    }
    for (const el of this.adminOnlyEls) {
      el.hidden = player;
    }

    this.adminLink.hidden = !player || !this.showAdminLink;

    this.clearError();

    if (player) {
      this.nickInput.focus();
    } else {
      this.adminUserInput.focus();
    }
  }

  /** @param {string} message */
  showError(message) {
    this.errorEl.textContent = message;
    this.errorEl.hidden = !message;
  }

  clearError() {
    this.showError('');
  }

  /** @param {boolean} visible */
  setVisible(visible) {
    this.root.hidden = !visible;
  }

  blur() {
    this.nickInput.blur();
    this.adminUserInput.blur();
    this.adminPassInput.blur();
  }

  destroy() {
    this._unsubLang?.();
    this._unbindSync?.();
    this.root.remove();
  }
}
