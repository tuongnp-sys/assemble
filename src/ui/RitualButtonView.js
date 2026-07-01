import Phaser from 'phaser';
import { t } from '../core/i18n.js';

export class RitualButtonView {
  /**
   * @param {import('phaser').Scene} scene
   * @param {number} w
   * @param {number} h
   * @param {{ onDown: () => void, onUp: () => void }} handlers
   */
  constructor(scene, w, h, handlers) {
    this.scene = scene;
    this.handlers = handlers;
    this.depth = 18;
    this.visible = false;
    this._hintTimer = null;
    this._defaultHint = t('game.ritual_hold');

    this.bg = scene.add
      .rectangle(w / 2, h - 100, 220, 56, 0xb71c1c, 1)
      .setStrokeStyle(3, 0xffd54f, 1)
      .setDepth(this.depth)
      .setVisible(false);

    this.label = scene.add
      .text(w / 2, h - 100, t('game.ritual_btn'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#fff9c4',
      })
      .setOrigin(0.5)
      .setDepth(this.depth + 1)
      .setVisible(false);

    this.hint = scene.add
      .text(w / 2, h - 138, this._defaultHint, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#ffcc80',
        align: 'center',
        wordWrap: { width: w - 48 },
      })
      .setOrigin(0.5)
      .setDepth(this.depth)
      .setVisible(false);

    this.ring = scene.add
      .circle(w / 2, h - 100, 34, 0xffd54f, 0)
      .setStrokeStyle(3, 0xffd54f, 0.9)
      .setDepth(this.depth - 1)
      .setVisible(false);

    this._bindHold(this.bg);
    this._bindHold(this.label);
  }

  /**
   * @param {Phaser.GameObjects.GameObject} target
   */
  _bindHold(target) {
    target.setInteractive({ useHandCursor: true });
    target.on('pointerdown', () => this.handlers.onDown());
    target.on('pointerup', () => this.handlers.onUp());
  }

  setVisible(v) {
    this.visible = v;
    this.bg.setVisible(v);
    this.label.setVisible(v);
    this.hint.setVisible(v);
    this.ring.setVisible(v);
    if (v) this.resetHint();
  }

  resetHint() {
    if (this._hintTimer) {
      this._hintTimer.remove(false);
      this._hintTimer = null;
    }
    this.hint.setText(this._defaultHint);
    this.hint.setColor('#ffcc80');
  }

  /**
   * @param {string} msg
   */
  showHint(msg) {
    this.hint.setText(msg);
    this.hint.setColor('#ffab91');
    if (this._hintTimer) this._hintTimer.remove(false);
    this._hintTimer = this.scene.time.delayedCall(1400, () => {
      this._hintTimer = null;
      if (this.hint?.active) this.resetHint();
    });
  }

  /**
   * @param {number} progress 0..1
   */
  setHoldProgress(progress) {
    const scale = 1 + progress * 0.15;
    this.ring.setScale(scale);
    this.ring.setAlpha(0.4 + progress * 0.6);
    const prog = Math.max(0, Math.min(1, progress));
    const r = Math.floor(Phaser.Math.Linear(0xb7, 0x2e, prog));
    const g = Math.floor(Phaser.Math.Linear(0x1c, 0x7d, prog));
    const b = Math.floor(Phaser.Math.Linear(0x1c, 0x32, prog));
    this.bg.setFillStyle((r << 16) | (g << 8) | b, 1);
    if (prog >= 1) {
      this.hint.setText(t('game.ritual_carving'));
      this.hint.setColor('#a5d6a7');
    }
  }

  refreshLang() {
    this._defaultHint = t('game.ritual_hold');
    this.label?.setText(t('game.ritual_btn'));
    this.resetHint();
  }

  destroy() {
    if (this._hintTimer) this._hintTimer.remove(false);
    this.bg.destroy();
    this.label.destroy();
    this.hint.destroy();
    this.ring.destroy();
  }
}
