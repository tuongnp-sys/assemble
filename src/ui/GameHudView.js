import { t } from '../core/i18n.js';

/**
 * HUD — timer, phase, progress.
 */
export class GameHudView {
  /**
   * @param {import('phaser').Scene} scene
   * @param {number} w
   */
  constructor(scene, w) {
    this.scene = scene;
    this.depth = 15;

    this.timerText = scene.add
      .text(w / 2, 48, '75', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#fff9c4',
      })
      .setOrigin(0.5)
      .setDepth(this.depth);

    this.phaseText = scene.add
      .text(w / 2, 68, t('hud.phase_collect'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#a5d6a7',
      })
      .setOrigin(0.5)
      .setDepth(this.depth);

    this.progressText = scene.add
      .text(w / 2, 84, '0/10', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#90caf9',
      })
      .setOrigin(0.5)
      .setDepth(this.depth);

    this.barBg = scene.add
      .rectangle(w / 2, 100, w - 48, 8, 0x1b3d1b, 0.9)
      .setDepth(this.depth - 1);
    this.barFill = scene.add
      .rectangle(24, 100, 4, 6, 0x66bb6a, 1)
      .setOrigin(0, 0.5)
      .setDepth(this.depth);

    this._lastState = null;
  }

  /**
   * @param {import('../core/GameState.js').GameState} state
   */
  sync(state) {
    this._lastState = state;
    const sec = Math.ceil(state.timeLeft);
    this.timerText.setText(String(sec));
    this.timerText.setColor(sec <= 10 ? '#ef5350' : '#fff9c4');

    const phaseLabels = {
      COLLECT: t('hud.phase_collect'),
      ASSEMBLE: t('hud.phase_assemble'),
      RITUAL: t('hud.phase_ritual'),
      ENDED: '—',
      INTRO: '—',
    };
    this.phaseText.setText(phaseLabels[state.phase] ?? state.phase);

    let prog = 0;
    let label = '';
    if (state.phase === 'COLLECT') {
      prog = state.collectProgress;
      label = `${state.inventory.length}/${state.actConfig.assembleTarget}`;
    } else if (state.phase === 'ASSEMBLE' || state.phase === 'RITUAL') {
      prog = state.assembleProgress;
      label = `${state.column.length}/${state.actConfig.assembleTarget}`;
    }
    this.progressText.setText(label);

    const maxW = this.scene.cameras.main.width - 52;
    this.barFill.width = Math.max(4, maxW * Math.min(1, prog));
  }

  refreshLang() {
    if (this._lastState) this.sync(this._lastState);
  }

  destroy() {
    this.timerText.destroy();
    this.phaseText.destroy();
    this.progressText.destroy();
    this.barBg.destroy();
    this.barFill.destroy();
  }
}
