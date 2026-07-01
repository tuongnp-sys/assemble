import { userStorageKey } from './userSession.js';

const STORAGE_KEY = 'tretramdot_achievements';

/** @typedef {{ id: string, title: string, desc: string, icon: string }} AchievementDef */

/** @type {Record<string, AchievementDef>} */
export const ACHIEVEMENTS = {
  tre_master: {
    id: 'tre_master',
    title: 'Tre Master',
    desc: 'Khắc nhập trăm đốt — ghép cả hành trình',
    icon: '👑',
  },
};

/** @returns {Set<string>} */
export function loadUnlockedIds() {
  try {
    const raw = localStorage.getItem(userStorageKey(STORAGE_KEY));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

/** @param {Set<string>} ids */
function saveUnlockedIds(ids) {
  try {
    localStorage.setItem(userStorageKey(STORAGE_KEY), JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} id
 * @returns {{ unlocked: boolean, isNew: boolean }}
 */
export function unlockAchievement(id) {
  const ids = loadUnlockedIds();
  if (ids.has(id)) return { unlocked: true, isNew: false };
  ids.add(id);
  saveUnlockedIds(ids);
  return { unlocked: true, isNew: true };
}

/**
 * @param {string} id
 */
export function hasAchievement(id) {
  return loadUnlockedIds().has(id);
}

/**
 * @param {string} id
 * @returns {AchievementDef|null}
 */
export function getAchievementDef(id) {
  return ACHIEVEMENTS[id] ?? null;
}
