import Phaser from 'phaser';
import { playMenuBgmIfAudible } from './audio/BgmController.js';
import { bgmBus } from './audio/BgmBus.js';
import { setGamePhase } from './gameSession.js';
import { t } from './core/i18n.js';
import { LoginScreen } from './ui/LoginScreen.js';
import { wireSceneLang } from './ui/LangToggle.js';
import { StoryScrollOverlay } from './ui/StoryScrollOverlay.js';
import {
  loginPlayer,
  loginAdmin,
  getPostLoginScene,
  isAdminFeatureEnabled,
} from './core/userSession.js';

/**
 * LoginScene — nền Phaser + LoginScreen HTML (card + chrome).
 */
export class LoginScene extends Phaser.Scene {
  constructor() {
    super('LoginScene');
  }

  create() {
    setGamePhase('MENU');
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.add.rectangle(w / 2, h / 2, w, h, 0x1a3d2e, 1);

    this.storyOverlay = null;

    this.loginScreen = new LoginScreen(
      this,
      {
        onStory: () => this._openStory(),
        onHowTo: () => this._openHowTo(),
        onPlay: (nickname) => this._onPlay(nickname),
        onAdminLogin: (user, pass) => this._onAdminLogin(user, pass),
      },
      { showAdminLink: isAdminFeatureEnabled() }
    );

    this.events.once('shutdown', () => this._cleanup());

    wireSceneLang(this, () => this.loginScreen?.refreshLang());

    playMenuBgmIfAudible(this);
  }

  /**
   * @param {string} nickname
   */
  _onPlay(nickname) {
    const res = loginPlayer(nickname);
    if (!res.ok) {
      this.loginScreen.showError(t(res.errorKey ?? 'login.err'));
      return;
    }
    this.scene.start(getPostLoginScene());
  }

  /**
   * @param {string} user
   * @param {string} pass
   */
  async _onAdminLogin(user, pass) {
    this.loginScreen.showError(`${t('login.admin_login')}…`);
    const res = await loginAdmin(user, pass);
    if (!res.ok) {
      this.loginScreen.showError(t(res.errorKey ?? 'login.err'));
      return;
    }
    this.scene.start(getPostLoginScene());
  }

  _openHowTo() {
    if (this.storyOverlay) return;
    this.loginScreen.setVisible(false);
    bgmBus.stop();
    this.scene.start('HowToPlayScene', {
      returnScene: 'LoginScene',
      guestMode: true,
    });
  }

  _openStory() {
    if (this.storyOverlay) return;
    this.loginScreen.blur();
    this.loginScreen.setVisible(false);
    this.storyOverlay = new StoryScrollOverlay(this, {
      onClose: () => {
        this.storyOverlay = null;
        this.loginScreen?.setVisible(true);
      },
    });
  }

  _cleanup() {
    this.storyOverlay?.destroy();
    this.storyOverlay = null;
    this.loginScreen?.destroy();
    this.loginScreen = null;
  }
}
