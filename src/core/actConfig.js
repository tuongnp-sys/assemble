import balance from '../data/balance.json' with { type: 'json' };

/** @type {readonly string[]} */
export const ACT_ORDER = ['1', '2', '3', 'finale'];

/** @type {string} */
export const MAX_ACT = 'finale';

/**
 * @param {object} [bal]
 * @param {string} [actId]
 */
export function getActConfig(bal = balance, actId = '1') {
  const acts = bal.acts ?? {};
  const act = acts[actId] ?? acts['1'] ?? {};
  return {
    id: actId,
    labelKey: act.labelKey ?? `act.${actId}.label`,
    timeSec: act.timeSec ?? 75,
    collectTarget: act.collectTarget ?? 12,
    assembleTarget: act.assembleTarget ?? 10,
    decoyRatio: act.decoyRatio ?? 0.2,
    jointTypeCount: act.jointTypeCount ?? 4,
    allowRotate: act.allowRotate ?? false,
    saboteurEnabled: act.saboteurEnabled ?? false,
    cinematicAutoJoin: act.cinematicAutoJoin ?? 0,
    collect: { ...bal.collect, ...(act.collect ?? {}) },
    assemble: { ...bal.assemble, ...(act.assemble ?? {}) },
    ritual: { ...bal.ritual, ...(act.ritual ?? {}) },
  };
}

/**
 * @param {string} actId
 * @returns {number}
 */
export function getActIndex(actId) {
  const i = ACT_ORDER.indexOf(actId);
  return i >= 0 ? i : 0;
}

/**
 * @param {string} actId
 * @returns {number}
 */
export function getGoldReward(actId, bal = balance) {
  const idx = getActIndex(actId);
  const rewards = bal.gold?.perAct ?? [20, 50, 80, 100];
  return rewards[idx] ?? rewards[rewards.length - 1] ?? 20;
}

/**
 * @param {ReturnType<typeof getActConfig>} actConfig
 * @param {object} [bal]
 */
export function getAssembleBonusSec(actConfig, bal = balance) {
  const base = bal.timing?.assembleBonusSec ?? 30;
  const perSeg = bal.timing?.assembleBonusPerSegment ?? 1.25;
  return Math.round(base + actConfig.assembleTarget * perSeg);
}

/**
 * @param {object} [bal]
 */
export function getRitualBonusSec(bal = balance) {
  return bal.timing?.ritualBonusSec ?? 18;
}
