import { t } from '../core/i18n.js';
import { changeAdminCredentialsRemote } from '../core/adminAuthService.js';
import { bindHtmlOverlayToCanvas } from './htmlOverlaySync.js';

/**
 * Form đổi tài khoản / mật khẩu admin — HTML overlay (không dùng add.dom).
 */
export class AdminCredentialsPanel {
  /**
   * @param {import('phaser').Scene} scene
   * @param {{ onClose: () => void }} opts
   */
  constructor(scene, opts) {
    this.scene = scene;
    this.opts = opts;
    this._done = false;
    this._inputWasEnabled = scene.input.enabled;
    scene.input.enabled = false;

    this.root = document.createElement('div');
    this.root.className = 'admin-cred-overlay';
    this.root.innerHTML = `
      <div class="admin-cred-backdrop" aria-hidden="true"></div>
      <div class="admin-cred-form" role="dialog" aria-modal="true">
        <h3 class="admin-cred-title"></h3>
        <label class="admin-cred-label admin-cred-lbl-cur"></label>
        <input type="password" class="admin-cred-input admin-cred-cur" autocomplete="current-password" />
        <label class="admin-cred-label admin-cred-lbl-user"></label>
        <input type="text" class="admin-cred-input admin-cred-user" autocomplete="username" maxlength="32" />
        <label class="admin-cred-label admin-cred-lbl-new"></label>
        <input type="password" class="admin-cred-input admin-cred-new" autocomplete="new-password" />
        <label class="admin-cred-label admin-cred-lbl-conf"></label>
        <input type="password" class="admin-cred-input admin-cred-conf" autocomplete="new-password" />
        <p class="admin-cred-hint"></p>
        <p class="admin-cred-msg" role="alert"></p>
        <div class="admin-cred-actions">
          <button type="button" class="admin-cred-btn primary admin-cred-save"></button>
          <button type="button" class="admin-cred-btn admin-cred-cancel"></button>
        </div>
      </div>
    `;

    document.body.appendChild(this.root);
    this._bindRefs();
    this._applyStrings();

    this._unbindSync = bindHtmlOverlayToCanvas(scene.game, this.root);

    this.backdropEl.addEventListener('click', () => this.destroy());
    this.cancelBtn.addEventListener('click', () => this.destroy());
    this.saveBtn.addEventListener('click', () => void this._save());

    this.formEl.addEventListener('mousedown', (e) => e.stopPropagation());
    this.formEl.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });

    this.curInput.focus();
  }

  _bindRefs() {
    const r = this.root;
    this.backdropEl = /** @type {HTMLDivElement} */ (r.querySelector('.admin-cred-backdrop'));
    this.formEl = /** @type {HTMLDivElement} */ (r.querySelector('.admin-cred-form'));
    this.curInput = /** @type {HTMLInputElement} */ (r.querySelector('.admin-cred-cur'));
    this.userInput = /** @type {HTMLInputElement} */ (r.querySelector('.admin-cred-user'));
    this.newInput = /** @type {HTMLInputElement} */ (r.querySelector('.admin-cred-new'));
    this.confInput = /** @type {HTMLInputElement} */ (r.querySelector('.admin-cred-conf'));
    this.msgEl = /** @type {HTMLParagraphElement} */ (r.querySelector('.admin-cred-msg'));
    this.saveBtn = /** @type {HTMLButtonElement} */ (r.querySelector('.admin-cred-save'));
    this.cancelBtn = /** @type {HTMLButtonElement} */ (r.querySelector('.admin-cred-cancel'));
  }

  _applyStrings() {
    const r = this.root;
    r.querySelector('.admin-cred-title').textContent = t('admin.change.title');
    r.querySelector('.admin-cred-lbl-cur').textContent = t('admin.change.current');
    r.querySelector('.admin-cred-lbl-user').textContent = t('admin.change.new_user');
    r.querySelector('.admin-cred-lbl-new').textContent = t('admin.change.new_pass');
    r.querySelector('.admin-cred-lbl-conf').textContent = t('admin.change.confirm');
    r.querySelector('.admin-cred-hint').textContent = t('admin.change.hint');
    this.saveBtn.textContent = t('admin.change.save');
    this.cancelBtn.textContent = t('admin.change.cancel');
  }

  async _save() {
    this.msgEl.textContent = '';
    this.msgEl.className = 'admin-cred-msg';
    const res = await changeAdminCredentialsRemote({
      currentPassword: this.curInput.value,
      newUsername: this.userInput.value.trim() || undefined,
      newPassword: this.newInput.value,
      confirmPassword: this.confInput.value,
    });
    if (!res.ok) {
      this.msgEl.textContent = t(res.errorKey ?? 'admin.auth.server');
      this.msgEl.className = 'admin-cred-msg error';
      return;
    }
    this.msgEl.textContent = t(res.messageKey ?? 'admin.change.ok');
    this.msgEl.className = 'admin-cred-msg ok';
    window.setTimeout(() => this.destroy(), 1200);
  }

  destroy() {
    if (this._done) return;
    this._done = true;
    if (this.scene?.input) {
      this.scene.input.enabled = this._inputWasEnabled;
    }
    this._unbindSync?.();
    this.root.remove();
    this.opts.onClose?.();
  }
}
