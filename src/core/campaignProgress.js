import { ACT_ORDER, MAX_ACT } from './actConfig.js';
import { pickBilingual } from './locale.js';
import { t, tFmt } from './i18n.js';

import { userStorageKey } from './userSession.js';

const STORAGE_KEY_BASE = 'tretramdot_campaign';

/** @typedef {{ gold: number, clearedActs: string[], gameComplete: boolean }} CampaignData */

function defaultData() {
  return { gold: 0, clearedActs: [], gameComplete: false };
}

/** @returns {CampaignData} */
export function loadCampaign() {
  try {
    const raw = localStorage.getItem(userStorageKey(STORAGE_KEY_BASE));
    if (!raw) return defaultData();
    const d = JSON.parse(raw);
    return {
      gold: Number(d.gold) || 0,
      clearedActs: Array.isArray(d.clearedActs) ? d.clearedActs : [],
      gameComplete: Boolean(d.gameComplete),
    };
  } catch {
    return defaultData();
  }
}

/** @param {CampaignData} data */
export function saveCampaign(data) {
  try {
    localStorage.setItem(userStorageKey(STORAGE_KEY_BASE), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function resetCampaign() {
  try {
    localStorage.removeItem(userStorageKey(STORAGE_KEY_BASE));
  } catch {
    /* ignore */
  }
}

/**
 * @param {boolean} keepGold Giữ vàng đã kiếm (chỉ reset act progress).
 */
export function resetCampaignProgress(keepGold = false) {
  if (!keepGold) {
    resetCampaign();
    return defaultData();
  }
  const data = loadCampaign();
  const next = { gold: data.gold, clearedActs: [], gameComplete: false };
  saveCampaign(next);
  return next;
}

/**
 * @param {string} actId
 * @param {number} goldReward
 */
export function recordActVictory(actId, goldReward) {
  const data = loadCampaign();
  if (!data.clearedActs.includes(actId)) {
    data.clearedActs.push(actId);
  }
  data.gold += goldReward;
  if (actId === MAX_ACT) {
    data.gameComplete = true;
  }
  saveCampaign(data);
  return data;
}

/** @returns {string} */
export function getContinueActId() {
  const data = loadCampaign();
  for (const actId of ACT_ORDER) {
    if (!data.clearedActs.includes(actId)) return actId;
  }
  return data.gameComplete ? '1' : MAX_ACT;
}

/**
 * @param {string} actId
 * @returns {string|null}
 */
export function getNextActId(actId) {
  const idx = ACT_ORDER.indexOf(actId);
  if (idx < 0 || idx >= ACT_ORDER.length - 1) return null;
  return ACT_ORDER[idx + 1];
}

/**
 * @param {string} actId
 * @returns {string}
 */
export function getActDisplayName(actId) {
  const key = `acts.${actId}`;
  const label = t(key);
  return label !== key ? label : `Act ${actId}`;
}

/**
 * @param {object} legend
 * @param {string} actId
 * @param {string} key
 */
export function getLegendText(legend, actId, key) {
  const block = legend.acts?.[actId]?.[key];
  if (!block) return pickBilingual(legend.defeat);
  return pickBilingual(block);
}
