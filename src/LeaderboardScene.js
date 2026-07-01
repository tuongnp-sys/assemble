import Phaser from 'phaser';
import { bgmBus } from './audio/BgmBus.js';
import { setGamePhase } from './gameSession.js';
import { ACT_ORDER } from './core/actConfig.js';
import { getCurrentUser, getPostLoginScene } from './core/userSession.js';
import {
  getActLeaderboard,
  getTotalLeaderboard,
  getUserRank,
  formatScore,
  getActDisplayName,
} from './core/leaderboardService.js';
import { t, tFmt } from './core/i18n.js';
import { wireSceneLang } from './ui/LangToggle.js';

/**
 * LeaderboardScene — bảng xếp hạng offline (theo user đã đăng nhập).
 */
export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super('LeaderboardScene');
  }

  init(data) {
    this.boardActId = data?.boardActId ?? 'total';
  }

  create() {
    setGamePhase('MENU');
    const user = getCurrentUser();
    if (!user || user.role !== 'player') {
      this.scene.start(getPostLoginScene());
      return;
    }

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    bgmBus.stop();

    this.add.rectangle(w / 2, h / 2, w, h, 0x1a3d2e, 1);

    this.add
      .text(w / 2, h * 0.08, t('leaderboard.title'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#fff9c4',
      })
      .setOrigin(0.5);

    if (user) {
      this.add
        .text(w / 2, h * 0.13, `👤 ${user.nickname}`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          color: '#90caf9',
        })
        .setOrigin(0.5);
    }

    this.rankHint = this.add
      .text(w / 2, h * 0.17, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#ffd54f',
      })
      .setOrigin(0.5);

    this.listText = this.add
      .text(w / 2, h * 0.28, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#e8f5e9',
        align: 'left',
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0);

    const tabY = h * 0.22;
    this._addTab(w / 2 - 120, tabY, 70, 28, t('leaderboard.tab_total'), () => this._showBoard('total'));
    let tx = w / 2 - 40;
    const labels = ['A1', 'A2', 'A3', 'Fin'];
    ACT_ORDER.forEach((actId, i) => {
      this._addTab(tx, tabY, 52, 28, labels[i], () => this._showBoard(actId));
      tx += 58;
    });

    this._addBtn(w / 2, h * 0.92, 160, 40, t('common.back_menu'), () => {
      this.scene.start('MenuScene');
    });

    wireSceneLang(this, () => this.scene.restart({ boardActId: this.boardActId }));

    this._showBoard('total');
  }

  /**
   * @param {string} actId
   */
  _showBoard(actId) {
    this.boardActId = actId;
    const user = getCurrentUser();
    const lines = [];

    if (actId === 'total') {
      const board = getTotalLeaderboard(15);
      if (!board.length) {
        lines.push(t('leaderboard.empty_total'));
      } else {
        board.forEach((e, i) => {
          const mark = e.userId === user?.userId ? ' ◀' : '';
          lines.push(`${i + 1}. ${e.nickname} — ${formatScore(e.score)}${mark}`);
        });
      }
      this.rankHint.setText('');
    } else {
      const board = getActLeaderboard(actId, 15);
      if (!board.length) {
        lines.push(tFmt('leaderboard.empty_act', { act: getActDisplayName(actId) }));
      } else {
        board.forEach((e, i) => {
          const mark = e.userId === user?.userId ? ' ◀' : '';
          lines.push(`${i + 1}. ${e.nickname} — ${formatScore(e.score)}${mark}`);
        });
      }
      const rank = user ? getUserRank(actId, user.userId) : null;
      this.rankHint.setText(
        rank ? tFmt('leaderboard.your_rank', { rank }) : t('leaderboard.no_rank')
      );
    }

    this.listText.setText(lines.join('\n'));
  }

  _addTab(x, y, bw, bh, label, onClick) {
    const bg = this.add
      .rectangle(x, y, bw, bh, 0x37474f, 1)
      .setStrokeStyle(1, 0x90caf9)
      .setInteractive({ useHandCursor: true });
    const txt = this.add
      .text(x, y, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fff',
      })
      .setOrigin(0.5);
    bg.on('pointerdown', onClick);
    txt.setInteractive({ useHandCursor: true });
    txt.on('pointerdown', onClick);
  }

  _addBtn(x, y, bw, bh, label, onClick) {
    const bg = this.add
      .rectangle(x, y, bw, bh, 0x455a64, 1)
      .setStrokeStyle(2, 0xb0bec5)
      .setInteractive({ useHandCursor: true });
    const txt = this.add
      .text(x, y, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fff',
      })
      .setOrigin(0.5);
    bg.on('pointerdown', onClick);
    txt.setInteractive({ useHandCursor: true });
    txt.on('pointerdown', onClick);
  }
}
