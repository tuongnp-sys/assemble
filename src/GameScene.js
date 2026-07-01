import Phaser from 'phaser';
import { setGamePhase, setUserPaused, isSystemPaused } from './gameSession.js';
import { platform } from '../platform/index.js';
import { GameController } from './core/GameController.js';
import { getActIndex } from './core/actConfig.js';
import { audioManager } from './audio/AudioManager.js';
import { bgmBus } from './audio/BgmBus.js';
import { GameHudView } from './ui/GameHudView.js';
import { CollectLaneView } from './ui/CollectLaneView.js';
import { AssembleColumnView } from './ui/AssembleColumnView.js';
import { SegmentPoolView } from './ui/SegmentPoolView.js';
import { RitualButtonView } from './ui/RitualButtonView.js';
import { ActBriefingView } from './ui/ActBriefingView.js';
import { GameChromeView } from './ui/GameChromeView.js';
import { CampaignBackdropView } from './ui/CampaignBackdropView.js';
import { ButHelpOverlay } from './ui/ButHelpOverlay.js';
import { shouldPauseTimerDuringButHelp } from './core/butHelpService.js';
import { debugFlags } from './core/debugFlags.js';
import { t, tFmt } from './core/i18n.js';
import { wireSceneLang } from './ui/LangToggle.js';

/**
 * GameScene — campaign: Collect → Assemble → Ritual.
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.actId = data.actId ?? debugFlags.startActId ?? '1';
    this.dailySeed = data.dailySeed ?? 0;
    const cheats = debugFlags.enabled;
    this.debugAutoWin = cheats && Boolean(data.debugAutoWin ?? debugFlags.autoWin);
    this.debugSkipBriefing =
      cheats && Boolean(data.debugSkipBriefing ?? debugFlags.skipBriefing);
    this.adminSession = data.adminSession === true;
  }

  create() {
    setGamePhase('PLAYING');
    platform.gameplayStart();
    platform.updateLevel(getActIndex(this.actId) + 1);

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.backdrop = new CampaignBackdropView(this, this.actId, w, h);

    this.controller = new GameController(this.actId, this.dailySeed);
    const cfg = this.controller.state.actConfig;
    const laneY = cfg.collect.laneY ?? 220;

    this.hud = new GameHudView(this, w);
    this.collectLane = new CollectLaneView(this, w, laneY);
    this.columnView = new AssembleColumnView(
      this,
      cfg.assemble,
      () => this._onBottomUndo(),
      () => this._showToast(t('game.undo_only_bottom'))
    );
    this.poolView = new SegmentPoolView(this, cfg.assemble, (id) => this._onPoolSelect(id));
    this.ritualBtn = new RitualButtonView(this, w, h, {
      onDown: () => this._onRitualDown(),
      onUp: () => this._onRitualUp(),
    });

    this.toastText = this.add
      .text(w / 2, h * 0.5, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ffab91',
        stroke: '#1a1a1a',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setAlpha(0);

    this.selectedId = null;
    this.ended = false;
    this.briefingActive = true;
    this.butHelpActive = false;
    this._lastUiTap = 0;

    this.butOverlay = new ButHelpOverlay(this);

    this.chrome = new GameChromeView(this, {
      onMenu: () => this._requestMenu(),
      onPauseToggle: () => this._togglePause(),
      onMenuConfirmed: () => this._goMenu(),
      onButHelp: () => this._onButHelp(),
    });

    this.input.on('pointerdown', (ptr) => this._onPointerDown(ptr));

    wireSceneLang(this, () => this._refreshLang());

    this.events.once('shutdown', () => this._cleanup());

    const onBriefingDone = () => {
      this.briefingActive = false;
      this.briefing = null;
      bgmBus.requestTrack('collect');
      this._applyDebugShortcuts();
    };

    if (this.debugSkipBriefing) {
      this.briefingActive = false;
      bgmBus.requestTrack('collect');
      this._applyDebugShortcuts();
    } else {
      this.briefing = new ActBriefingView(this, this.actId, onBriefingDone);
    }
  }

  _applyDebugShortcuts() {
    if (!this.debugAutoWin) return;

    const state = this.controller.state;
    const chain = state.segmentSet.chain;
    state.inventory = [...chain];
    state.assemblePool = [];
    state.column = [...chain];
    state.collectedIds = new Set(chain.map((s) => s.id));
    state.correctCollects = chain.length;
    state.setPhase('RITUAL');
    this.ritualBtn.setVisible(true);
    this._showToast(t('toast.dev_auto'));

    this.time.delayedCall(500, () => {
      if (this.ended) return;
      const res = this.controller.ritual.holdEnd(
        state,
        this.controller.assemble,
        { forceComplete: true }
      );
      if (res.resolved) {
        this._handleEvents([
          {
            type: res.victory ? 'khac_nhap' : 'khac_xuat',
            firstBadIndex: res.firstBadIndex,
          },
        ]);
      }
      if (state.ended) {
        this._endGame(state.victory, res.firstBadIndex ?? null);
      }
    });
  }

  _cleanup() {
    this.briefing?.destroy();
    this.chrome?.destroy();
    this.hud?.destroy();
    this.collectLane?.destroy();
    this.columnView?.destroy();
    this.poolView?.destroy();
    this.ritualBtn?.destroy();
    this.toastText?.destroy();
    this.backdrop?.destroy();
    this.butOverlay?.destroy();
  }

  _pauseGame() {
    if (this.ended || this.briefingActive) return;
    this.chrome.showPauseOverlay();
    this.controller.setPaused(true);
    bgmBus.suspend();
  }

  _resumeFromPause() {
    this.chrome.hidePauseOverlay();
    if (!isSystemPaused()) {
      this.controller.setPaused(false);
      bgmBus.resumePlayback();
    }
  }

  _togglePause() {
    if (this.ended || this.briefingActive) return;
    if (this.chrome.confirmBg?.visible) return;
    if (this.chrome.userPaused) {
      this._resumeFromPause();
    } else {
      this._pauseGame();
    }
  }

  _requestMenu() {
    if (this.ended) return;
    if (!this.chrome.userPaused) {
      this._pauseGame();
    }
    this.chrome.showMenuConfirm();
  }

  _goMenu() {
    if (this.ended) return;
    this.ended = true;
    platform.gameplayStop();
    bgmBus.stop();
    setUserPaused(false);
    this.scene.stop('GameOverScene');
    if (this.adminSession) {
      setGamePhase('MENU');
      this.scene.start('AdminHubScene');
      return;
    }
    setGamePhase('MENU');
    this.scene.start('MenuScene');
  }

  _showToast(msg) {
    this.toastText.setText(msg);
    this.toastText.setAlpha(1);
    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      duration: 1600,
      delay: 600,
    });
  }

  _playUiTap() {
    const now = Date.now();
    if (now - this._lastUiTap < 50) return;
    this._lastUiTap = now;
    audioManager.playSfx('ui_tap');
  }

  /**
   * @param {Phaser.Input.Pointer} ptr
   */
  _onPointerDown(ptr) {
    if (this.briefingActive || this.ended || this.controller.paused || this.butHelpActive) return;
    if (this.chrome?.isOverlayOpen()) return;
    const state = this.controller.state;

    if (state.phase === 'COLLECT') {
      this._playUiTap();
      const { events } = this.controller.handleTap(ptr.x, ptr.y);
      this._handleEvents(events);
    }
  }

  _onPoolSelect(segmentId) {
    if (
      this.briefingActive ||
      this.controller.paused ||
      this.butHelpActive ||
      this.controller.state.phase !== 'ASSEMBLE'
    ) {
      return;
    }
    audioManager.playSfx('pool_pick');
    const { events } = this.controller.handlePoolSelect(segmentId);
    this.selectedId = null;
    this.poolView.clearHint();
    this.columnView.clearUndoHint();
    this._handleEvents(events);
  }

  _onBottomUndo() {
    if (this.briefingActive || this.ended || this.butHelpActive) return;
    const phase = this.controller.state.phase;
    if (phase !== 'ASSEMBLE' && phase !== 'RITUAL') return;
    this._playUiTap();
    const { events } = this.controller.handleColumnUndo();
    this.selectedId = null;
    this.poolView.clearHint();
    this.columnView.clearUndoHint();
    this._handleEvents(events);
  }

  _updateButHelpButton() {
    const state = this.controller.state;
    const show = state.phase === 'ASSEMBLE' && !this.briefingActive && !this.ended;
    this.chrome.updateButHelp(state.butHelpUsesLeft, show);
  }

  _onButHelp() {
    if (this.briefingActive || this.ended || this.butHelpActive || this.controller.paused) return;
    if (this.chrome.isOverlayOpen()) return;

    const res = this.controller.handleButHelp();
    if (!res.events.length) {
      if (res.reason === 'no_uses') this._showToast(t('toast.but_no_uses'));
      return;
    }
    this._handleEvents(res.events);
  }

  _startButHelp(ev) {
    this.butHelpActive = true;
    if (shouldPauseTimerDuringButHelp()) {
      this.controller.setButHelpFrozen(true);
    }

    this.poolView.clearHint();
    this.columnView.clearUndoHint();

    const hint = /** @type {{ kind: string, segmentId?: string }} */ (ev.hint);
    if (hint.kind === 'pool' && hint.segmentId) {
      this.poolView.highlightHint(hint.segmentId);
    } else if (hint.kind === 'undo') {
      this.columnView.pulseBottomSegment();
    }

    this.backdrop?.onButHelp();
    audioManager.playSfx('tap_ok');

    this.butOverlay.show({
      message: /** @type {string} */ (ev.message),
      kind: hint.kind,
      onDone: () => {
        this.butHelpActive = false;
        this.controller.setButHelpFrozen(false);
        this._updateButHelpButton();
      },
    });
    this._updateButHelpButton();
  }

  _refreshLang() {
    this.hud?.refreshLang();
    this.chrome?.refreshLang();
    this.collectLane?.refreshLang();
    this.poolView?.refreshLang();
    this.columnView?.refreshLang();
    this.ritualBtn?.refreshLang();
    this.briefing?.refreshLang();
    const state = this.controller?.state;
    if (state?.phase === 'ASSEMBLE') {
      this._updateButHelpButton();
    }
  }

  _syncAssembleViews() {
    const state = this.controller.state;
    this.columnView.sync(state);
    this.poolView.sync(state, null);
    if (state.phase !== 'RITUAL') {
      this.ritualBtn.setVisible(false);
    }
  }

  _onRitualDown() {
    if (this.controller.paused) return;
    this._playUiTap();
    this.controller.handleRitualDown();
  }

  _onRitualUp() {
    if (this.controller.paused) return;
    const res = this.controller.handleRitualUp();
    this._handleEvents(res.events);
    if (res.tooEarly) {
      this.ritualBtn.showHint(t('toast.ritual_early'));
      audioManager.playSfx('tap_bad');
    }
    if (res.ended) this._endGame(res.victory, res.firstBadIndex);
  }

  /**
   * @param {Array<{ type: string, [key: string]: unknown }>} events
   */
  _handleEvents(events) {
    for (const ev of events) {
      if (ev.type === 'collect_ok') audioManager.playSfx('tap_ok');
      if (ev.type === 'collect_bad') audioManager.playSfx('tap_bad');
      if (ev.type === 'snap') {
        audioManager.playSfx('snap');
        this.poolView.clearHint();
        this.columnView.clearUndoHint();
        this.columnView.pulseDropZone();
        this.cameras.main.flash(80, 200, 255, 120, false);
        this.backdrop?.onSnap();
        const st = this.controller.state;
        this.backdrop?.setColumnProgress(
          st.column.length / st.actConfig.assembleTarget
        );
      }
      if (ev.type === 'unsnap') {
        audioManager.playSfx('tap_ok');
        this.poolView.clearHint();
        this.columnView.clearUndoHint();
        this._showToast(t('toast.unsnap'));
        this._syncAssembleViews();
      }
      if (ev.type === 'wrong_joint') {
        audioManager.playSfx('tap_bad');
        this._showToast(t('toast.wrong_joint'));
      }
      if (ev.type === 'time_bonus') {
        const labelKey =
          ev.label === 'KHÉP LÓNG' || ev.label === 'GHÉP LÓNG'
            ? 'toast.bonus_assemble'
            : ev.label === 'KHẮC NHẬP'
              ? 'toast.bonus_ritual'
              : null;
        const label = labelKey ? t(labelKey) : String(ev.label ?? '');
        const sec = /** @type {number} */ (ev.seconds ?? 0);
        this._showToast(tFmt('toast.time_bonus', { sec, label }));
        this.cameras.main.flash(150, 120, 220, 100, false);
      }
      if (ev.type === 'phase' && ev.phase === 'ASSEMBLE') {
        bgmBus.requestTrack('assemble');
        this.ritualBtn.setVisible(false);
        this._updateButHelpButton();
      }
      if (ev.type === 'phase' && ev.phase === 'RITUAL') {
        this.ritualBtn.setVisible(true);
        this.chrome.updateButHelp(0, false);
      }
      if (ev.type === 'but_help') this._startButHelp(ev);
      if (ev.type === 'saboteur_drop' || ev.type === 'saboteur_decoy' || ev.type === 'saboteur_hud') {
        const key = ev.messageKey ?? 'saboteur.drop';
        this._showToast(t(/** @type {string} */ (key)));
        this.cameras.main.shake(100, 0.004);
      }
      if (ev.type === 'khac_nhap') {
        audioManager.playSfx('khacnhap');
        this.cameras.main.flash(280, 255, 235, 140);
      }
      if (ev.type === 'khac_xuat') audioManager.playSfx('khacxuat');
      if (ev.type === 'khac_xuat' && ev.firstBadIndex != null) {
        this.columnView.setBadHighlight(/** @type {number} */ (ev.firstBadIndex));
      }
    }
  }

  _endGame(victory, firstBadIndex) {
    if (this.ended) return;
    this.ended = true;
    platform.gameplayStop();
    platform.setHasCompletedRun(true);
    const state = this.controller.state;
    const score = state.score;
    platform.updateScore(score);
    platform.ping('game_over', { score });

    const delay = victory && this.actId === 'finale' ? 800 : victory ? 400 : 800;
    this.time.delayedCall(delay, () => {
      const payload = {
        overlay: true,
        victory,
        actId: this.actId,
        score,
        scoreBreakdown: state.scoreBreakdown,
        timeLeft: state.timeLeft,
        goldEarned: state.goldEarned,
        firstBadIndex: firstBadIndex ?? null,
        adminSession: this.adminSession,
        dailySeed: this.dailySeed,
      };

      if (victory && this.actId === 'finale') {
        this.scene.launch('FinaleCinematicScene', {
          overlay: true,
          dailySeed: this.dailySeed,
          gameOverPayload: payload,
        });
        return;
      }

      this.scene.launch('GameOverScene', payload);
    });
  }

  update(_t, deltaMs) {
    if (this.briefingActive || this.ended) return;

    if (!this.controller.paused && !this.butHelpActive) {
      const dt = deltaMs / 1000;
      const result = this.controller.update(dt);

      if (result.events?.length) this._handleEvents(result.events);

      if (result.ended && !this.ended) {
        this._endGame(result.victory, result.firstBadIndex);
      }
    }

    if (this.controller.paused) return;

    const state = this.controller.state;
    const hudHidden = this.controller.saboteur.isHudHidden();
    if (!hudHidden) {
      this.hud.sync(state);
      this.hud.timerText.setAlpha(1);
    } else {
      this.hud.timerText.setAlpha(0.85);
    }

    if (state.phase === 'COLLECT') {
      this.collectLane.sync(this.controller.collect);
      this.poolView.setAssembleUiVisible(false);
      this.chrome.updateButHelp(0, false);
    } else {
      this.collectLane.sync({ drifting: [] });
    }

    if (state.phase === 'ASSEMBLE' || state.phase === 'RITUAL') {
      this.selectedId = this.controller.assemble.selectedId;
      this.columnView.sync(state);
      this.poolView.sync(state, this.selectedId);
      this.backdrop?.setColumnProgress(
        state.column.length / state.actConfig.assembleTarget
      );
      if (state.phase === 'ASSEMBLE') this._updateButHelpButton();
    }

    if (state.phase === 'RITUAL') {
      this.ritualBtn.setVisible(true);
      const holdSec = state.actConfig.ritual.holdSec ?? 1.0;
      this.ritualBtn.setHoldProgress(Math.min(1, state.ritualHoldSec / holdSec));
    } else {
      this.ritualBtn.setVisible(false);
    }
  }
}
