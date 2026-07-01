import Phaser from 'phaser';
import { audioManager } from './audio/AudioManager.js';
import { bgmBus } from './audio/BgmBus.js';
import { stopUnderlyingSceneAudio } from './audio/BgmController.js';
import { setGamePhase } from './gameSession.js';
import { platform } from '../platform/index.js';
import { getGoldReward } from './core/actConfig.js';
import {
  getActDisplayName,
  getNextActId,
  recordActVictory,
  getLegendText,
} from './core/campaignProgress.js';
import { getAchievementText } from './core/butHelpService.js';
import { hasAchievement } from './core/achievementStorage.js';
import {
  formatScoreBreakdown,
} from './core/scoring.js';
import { t, tFmt } from './core/i18n.js';
import { wireSceneLang } from './ui/LangToggle.js';
import { recordActBestScore, getActBestScore } from './core/scoreStorage.js';
import {
  submitLeaderboardScore,
  getUserRank,
  formatScore,
} from './core/leaderboardService.js';
import { getCurrentUser } from './core/userSession.js';
import legend from './data/content/legend.json';

/**
 * GameOverScene — campaign victory/defeat flow.
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    this.victory = data.victory ?? false;
    this.actId = data.actId ?? '1';
    this.score = data.score ?? 0;
    this.scoreBreakdown = data.scoreBreakdown ?? null;
    this.isNewBest = false;
    this.timeLeft = data.timeLeft ?? 0;
    this.goldEarned = data.goldEarned ?? 0;
    this.firstBadIndex = data.firstBadIndex ?? null;
    this.nextActId = null;
    this.isFinaleWin = false;
    this.adminSession = data.adminSession === true;
    this.leaderboardRank = null;
    this.achievementUnlocked = data.achievementUnlocked ?? null;
    this.fromCinematic = data.fromCinematic === true;
    this.skipSideEffects = data.skipSideEffects === true;
    if (data.isNewBest != null) this.isNewBest = data.isNewBest;
    if (data.leaderboardRank != null) this.leaderboardRank = data.leaderboardRank;
    if (data.nextActId != null) this.nextActId = data.nextActId;
    if (data.isFinaleWin != null) this.isFinaleWin = data.isFinaleWin;
  }

  _restartPayload() {
    return {
      victory: this.victory,
      actId: this.actId,
      score: this.score,
      scoreBreakdown: this.scoreBreakdown,
      timeLeft: this.timeLeft,
      goldEarned: this.goldEarned,
      firstBadIndex: this.firstBadIndex,
      adminSession: this.adminSession,
      achievementUnlocked: this.achievementUnlocked,
      fromCinematic: this.fromCinematic,
      skipSideEffects: true,
      isNewBest: this.isNewBest,
      leaderboardRank: this.leaderboardRank,
      nextActId: this.nextActId,
      isFinaleWin: this.isFinaleWin,
    };
  }

  create() {
    setGamePhase('GAMEOVER');
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    stopUnderlyingSceneAudio(this);
    bgmBus.stop();
    bgmBus.ensureSfxUnlocked();

    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.6).setDepth(40);

    wireSceneLang(this, () => this.scene.restart(this._restartPayload()));

    if (this.victory && !this.adminSession && !this.skipSideEffects && getCurrentUser()?.role === 'player') {
      const gold = this.goldEarned || getGoldReward(this.actId);
      recordActVictory(this.actId, gold);
      const best = recordActBestScore(this.actId, this.score);
      this.isNewBest = best.isNewBest;
      const lb = submitLeaderboardScore({ actId: this.actId, score: this.score });
      this.leaderboardRank = lb.rank ?? getUserRank(this.actId);
      this.nextActId = getNextActId(this.actId);
      this.isFinaleWin = this.actId === 'finale';
      this._buildVictory(w, h, gold);
      audioManager.playSfx('khacnhap');
    } else if (this.victory) {
      const gold = this.goldEarned || getGoldReward(this.actId);
      this.nextActId = getNextActId(this.actId);
      this.isFinaleWin = this.actId === 'finale';
      this._buildVictory(w, h, gold);
      audioManager.playSfx('khacnhap');
    } else {
      this._buildDefeat(w, h);
      audioManager.playSfx('khacxuat');
    }
  }

  _buildVictory(w, h, gold) {
    this.cameras.main.flash(300, 255, 235, 150);

    const title = this.isFinaleWin ? t('gameover.finale') : t('gameover.victory');
    this.add
      .text(w / 2, h * 0.14, title, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: this.isFinaleWin ? 34 : 30,
        fontStyle: 'bold',
        color: '#fff9c4',
        stroke: '#2e7d32',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(50);

    this.add
      .text(w / 2, h * 0.2, getActDisplayName(this.actId), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#a5d6a7',
      })
      .setOrigin(0.5)
      .setDepth(50);

    if (this.isFinaleWin) {
      this.add
        .image(w / 2, h * 0.38, 'game_assets', 'but')
        .setScale(1.6)
        .setDepth(45);
      this.add
        .image(w * 0.35, h * 0.42, 'game_assets', 'farmer')
        .setScale(1.2)
        .setDepth(44);
    } else {
      this.add
        .image(w / 2, h * 0.38, 'game_assets', 'segment_body')
        .setScale(2.2)
        .setDepth(45);
    }

    const story =
      this.isFinaleWin
        ? getLegendText(legend, this.actId, 'finale') || getLegendText(legend, this.actId, 'victory')
        : getLegendText(legend, this.actId, 'victory');

    const bestLine = this.isNewBest
      ? tFmt('gameover.new_best', { score: formatScore(this.score) })
      : tFmt('gameover.score_line', {
          score: formatScore(this.score),
          best: formatScore(getActBestScore(this.actId)),
        });

    this.add
      .text(w / 2, h * 0.52, story, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#e8f5e9',
        align: 'center',
        wordWrap: { width: w - 48 },
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0)
      .setDepth(50);

    this.add
      .text(w / 2, h * 0.64, bestLine, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        fontStyle: this.isNewBest ? 'bold' : 'normal',
        color: this.isNewBest ? '#fff59d' : '#ffd54f',
        align: 'center',
        wordWrap: { width: w - 40 },
      })
      .setOrigin(0.5)
      .setDepth(50);

    if (this.scoreBreakdown) {
      this.add
        .text(w / 2, h * 0.69, formatScoreBreakdown(this.scoreBreakdown), {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '10px',
          color: '#c8e6c9',
          align: 'center',
          wordWrap: { width: w - 48 },
        })
        .setOrigin(0.5)
        .setDepth(50);
    }

    this.add
      .text(w / 2, h * 0.74, tFmt('gameover.gold_time', { gold, sec: Math.ceil(this.timeLeft) }), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#a5d6a7',
      })
      .setOrigin(0.5)
      .setDepth(50);

    if (this.leaderboardRank) {
      this.add
        .text(w / 2, h * 0.78, tFmt('gameover.rank_act', { rank: this.leaderboardRank }), {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '11px',
          color: '#90caf9',
        })
        .setOrigin(0.5)
        .setDepth(50);
    }

    const achId = this.achievementUnlocked ?? (this.isFinaleWin && hasAchievement('tre_master') ? 'tre_master' : null);
    if (achId) {
      const ach = getAchievementText(achId);
      const isNew = this.achievementUnlocked === achId;
      const achY = this.leaderboardRank ? h * 0.82 : h * 0.78;
      this.add
        .text(
          w / 2,
          achY,
          isNew
            ? tFmt('gameover.ach_new', { icon: ach.icon, title: ach.title })
            : tFmt('gameover.ach_have', { icon: ach.icon, title: ach.title }),
          {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '12px',
            fontStyle: isNew ? 'bold' : 'normal',
            color: '#ffd54f',
            align: 'center',
          }
        )
        .setOrigin(0.5)
        .setDepth(50);
    }

    this._addButtons(w, h, true);
  }

  _buildDefeat(w, h) {
    this.cameras.main.shake(200, 0.008);

    const isTimeUp = this.firstBadIndex == null && this.timeLeft <= 0;
    const title = isTimeUp ? t('gameover.defeat_time') : t('gameover.defeat_ritual');

    this.add
      .text(w / 2, h * 0.18, title, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '30px',
        fontStyle: 'bold',
        color: isTimeUp ? '#ffb74d' : '#ef5350',
        stroke: '#1a1a1a',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(50);

    let sub = getLegendText(legend, this.actId, 'defeat');
    if (this.firstBadIndex != null) {
      sub = `${tFmt('gameover.bad_joint', { n: this.firstBadIndex + 1 })}\n${sub}`;
    } else if (isTimeUp) {
      sub = `${t('gameover.time_tip')}\n${sub}`;
    }

    this.add
      .text(w / 2, h * 0.28, sub, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#ffccbc',
        align: 'center',
        wordWrap: { width: w - 48 },
        lineSpacing: 4,
      })
      .setOrigin(0.5)
      .setDepth(50);

    this.add
      .image(w / 2, h * 0.48, 'game_assets', 'farmer')
      .setScale(1.3)
      .setAlpha(0.75)
      .setDepth(45);

    this._addButtons(w, h, false);
  }

  _addButtons(w, h, victory) {
    let y = h * 0.78;

    if (victory && this.nextActId) {
      const nextLabel = tFmt('gameover.continue', { act: getActDisplayName(this.nextActId) });
      this._mkBtn(w / 2, y, 240, 44, 0x1565c0, 0x90caf9, nextLabel, () => {
        this._goAct(this.nextActId);
      });
      y += 52;
    }

    if (victory && this.isFinaleWin) {
      this._mkBtn(w / 2, y, 200, 40, 0x455a64, 0xb0bec5, t('gameover.menu'), () => this._goMenu());
      return;
    }

    this._mkBtn(w / 2, y, 200, 44, 0x2e7d32, 0xa5d6a7, t('gameover.replay'), async () => {
      await platform.showInterstitial();
      this._goAct(this.actId);
    });

    this._mkBtn(w / 2, h * 0.9, 160, 36, 0x455a64, 0xb0bec5, t('gameover.menu'), () => this._goMenu());
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} bw
   * @param {number} bh
   * @param {number} fill
   * @param {number} stroke
   * @param {string} label
   * @param {() => void} onClick
   */
  _mkBtn(x, y, bw, bh, fill, stroke, label, onClick) {
    const bg = this.add
      .rectangle(x, y, bw, bh, fill, 1)
      .setStrokeStyle(2, stroke)
      .setInteractive({ useHandCursor: true })
      .setDepth(55);

    const txt = this.add
      .text(x, y, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: label.length > 14 ? '11px' : '14px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: bw - 12 },
      })
      .setOrigin(0.5)
      .setDepth(56);

    const go = () => onClick();
    bg.on('pointerdown', go);
    txt.setInteractive({ useHandCursor: true });
    txt.on('pointerdown', go);
  }

  /**
   * @param {string} actId
   */
  _goAct(actId) {
    this.scene.stop('FinaleCinematicScene');
    this.scene.stop('GameOverScene');
    this.scene.stop('GameScene');
    setGamePhase('PLAYING');
    this.scene.start('GameScene', { actId });
  }

  _goMenu() {
    this.scene.stop('FinaleCinematicScene');
    this.scene.stop('GameOverScene');
    this.scene.stop('GameScene');
    setGamePhase('MENU');
    this.scene.start('MenuScene');
  }
}
