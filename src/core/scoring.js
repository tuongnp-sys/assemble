import balance from '../data/balance.json' with { type: 'json' };
import { getActIndex } from './actConfig.js';
import { getLang } from './locale.js';
import { t, tFmt } from './i18n.js';

/** @typedef {{
 *   total: number,
 *   base: number,
 *   timeBonus: number,
 *   decoyPenalty: number,
 *   saboteurBonus: number,
 *   actWeight: number,
 * }} ScoreBreakdown */

/** @param {string} actId */
export function getActWeight(actId, bal = balance) {
  const weights = bal.scoring?.actWeights ?? {};
  if (weights[actId] != null) return Number(weights[actId]);
  const fallback = [1, 2, 3, 5];
  return fallback[getActIndex(actId)] ?? 1;
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {boolean} [victory]
 * @returns {ScoreBreakdown}
 */
export function computeScoreBreakdown(state, victory = state.victory) {
  const cfg = balance.scoring ?? {};
  const actWeight = getActWeight(state.actId);
  const basePerWeight = cfg.basePerWeight ?? 10000;
  const timeBonusMax = cfg.timeBonusMax ?? 5000;
  const decoyPenaltyEach = cfg.decoyPenalty ?? 200;
  const saboteurPerEvent = cfg.saboteurBonusPerEvent ?? 100;
  const saboteurCap = cfg.saboteurBonusCap ?? 500;
  const minScore = cfg.minScore ?? 100;

  const base = actWeight * basePerWeight;

  if (!victory) {
    return {
      total: 0,
      base: 0,
      timeBonus: 0,
      decoyPenalty: 0,
      saboteurBonus: 0,
      actWeight,
    };
  }

  const timeSec = state.actConfig.timeSec || 1;
  const timeRatio = Math.max(0, Math.min(1, state.timeLeft / timeSec));
  const timeBonus = Math.floor(timeRatio * timeBonusMax * actWeight);

  const decoyPenalty = (state.wrongDecoyTaps ?? 0) * decoyPenaltyEach;

  let saboteurBonus = 0;
  if (state.actConfig.saboteurEnabled && (state.saboteurEvents ?? 0) > 0) {
    saboteurBonus = Math.min(
      saboteurCap,
      (state.saboteurEvents ?? 0) * saboteurPerEvent
    );
  }

  const total = Math.max(
    minScore,
    base + timeBonus - decoyPenalty + saboteurBonus
  );

  return {
    total,
    base,
    timeBonus,
    decoyPenalty,
    saboteurBonus,
    actWeight,
  };
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {boolean} [victory]
 */
export function computeActScore(state, victory = state.victory) {
  return computeScoreBreakdown(state, victory).total;
}

/**
 * @param {ScoreBreakdown} b
 * @returns {string}
 */
export function formatScoreBreakdownVi(b) {
  return formatScoreBreakdown(b);
}

/**
 * @param {ScoreBreakdown} b
 */
export function formatScoreBreakdown(b) {
  const loc = getLang() === 'vi' ? 'vi-VN' : 'en-US';
  const fmt = (n) => n.toLocaleString(loc);
  const parts = [tFmt('gameover.score_base', { n: fmt(b.base) })];
  if (b.timeBonus > 0) {
    parts.push(tFmt('gameover.score_time', { n: fmt(b.timeBonus) }));
  }
  if (b.decoyPenalty > 0) {
    parts.push(tFmt('gameover.score_decoy', { n: fmt(b.decoyPenalty) }));
  }
  if (b.saboteurBonus > 0) {
    parts.push(tFmt('gameover.score_saboteur', { n: fmt(b.saboteurBonus) }));
  }
  return parts.join(' · ');
}

/**
 * @param {number} n
 */
export function formatScore(n) {
  const loc = getLang() === 'vi' ? 'vi-VN' : 'en-US';
  return n.toLocaleString(loc);
}
