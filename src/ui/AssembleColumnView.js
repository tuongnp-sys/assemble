import { createSegmentContainer } from './segmentVisual.js';
import { t, tFmt } from '../core/i18n.js';

/** Khoảng cách giữa các lóng — đủ chỗ cho mắt nối không bị che. */
const SEGMENT_GAP = 14;

/**
 * Cột ghép — viewport cố định, chỉ hiện N lóng cuối (tránh tràn màn).
 */
export class AssembleColumnView {
  /**
   * @param {import('phaser').Scene} scene
   * @param {object} assembleConfig
   * @param {() => void} onBottomTap
   * @param {() => void} [onUpperTap]
   */
  constructor(scene, assembleConfig, onBottomTap, onUpperTap) {
    this.scene = scene;
    this.columnX = assembleConfig.columnX ?? 187;
    this.segmentHeight = assembleConfig.segmentHeight ?? 28;
    this.maxVisible = assembleConfig.maxVisibleOnColumn ?? 7;
    this.viewportTopY = assembleConfig.viewportTopY ?? 118;
    this.viewportBottomY = assembleConfig.viewportBottomY ?? 400;
    this.depth = 11;
    this.onBottomTap = onBottomTap;
    this.onUpperTap = onUpperTap ?? (() => {});
    const labelX = this.columnX + 58;

    const vpH = this.viewportBottomY - this.viewportTopY;
    this.segmentStep = Math.min(
      this.segmentHeight + SEGMENT_GAP,
      Math.floor(vpH / Math.max(this.maxVisible, 1))
    );
    this.dropY = this.viewportBottomY - 18;

    this.columnBg = scene.add
      .rectangle(
        this.columnX,
        (this.viewportTopY + this.viewportBottomY) / 2,
        84,
        vpH + 8,
        0x1a2e1a,
        0.45
      )
      .setStrokeStyle(2, 0x4caf50, 0.5)
      .setDepth(10);

    this.stumpGfx = scene.add
      .rectangle(this.columnX, this.viewportBottomY + 6, 64, 14, 0x3d5c2e, 0.9)
      .setStrokeStyle(1, 0x6abf4b, 0.6)
      .setDepth(10)
      .setVisible(false);

    this.buriedText = scene.add
      .text(labelX, this.viewportBottomY + 4, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '9px',
        color: '#a5d6a7',
      })
      .setOrigin(0, 0.5)
      .setDepth(12)
      .setVisible(false);

    this.columnTitle = scene.add
      .text(this.columnX, this.viewportTopY + 10, t('game.column_title'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        color: '#81c784',
      })
      .setOrigin(0.5, 0)
      .setDepth(16);

    this.dropZone = scene.add
      .rectangle(this.columnX, this.dropY, 72, 34, 0x4caf50, 0.14)
      .setStrokeStyle(2, 0xffd54f, 0.8)
      .setDepth(11);

    this.dropHint = scene.add
      .text(labelX, this.dropY, t('game.drop_wait'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '9px',
        color: '#ffd54f',
        align: 'left',
        lineSpacing: 2,
      })
      .setOrigin(0, 0.5)
      .setDepth(12);

    /** @type {Phaser.GameObjects.Container[]} */
    this.placed = [];
    /** @type {import('../core/SegmentTypes.js').BambooSegment[]} */
    this._lastSegments = [];
    this.highlightBadIndex = null;
    this.undoHintTween = null;
    this._lastBuried = 0;
    this._hasColumn = false;
    this.labelX = labelX;
    this._assembleUiVisible = false;
    this.setAssembleUiVisible(false);
  }

  /**
   * @param {{ columnX: number, viewportTopY: number, viewportBottomY: number }} layout
   */
  applyLayout(layout) {
    this.columnX = layout.columnX;
    this.labelX = this.columnX + 58;
    this.viewportTopY = layout.viewportTopY;
    this.viewportBottomY = layout.viewportBottomY;

    const vpH = this.viewportBottomY - this.viewportTopY;
    this.segmentStep = Math.min(
      this.segmentHeight + SEGMENT_GAP,
      Math.floor(vpH / Math.max(this.maxVisible, 1))
    );
    this.dropY = this.viewportBottomY - 18;

    this.columnBg.setPosition(this.columnX, (this.viewportTopY + this.viewportBottomY) / 2);
    this.columnBg.setSize(84, vpH + 8);

    this.stumpGfx.setPosition(this.columnX, this.viewportBottomY + 6);
    this.buriedText.setPosition(this.labelX, this.viewportBottomY + 4);
    this.columnTitle.setPosition(this.columnX, this.viewportTopY + 10);
    this.dropZone.setPosition(this.columnX, this.dropY);
    this.dropHint.setPosition(this.labelX, this.dropY);
  }

  /** @param {boolean} visible */
  setAssembleUiVisible(visible) {
    this._assembleUiVisible = visible;
    this.columnBg.setVisible(visible);
    this.columnTitle.setVisible(visible);
    this.dropZone.setVisible(visible);
    this.dropHint.setVisible(visible);
    if (!visible) {
      this.stumpGfx.setVisible(false);
      this.buriedText.setVisible(false);
      for (const s of this.placed) s.setVisible(false);
    }
  }

  refreshLang() {
    this.columnTitle?.setText(t('game.column_title'));
    if (this._lastBuried > 0) {
      this.buriedText?.setText(tFmt('game.buried', { n: this._lastBuried }));
    }
    this.dropHint?.setText(
      this._hasColumn ? t('game.drop_undo') : t('game.drop_wait')
    );
  }

  /**
   * @param {number} colIndex absolute index in column
   * @param {number} start first visible index
   * @param {number} visibleCount
   */
  _yForIndex(colIndex, start, visibleCount) {
    const vi = colIndex - start;
    return this.dropY - (visibleCount - 1 - vi) * this.segmentStep;
  }

  /**
   * @param {import('../core/GameState.js').GameState} state
   */
  sync(state) {
    if (!this._assembleUiVisible) return;

    const total = state.column.length;
    const start = Math.max(0, total - this.maxVisible);
    const visibleCount = total - start;
    const buried = start;

    this._lastBuried = buried;
    this._hasColumn = total > 0;
    this.stumpGfx.setVisible(buried > 0);
    if (buried > 0) {
      this.buriedText.setVisible(true);
      this.buriedText.setText(tFmt('game.buried', { n: buried }));
    } else {
      this.buriedText.setVisible(false);
    }

    if (total > 0) {
      this.dropHint.setY(this.dropY);
      this.dropHint.setText(t('game.drop_undo'));
    } else {
      this.dropHint.setY(this.dropY);
      this.dropHint.setText(t('game.drop_wait'));
    }

    this.dropZone.setY(this.dropY);

    while (this.placed.length > visibleCount) {
      const s = this.placed.pop();
      s.destroy();
    }

    for (let vi = 0; vi < visibleCount; vi++) {
      const colIndex = start + vi;
      const seg = state.column[colIndex];
      const y = this._yForIndex(colIndex, start, visibleCount);
      const isBottom = colIndex === total - 1;

      if (vi < this.placed.length) {
        this.placed[vi].setPosition(this.columnX, y);
        this.placed[vi].setDepth(this.depth + vi * 2);
        const bad = this.highlightBadIndex === colIndex;
        this.placed[vi].setAlpha(bad ? 0.92 : 1);
        this.placed[vi].list.forEach((c) => {
          if (c.setTint) c.setTint(bad ? 0xff5252 : 0xffffff);
        });
        this._wireBottomTap(this.placed[vi], isBottom);
      } else {
        const spr = createSegmentContainer(this.scene, this.columnX, y, seg, {
          scale: visibleCount > 5 ? 0.92 : 1.02,
          depth: this.depth + vi * 2,
        });
        this._wireBottomTap(spr, isBottom);
        this.placed.push(spr);
      }
    }

    this._lastSegments = [...state.column];
  }

  /**
   * @param {Phaser.GameObjects.Container} spr
   * @param {boolean} isBottom
   */
  _wireBottomTap(spr, isBottom) {
    const body = spr.list[0];
    if (!body?.setInteractive) return;
    body.removeAllListeners('pointerdown');
    body.setInteractive({ useHandCursor: isBottom });
    body.on('pointerdown', (_pointer, _lx, _ly, event) => {
      event?.stopPropagation();
      if (isBottom) {
        this.onBottomTap();
      } else {
        this.onUpperTap();
      }
    });
  }

  /** @param {number|null} idx */
  setBadHighlight(idx) {
    this.highlightBadIndex = idx;
  }

  pulseDropZone() {
    this.scene.tweens.add({
      targets: this.dropZone,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 120,
      yoyo: true,
    });
  }

  pulseBottomSegment() {
    this.clearUndoHint();
    const bottom = this.placed[this.placed.length - 1];
    if (!bottom) return;
    this.undoHintTween = this.scene.tweens.add({
      targets: bottom,
      scaleX: 1.14,
      scaleY: 1.14,
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  clearUndoHint() {
    if (this.undoHintTween) {
      this.undoHintTween.stop();
      this.undoHintTween.remove();
      this.undoHintTween = null;
    }
  }

  /** Tiến độ 0..1 — cho parallax nền */
  getColumnProgress(state) {
    const t = state.actConfig.assembleTarget || 1;
    return Math.min(1, state.column.length / t);
  }

  destroy() {
    this.clearUndoHint();
    for (const s of this.placed) s.destroy();
    this.placed = [];
    this.dropZone.destroy();
    this.dropHint.destroy();
    this.columnTitle.destroy();
    this.columnBg.destroy();
    this.stumpGfx.destroy();
    this.buriedText.destroy();
  }
}
