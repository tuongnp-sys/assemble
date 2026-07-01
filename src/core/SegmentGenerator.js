import { ALL_JOINT_PATTERNS, FLAT_JOINT } from './SegmentTypes.js';

/**
 * Mulberry32 PRNG — deterministic per act + seed.
 * @param {number} seed
 */
export function createRng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {string} actId
 * @param {number} [dailySeed]
 */
export function hashSeed(actId, dailySeed = 0) {
  let h = dailySeed ^ 0x811c9dc5;
  for (let i = 0; i < actId.length; i++) {
    h ^= actId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * @param {number} count
 * @param {() => number} rng
 */
function pickPatterns(count, rng) {
  const pool = [...ALL_JOINT_PATTERNS];
  const picked = [];
  while (picked.length < count && pool.length) {
    const idx = Math.floor(rng() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  while (picked.length < count) {
    picked.push(ALL_JOINT_PATTERNS[picked.length % ALL_JOINT_PATTERNS.length]);
  }
  return picked;
}

/**
 * Sinh chuỗi lóng tre đúng: jointBottom[i] === jointTop[i+1].
 * @param {number} assembleTarget
 * @param {number} jointTypeCount
 * @param {() => number} rng
 * @param {string} idPrefix
 */
export function generateChain(assembleTarget, jointTypeCount, rng, idPrefix = 'seg') {
  const patterns = pickPatterns(jointTypeCount, rng);
  /** @type {import('./SegmentTypes.js').BambooSegment[]} */
  const chain = [];

  for (let i = 0; i < assembleTarget; i++) {
    const jointTop = i === 0 ? FLAT_JOINT : chain[i - 1].jointBottom;
    const jointBottom =
      i === assembleTarget - 1
        ? FLAT_JOINT
        : patterns[Math.floor(rng() * patterns.length)];

    chain.push({
      id: `${idPrefix}_${i}`,
      jointTop,
      jointBottom,
      isDecoy: false,
      rotation: 0,
      sequenceIndex: i,
    });
  }

  return chain;
}

/**
 * @param {import('./SegmentTypes.js').BambooSegment[]} chain
 * @param {number} decoyRatio
 * @param {() => number} rng
 * @param {string} idPrefix
 */
export function generateDecoys(chain, decoyRatio, rng, idPrefix = 'decoy') {
  const decoyCount = Math.max(1, Math.round(chain.length * decoyRatio));
  const usedPatterns = new Set(chain.flatMap((s) => [s.jointTop, s.jointBottom]));
  const patternPool = [...usedPatterns].filter((p) => p !== FLAT_JOINT);
  /** @type {import('./SegmentTypes.js').BambooSegment[]} */
  const decoys = [];

  for (let i = 0; i < decoyCount; i++) {
    const top = patternPool[Math.floor(rng() * patternPool.length)] ?? 'circle';
    let bottom = patternPool[Math.floor(rng() * patternPool.length)] ?? 'triangle';
    if (top === bottom && patternPool.length > 1) {
      bottom = patternPool[(patternPool.indexOf(top) + 1) % patternPool.length];
    }

    decoys.push({
      id: `${idPrefix}_${i}`,
      jointTop: top,
      jointBottom: bottom,
      isDecoy: true,
      rotation: rng() < 0.5 ? 0 : 180,
      sequenceIndex: -1,
    });
  }

  return decoys;
}

/**
 * @param {import('./SegmentTypes.js').BambooSegment[]} items
 * @param {() => number} rng
 */
function shuffle(items, rng) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * @param {string} actId
 * @param {object} actConfig from getActConfig()
 * @param {number} [dailySeed]
 * @returns {import('./SegmentTypes.js').ActSegmentSet}
 */
export function generateActSegments(actId, actConfig, dailySeed = 0) {
  const rng = createRng(hashSeed(actId, dailySeed));
  const chain = generateChain(
    actConfig.assembleTarget,
    actConfig.jointTypeCount,
    rng,
    `act${actId}`
  );
  const decoys = generateDecoys(chain, actConfig.decoyRatio, rng, `act${actId}_decoy`);
  const pool = shuffle([...chain, ...decoys], rng);

  return { chain, decoys, pool };
}

/**
 * Kiểm tra hai lóng có khớp mắt nối không (bottom của dưới = top của trên).
 * @param {import('./SegmentTypes.js').BambooSegment} lower
 * @param {import('./SegmentTypes.js').BambooSegment} upper
 */
export function jointsMatch(lower, upper) {
  return lower.jointBottom === upper.jointTop;
}

/**
 * Khắc Nhập — kiểm tra theo mắt nối (người chơi không biết ID).
 * @param {import('./SegmentTypes.js').BambooSegment[]} column player order bottom→top
 * @param {import('./SegmentTypes.js').BambooSegment[]} expectedChain
 * @returns {import('./SegmentTypes.js').ColumnValidation}
 */
export function validateColumn(column, expectedChain) {
  const targetLen = expectedChain.length;

  if (column.length !== targetLen) {
    return {
      ok: false,
      firstBadIndex: column.length < targetLen ? column.length : targetLen - 1,
    };
  }

  if (column[0].jointTop !== FLAT_JOINT) {
    return { ok: false, firstBadIndex: 0 };
  }

  if (column[column.length - 1].jointBottom !== FLAT_JOINT) {
    return { ok: false, firstBadIndex: column.length - 1 };
  }

  for (let i = 1; i < column.length; i++) {
    if (!jointsMatch(column[i - 1], column[i])) {
      return { ok: false, firstBadIndex: i };
    }
  }

  const chainIds = new Set(expectedChain.map((s) => s.id));
  const used = new Set();
  for (let i = 0; i < column.length; i++) {
    const seg = column[i];
    if (seg.isDecoy || !chainIds.has(seg.id) || used.has(seg.id)) {
      return { ok: false, firstBadIndex: i };
    }
    used.add(seg.id);
  }

  return { ok: true };
}
