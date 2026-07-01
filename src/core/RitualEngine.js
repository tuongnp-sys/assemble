/**
 * RitualEngine — hold Khắc Nhập, resolve thắng/thua.
 */
export class RitualEngine {
  /**
   * @param {object} ritualConfig
   */
  constructor(ritualConfig) {
    this.config = ritualConfig;
  }

  reset() {
    /* state lives on GameState */
  }

  /**
   * @param {import('./GameState.js').GameState} state
   */
  holdStart(state) {
    if (state.phase !== 'RITUAL' || state.ended) return;
    state.ritualHolding = true;
  }

  /**
   * @param {number} dt
   * @param {import('./GameState.js').GameState} state
   */
  tick(dt, state) {
    if (!state.ritualHolding || state.phase !== 'RITUAL') return;
    state.ritualHoldSec += dt;
  }

  /**
   * @param {import('./GameState.js').GameState} state
   */
  _holdThresholdSec() {
    const holdSec = this.config.holdSec ?? 1.2;
    return holdSec * 0.75;
  }

  /**
   * @param {import('./GameState.js').GameState} state
   * @param {import('./AssembleEngine.js').AssembleEngine} assemble
   * @param {{ forceComplete?: boolean }} [opts]
   * @returns {{ resolved: boolean, victory?: boolean, firstBadIndex?: number, tooEarly?: boolean }}
   */
  holdEnd(state, assemble, opts = {}) {
    if (state.phase !== 'RITUAL') return { resolved: false };

    const forceComplete = opts.forceComplete === true;
    state.ritualHolding = false;

    const minHold = this.config.holdMinSec ?? 0.35;
    const holdSec = this.config.holdSec ?? 1.2;
    const threshold = this._holdThresholdSec();
    const held = state.ritualHoldSec;

    if (!forceComplete && held < minHold) {
      state.ritualHoldSec = 0;
      return { resolved: false, tooEarly: false };
    }

    if (!forceComplete && held < threshold) {
      state.ritualHoldSec = 0;
      return { resolved: false, tooEarly: true };
    }

    const result = assemble.validateForRitual(state);
    state.ritualHoldSec = 0;

    if (result.ok) {
      state.finishVictory();
      return { resolved: true, victory: true };
    }
    state.finishDefeat(result.firstBadIndex);
    return { resolved: true, victory: false, firstBadIndex: result.firstBadIndex };
  }

  /**
   * Giữ đủ thời gian → tự khắc nhập/xuất không cần thả tay.
   * @param {import('./GameState.js').GameState} state
   * @param {import('./AssembleEngine.js').AssembleEngine} assemble
   */
  tryAutoComplete(state, assemble) {
    if (state.phase !== 'RITUAL' || !state.ritualHolding || state.ended) {
      return { resolved: false };
    }
    const holdSec = this.config.holdSec ?? 1.2;
    if (state.ritualHoldSec < holdSec) return { resolved: false };
    return this.holdEnd(state, assemble, { forceComplete: true });
  }

  /**
   * @param {import('./GameState.js').GameState} state
   */
  cancelHold(state) {
    state.ritualHolding = false;
    state.ritualHoldSec = 0;
  }
}
