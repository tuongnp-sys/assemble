import balance from '../data/balance.json' with { type: 'json' };
import { ACT_ORDER, getActConfig } from './actConfig.js';
import { generateActSegments } from './SegmentGenerator.js';

/** Tổng lóng campaign: 10 + 20 + 30 + 40 */
export const HUNDRED_TOTAL = 100;

/** Lóng từ Act 1–3 (cinematicAutoJoin) */
export const PRIOR_ACTS_JOIN_COUNT = 60;

/**
 * Số lóng ghép theo từng act.
 */
export function getActChainCounts() {
  return ACT_ORDER.map((actId) => ({
    actId,
    count: getActConfig(balance, actId).assembleTarget,
    label: actId === 'finale' ? '40' : String(getActConfig(balance, actId).assembleTarget),
  }));
}

/**
 * Ghép chuỗi 4 act thành 100 lóng — cùng seed với GameState (deterministic).
 * @param {number} [dailySeed]
 */
export function buildHundredChain(dailySeed = 0) {
  /** @type {import('./SegmentTypes.js').BambooSegment[]} */
  const segments = [];
  let globalIndex = 0;

  for (const actId of ACT_ORDER) {
    const cfg = getActConfig(balance, actId);
    const { chain } = generateActSegments(actId, cfg, dailySeed);
    for (const seg of chain) {
      segments.push({
        ...seg,
        id: `hundred_${globalIndex}`,
        sequenceIndex: globalIndex,
      });
      globalIndex++;
    }
  }

  return segments;
}
