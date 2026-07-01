import sabotageConfig from '../data/sabotage.json';

/**
 * Phú ông phá — act 3+.
 */
export class SaboteurDirector {
  constructor() {
    /** @type {Record<string, number>} */
    this.cooldowns = {};
    this._hideHudUntil = 0;
  }

  reset() {
    this.cooldowns = {};
    this._hideHudUntil = 0;
  }

  isHudHidden() {
    return Date.now() < this._hideHudUntil;
  }

  /**
   * @param {number} dt
   * @param {import('./GameState.js').GameState} state
   */
  tick(dt, state) {
    if (!state.actConfig.saboteurEnabled) return null;
    if (state.phase !== 'ASSEMBLE' && state.phase !== 'RITUAL') return null;

    const progress = state.assembleProgress;
    const timeLeft = state.timeLeft;

    for (const [key, cfg] of Object.entries(sabotageConfig)) {
      const cd = this.cooldowns[key] ?? 0;
      if (cd > 0) {
        this.cooldowns[key] = cd - dt * 1000;
        continue;
      }
      if (progress < (cfg.minProgress ?? 0.5)) continue;
      if (cfg.maxTimeLeft != null && timeLeft > cfg.maxTimeLeft) continue;

      if (Math.random() < dt * 0.12) {
        this.cooldowns[key] = cfg.cooldownMs ?? 18000;
        return this._applyEvent(key, cfg, state);
      }
    }
    return null;
  }

  _applyEvent(key, cfg, state) {
    if (key === 'phuong_nem_da' && state.column.length > 0) {
      const dropCount = cfg.dropCount ?? 1;
      for (let i = 0; i < dropCount && state.column.length; i++) {
        const seg = state.column.pop();
        if (seg) state.assemblePool.push(seg);
      }
      return { type: 'saboteur_drop', messageKey: 'saboteur.drop' };
    }
    if (key === 'phuong_tha_ga') {
      const decoys = state.segmentSet.decoys;
      if (decoys.length) {
        const d = decoys[Math.floor(Math.random() * decoys.length)];
        state.assemblePool.push({ ...d, id: `${d.id}_inj_${Date.now()}` });
      }
      return { type: 'saboteur_decoy', messageKey: 'saboteur.decoy' };
    }
    if (key === 'set_mat_hud') {
      this._hideHudUntil = Date.now() + (cfg.hideHudMs ?? 2000);
      return { type: 'saboteur_hud', messageKey: 'saboteur.hud' };
    }
    return { type: 'saboteur', messageKey: 'saboteur.drop' };
  }
}
