import Phaser from 'phaser';
import { bgmBus } from './audio/BgmBus.js';
import { playMenuBgmIfAudible } from './audio/BgmController.js';
import { setGamePhase } from './gameSession.js';
import {
  loadCampaign,
  getContinueActId,
  getActDisplayName,
  resetCampaignProgress,
} from './core/campaignProgress.js';
import { formatScore } from './core/scoring.js';
import { getCampaignBestTotal } from './core/scoreStorage.js';
import { getCurrentUser, logout } from './core/userSession.js';
import { t, tFmt } from './core/i18n.js';
import { wireSceneLang } from './ui/LangToggle.js';

/**
 * MenuScene — campaign menu.
 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  init(data) {
    this.adminPreview = data?.adminPreview === true;
  }

  create() {
    setGamePhase('MENU');
    const user = getCurrentUser();
    if (!user) {
      this.scene.start('LoginScene');
      return;
    }
    if (user.role === 'admin' && !this.adminPreview) {
      this.scene.start('AdminHubScene');
      return;
    }

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const campaign = loadCampaign();
    const continueAct = getContinueActId();
    const displayName = this.adminPreview ? t('menu.preview_name') : user.nickname;

    wireSceneLang(this, () => this.scene.restart({ adminPreview: this.adminPreview }));

    this.add.image(w / 2, h * 0.72, 'game_assets', 'bg_hill').setDisplaySize(w, 200);
    this.add.image(w * 0.28, h * 0.55, 'game_assets', 'farmer').setScale(1.2);
    this.add.image(w * 0.72, h * 0.52, 'game_assets', 'phuong').setScale(1.1).setAlpha(0.85);

    this.add
      .text(w / 2, h * 0.1, t('menu.title'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#f5e6a8',
        stroke: '#1a3d2e',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, h * 0.16, tFmt('menu.hello', { name: displayName }), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#c8e6c9',
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, h * 0.2, t('menu.tagline'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#81c784',
      })
      .setOrigin(0.5);

    if (this.adminPreview) {
      this.add
        .text(w / 2, h * 0.22, t('menu.admin_preview'), {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '10px',
          color: '#ffab91',
        })
        .setOrigin(0.5);
    }

    const progress = campaign.gameComplete
      ? t('menu.progress_complete')
      : campaign.clearedActs.length
        ? tFmt('menu.progress', {
            n: campaign.clearedActs.length,
            act: getActDisplayName(continueAct),
          })
        : t('menu.progress_start');

    this.add
      .text(w / 2, h * 0.25, progress, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#90caf9',
        align: 'center',
        wordWrap: { width: w - 40 },
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, h * 0.3, tFmt('menu.gold_line', { n: campaign.gold }), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#ffd54f',
      })
      .setOrigin(0.5);

    const bestTotal = getCampaignBestTotal();
    if (bestTotal > 0) {
      this.add
        .text(w / 2, h * 0.35, tFmt('menu.best_line', { score: formatScore(bestTotal) }), {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '11px',
          color: '#90caf9',
        })
        .setOrigin(0.5);
    }

    const isFreshPlayer = campaign.clearedActs.length === 0 && !campaign.gameComplete;
    const hasProgress = campaign.clearedActs.length > 0 && !campaign.gameComplete;

    const startLabel =
      isFreshPlayer || campaign.gameComplete ? t('menu.start') : t('menu.restart');

    const openHowTo = () => {
      bgmBus.stop();
      this.scene.start('HowToPlayScene', {
        returnScene: 'MenuScene',
        adminMode: this.adminPreview,
        adminPreview: this.adminPreview,
      });
    };

    if (hasProgress) {
      this._addButton(
        w / 2,
        h * 0.56,
        220,
        44,
        0x1565c0,
        0x90caf9,
        tFmt('menu.continue', {
          act: getActDisplayName(continueAct).replace(/^Act \d+ — /, ''),
        }),
        async () => {
          await this._startAct(continueAct);
        }
      );
    }

    this._addButton(
      w / 2,
      h * (hasProgress ? 0.64 : 0.58),
      200,
      44,
      0x2e7d32,
      0xa5d6a7,
      startLabel,
      async () => {
        if (!isFreshPlayer) {
          resetCampaignProgress(false);
        }
        await this._startAct('1');
      }
    );

    const rowY = h * (hasProgress ? 0.72 : 0.66);
    const pairW = 148;
    const pairGap = 8;

    this._addButton(
      w / 2 - pairW / 2 - pairGap / 2,
      rowY,
      pairW,
      36,
      0x455a64,
      0xb0bec5,
      t('menu.howto'),
      openHowTo
    );

    this._addButton(
      w / 2 + pairW / 2 + pairGap / 2,
      rowY,
      pairW,
      36,
      0x455a64,
      0xb0bec5,
      t('menu.leaderboard'),
      () => {
        bgmBus.stop();
        this.scene.start('LeaderboardScene');
      }
    );

    if (this.adminPreview) {
      this._addButton(56, 28, 100, 28, 0x5d4037, 0xffcc80, t('menu.back_admin'), () => {
        this.scene.start('AdminHubScene');
      });
    } else {
      this._addButton(56, 28, 88, 28, 0x455a64, 0xb0bec5, t('common.exit'), () => {
        logout();
        bgmBus.stop();
        this.scene.start('LoginScene');
      });
    }

    playMenuBgmIfAudible(this);
  }

  /**
   * @param {string} actId
   */
  async _startAct(actId) {
    bgmBus.stop();
    this.scene.start('GameScene', { actId });
  }

  _addButton(x, y, bw, bh, fill, stroke, label, onClick) {
    const bg = this.add
      .rectangle(x, y, bw, bh, fill, 1)
      .setStrokeStyle(2, stroke)
      .setInteractive({ useHandCursor: true });

    const txt = this.add
      .text(x, y, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: label.length > 12 ? '10px' : label.length > 8 ? '11px' : '14px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: bw - 6 },
      })
      .setOrigin(0.5);

    bg.on('pointerdown', onClick);
    txt.setInteractive({ useHandCursor: true });
    txt.on('pointerdown', onClick);
  }
}
