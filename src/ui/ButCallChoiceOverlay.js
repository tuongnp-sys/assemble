import Phaser from 'phaser';
import { t } from '../core/i18n.js';

const DEPTH = 46;

/**
 * Chọn Chỉ lóng vs Ghép phép khi gọi Bụt.
 */
export class ButCallChoiceOverlay {
  /**
   * @param {import('phaser').Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.active = false;
  }

  /**
   * @param {object} opts
   * @param {boolean} opts.hint
   * @param {boolean} opts.ghep
   * @param {() => void} opts.onHint
   * @param {() => void} opts.onGhep
   * @param {() => void} [opts.onCancel]
   */
  show(opts) {
    if (this.active) return;
    this.active = true;
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;

    this.bg = this.scene.add
      .rectangle(w / 2, h / 2, w, h, 0x0a1628, 0.78)
      .setDepth(DEPTH)
      .setInteractive();

    this.butImg = this.scene.add
      .image(w / 2, h * 0.2, 'game_assets', 'but')
      .setDepth(DEPTH + 1)
      .setScale(0.26);

    this.title = this.scene.add
      .text(w / 2, h * 0.3, t('but_ghep.choice_title'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#fff9c4',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH + 2);

    const buttons = [];
    let y = h * 0.42;

    if (opts.hint) {
      const hintBtn = this._mkBtn(w / 2, y, t('but_ghep.choice_hint'), '#1b5e20', () => {
        this.hide();
        opts.onHint();
      });
      buttons.push(hintBtn);
      y += 52;
    }

    if (opts.ghep) {
      const ghepBtn = this._mkBtn(
        w / 2,
        y,
        t('but_ghep.choice_ghep'),
        '#4a148c',
        () => {
          this.hide();
          opts.onGhep();
        }
      );
      buttons.push(ghepBtn);

      this.penalty = this.scene.add
        .text(w / 2, y + 28, t('but_ghep.choice_penalty'), {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '10px',
          color: '#ef9a9a',
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(DEPTH + 2);
      y += 58;
    }

    this.cancelBtn = this._mkBtn(w / 2, y, t('but_ghep.choice_cancel'), '#37474f', () => {
      this.hide();
      opts.onCancel?.();
    });
    buttons.push(this.cancelBtn);

    this._buttons = buttons;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {string} label
   * @param {string} bg
   * @param {() => void} onClick
   */
  _mkBtn(x, y, label, bg, onClick) {
    const txt = this.scene.add
      .text(x, y, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fff',
        backgroundColor: bg,
        padding: { x: 14, y: 8 },
        align: 'center',
        wordWrap: { width: 260 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH + 3)
      .setInteractive({ useHandCursor: true });

    txt.on('pointerdown', onClick);
    return txt;
  }

  hide() {
    if (!this.active) return;
    this.active = false;
    const parts = [
      this.bg,
      this.butImg,
      this.title,
      this.penalty,
      this.cancelBtn,
      ...(this._buttons ?? []),
    ];
    for (const p of parts) {
      if (p?.active) p.destroy();
    }
    this.bg = null;
    this._buttons = null;
  }

  isActive() {
    return this.active;
  }

  destroy() {
    this.hide();
  }
}
