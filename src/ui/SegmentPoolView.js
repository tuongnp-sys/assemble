import { createSegmentContainer } from './segmentVisual.js';
import { t } from '../core/i18n.js';

/**
 * Kho lóng — chạm chọn, chạm cột để ghép.
 */
export class SegmentPoolView {
  /**
   * @param {import('phaser').Scene} scene
   * @param {object} assembleConfig
   * @param {(segmentId: string) => void} onSelect
   */
  constructor(scene, assembleConfig, onSelect) {
    this.scene = scene;
    this.poolY = assembleConfig.poolY ?? 680;
    this.onSelect = onSelect;
    this.depth = 12;
    this.selectedId = null;
    this.hintSegmentId = null;
    this.hintTween = null;

    const w = scene.cameras.main.width;
    this.poolBg = scene.add
      .rectangle(w / 2, this.poolY, w - 24, 100, 0x263238, 0.75)
      .setStrokeStyle(1, 0x546e7a, 0.8)
      .setDepth(11)
      .setVisible(false);

    this.hintText = scene.add
      .text(w / 2, this.poolY - 58, t('game.pool_hint'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#b0bec5',
      })
      .setOrigin(0.5)
      .setDepth(this.depth)
      .setVisible(false);

    /** @type {Map<string, Phaser.GameObjects.Container>} */
    this.sprites = new Map();
    this.dragGhost = null;
  }

  /** @param {boolean} visible */
  setAssembleUiVisible(visible) {
    this.poolBg.setVisible(visible);
    this.hintText.setVisible(visible);
    if (!visible) {
      for (const spr of this.sprites.values()) spr.setVisible(false);
    }
  }

  /**
   * @param {import('../core/GameState.js').GameState} state
   * @param {string|null} selectedId
   */
  sync(state, selectedId) {
    this.selectedId = selectedId;
    this.poolBg.setVisible(true);
    this.hintText.setVisible(true);
    const w = this.scene.cameras.main.width;
    const pool = state.assemblePool;
    const spacing = Math.min(48, (w - 40) / Math.max(pool.length, 1));
    const startX = w / 2 - ((pool.length - 1) * spacing) / 2;

    const alive = new Set();
    pool.forEach((seg, i) => {
      alive.add(seg.id);
      const x = startX + i * spacing;
      let spr = this.sprites.get(seg.id);
      if (!spr) {
        spr = createSegmentContainer(this.scene, x, this.poolY, seg, {
          scale: 0.95,
          depth: this.depth,
          interactive: true,
        });
        const body = spr.list[0];
        body.on('pointerdown', () => this.onSelect(seg.id));
        this.sprites.set(seg.id, spr);
      }
      spr.setPosition(x, this.poolY);
      spr.setVisible(true);
      const selected = seg.id === selectedId;
      const isHint = seg.id === this.hintSegmentId;
      spr.setScale(selected ? 1.08 : isHint ? 1.12 : 0.95);
      spr.setAlpha(selected || isHint ? 1 : 0.88);
      spr.list.forEach((c) => {
        if (!c.setStrokeStyle) return;
        if (selected) c.setStrokeStyle(2, 0xffd54f, 1);
        else if (isHint) c.setStrokeStyle(3, 0xfff176, 1);
        else c.setStrokeStyle(1, 0x2e7d32, 0.6);
      });
      if (isHint) this._ensureHintTween(spr);
    });

    for (const [id, spr] of this.sprites) {
      if (!alive.has(id)) {
        spr.destroy();
        this.sprites.delete(id);
      }
    }
  }

  refreshLang() {
    this.hintText?.setText(t('game.pool_hint'));
  }

  highlightHint(segmentId) {
    this.hintSegmentId = segmentId;
  }

  clearHint() {
    this.hintSegmentId = null;
    if (this.hintTween) {
      this.hintTween.stop();
      this.hintTween.remove();
      this.hintTween = null;
    }
  }

  /**
   * @param {Phaser.GameObjects.Container} spr
   */
  _ensureHintTween(spr) {
    if (this.hintTween?.targets?.includes(spr)) return;
    if (this.hintTween) {
      this.hintTween.stop();
      this.hintTween.remove();
    }
    this.hintTween = this.scene.tweens.add({
      targets: spr,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  showDragGhost(segment, x, y) {
    this.hideDragGhost();
    this.dragGhost = createSegmentContainer(this.scene, x, y, segment, {
      scale: 1.1,
      depth: 20,
    });
    this.dragGhost.setAlpha(0.85);
  }

  moveDragGhost(x, y) {
    this.dragGhost?.setPosition(x, y);
  }

  hideDragGhost() {
    if (this.dragGhost) {
      this.dragGhost.destroy();
      this.dragGhost = null;
    }
  }

  destroy() {
    this.clearHint();
    this.hideDragGhost();
    for (const spr of this.sprites.values()) spr.destroy();
    this.sprites.clear();
    this.poolBg.destroy();
    this.hintText.destroy();
  }
}
