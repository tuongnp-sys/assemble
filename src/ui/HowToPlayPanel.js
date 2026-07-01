import Phaser from 'phaser';
import howToData from '../data/content/how-to-play.json';
import { getLang } from '../core/locale.js';
import { pickBilingual } from '../core/locale.js';
import { t } from '../core/i18n.js';
import { subscribeLangChange } from '../core/locale.js';

/**
 * Panel hướng dẫn 4 trang — swipe bằng nút ‹ ›.
 */
export class HowToPlayPanel {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} w
   * @param {number} h
   * @param {{ onBack: () => void, onStart?: () => void, showStart?: boolean }} opts
   */
  constructor(scene, w, h, opts) {
    this.scene = scene;
    this.w = w;
    this.h = h;
    this.opts = opts;
    this.pageIndex = 0;
    this.lang = getLang();
    /** @type {Phaser.GameObjects.GameObject[]} */
    this._pageObjects = [];

    const panelH = h * 0.72;
    const panelTop = h / 2 - panelH / 2;

    this.panelBg = scene.add
      .rectangle(w / 2, h / 2, w - 20, panelH, 0x1a2e1a, 0.95)
      .setStrokeStyle(3, 0xffd54f, 1)
      .setDepth(25);

    this.titleText = scene.add
      .text(w / 2, panelTop + 14, this._t(howToData.title), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#fff9c4',
      })
      .setOrigin(0.5, 0)
      .setDepth(26);

    this.introText = scene.add
      .text(w / 2, panelTop + 42, this._t(howToData.intro), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#c8e6c9',
        align: 'center',
        wordWrap: { width: w - 56 },
      })
      .setOrigin(0.5, 0)
      .setDepth(26);

    this.contentY = panelTop + 100;

    const btnY = panelTop + panelH - 32;
    const dotsY = btnY - 40;
    const navY = dotsY - 34;

    this.prevBtn = scene.add
      .text(36, navY, '‹', {
        fontSize: '28px',
        color: '#a5d6a7',
      })
      .setInteractive({ useHandCursor: true })
      .setDepth(26);

    this.nextBtn = scene.add
      .text(w - 36, navY, '›', {
        fontSize: '28px',
        color: '#a5d6a7',
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(26);

    this.pageLabel = scene.add
      .text(w / 2, navY + 4, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#90caf9',
      })
      .setOrigin(0.5, 0)
      .setDepth(26);

    this._dots = [];
    const pages = howToData.pages;
    const dotSpan = (pages.length - 1) * 16;
    for (let i = 0; i < pages.length; i++) {
      const dot = scene.add
        .circle(w / 2 - dotSpan / 2 + i * 16, dotsY, 5, 0x4caf50, 0.5)
        .setDepth(28);
      this._dots.push(dot);
    }

    this.prevBtn.on('pointerdown', () => this._goPage(this.pageIndex - 1));
    this.nextBtn.on('pointerdown', () => this._goPage(this.pageIndex + 1));

    if (opts.showStart !== false && opts.onStart) {
      this.startBg = scene.add
        .rectangle(w / 2, btnY, 200, 44, 0x2e7d32, 1)
        .setStrokeStyle(2, 0xa5d6a7)
        .setInteractive({ useHandCursor: true })
        .setDepth(27);

      this.startLabel = scene.add
        .text(w / 2, btnY, t('howto.start'), {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '16px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0.5)
        .setDepth(28);

      this.startBg.on('pointerdown', () => opts.onStart?.());
      this.startLabel.setInteractive({ useHandCursor: true });
      this.startLabel.on('pointerdown', () => opts.onStart?.());
    }

    this._renderPage();

    this._unsub = subscribeLangChange(() => this.refreshLang());
  }

  /**
   * @param {{ vi: string, en: string }} obj
   */
  _t(obj) {
    return pickBilingual(obj);
  }

  refreshLang() {
    this.lang = getLang();
    this.titleText.setText(this._t(howToData.title));
    this.introText.setText(this._t(howToData.intro));
    this.startLabel?.setText(t('howto.start'));
    this._renderPage();
  }

  _goPage(idx) {
    const max = howToData.pages.length - 1;
    this.pageIndex = Phaser.Math.Clamp(idx, 0, max);
    this._renderPage();
  }

  _renderPage() {
    for (const o of this._pageObjects) o.destroy();
    this._pageObjects = [];

    const page = howToData.pages[this.pageIndex];
    const w = this.w;

    const badge = this.scene.add
      .circle(w / 2, this.contentY, 18, 0x2e7d32, 1)
      .setStrokeStyle(2, 0xffd54f)
      .setDepth(26);
    const badgeTxt = this.scene.add
      .text(w / 2, this.contentY, page.icon, {
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fff9c4',
      })
      .setOrigin(0.5)
      .setDepth(27);

    const heading = this.scene.add
      .text(w / 2, this.contentY + 32, this._t(page.heading), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#fff9c4',
      })
      .setOrigin(0.5, 0)
      .setDepth(26);

    const body = this.scene.add
      .text(w / 2, this.contentY + 58, this._t(page.body), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#e8f5e9',
        align: 'center',
        lineSpacing: 4,
        wordWrap: { width: w - 56 },
      })
      .setOrigin(0.5, 0)
      .setDepth(26);

    this._pageObjects.push(badge, badgeTxt, heading, body);

    this.pageLabel.setText(`${this.pageIndex + 1} / ${howToData.pages.length}`);
    for (let i = 0; i < this._dots.length; i++) {
      this._dots[i].setFillStyle(i === this.pageIndex ? 0xffd54f : 0x4caf50, i === this.pageIndex ? 1 : 0.45);
    }
    this.prevBtn.setAlpha(this.pageIndex === 0 ? 0.35 : 1);
    this.nextBtn.setAlpha(this.pageIndex === howToData.pages.length - 1 ? 0.35 : 1);
  }

  destroy() {
    this._unsub?.();
    for (const o of this._pageObjects) o.destroy();
    this.panelBg.destroy();
    this.titleText.destroy();
    this.introText.destroy();
    this.prevBtn.destroy();
    this.nextBtn.destroy();
    this.pageLabel.destroy();
    for (const d of this._dots) d.destroy();
    this.startBg?.destroy();
    this.startLabel?.destroy();
  }
}
