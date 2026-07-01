import Phaser from 'phaser';
import { getActIndex } from '../core/actConfig.js';

/**
 * Nền campaign — lâu đài, đám đông, nhân vật theo act.
 */
export class CampaignBackdropView {
  /**
   * @param {import('phaser').Scene} scene
   * @param {string} actId
   * @param {number} w
   * @param {number} h
   */
  constructor(scene, actId, w, h) {
    this.scene = scene;
    this.w = w;
    this.h = h;
    this.actIdx = getActIndex(actId);
    this.depthBase = 0;

    this.sky = scene.add
      .rectangle(w / 2, h * 0.32, w, h * 0.55, 0x1a3d2e, 0)
      .setDepth(0);

    this.hills = scene.add
      .image(w / 2, h * 0.78, 'game_assets', 'bg_hill')
      .setDisplaySize(w, 200)
      .setDepth(1);

    this.castleFar = scene.add
      .image(w / 2, h * 0.22, 'game_assets', 'castle_far')
      .setDepth(2)
      .setAlpha(this.actIdx >= 1 ? 0.45 : 0.2)
      .setScale(this.actIdx >= 3 ? 1.15 : 0.95);

    this.castleMid = scene.add
      .image(w / 2, h * 0.28, 'game_assets', 'castle_mid')
      .setDepth(3)
      .setAlpha(this.actIdx >= 1 ? 0.7 : 0)
      .setScale(1.05);

    this.crowdLeft = scene.add
      .image(w * 0.12, h * 0.62, 'game_assets', 'crowd')
      .setDepth(4)
      .setAlpha(this._crowdAlpha())
      .setScale(1.1);

    this.crowdRight = scene.add
      .image(w * 0.88, h * 0.64, 'game_assets', 'crowd')
      .setDepth(4)
      .setAlpha(this._crowdAlpha())
      .setFlipX(true)
      .setScale(1.05);

    this.groom = scene.add
      .image(w * 0.14, h * 0.58, 'game_assets', 'farmer')
      .setDepth(6)
      .setScale(1.15);

    this.phuHo = scene.add
      .image(w * 0.86, h * 0.38, 'game_assets', 'phu_ho')
      .setDepth(5)
      .setAlpha(this.actIdx >= 1 ? 0.95 : 0)
      .setScale(1.05);

    this.princess = scene.add
      .image(w * 0.72, h * 0.26, 'game_assets', 'princess')
      .setDepth(5)
      .setAlpha(this.actIdx >= 3 ? 0.9 : 0)
      .setScale(1.1);

    this.phuong = scene.add
      .image(w * 0.9, h * 0.42, 'game_assets', 'phuong')
      .setDepth(6)
      .setAlpha(this.actIdx >= 2 ? 0.75 : 0)
      .setScale(0.95);

    this._startAmbientTweens();
  }

  _crowdAlpha() {
    if (this.actIdx >= 3) return 0.85;
    if (this.actIdx >= 1) return 0.55;
    return 0.35;
  }

  _startAmbientTweens() {
    const bob = (obj, dy = 3, dur = 1400) => {
      if (!obj?.active) return;
      this.scene.tweens.add({
        targets: obj,
        y: obj.y + dy,
        duration: dur,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    };
    bob(this.crowdLeft, 2, 1600);
    bob(this.crowdRight, -2, 1500);
    bob(this.princess, 2, 2000);
    bob(this.groom, 1.5, 1800);
  }

  /**
   * @param {number} progress 0..1
   */
  setColumnProgress(progress) {
    const p = Math.max(0, Math.min(1, progress));
    const lift = p * 18;
    if (this.castleFar.active) this.castleFar.setY(this.h * 0.22 - lift * 0.3);
    if (this.castleMid.active) this.castleMid.setY(this.h * 0.28 - lift * 0.5);
    const crowdA = this._crowdAlpha() + p * 0.15;
    this.crowdLeft.setAlpha(Math.min(1, crowdA));
    this.crowdRight.setAlpha(Math.min(1, crowdA));
  }

  onSnap() {
    this.scene.tweens.add({
      targets: this.groom,
      scaleX: 1.22,
      scaleY: 1.22,
      duration: 100,
      yoyo: true,
    });
    this.scene.tweens.add({
      targets: [this.crowdLeft, this.crowdRight],
      scaleX: '+=0.06',
      scaleY: '+=0.06',
      duration: 120,
      yoyo: true,
    });
  }

  onButHelp() {
    this.scene.tweens.add({
      targets: this.phuong,
      alpha: 1,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 280,
      yoyo: true,
    });
    this.scene.tweens.add({
      targets: [this.crowdLeft, this.crowdRight],
      x: '+=3',
      duration: 200,
      yoyo: true,
      repeat: 2,
    });
  }

  destroy() {
    this.sky.destroy();
    this.hills.destroy();
    this.castleFar.destroy();
    this.castleMid.destroy();
    this.crowdLeft.destroy();
    this.crowdRight.destroy();
    this.groom.destroy();
    this.phuHo.destroy();
    this.princess.destroy();
    this.phuong.destroy();
  }
}
