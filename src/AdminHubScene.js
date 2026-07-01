import Phaser from 'phaser';
import { bgmBus } from './audio/BgmBus.js';
import { playMenuBgmIfAudible } from './audio/BgmController.js';
import { setGamePhase } from './gameSession.js';
import { ACT_ORDER } from './core/actConfig.js';
import { debugUnlockAllActs, debugResetCampaign, debugGetCampaign } from './core/debugFlags.js';
import { logout } from './core/userSession.js';
import { t, tFmt } from './core/i18n.js';
import { wireSceneLang } from './ui/LangToggle.js';
import { AdminCredentialsPanel } from './ui/AdminCredentialsPanel.js';

/**
 * AdminHubScene — test game (chỉ sau đăng nhập admin).
 */
export class AdminHubScene extends Phaser.Scene {
  constructor() {
    super('AdminHubScene');
  }

  create() {
    setGamePhase('MENU');
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.add.rectangle(w / 2, h / 2, w, h, 0x1a2e1a, 1);

    this.add
      .text(w / 2, h * 0.08, t('admin_hub.title'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffab91',
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, h * 0.14, t('admin_hub.no_lb'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#b0bec5',
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(w / 2, h * 0.44, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#a5d6a7',
        align: 'center',
        wordWrap: { width: w - 40 },
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const labels = ['Act 1', 'Act 2', 'Act 3', 'Finale'];
    const bw = 78;
    const gap = 6;
    const totalW = ACT_ORDER.length * bw + (ACT_ORDER.length - 1) * gap;
    let x = w / 2 - totalW / 2 + bw / 2;
    const actY = h * 0.22;

    ACT_ORDER.forEach((actId, i) => {
      this._addBtn(x, actY, bw, 36, labels[i], () => this._startAct(actId));
      x += bw + gap;
    });

    const utilY = h * 0.32;
    this._addBtn(w / 2 - 90, utilY, 84, 32, 'Unlock', () => {
      debugUnlockAllActs();
      const c = debugGetCampaign();
      this._showStatus(tFmt('admin_hub.unlock_ok', { n: c.clearedActs.length, gold: c.gold }));
    });
    this._addBtn(w / 2, utilY, 84, 32, 'Reset', () => {
      debugResetCampaign();
      this._showStatus(t('admin_hub.reset_ok'));
    });
    this._addBtn(w / 2 + 90, utilY, 84, 32, 'Auto↑', () => {
      void this._startAct('1', { debugAutoWin: true, debugSkipBriefing: true });
    });

    const goY = h * 0.4;
    this._addBtn(w / 2 - 80, goY, 72, 32, 'GO Win', () => {
      this._goOver(true);
    });
    this._addBtn(w / 2 + 80, goY, 72, 32, 'GO Lose', () => {
      this._goOver(false);
    });

    this._addBtn(w / 2, h * 0.5, 200, 40, t('admin_hub.view_menu'), () => {
      this.scene.start('MenuScene', { adminPreview: true });
    });

    this._addBtn(w / 2, h * 0.56, 200, 36, t('menu.howto'), () => {
      bgmBus.stop();
      this.scene.start('HowToPlayScene', {
        returnScene: 'AdminHubScene',
        adminMode: true,
      });
    });

    this._addBtn(w / 2, h * 0.62, 200, 36, 'CINEMATIC', () => {
      this.scene.start('FinaleCinematicScene', {
        dailySeed: 0,
        gameOverPayload: {
          victory: true,
          actId: 'finale',
          score: 62800,
          timeLeft: 55,
          goldEarned: 100,
          adminSession: true,
        },
      });
    });

    this._addBtn(w / 2, h * 0.68, 200, 36, t('admin_hub.change_cred'), () => {
      if (this.credPanel) return;
      this.credPanel = new AdminCredentialsPanel(this, {
        onClose: () => {
          this.credPanel = null;
        },
      });
    });

    this._addBtn(w / 2, h * 0.88, 180, 40, t('admin_hub.logout'), () => {
      logout();
      bgmBus.stop();
      this.scene.start('LoginScene');
    });

    wireSceneLang(this, () => this.scene.restart());

    playMenuBgmIfAudible(this);
  }

  shutdown() {
    this.credPanel?.destroy();
    this.credPanel = null;
  }

  /**
   * @param {string} actId
   * @param {object} [opts]
   */
  async _startAct(actId, opts = {}) {
    bgmBus.stop();
    this.scene.start('GameScene', {
      actId,
      debugAutoWin: Boolean(opts.debugAutoWin),
      debugSkipBriefing: Boolean(opts.debugSkipBriefing),
      adminSession: true,
    });
  }

  /**
   * @param {boolean} victory
   */
  _goOver(victory) {
    setGamePhase('GAMEOVER');
    bgmBus.stop();
    this.scene.start('GameOverScene', {
      victory,
      actId: 'finale',
      score: victory ? 62800 : 0,
      timeLeft: 55,
      goldEarned: victory ? 100 : 0,
      firstBadIndex: victory ? null : 4,
      adminSession: true,
    });
  }

  _showStatus(message) {
    if (this.statusTween) {
      this.statusTween.stop();
    }
    this.statusText.setText(message);
    this.statusText.setAlpha(1);
    this.statusTween = this.tweens.add({
      targets: this.statusText,
      alpha: 0,
      duration: 2200,
      delay: 1800,
    });
  }

  _addBtn(x, y, bw, bh, label, onClick) {
    const bg = this.add
      .rectangle(x, y, bw, bh, 0x5d4037, 1)
      .setStrokeStyle(2, 0xffcc80)
      .setInteractive({ useHandCursor: true });
    const txt = this.add
      .text(x, y, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fff',
      })
      .setOrigin(0.5);
    bg.on('pointerdown', onClick);
    txt.setInteractive({ useHandCursor: true });
    txt.on('pointerdown', onClick);
  }
}
