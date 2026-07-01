import balance from '../data/balance.json' with { type: 'json' };
import { pickBilingual } from './locale.js';
import { t, tFmt } from './i18n.js';
import { ACT_ORDER } from './actConfig.js';
import { validateColumn } from './SegmentGenerator.js';

/**
 * @param {import('./SegmentTypes.js').BambooSegment} seg
 */
function cloneSegment(seg) {
  return { ...seg };
}

/**
 * @param {string} actId
 * @param {object} [bal]
 */
export function getButGhepMaxUses(actId, bal = balance) {
  const cfg = bal.butGhep ?? {};
  const enabledFrom = cfg.enabledFromAct ?? '2';
  const fromIdx = ACT_ORDER.indexOf(enabledFrom);
  const actIdx = ACT_ORDER.indexOf(actId);
  if (actIdx < 0 || fromIdx < 0 || actIdx < fromIdx) return 0;
  return cfg.usesPerAct?.[actId] ?? cfg.usesPerAct?.default ?? 0;
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function isButGhepEnabled(state) {
  return getButGhepMaxUses(state.actId) > 0;
}

/**
 * @param {string} actId
 * @param {number} columnLength
 * @param {number} assembleTarget
 * @param {{ config?: object, rng?: () => number }} [opts]
 */
export function computePlaceCount(actId, columnLength, assembleTarget, opts = {}) {
  const cfg = opts.config ?? balance.butGhep ?? {};
  const rng = opts.rng ?? Math.random;
  const remaining = assembleTarget - columnLength;
  if (remaining <= 0) return 0;

  if (actId === 'finale') {
    const manual = Math.min(cfg.manualLeft?.finale ?? 3, remaining);
    return Math.max(0, remaining - manual);
  }

  const range = cfg.placeRanges?.[actId];
  if (!Array.isArray(range) || range.length < 2) return 0;

  const minManual = cfg.minManualLeft ?? 1;
  const maxPlace = Math.max(0, remaining - minManual);
  if (maxPlace <= 0) return 0;

  const lo = Math.min(range[0], range[1]);
  const hi = Math.max(range[0], range[1]);
  const rolled = lo + Math.floor(rng() * (hi - lo + 1));
  return Math.min(rolled, maxPlace);
}

/**
 * Biến hóa cột + kho, ghép hộ N lóng đúng chuỗi.
 * @param {import('./GameState.js').GameState} state
 * @param {{ rng?: () => number }} [opts]
 */
export function applyButGhepMagic(state, opts = {}) {
  const { chain } = state.segmentSet;
  const target = state.actConfig.assembleTarget;
  const prefixLen = state.column.length;
  const placeCount = computePlaceCount(state.actId, prefixLen, target, opts);

  state.column = chain.slice(0, prefixLen).map(cloneSegment);

  const start = state.column.length;
  const end = Math.min(start + placeCount, target);
  for (let i = start; i < end; i++) {
    state.column.push(cloneSegment(chain[i]));
  }

  const onColumn = new Set(state.column.map((s) => s.id));
  const remainingChain = chain.filter((s) => !onColumn.has(s.id)).map(cloneSegment);
  const decoys = state.assemblePool.filter((s) => s.isDecoy);
  state.assemblePool = [...remainingChain, ...decoys];

  const placedCount = end - start;
  const manualLeft = target - state.column.length;
  const validation = validateColumn(state.column, chain);

  return {
    placedCount,
    transformedPrefix: prefixLen,
    manualLeft,
    columnLength: state.column.length,
    poolPlaceable: remainingChain.length,
    columnValid: validation.ok,
  };
}

/**
 * @param {string} actId
 * @param {{ placedCount: number, manualLeft: number, transformedPrefix: number }} result
 */
export function pickButGhepMessage(actId, result) {
  const custom = balance.butGhep?.lines?.[actId];
  if (Array.isArray(custom) && custom.length) {
    const item = custom[Math.floor(Math.random() * custom.length)];
    if (typeof item === 'string') {
      return item
        .replace('{n}', String(result.placedCount))
        .replace('{left}', String(result.manualLeft));
    }
    const text = pickBilingual(item);
    return text
      .replace('{n}', String(result.placedCount))
      .replace('{left}', String(result.manualLeft));
  }
  return tFmt('but_ghep.msg_done', {
    n: result.placedCount,
    left: result.manualLeft,
  });
}

export function getButGhepOverlaySec(bal = balance) {
  return bal.butGhep?.overlaySec ?? 3.5;
}

export function getButGhepScoreMultiplier(bal = balance) {
  return bal.butGhep?.scoreMultiplier ?? 0.5;
}
