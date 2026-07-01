import balance from '../data/balance.json' with { type: 'json' };
import { pickBilingual } from './locale.js';
import { t } from './i18n.js';
import { ACT_ORDER } from './actConfig.js';

const DEFAULT_MSG_KEYS = {
  pool: ['but_help.msg_pool_1', 'but_help.msg_pool_2'],
  undo: ['but_help.msg_undo_1'],
  none: ['but_help.msg_none_1'],
};

/**
 * @param {string} actId
 * @param {object} [bal]
 */
export function getButHelpMaxUses(actId, bal = balance) {
  const cfg = bal.butHelp ?? {};
  const enabledFrom = cfg.enabledFromAct ?? '2';
  const fromIdx = ACT_ORDER.indexOf(enabledFrom);
  const actIdx = ACT_ORDER.indexOf(actId);
  if (actIdx < 0 || fromIdx < 0 || actIdx < fromIdx) return 0;
  return cfg.usesPerAct?.[actId] ?? 0;
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function isButHelpEnabled(state) {
  return getButHelpMaxUses(state.actId) > 0;
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {import('./AssembleEngine.js').AssembleEngine} assemble
 */
export function findButHint(state, assemble) {
  const matches = state.assemblePool.filter((s) =>
    assemble.canPlaceOnColumn(s, state.column)
  );

  if (matches.length > 0) {
    const chainIds = new Set(state.segmentSet.chain.map((s) => s.id));
    const seg = matches.find((s) => chainIds.has(s.id)) ?? matches[0];
    return { kind: 'pool', segmentId: seg.id, segment: seg };
  }

  if (state.column.length > 0) {
    return { kind: 'undo' };
  }

  return { kind: 'none' };
}

/**
 * @param {'pool'|'undo'|'none'} kind
 * @param {string} [actId]
 */
export function pickButHelpMessage(kind, actId) {
  const custom = balance.butHelp?.lines?.[actId]?.[kind];
  if (Array.isArray(custom) && custom.length) {
    const item = custom[Math.floor(Math.random() * custom.length)];
    if (typeof item === 'string') return item;
    return pickBilingual(item);
  }
  const keys = DEFAULT_MSG_KEYS[kind] ?? DEFAULT_MSG_KEYS.none;
  const key = keys[Math.floor(Math.random() * keys.length)];
  return t(key);
}

export function getButHelpOverlaySec(bal = balance) {
  return bal.butHelp?.overlaySec ?? 2.8;
}

export function shouldPauseTimerDuringButHelp(bal = balance) {
  return bal.butHelp?.pauseTimerDuringHint !== false;
}

export function getAchievementText(id) {
  if (id === 'tre_master') {
    return {
      title: t('achievement.tre_master_title'),
      desc: t('achievement.tre_master_desc'),
      icon: '👑',
    };
  }
  return { title: id, desc: '', icon: '👑' };
}
