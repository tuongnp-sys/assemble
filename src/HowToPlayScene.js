import Phaser from 'phaser';
import { bgmBus } from './audio/BgmBus.js';
import { playMenuBgmIfAudible } from './audio/BgmController.js';
import { HowToPlayPanel } from './ui/HowToPlayPanel.js';
import { getCurrentUser } from './core/userSession.js';
import { t } from './core/i18n.js';
import { wireSceneLang } from './ui/LangToggle.js';

/**
 * HowToPlayScene — hướng dẫn 4 bước (player + admin + guest từ login).
 */
export class HowToPlayScene extends Phaser.Scene {
  constructor() {
    super('HowToPlayScene');
  }

  init(data) {
    this.returnScene = data?.returnScene ?? 'MenuScene';
    this.adminMode = data?.adminMode === true;
    this.adminPreview = data?.adminPreview === true;
    this.guestMode = data?.guestMode === true;
  }

  create() {
    const user = getCurrentUser();
    if (!user && !this.guestMode) {
      this.scene.start('LoginScene');
      return;
    }
    if (user && !this.adminMode && !this.guestMode && user.role !== 'player') {
      this.scene.start('AdminHubScene');
      return;
    }

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.add.rectangle(w / 2, h / 2, w, h, 0x1a3d2e).setDepth(0);
    this.add.image(w / 2, h * 0.78, 'game_assets', 'bg_hill').setDisplaySize(w, 180).setAlpha(0.5).setDepth(1);

    this._buildBackButton(w);

    this.panel = new HowToPlayPanel(this, w, h, {
      showStart: !this.adminMode && !this.guestMode,
      onBack: () => this._goBack(),
      onStart: () => this._goPlay(),
    });

    wireSceneLang(this, () =>
      this.scene.restart({
        returnScene: this.returnScene,
        adminMode: this.adminMode,
        adminPreview: this.adminPreview,
        guestMode: this.guestMode,
      })
    );

    playMenuBgmIfAudible(this);
  }

  _goBack() {
    if (this.returnScene === 'MenuScene') {
      this.scene.start('MenuScene', { adminPreview: this.adminPreview });
      return;
    }
    this.scene.start(this.returnScene);
  }

  /**
   * @param {number} w
   */
  _buildBackButton(w) {
    const y = 28;
    /** @type {string} */
    let labelKey = 'common.back_menu';
    if (this.guestMode) {
      labelKey = 'login.back';
    } else if (this.returnScene === 'AdminHubScene' || this.adminPreview) {
      labelKey = 'menu.back_admin';
    }

    const bg = this.add
      .rectangle(56, y, 96, 32, 0x263238, 0.9)
      .setStrokeStyle(2, 0x81c784, 0.9)
      .setInteractive({ useHandCursor: true })
      .setDepth(60);

    const txt = this.add
      .text(56, y, t(labelKey), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#a5d6a7',
      })
      .setOrigin(0.5)
      .setDepth(61);

    const goBack = () => this._goBack();
    bg.on('pointerdown', goBack);
    txt.setInteractive({ useHandCursor: true });
    txt.on('pointerdown', goBack);
  }

  _goPlay() {
    bgmBus.stop();
    this.scene.start('GameScene', { actId: '1' });
  }

  shutdown() {
    this.panel?.destroy();
    this.panel = null;
  }
}
