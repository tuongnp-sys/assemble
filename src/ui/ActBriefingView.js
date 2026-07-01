import legend from '../data/content/legend.json';
import { getActDisplayName, getLegendText } from '../core/campaignProgress.js';
import { t } from '../core/i18n.js';
import { subscribeLangChange } from '../core/locale.js';

/**
 * Overlay briefing đầu mỗi act.
 */
export class ActBriefingView {
  /**
   * @param {import('phaser').Scene} scene
   * @param {string} actId
   * @param {() => void} onDone
   */
  constructor(scene, actId, onDone) {
    this.actId = actId;
    const w = scene.cameras.main.width;
    const h = scene.cameras.main.height;
    this.depth = 35;

    this.bg = scene.add
      .rectangle(w / 2, h / 2, w, h, 0x000000, 0.65)
      .setDepth(this.depth)
      .setInteractive();

    this.title = scene.add
      .text(w / 2, h * 0.28, getActDisplayName(actId), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#fff9c4',
      })
      .setOrigin(0.5)
      .setDepth(this.depth + 1);

    this.body = scene.add
      .text(w / 2, h * 0.38, getLegendText(legend, actId, 'briefing'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#e8f5e9',
        align: 'center',
        wordWrap: { width: w - 56 },
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0)
      .setDepth(this.depth + 1);

    this.hint = scene.add
      .text(w / 2, h * 0.72, t('game.briefing_tap'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#90caf9',
      })
      .setOrigin(0.5)
      .setDepth(this.depth + 1);

    this._unsub = subscribeLangChange(() => this.refreshLang());

    const dismiss = () => {
      if (this._done) return;
      this._done = true;
      this.destroy();
      onDone();
    };

    this.bg.on('pointerdown', dismiss);
    scene.time.delayedCall(2800, dismiss);
    this._done = false;
  }

  refreshLang() {
    this.title?.setText(getActDisplayName(this.actId));
    this.body?.setText(getLegendText(legend, this.actId, 'briefing'));
    this.hint?.setText(t('game.briefing_tap'));
  }

  destroy() {
    this._unsub?.();
    this.bg?.destroy();
    this.title?.destroy();
    this.body?.destroy();
    this.hint?.destroy();
  }
}
