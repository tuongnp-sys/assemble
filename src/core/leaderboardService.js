import { ACT_ORDER } from './actConfig.js';
import { getCurrentUser, userStorageKey } from './userSession.js';
import { formatScore } from './scoring.js';
import { getActDisplayName } from './campaignProgress.js';

const LB_KEY = 'tretramdot_leaderboard';

/** @typedef {{
 *   id: string,
 *   userId: string,
 *   nickname: string,
 *   actId: string,
 *   score: number,
 *   at: string,
 * }} LeaderboardEntry */

/** @returns {LeaderboardEntry[]} */
function loadAllEntries() {
  try {
    const raw = localStorage.getItem(LB_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** @param {LeaderboardEntry[]} entries */
function saveAllEntries(entries) {
  try {
    localStorage.setItem(LB_KEY, JSON.stringify(entries.slice(0, 500)));
  } catch {
    /* ignore */
  }
}

/**
 * Ghi điểm thắng — mỗi user chỉ giữ best theo act.
 * @param {{ actId: string, score: number }} payload
 */
export function submitLeaderboardScore(payload) {
  const user = getCurrentUser();
  if (!user || user.role === 'admin') return { submitted: false };

  const { actId, score } = payload;
  if (!score || score <= 0) return { submitted: false };

  const entries = loadAllEntries();
  const existing = entries.find(
    (e) => e.userId === user.userId && e.actId === actId
  );

  if (existing && score <= existing.score) {
    return { submitted: true, isNewBest: false, rank: getUserRank(actId, user.userId) };
  }

  const entry = {
    id: `${user.userId}_${actId}`,
    userId: user.userId,
    nickname: user.nickname,
    actId,
    score,
    at: new Date().toISOString(),
  };

  const filtered = entries.filter(
    (e) => !(e.userId === user.userId && e.actId === actId)
  );
  filtered.push(entry);
  saveAllEntries(filtered);

  return {
    submitted: true,
    isNewBest: true,
    rank: getUserRank(actId, user.userId),
  };
}

/**
 * @param {string} actId
 * @param {string} [userId]
 */
export function getUserRank(actId, userId) {
  const uid = userId ?? getCurrentUser()?.userId;
  if (!uid) return null;
  const board = getActLeaderboard(actId, 100);
  const idx = board.findIndex((e) => e.userId === uid);
  return idx >= 0 ? idx + 1 : null;
}

/**
 * @param {string} actId
 * @param {number} [limit]
 */
export function getActLeaderboard(actId, limit = 20) {
  return loadAllEntries()
    .filter((e) => e.actId === actId)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Tổng best từng act của mỗi user.
 * @param {number} [limit]
 */
export function getTotalLeaderboard(limit = 20) {
  const entries = loadAllEntries();
  /** @type {Map<string, { userId: string, nickname: string, score: number }>} */
  const totals = new Map();

  for (const uid of new Set(entries.map((e) => e.userId))) {
    const nick =
      entries.find((e) => e.userId === uid)?.nickname ?? '???';
    let sum = 0;
    for (const actId of ACT_ORDER) {
      const best = entries
        .filter((e) => e.userId === uid && e.actId === actId)
        .reduce((m, e) => Math.max(m, e.score), 0);
      sum += best;
    }
    if (sum > 0) totals.set(uid, { userId: uid, nickname: nick, score: sum });
  }

  return [...totals.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * @param {string} actId
 * @returns {number}
 */
export function getUserActBestFromBoard(actId) {
  const user = getCurrentUser();
  if (!user) return 0;
  return (
    loadAllEntries()
      .filter((e) => e.userId === user.userId && e.actId === actId)
      .reduce((m, e) => Math.max(m, e.score), 0) ?? 0
  );
}

export { formatScore, getActDisplayName };
