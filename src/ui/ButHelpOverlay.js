import Phaser from 'phaser';
import { getButHelpOverlaySec } from '../core/butHelpService.js';
import { t } from '../core/i18n.js';

const DEPTH = 45;

/**
 * Overlay cứu giúp — Bụt chỉ bài lóng đúng.
 */
export class ButHelpOverlay {
  /**
   * @param {import('phaser').Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this._timer = null;
  }

  /**
   * @param {object} opts
   * @param {string} opts.message
   * @param {() => void} opts.onDone
   */
  show(opts) {
    if (this.active) return;
    this.active = true;
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;
    const duration = (opts.durationSec ?? getButHelpOverlaySec()) * 1000;

    this.bg = this.scene.add
      .rectangle(w / 2, h / 2, w, h, 0x0a1628, 0.72)
      .setDepth(DEPTH);

    this.butImg = this.scene.add
      .image(w / 2, h * 0.22, 'game_assets', 'but')
      .setDepth(DEPTH + 1)
      .setScale(0.3)
      .setAlpha(0);

    this.glow = this.scene.add
      .circle(w / 2, h * 0.22, 48, 0xfff9c4, 0.15)
      .setDepth(DEPTH)
      .setScale(0.5)
      .setAlpha(0);

    this.quote = this.scene.add
      .text(w / 2, h * 0.34, opts.message, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fff9c4',
        align: 'center',
        wordWrap: { width: w - 56 },
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH + 2)
      .setAlpha(0);

    this.hintSub = this.scene.add
      .text(w / 2, h * 0.48, t('but_help.overlay_pool'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#90caf9',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH + 2)
      .setAlpha(0)
      .setVisible(opts.kind === 'pool');

    if (opts.kind === 'undo') {
      this.hintSub.setText(t('but_help.overlay_undo'));
      this.hintSub.setVisible(true);
    } else if (opts.kind === 'ghep') {
      this.hintSub.setText(t('but_ghep.overlay_sub'));
      this.hintSub.setVisible(true);
    }

    this.scene.cameras.main.flash(200, 255, 235, 120, false);

    this.scene.tweens.add({
      targets: [this.butImg, this.glow],
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 380,
      ease: 'Back.easeOut',
    });
    this.scene.tweens.add({
      targets: this.quote,
      alpha: 1,
      duration: 300,
      delay: 200,
    });
    this.scene.tweens.add({
      targets: this.hintSub,
      alpha: 1,
      duration: 280,
      delay: 350,
    });

    this._timer = this.scene.time.delayedCall(duration, () => this.hide(opts.onDone));
  }

  /**
   * @param {() => void} [onDone]
   */
  hide(onDone) {
    if (!this.active) return;
    this.active = false;
    if (this._timer) {
      this._timer.remove(false);
      this._timer = null;
    }
    const parts = [this.bg, this.butImg, this.glow, this.quote, this.hintSub];
    for (const p of parts) {
      if (p?.active) p.destroy();
    }
    this.bg = null;
    onDone?.();
  }

  isActive() {
    return this.active;
  }

  destroy() {
    this.hide();
  }
}
