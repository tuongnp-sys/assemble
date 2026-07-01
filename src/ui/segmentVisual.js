/** Màu hiển thị mắt nối */
export const JOINT_COLORS = {
  flat: 0x9e9e9e,
  circle: 0xffeb3b,
  triangle: 0xff9800,
  wave: 0x03a9f4,
  cross: 0xe91e63,
  diamond: 0x9c27b0,
  zigzag: 0x4caf50,
  dot: 0xffffff,
  line: 0x795548,
  star: 0xffc107,
  moon: 0xb39ddb,
};

/**
 * @param {import('../core/SegmentTypes.js').JointPattern} pattern
 */
export function jointColor(pattern) {
  return JOINT_COLORS[pattern] ?? 0xcccccc;
}

/**
 * @param {import('phaser').Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {import('../core/SegmentTypes.js').JointPattern} pattern
 * @param {number} scale
 */
function createJointDot(scene, x, y, pattern, scale) {
  const r = 5 * scale;
  const outline = scene.add.circle(x, y, r + 1.5 * scale, 0x1a1a1a, 1);
  const fill = scene.add.circle(x, y, r, jointColor(pattern), 1);
  const ring = scene.add.circle(x, y, r + 0.5 * scale, 0xffffff, 0).setStrokeStyle(1.5, 0xffffff, 0.9);
  return [outline, fill, ring];
}

/**
 * @param {import('phaser').Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {import('../core/SegmentTypes.js').BambooSegment} segment
 * @param {object} [opts]
 * @param {number} [opts.scale]
 * @param {number} [opts.depth]
 * @param {boolean} [opts.interactive]
 */
export function createSegmentContainer(scene, x, y, segment, opts = {}) {
  const scale = opts.scale ?? 1;
  const depth = opts.depth ?? 10;
  const frame = segment.isDecoy ? 'segment_decoy' : 'segment_body';
  const container = scene.add.container(x, y).setDepth(depth);

  const body = scene.add.image(0, 0, 'game_assets', frame).setScale(scale);
  container.add(body);

  const jointOffsetY = 17 * scale;
  const topParts = createJointDot(scene, 0, -jointOffsetY, segment.jointTop, scale);
  const botParts = createJointDot(scene, 0, jointOffsetY, segment.jointBottom, scale);
  container.add([...topParts, ...botParts]);

  if (segment.rotation === 180) {
    container.setAngle(180);
  }

  container.setData('segmentId', segment.id);
  container.setData('segment', segment);

  if (opts.interactive) {
    body.setInteractive({ useHandCursor: true, draggable: true });
  }

  return container;
}
