import Phaser from 'phaser';
import { preloadAudioAssets, registerLoadedTracks } from './audio/BgmController.js';
import { applyMutedPreference } from './audio/audioPreferences.js';
import { getPostLoginScene } from './core/userSession.js';

/**
 * BootScene — atlas placeholder + preload (Sprint 0).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    const w = this.cameras.main.width;
    const bar = this.add.rectangle(w / 2, 400, 200, 12, 0x1a2e1a);
    const fill = this.add.rectangle(w / 2 - 98, 400, 4, 8, 0x6abf4b).setOrigin(0, 0.5);

    this.load.on('progress', (v) => {
      fill.width = 196 * v;
    });

    preloadAudioAssets(this);
  }

  create() {
    this._buildAtlas();
    registerLoadedTracks(this);
    applyMutedPreference();
    this.scene.start(getPostLoginScene());
  }

  _buildAtlas() {
    /** @type {Record<string, { x: number, y: number, w: number, h: number }>} */
    const frames = {};

    const defs = [
      {
        key: 'segment_body',
        w: 48,
        h: 28,
        draw: (gfx) => {
          gfx.fillStyle(0x5a9e3a, 1);
          gfx.fillRoundedRect(2, 6, 44, 16, 3);
          gfx.lineStyle(2, 0x3d6b28, 1);
          gfx.strokeRoundedRect(2, 6, 44, 16, 3);
          gfx.lineStyle(1, 0x7bc45a, 0.35);
          gfx.lineBetween(10, 12, 38, 16);
          gfx.lineBetween(10, 16, 38, 20);
        },
      },
      {
        key: 'segment_decoy',
        w: 48,
        h: 28,
        draw: (gfx) => {
          gfx.fillStyle(0x6b5344, 1);
          gfx.fillRoundedRect(2, 6, 44, 16, 3);
          gfx.lineStyle(2, 0x8b3a3a, 0.8);
          gfx.strokeRoundedRect(2, 6, 44, 16, 3);
        },
      },
      {
        key: 'farmer',
        w: 40,
        h: 56,
        draw: (gfx) => {
          gfx.fillStyle(0xc49a6c, 1);
          gfx.fillCircle(20, 14, 10);
          gfx.fillStyle(0x4a6741, 1);
          gfx.fillRect(10, 24, 20, 28);
        },
      },
      {
        key: 'phuong',
        w: 44,
        h: 58,
        draw: (gfx) => {
          gfx.fillStyle(0xe8c547, 1);
          gfx.fillCircle(22, 14, 11);
          gfx.fillStyle(0x8b1a1a, 1);
          gfx.fillRect(8, 26, 28, 30);
        },
      },
      {
        key: 'but',
        w: 36,
        h: 52,
        draw: (gfx) => {
          gfx.fillStyle(0xffffff, 0.9);
          gfx.fillCircle(18, 16, 12);
          gfx.fillStyle(0x7ec8e3, 0.8);
          gfx.fillTriangle(18, 28, 8, 50, 28, 50);
        },
      },
      {
        key: 'bg_hill',
        w: 375,
        h: 200,
        draw: (gfx) => {
          gfx.fillStyle(0x2d5a3d, 1);
          gfx.beginPath();
          gfx.moveTo(0, 200);
          gfx.lineTo(0, 80);
          gfx.lineTo(120, 40);
          gfx.lineTo(260, 90);
          gfx.lineTo(375, 50);
          gfx.lineTo(375, 200);
          gfx.closePath();
          gfx.fillPath();
        },
      },
      {
        key: 'castle_far',
        w: 200,
        h: 110,
        draw: (gfx) => {
          gfx.fillStyle(0x5c6bc0, 0.35);
          gfx.fillRect(40, 50, 120, 60);
          gfx.fillStyle(0x7986cb, 0.5);
          gfx.fillTriangle(100, 12, 55, 52, 145, 52);
          gfx.fillRect(88, 28, 24, 18);
          gfx.fillStyle(0xd32f2f, 0.8);
          gfx.fillRect(96, 8, 8, 14);
        },
      },
      {
        key: 'castle_mid',
        w: 140,
        h: 90,
        draw: (gfx) => {
          gfx.fillStyle(0x8d6e63, 0.7);
          gfx.fillRect(20, 40, 100, 50);
          gfx.fillStyle(0xa1887f, 0.85);
          gfx.fillTriangle(70, 8, 30, 42, 110, 42);
          gfx.lineStyle(2, 0xffd54f, 0.6);
          gfx.strokeRect(58, 55, 24, 30);
        },
      },
      {
        key: 'crowd',
        w: 72,
        h: 36,
        draw: (gfx) => {
          const colors = [0x78909c, 0x90a4ae, 0x607d8b, 0x546e7a];
          for (let i = 0; i < 4; i++) {
            const x = 8 + i * 16;
            gfx.fillStyle(colors[i], 0.85);
            gfx.fillCircle(x + 6, 10, 5);
            gfx.fillRect(x + 2, 16, 12, 16);
          }
        },
      },
      {
        key: 'princess',
        w: 36,
        h: 52,
        draw: (gfx) => {
          gfx.fillStyle(0xffccbc, 1);
          gfx.fillCircle(18, 12, 9);
          gfx.fillStyle(0xf48fb1, 1);
          gfx.fillTriangle(18, 4, 8, 14, 28, 14);
          gfx.fillStyle(0xec407a, 1);
          gfx.fillRect(8, 22, 20, 26);
        },
      },
      {
        key: 'couple_wedding',
        w: 132,
        h: 92,
        draw: (gfx) => {
          gfx.fillStyle(0xfff9c4, 0.18);
          gfx.fillEllipse(66, 48, 118, 78);

          gfx.fillStyle(0x000000, 0.22);
          gfx.fillEllipse(66, 88, 76, 10);

          gfx.fillStyle(0x5d4037, 1);
          gfx.fillRect(22, 62, 9, 22);
          gfx.fillRect(36, 62, 9, 22);
          gfx.fillStyle(0x2e7d32, 1);
          gfx.fillRoundedRect(16, 40, 38, 26, 5);
          gfx.fillStyle(0x1b5e20, 1);
          gfx.fillRoundedRect(18, 44, 34, 8, 3);
          gfx.fillStyle(0x43a047, 0.85);
          gfx.fillTriangle(16, 44, 54, 44, 35, 54);
          gfx.fillStyle(0xc49a6c, 1);
          gfx.fillCircle(35, 18, 12);
          gfx.fillStyle(0x3e2723, 1);
          gfx.fillEllipse(35, 10, 16, 7);
          gfx.fillStyle(0x6d4c41, 1);
          gfx.fillTriangle(35, 0, 20, 14, 50, 14);
          gfx.lineStyle(1, 0xa1887f, 0.7);
          gfx.strokeTriangle(35, 2, 22, 13, 48, 13);
          gfx.fillStyle(0xc49a6c, 1);
          gfx.fillRoundedRect(48, 46, 14, 6, 2);

          gfx.fillStyle(0x880e4f, 1);
          gfx.fillRoundedRect(78, 38, 36, 30, 4);
          gfx.fillStyle(0xf48fb1, 0.95);
          gfx.fillTriangle(78, 42, 114, 42, 96, 68);
          gfx.fillStyle(0xffccbc, 1);
          gfx.fillCircle(96, 18, 11);
          gfx.fillStyle(0xffd54f, 1);
          gfx.fillRect(88, 6, 16, 9);
          gfx.fillTriangle(88, 12, 104, 12, 96, 22);
          gfx.fillStyle(0xff4081, 1);
          gfx.fillCircle(104, 8, 4);
          gfx.fillStyle(0xffeb3b, 1);
          gfx.fillCircle(90, 9, 3);
          gfx.fillStyle(0xe91e63, 1);
          gfx.fillCircle(98, 7, 2);
          gfx.fillStyle(0xffccbc, 1);
          gfx.fillRoundedRect(70, 48, 12, 6, 2);

          gfx.fillStyle(0xc49a6c, 1);
          gfx.fillCircle(58, 46, 5);
          gfx.fillStyle(0xffccbc, 1);
          gfx.fillCircle(68, 46, 5);
          gfx.fillStyle(0x2e7d32, 1);
          gfx.fillCircle(63, 52, 7);
          gfx.fillStyle(0x66bb6a, 1);
          gfx.fillRect(61, 54, 4, 10);
          gfx.fillStyle(0xf48fb1, 1);
          gfx.fillCircle(60, 50, 3);
          gfx.fillStyle(0xffeb3b, 1);
          gfx.fillCircle(66, 50, 3);
          gfx.fillStyle(0xe040fb, 1);
          gfx.fillCircle(63, 48, 2);

          gfx.lineStyle(2, 0xffd54f, 0.85);
          gfx.strokeEllipse(66, 48, 54, 38);
          gfx.fillStyle(0xffeb3b, 0.95);
          gfx.fillCircle(66, 28, 3);
          gfx.fillStyle(0xff4081, 0.9);
          gfx.fillCircle(58, 32, 2);
          gfx.fillStyle(0x40c4ff, 0.9);
          gfx.fillCircle(74, 32, 2);
        },
      },
      {
        key: 'phu_ho',
        w: 44,
        h: 60,
        draw: (gfx) => {
          gfx.fillStyle(0xffe0b2, 1);
          gfx.fillCircle(22, 14, 10);
          gfx.fillStyle(0x5d4037, 1);
          gfx.fillRect(10, 6, 24, 8);
          gfx.fillStyle(0x37474f, 1);
          gfx.fillRect(12, 26, 20, 30);
          gfx.fillStyle(0xffd54f, 0.9);
          gfx.fillRect(28, 32, 10, 6);
        },
      },
    ];

    let x = 0;
    let y = 0;
    let rowH = 0;
    const pad = 2;
    const maxW = 512;

    for (const def of defs) {
      if (x + def.w > maxW) {
        x = 0;
        y += rowH + pad;
        rowH = 0;
      }
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      def.draw(g);
      g.generateTexture(`__tmp_${def.key}`, def.w, def.h);
      g.destroy();

      frames[def.key] = { x, y, w: def.w, h: def.h };
      x += def.w + pad;
      rowH = Math.max(rowH, def.h);
    }

    const atlasH = y + rowH;
    const canvas = this.textures.createCanvas('game_assets', maxW, atlasH);
    const ctx = canvas.getContext();

    for (const def of defs) {
      const f = frames[def.key];
      const src = this.textures.get(`__tmp_${def.key}`).getSourceImage();
      ctx.drawImage(src, f.x, f.y);
      this.textures.remove(`__tmp_${def.key}`);
    }

    for (const [key, f] of Object.entries(frames)) {
      canvas.add(key, 0, f.x, f.y, f.w, f.h);
    }
    canvas.refresh();
  }
}
