import { createSegmentContainer } from './segmentVisual.js';
import { t } from '../core/i18n.js';

/**
 * Lane collect — hiển thị lóng trôi.
 */
export class CollectLaneView {
  /**
   * @param {import('phaser').Scene} scene
   * @param {number} w
   * @param {number} laneY
   */
  constructor(scene, w, laneY) {
    this.scene = scene;
    this.laneY = laneY;
    this.depth = 9;

    this.laneBg = scene.add
      .rectangle(w / 2, laneY, w - 32, 56, 0x2e5a3a, 0.45)
      .setStrokeStyle(1, 0x4caf50, 0.5)
      .setDepth(8);

    this.hintText = scene.add
      .text(w / 2, laneY - 42, t('game.collect_hint'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#c8e6c9',
      })
      .setOrigin(0.5)
      .setDepth(this.depth);

    /** @type {Map<string, Phaser.GameObjects.Container>} */
    this.sprites = new Map();
  }

  /**
   * @param {number} w
   * @param {{ collectLaneY: number }} layout
   */
  applyLayout(w, layout) {
    this.laneY = layout.collectLaneY;
    this.laneBg.setPosition(w / 2, this.laneY);
    this.laneBg.setSize(w - 32, 56);
    this.hintText.setPosition(w / 2, this.laneY - 42);
  }

  /**
   * @param {import('../core/CollectEngine.js').CollectEngine} engine
   */
  sync(engine) {
    const alive = new Set();
    for (const d of engine.drifting) {
      alive.add(d.id);
      let spr = this.sprites.get(d.id);
      if (!spr) {
        spr = createSegmentContainer(this.scene, d.x, d.y, d.segment, {
          scale: 1.15,
          depth: this.depth,
        });
        this.sprites.set(d.id, spr);
      }
      spr.setPosition(d.x, d.y);
    }
    for (const [id, spr] of this.sprites) {
      if (!alive.has(id)) {
        spr.destroy();
        this.sprites.delete(id);
      }
    }
  }

  refreshLang() {
    this.hintText?.setText(t('game.collect_hint'));
  }

  destroy() {
    this.hintText?.destroy();
    this.laneBg?.destroy();
    for (const spr of this.sprites.values()) spr.destroy();
    this.sprites.clear();
  }
}
