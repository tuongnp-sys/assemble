import { ACT_ORDER } from './actConfig.js';
import { loadCampaign, saveCampaign, resetCampaign } from './campaignProgress.js';

const params = new URLSearchParams(window.location.search);

/** @param {string} name */
function isTruthy(name) {
  const v = params.get(name);
  if (v == null) return false;
  return v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes';
}

/** @param {string} id */
export function isValidActId(id) {
  return ACT_ORDER.includes(id);
}

/**
 * Chỉ bật khi URL có ?debug=1 — người chơi thường không thấy admin UI / cheats.
 */
export function isDebugMode() {
  return isTruthy('debug');
}

/** @returns {string|null} */
function readUrlActId() {
  const id = params.get('act');
  if (!id || !isValidActId(id)) return null;
  return id;
}

export const debugFlags = {
  get enabled() {
    return isDebugMode();
  },
  get autoWin() {
    return isDebugMode() && isTruthy('autowin');
  },
  get skipBriefing() {
    return isDebugMode() && (isTruthy('skipbriefing') || isTruthy('autowin'));
  },
  /** @returns {'win'|'lose'|null} */
  get gameOver() {
    if (!isDebugMode()) return null;
    const v = params.get('gameover')?.toLowerCase();
    if (v === 'win' || v === 'lose') return v;
    return null;
  },
  get startActId() {
    return isDebugMode() ? readUrlActId() : null;
  },
};

export function debugUnlockAllActs() {
  saveCampaign({
    gold: 250,
    clearedActs: ['1', '2', '3'],
    gameComplete: false,
  });
}

export function debugUnlockComplete() {
  saveCampaign({
    gold: 350,
    clearedActs: [...ACT_ORDER],
    gameComplete: true,
  });
}

export function debugResetCampaign() {
  resetCampaign();
}

/** @returns {import('./campaignProgress.js').CampaignData} */
export function debugGetCampaign() {
  return loadCampaign();
}

/**
 * @param {import('phaser').Game} game
 */
export function attachDebugApi(game) {
  if (!isDebugMode()) {
    try {
      delete window.__TRE_DEBUG__;
    } catch {
      /* ignore */
    }
    return;
  }

  /** @type {Record<string, unknown>} */
  const api = {
    flags: debugFlags,
    acts: [...ACT_ORDER],
    startAct(actId, opts = {}) {
      if (!isValidActId(actId)) {
        console.warn('[debug] actId must be:', ACT_ORDER.join(', '));
        return;
      }
      game.scene.start('GameScene', {
        actId,
        debugAutoWin: Boolean(opts.autoWin),
        debugSkipBriefing: Boolean(opts.skipBriefing),
      });
    },
    gameOver(victory, actId = '1', extra = {}) {
      if (!isValidActId(actId)) actId = '1';
      game.scene.stop('GameOverScene');
      game.scene.stop('GameScene');
      game.scene.start('GameOverScene', {
        victory,
        actId,
        score: extra.score ?? 50000,
        timeLeft: extra.timeLeft ?? 42,
        goldEarned: extra.goldEarned ?? 20,
        firstBadIndex: extra.firstBadIndex ?? (victory ? null : 2),
      });
    },
    unlockAll: debugUnlockAllActs,
    unlockComplete: debugUnlockComplete,
    resetCampaign: debugResetCampaign,
    getCampaign: debugGetCampaign,
  };

  window.__TRE_DEBUG__ = api;
}
