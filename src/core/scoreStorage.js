import { userStorageKey } from './userSession.js';

const STORAGE_KEY_BASE = 'tretramdot_best_scores';

function storageKey() {
  return userStorageKey(STORAGE_KEY_BASE);
}

/** @typedef {{ acts: Record<string, number>, campaignRun: number, updatedAt: string }} BestScores */

function defaultScores() {
  return { acts: {}, campaignRun: 0, updatedAt: '' };
}

/** @returns {BestScores} */
export function loadBestScores() {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return defaultScores();
    const d = JSON.parse(raw);
    return {
      acts: typeof d.acts === 'object' && d.acts ? d.acts : {},
      campaignRun: Number(d.campaignRun) || 0,
      updatedAt: d.updatedAt ?? '',
    };
  } catch {
    return defaultScores();
  }
}

/** @param {BestScores} data */
export function saveBestScores(data) {
  try {
    localStorage.setItem(
      storageKey(),
      JSON.stringify({ ...data, updatedAt: new Date().toISOString() })
    );
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} actId
 * @param {number} score
 * @returns {{ isNewBest: boolean, previousBest: number }}
 */
export function recordActBestScore(actId, score) {
  const data = loadBestScores();
  const previousBest = Number(data.acts[actId]) || 0;
  const isNewBest = score > previousBest;
  if (isNewBest) {
    data.acts[actId] = score;
    saveBestScores(data);
  }
  return { isNewBest, previousBest };
}

/**
 * Tổng điểm best từng act (offline leaderboard cá nhân).
 * @returns {number}
 */
export function getCampaignBestTotal() {
  const data = loadBestScores();
  return Object.values(data.acts).reduce((s, n) => s + (Number(n) || 0), 0);
}

/**
 * @param {string} actId
 * @returns {number}
 */
export function getActBestScore(actId) {
  return Number(loadBestScores().acts[actId]) || 0;
}
