import Phaser from 'phaser';
import { audioManager } from './audio/AudioManager.js';
import { bgmBus } from './audio/BgmBus.js';
import { stopUnderlyingSceneAudio } from './audio/BgmController.js';
import { setGamePhase } from './gameSession.js';
import {
  getActChainCounts,
  HUNDRED_TOTAL,
  PRIOR_ACTS_JOIN_COUNT,
} from './core/campaignHundredChain.js';
import { unlockAchievement } from './core/achievementStorage.js';
import { getAchievementText } from './core/butHelpService.js';
import { burstFirework, startFireworksShow, scatterFlowerPath } from './ui/fireworksBurst.js';
import { t, tFmt } from './core/i18n.js';
import { wireSceneLang } from './ui/LangToggle.js';

const ACT_COLORS = {
  '1': 0x66bb6a,
  '2': 0x43a047,
  '3': 0x2e7d32,
  finale: 0x1b5e20,
};

const RICH_FRAMES = ['phuong', 'crowd', 'phuong', 'crowd'];

/** @type {Record<'phu'|'rich', { bg: number, bgAlpha: number, text: string, border: number, textStroke: string }>} */
const SPEECH_STYLE = {
  phu: { bg: 0x5d4037, bgAlpha: 0.92, text: '#fff9c4', border: 0xffd54f, textStroke: '#3e2723' },
  rich: { bg: 0x4a148c, bgAlpha: 0.9, text: '#f8bbd0', border: 0xff4081, textStroke: '#311b92' },
};

/**
 * Finale — ghép 100 đốt → đối đầu Phú ông & bọn phá đám → uyên ương.
 */
export class FinaleCinematicScene extends Phaser.Scene {
  constructor() {
    super('FinaleCinematicScene');
  }

  init(data) {
    this.dailySeed = data.dailySeed ?? 0;
    this.gameOverPayload = data.gameOverPayload ?? {};
    this.started = false;
    this.weddingStarted = false;
    /** @type {number} */
    this.confrontStep = 0;
    this._actionHandler = null;
  }

  create() {
    setGamePhase('GAMEOVER');
    stopUnderlyingSceneAudio(this);
    bgmBus.stop();
    bgmBus.ensureSfxUnlocked();

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.add.rectangle(w / 2, h / 2, w, h, 0x0a1628, 0.92).setDepth(0);

    this.add
      .image(w / 2, h * 0.18, 'game_assets', 'castle_mid')
      .setAlpha(0.5)
      .setScale(1.1)
      .setDepth(1);

    this.titleText = this.add
      .text(w / 2, h * 0.28, t('finale.success'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#fff9c4',
        stroke: '#2e7d32',
        strokeThickness: 3,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.quoteText = this.add
      .text(w / 2, h * 0.34, t('finale.quote_connect'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#c8e6c9',
        align: 'center',
        lineSpacing: 5,
        wordWrap: { width: w - 48 },
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.counterText = this.add
      .text(w / 2, h * 0.72, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#fff59d',
      })
      .setOrigin(0.5)
      .setDepth(12)
      .setAlpha(0);

    this.achievementText = this.add
      .text(w / 2, h * 0.82, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ffd54f',
        align: 'center',
        wordWrap: { width: w - 40 },
      })
      .setOrigin(0.5)
      .setDepth(12)
      .setAlpha(0);

    this.mergeZoneY = h * 0.52;
    this.columnX = w / 2;
    this.actBundles = [];
    this.fireworksHandle = null;
    this.fireworkBurstEvent = null;
    this.phuSprite = null;
    /** @type {Phaser.GameObjects.Image[]} */
    this.richSprites = [];
    /** @type {{ phu: Phaser.GameObjects.Container|null, rich: Phaser.GameObjects.Container|null }} */
    this._speechBySpeaker = { phu: null, rich: null };
    this.w = w;
    this.h = h;

    this._buildActBundles(w, h);
    this._buildActionButton(w, h);

    wireSceneLang(this, () =>
      this.scene.restart({
        dailySeed: this.dailySeed,
        gameOverPayload: this.gameOverPayload,
      })
    );

    audioManager.playSfx('khacnhap');
  }

  /**
   * @param {number} w
   * @param {number} h
   */
  _buildActBundles(w, h) {
    const counts = getActChainCounts();
    const slots = [
      { x: w * 0.18, y: h * 0.48 },
      { x: w * 0.38, y: h * 0.44 },
      { x: w * 0.62, y: h * 0.44 },
      { x: w * 0.82, y: h * 0.48 },
    ];

    counts.forEach((act, i) => {
      const slot = slots[i];
      const color = ACT_COLORS[act.actId] ?? 0x4caf50;

      const chip = this.add
        .rectangle(slot.x, slot.y, 52, 64, color, 0.85)
        .setStrokeStyle(2, 0xfff9c4, 0.9)
        .setDepth(5);

      const label = this.add
        .text(slot.x, slot.y - 8, act.label, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '18px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0.5)
        .setDepth(6);

      const sub = this.add
        .text(slot.x, slot.y + 14, t('common.segments'), {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '9px',
          color: '#e8f5e9',
        })
        .setOrigin(0.5)
        .setDepth(6);

      const mini = this._createMiniStack(slot.x, slot.y + 36, act.count, color);

      this.actBundles.push({ chip, label, sub, mini, actId: act.actId, count: act.count });
    });

    this.plusTexts = ['+', '+', '+'].map((sym, i) =>
      this.add
        .text((slots[i].x + slots[i + 1].x) / 2, h * 0.46, sym, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '16px',
          color: '#a5d6a7',
        })
        .setOrigin(0.5)
        .setDepth(6)
    );
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} count
   * @param {number} tint
   */
  _createMiniStack(x, y, count, tint) {
    const layers = Math.min(4, Math.max(2, Math.ceil(count / 10)));
    const parts = [];
    for (let i = 0; i < layers; i++) {
      const seg = this.add
        .image(x, y - i * 6, 'game_assets', 'segment_body')
        .setScale(0.35)
        .setTint(tint)
        .setDepth(4 + i);
      parts.push(seg);
    }
    return parts;
  }

  /**
   * @param {number} w
   * @param {number} h
   */
  _buildActionButton(w, h) {
    const btnY = h * 0.62;
    this.actionBg = this.add
      .rectangle(w / 2, btnY, 260, 48, 0x4a148c, 1)
      .setStrokeStyle(2, 0xfff9c4)
      .setDepth(25)
      .setInteractive({ useHandCursor: true });

    this.actionLabel = this.add
      .text(w / 2, btnY, t('finale.connect_btn'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fff9c4',
        align: 'center',
        wordWrap: { width: 240 },
      })
      .setOrigin(0.5)
      .setDepth(26);

    const fire = () => this._actionHandler?.();
    this.actionBg.on('pointerdown', fire);
    this.actionLabel.setInteractive({ useHandCursor: true });
    this.actionLabel.on('pointerdown', fire);

    this._actionHandler = () => this._onConnect();

    this.connectBg = this.actionBg;
    this.connectLabel = this.actionLabel;

    this._pulseTween = this.tweens.add({
      targets: [this.actionBg, this.actionLabel],
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * @param {string} labelKey
   * @param {number} fillColor
   * @param {number} strokeColor
   * @param {() => void} onClick
   */
  _setActionButton(labelKey, fillColor, strokeColor, onClick) {
    this._actionHandler = onClick;
    this.actionBg.setFillStyle(fillColor, 1);
    this.actionBg.setStrokeStyle(2, strokeColor);
    this.actionBg.setAlpha(1);
    this.actionLabel.setText(t(labelKey));
    this.actionBg.setInteractive({ useHandCursor: true });
    this.actionLabel.setInteractive({ useHandCursor: true });
    if (!this._pulseTween?.isPlaying()) {
      this._pulseTween = this.tweens.add({
        targets: [this.actionBg, this.actionLabel],
        scaleX: 1.04,
        scaleY: 1.04,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  _disableActionButton() {
    this._actionHandler = null;
    this.actionBg.disableInteractive();
    this.actionLabel.disableInteractive();
    this._pulseTween?.stop();
    this.actionBg.setScale(1);
    this.actionLabel.setScale(1);
  }

  _onConnect() {
    if (this.started || this.weddingStarted) return;
    this.started = true;

    this._disableActionButton();
    this.actionBg.setAlpha(0.4);
    this.actionLabel.setText(t('finale.connecting'));

    this.quoteText.setText(t('finale.carve'));

    for (const bundle of this.actBundles) {
      this.tweens.add({
        targets: [bundle.chip, bundle.label, bundle.sub, ...bundle.mini],
        x: this.columnX,
        y: this.mergeZoneY,
        alpha: 0.3,
        duration: 900,
        ease: 'Cubic.easeInOut',
        delay:
          bundle.actId === 'finale' ? 300 : bundle.actId === '3' ? 200 : bundle.actId === '2' ? 100 : 0,
      });
    }

    for (const plus of this.plusTexts) {
      this.tweens.add({ targets: plus, alpha: 0, duration: 400 });
    }

    bgmBus.requestTrack('finale_merge');

    this.time.delayedCall(950, () => this._playMergeFlash());
    this.time.delayedCall(1100, () => this._growHundredTree());
  }

  _playMergeFlash() {
    this.cameras.main.flash(400, 255, 245, 140);
    audioManager.playSfx('snap');

    for (const bundle of this.actBundles) {
      bundle.chip.setVisible(false);
      bundle.label.setVisible(false);
      bundle.sub.setVisible(false);
      for (const m of bundle.mini) m.setVisible(false);
    }

    this.glow = this.add
      .ellipse(this.columnX, this.mergeZoneY, 80, 200, 0xfff9c4, 0.25)
      .setDepth(8);

    this.treePillar = this.add
      .rectangle(this.columnX, this.mergeZoneY + 60, 36, 8, 0x2e7d32, 1)
      .setDepth(9)
      .setOrigin(0.5, 1);
  }

  _growHundredTree() {
    const targetH = 220;
    this.counterText.setAlpha(1);
    this.counterText.setText('40');

    const counter = { n: 40 };
    this.tweens.add({
      targets: counter,
      n: HUNDRED_TOTAL,
      duration: 2400,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        this.counterText.setText(String(Math.floor(counter.n)));
      },
    });

    this.tweens.add({
      targets: this.treePillar,
      displayHeight: targetH,
      duration: 2400,
      ease: 'Cubic.easeOut',
    });

    this.tweens.add({
      targets: this.glow,
      displayHeight: targetH + 40,
      displayWidth: 100,
      alpha: 0.45,
      duration: 2400,
    });

    this.time.delayedCall(400, () => {
      this._spawnJoinSparkles(PRIOR_ACTS_JOIN_COUNT);
    });

    this.time.delayedCall(2600, () => this._onHundredComplete());
  }

  /**
   * @param {number} count
   */
  _spawnJoinSparkles(count) {
    const samples = Math.min(8, count);
    for (let i = 0; i < samples; i++) {
      const x = this.columnX + Phaser.Math.Between(-90, 90);
      const y = this.mergeZoneY + Phaser.Math.Between(-30, 80);
      const spr = this.add
        .image(x, y, 'game_assets', 'segment_body')
        .setScale(0.45)
        .setAlpha(0.9)
        .setDepth(11);

      this.tweens.add({
        targets: spr,
        x: this.columnX,
        y: this.mergeZoneY - (i / samples) * 180,
        alpha: 0,
        scale: 0.2,
        duration: 600 + i * 80,
        ease: 'Quad.easeIn',
        onComplete: () => spr.destroy(),
      });
    }
  }

  _treeTopY() {
    const h = this.treePillar?.displayHeight ?? 220;
    return this.mergeZoneY + 60 - h;
  }

  _onHundredComplete() {
    const w = this.w;
    const h = this.h;

    this.cameras.main.flash(500, 255, 255, 200);
    audioManager.playSfx('khacnhap');

    this.titleText.setText(t('finale.hundred'));
    this.titleText.setY(h * 0.1);
    this.counterText.setY(h * 0.16);
    this.counterText.setFontSize(22);
    this.quoteText.setY(h * 0.21);

    if (this.treePillar) this.treePillar.setAlpha(0.85);
    if (this.glow) this.glow.setAlpha(0.3);

    this.actionBg.setVisible(true);
    this.actionLabel.setVisible(true);

    this.time.delayedCall(600, () => this._startConfrontation());
  }

  _startConfrontation() {
    const w = this.w;
    const h = this.h;
    const groundY = h * 0.78;
    const depth = 18;

    this.quoteText.setAlpha(0);
    bgmBus.requestTrack('finale_confront');

    this.groundY = groundY;
    this.phuHome = { x: w * 0.28, y: groundY, scale: 1.2 };
    this.phuSprite = this.add
      .image(this.phuHome.x, this.phuHome.y, 'game_assets', 'phu_ho')
      .setOrigin(0.5, 1)
      .setScale(this.phuHome.scale)
      .setDepth(depth + 2);

    const richHomes = [
      { x: w * 0.62, y: groundY },
      { x: w * 0.72, y: groundY - 4 },
      { x: w * 0.82, y: groundY },
      { x: w * 0.68, y: groundY + 2 },
    ];

    this.richSprites = richHomes.map((home, i) => {
      const scale = i % 2 === 0 ? 1.05 : 0.95;
      return this.add
        .image(home.x, home.y, 'game_assets', RICH_FRAMES[i])
        .setOrigin(0.5, 1)
        .setScale(scale)
        .setDepth(depth + 1)
        .setData('home', { ...home, scale });
    });

    this.confrontStep = -1;
    this._disableActionButton();
    this._runConfrontIntro();
  }

  _richBubbleX() {
    if (!this.richSprites?.length) return this.w * 0.72;
    return this.richSprites.reduce((sum, s) => sum + s.x, 0) / this.richSprites.length;
  }

  _hideSpeechBubble(speaker) {
    const b = this._speechBySpeaker[speaker];
    if (b) {
      b.destroy();
      this._speechBySpeaker[speaker] = null;
    }
  }

  _hideAllSpeechBubbles() {
    this._hideSpeechBubble('phu');
    this._hideSpeechBubble('rich');
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {string} textKey
   * @param {'phu'|'rich'} speaker
   * @param {{ wrap?: number, fontSize?: string, depth?: number }} [opts]
   */
  _showSpeechBubble(x, y, textKey, speaker, opts = {}) {
    this._hideSpeechBubble(speaker);
    const style = SPEECH_STYLE[speaker];
    const wrap = opts.wrap ?? 158;
    const fontSize = opts.fontSize ?? '15px';
    const depth = opts.depth ?? 24;

    const label = this.add
      .text(0, 0, t(textKey), {
        fontFamily: 'system-ui, sans-serif',
        fontSize,
        fontStyle: 'bold',
        color: style.text,
        align: 'center',
        wordWrap: { width: wrap },
        lineSpacing: 5,
        stroke: style.textStroke,
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    const padX = 14;
    const padY = 11;
    const bw = Math.min(this.w - 20, label.width + padX * 2);
    const bh = label.height + padY * 2;

    const bg = this.add
      .rectangle(0, 0, bw, bh, style.bg, style.bgAlpha)
      .setStrokeStyle(3, style.border, 1);

    const container = this.add.container(x, y, [bg, label]).setDepth(depth);
    const clampedX = Phaser.Math.Clamp(x, bw / 2 + 10, this.w - bw / 2 - 10);
    container.setPosition(clampedX, y);
    this._speechBySpeaker[speaker] = container;

    container.setScale(0.82).setAlpha(0);
    this.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 240,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: container,
      angle: 2.5,
      duration: 85,
      yoyo: true,
      repeat: 4,
      ease: 'Sine.easeInOut',
    });

    return container;
  }

  _runConfrontIntro() {
    const groundY = this.groundY;
    const richX = this._richBubbleX();

    this._showSpeechBubble(richX, groundY - 108, 'finale.confront.rich_refuse', 'rich', {
      fontSize: '16px',
    });

    this.time.delayedCall(2100, () => {
      this._showSpeechBubble(this.phuHome.x, groundY - 108, 'finale.confront.phu_refuse', 'phu', {
        fontSize: '16px',
      });
    });

    this.time.delayedCall(4200, () => {
      this.confrontStep = 2;
      this._setActionButton('finale.confront.btn_khacnhap_phu', 0x4a148c, 0xfff9c4, () =>
        this._onConfrontKhacnhapPhu()
      );
    });
  }

  _shakeTree() {
    this.cameras.main.shake(280, 0.004);
    if (this.treePillar) {
      this.tweens.add({
        targets: this.treePillar,
        angle: 2,
        duration: 80,
        yoyo: true,
        repeat: 3,
        onComplete: () => this.treePillar?.setAngle(0),
      });
    }
  }

  /**
   * @param {Phaser.GameObjects.Image} sprite
   * @param {number} tx
   * @param {number} ty
   * @param {() => void} [onDone]
   */
  _flyStick(sprite, tx, ty, onDone) {
    audioManager.playSfx('khacnhap');
    this.tweens.add({
      targets: sprite,
      x: tx,
      y: ty,
      scale: sprite.scale * 0.85,
      duration: 700,
      ease: 'Back.easeIn',
      onComplete: () => onDone?.(),
    });
  }

  /**
   * @param {Phaser.GameObjects.Image} sprite
   * @param {{ x: number, y: number, scale?: number }} home
   * @param {() => void} [onDone]
   */
  _flyRelease(sprite, home, onDone) {
    audioManager.playSfx('khacxuat');
    this.tweens.add({
      targets: sprite,
      x: home.x,
      y: home.y,
      scale: home.scale ?? sprite.scale,
      duration: 650,
      ease: 'Bounce.easeOut',
      onComplete: () => onDone?.(),
    });
  }

  _onConfrontKhacnhapPhu() {
    if (this.confrontStep !== 2) return;
    this.confrontStep = -1;
    this._disableActionButton();
    this._hideSpeechBubble('phu');

    const top = this._treeTopY();
    this._shakeTree();
    this._flyStick(this.phuSprite, this.columnX, top + 28, () => {
      this.confrontStep = 3;
      this.time.delayedCall(400, () => {
        this._setActionButton('finale.confront.btn_khacnhap_rich', 0x4a148c, 0xfff9c4, () =>
          this._onConfrontKhacnhapRich()
        );
      });
    });
  }

  _onConfrontKhacnhapRich() {
    if (this.confrontStep !== 3) return;
    this.confrontStep = -1;
    this._disableActionButton();
    this._hideSpeechBubble('rich');

    const top = this._treeTopY();
    const slots = [
      { x: this.columnX - 18, y: top + 58 },
      { x: this.columnX + 16, y: top + 42 },
      { x: this.columnX - 8, y: top + 78 },
      { x: this.columnX + 22, y: top + 64 },
    ];

    this._shakeTree();
    let done = 0;
    const onOne = () => {
      done += 1;
      if (done >= this.richSprites.length) {
        this.confrontStep = 4;
        this._showSpeechBubble(
          this.phuSprite.x - 58,
          this.phuSprite.y - 52,
          'finale.confront.phu_beg',
          'phu',
          { fontSize: '14px', wrap: 140 }
        );
        this.time.delayedCall(500, () => {
          this._setActionButton('finale.confront.btn_khacxuat_phu', 0x8b1a1a, 0xffccbc, () =>
            this._onConfrontKhacxuatPhu()
          );
        });
      }
    };

    this.richSprites.forEach((spr, i) => {
      this.time.delayedCall(i * 120, () => {
        this._flyStick(spr, slots[i].x, slots[i].y, onOne);
      });
    });
  }

  _onConfrontKhacxuatPhu() {
    if (this.confrontStep !== 4) return;
    this.confrontStep = -1;
    this._disableActionButton();
    this._hideSpeechBubble('phu');

    this._flyRelease(this.phuSprite, this.phuHome, () => {
      this.confrontStep = 5;
      const top = this._treeTopY();
      this._showSpeechBubble(
        this.columnX + 62,
        top + 36,
        'finale.confront.rich_beg',
        'rich',
        { fontSize: '14px', wrap: 148 }
      );
      this.time.delayedCall(500, () => {
        this._setActionButton('finale.confront.btn_khacxuat_rich', 0x8b1a1a, 0xffccbc, () =>
          this._onConfrontKhacxuatRich()
        );
      });
    });
  }

  _onConfrontKhacxuatRich() {
    if (this.confrontStep !== 5) return;
    this.confrontStep = -1;
    this._disableActionButton();
    this._hideSpeechBubble('rich');

    let done = 0;
    const onOne = () => {
      done += 1;
      if (done >= this.richSprites.length) {
        this.phuSprite?.setVisible(false);
        for (const s of this.richSprites) s.setVisible(false);
        this.time.delayedCall(400, () => this._startWeddingCelebration());
      }
    };

    this.richSprites.forEach((spr, i) => {
      const home = /** @type {{ x: number, y: number, scale: number }} */ (spr.getData('home'));
      this.time.delayedCall(i * 100, () => {
        this._flyRelease(spr, home, onOne);
      });
    });
  }

  _startWeddingCelebration() {
    if (this.weddingStarted) return;
    this.weddingStarted = true;

    this._hideAllSpeechBubbles();

    const w = this.w;
    const h = this.h;

    bgmBus.requestTrack('finale_wedding');

    this.fireworksHandle = startFireworksShow(this, w, h, {
      loop: true,
      intervalMs: 280,
      particles: 30,
      depth: 35,
    });

    const ach = getAchievementText('tre_master');
    const { isNew } = unlockAchievement('tre_master');
    this._achievementNew = isNew;

    this.quoteText.setAlpha(1);
    this.quoteText.setText(t('finale.wedding'));
    this.quoteText.setY(h * 0.17);

    if (this.treePillar) this.treePillar.setAlpha(0.35);
    if (this.glow) this.glow.setAlpha(0.2);

    this.butImg = this.add
      .image(w * 0.5, h * 0.08, 'game_assets', 'but')
      .setScale(0.2)
      .setDepth(36)
      .setAlpha(0);

    this.tweens.add({
      targets: this.butImg,
      alpha: 1,
      scale: 0.45,
      duration: 500,
      ease: 'Back.easeOut',
    });

    const achLine = isNew
      ? tFmt('finale.ach_new', { icon: ach.icon, title: ach.title, desc: ach.desc })
      : tFmt('finale.ach_have', { icon: ach.icon, title: ach.title });

    this.achievementText.setText(achLine);
    this.achievementText.setY(h * 0.3);
    this.achievementText.setAlpha(1);

    this.actionBg.setVisible(false);
    this.actionLabel.setVisible(false);

    this._startWeddingParade(w, h);
    this.time.delayedCall(4800, () => this._showExitButton());
  }

  /**
   * @param {number} w
   * @param {number} h
   */
  _startWeddingParade(w, h) {
    const walkY = h * 0.76;
    const pathDepth = 20;

    this.add
      .rectangle(w / 2, walkY + 8, w - 20, 32, 0x558b2f, 0.4)
      .setDepth(pathDepth - 1);

    scatterFlowerPath(this, w, walkY + 6, pathDepth);

    this.add
      .image(w * 0.08, walkY - 24, 'game_assets', 'crowd')
      .setScale(0.9)
      .setAlpha(0.7)
      .setDepth(pathDepth);

    this.add
      .image(w * 0.92, walkY - 22, 'game_assets', 'crowd')
      .setScale(0.85)
      .setFlipX(true)
      .setAlpha(0.7)
      .setDepth(pathDepth);

    this.coupleGlow = this.add
      .ellipse(w / 2, walkY - 8, 130, 70, 0xfff9c4, 0.22)
      .setDepth(pathDepth + 1)
      .setScale(0.3, 0.3)
      .setAlpha(0);

    this.coupleWalk = this.add
      .image(-90, walkY, 'game_assets', 'couple_wedding')
      .setOrigin(0.5, 1)
      .setScale(1.45)
      .setDepth(pathDepth + 3);

    this.tweens.add({
      targets: this.coupleGlow,
      scaleX: 1,
      scaleY: 1,
      alpha: 0.35,
      duration: 900,
      delay: 3200,
      ease: 'Sine.easeOut',
    });

    this.tweens.add({
      targets: this.coupleWalk,
      x: w / 2,
      duration: 4200,
      ease: 'Cubic.easeOut',
    });

    this.tweens.add({
      targets: this.coupleWalk,
      y: walkY - 5,
      duration: 420,
      delay: 4200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.fireworkBurstEvent = this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        if (!this.coupleWalk?.active) return;
        burstFirework(
          this,
          Phaser.Math.Between(30, w - 30),
          Phaser.Math.Between(40, h * 0.4),
          { depth: 34, particles: 22, radius: 90 }
        );
      },
    });
  }

  _showExitButton() {
    const w = this.w;
    const h = this.h;
    const btnY = h * 0.9;

    this.exitBg = this.add
      .rectangle(w / 2, btnY, 200, 44, 0x1b5e20, 1)
      .setStrokeStyle(2, 0xffd54f)
      .setDepth(40)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);

    this.exitLabel = this.add
      .text(w / 2, btnY, t('finale.exit_btn'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fff9c4',
      })
      .setOrigin(0.5)
      .setDepth(41)
      .setAlpha(0);

    const leave = () => this._goGameOver(this._achievementNew === true);
    this.exitBg.on('pointerdown', leave);
    this.exitLabel.setInteractive({ useHandCursor: true });
    this.exitLabel.on('pointerdown', leave);

    this.tweens.add({
      targets: [this.exitBg, this.exitLabel],
      alpha: 1,
      duration: 400,
      ease: 'Quad.easeOut',
    });

    this.tweens.add({
      targets: [this.exitBg, this.exitLabel],
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * @param {boolean} achievementNew
   */
  _goGameOver(achievementNew) {
    this.fireworkBurstEvent?.remove(false);
    this.fireworksHandle?.stop();
    this.scene.stop('FinaleCinematicScene');
    this.scene.launch('GameOverScene', {
      overlay: true,
      ...this.gameOverPayload,
      achievementUnlocked: achievementNew ? 'tre_master' : null,
      fromCinematic: true,
    });
  }
}
