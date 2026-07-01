const BURST_COLORS = [
  0xff5252, 0xffeb3b, 0x69f0ae, 0x40c4ff, 0xe040fb, 0xff6e40, 0xfff59d, 0xf48fb1,
];

/**
 * Một đợt pháo hoa — hạt bay tỏa tròn.
 * @param {import('phaser').Scene} scene
 * @param {number} cx
 * @param {number} cy
 * @param {object} [opts]
 */
export function burstFirework(scene, cx, cy, opts = {}) {
  const depth = opts.depth ?? 30;
  const count = opts.particles ?? 28;
  const radius = opts.radius ?? 110;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2);
    const dist = Phaser.Math.Between(radius * 0.5, radius);
    const color = BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)];
    const size = Phaser.Math.Between(2, 6);

    const dot = scene.add.circle(cx, cy, size, color, 1).setDepth(depth);
    const trail = scene.add
      .circle(cx, cy, size * 0.6, color, 0.5)
      .setDepth(depth - 1)
      .setScale(0.5);

    scene.tweens.add({
      targets: [dot, trail],
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      alpha: 0,
      scale: 0.15,
      duration: Phaser.Math.Between(500, 1000),
      ease: 'Quad.easeOut',
      onComplete: () => {
        dot.destroy();
        trail.destroy();
      },
    });
  }

  const flash = scene.add.circle(cx, cy, 8, 0xffffff, 0.9).setDepth(depth + 1);
  scene.tweens.add({
    targets: flash,
    scale: 3,
    alpha: 0,
    duration: 280,
    onComplete: () => flash.destroy(),
  });
}

/**
 * Pháo hoa liên tục trong khoảng thời gian.
 * @param {import('phaser').Scene} scene
 * @param {number} w
 * @param {number} h
 * @param {object} [opts]
 * @returns {{ stop: () => void }}
 */
export function startFireworksShow(scene, w, h, opts = {}) {
  const loopForever = opts.loop === true;
  const durationMs = opts.durationMs ?? 8000;
  const intervalMs = opts.intervalMs ?? 320;
  const depth = opts.depth ?? 30;
  const events = [];

  const tick = () => {
    const cx = Phaser.Math.Between(Math.floor(w * 0.08), Math.floor(w * 0.92));
    const cy = Phaser.Math.Between(Math.floor(h * 0.08), Math.floor(h * 0.55));
    burstFirework(scene, cx, cy, { depth, particles: opts.particles ?? 26 });
  };

  tick();
  const loop = scene.time.addEvent({
    delay: intervalMs,
    loop: true,
    callback: tick,
  });
  events.push(loop);

  const multi = scene.time.addEvent({
    delay: intervalMs * 0.45,
    loop: true,
    callback: () => {
      burstFirework(scene, Phaser.Math.Between(40, w - 40), Phaser.Math.Between(60, h * 0.45), {
        depth,
        particles: 18,
        radius: 80,
      });
    },
  });
  events.push(multi);

  if (!loopForever) {
    const stopTimer = scene.time.delayedCall(durationMs, () => {
      for (const ev of events) ev.remove(false);
    });
    events.push(stopTimer);
  }

  return {
    stop() {
      for (const ev of events) ev.remove(false);
    },
  };
}

/**
 * Đường hoa dưới chân — chấm cánh hoa rải ngang.
 * @param {import('phaser').Scene} scene
 * @param {number} w
 * @param {number} y
 * @param {number} [depth]
 */
export function scatterFlowerPath(scene, w, y, depth = 18) {
  const colors = [0xf48fb1, 0xffeb3b, 0xce93d8, 0xff8a80, 0xffffff, 0xffcc80];
  const parts = [];
  for (let i = 0; i < 55; i++) {
    const x = Phaser.Math.Between(8, w - 8);
    const dy = Phaser.Math.Between(-10, 10);
    const c = colors[Math.floor(Math.random() * colors.length)];
    const petal = scene.add.circle(x, y + dy, Phaser.Math.Between(2, 5), c, 0.85).setDepth(depth);
    parts.push(petal);
  }
  return parts;
}
