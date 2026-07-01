/**
 * CollectEngine — spawn lóng trôi, xử lý tap.
 */
export class CollectEngine {
  /**
   * @param {object} collectConfig
   */
  constructor(collectConfig) {
    this.config = collectConfig;
    this.spawnTimer = 0;
    /** @type {import('./GamePhase.js').DriftingSegment[]} */
    this.drifting = [];
    this._spawnCounter = 0;
  }

  reset() {
    this.spawnTimer = 0;
    this.drifting = [];
    this._spawnCounter = 0;
  }

  /**
   * @param {import('./GameState.js').GameState} state
   * @returns {import('./GamePhase.js').DriftingSegment|null}
   */
  _pickSpawnSegment(state) {
    const { chain, decoys } = state.segmentSet;
    const uncollected = chain.filter((s) => !state.collectedIds.has(s.id));
    const candidates = [...uncollected, ...decoys];
    if (!candidates.length) return null;
    const idx = Math.floor(Math.random() * candidates.length);
    return candidates[idx];
  }

  /**
   * @param {import('./GameState.js').GameState} state
   * @param {number} dt
   */
  tick(dt, state) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && state.inventory.length < state.actConfig.assembleTarget) {
      const seg = this._pickSpawnSegment(state);
      if (seg) {
        this._spawnCounter++;
        this.drifting.push({
          id: `drift_${this._spawnCounter}`,
          segment: seg,
          x: 400,
          y: this.config.laneY ?? 220,
          speed: this.config.driftSpeed ?? 140,
        });
      }
      this.spawnTimer = this.config.spawnIntervalSec ?? 0.85;
    }

    const leftBound = -60;
    for (let i = this.drifting.length - 1; i >= 0; i--) {
      const d = this.drifting[i];
      d.x -= d.speed * dt;
      if (d.x < leftBound) {
        this.drifting.splice(i, 1);
      }
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {import('./GameState.js').GameState} state
   * @returns {{ result: 'ok'|'bad'|'miss', segment?: import('./SegmentTypes.js').BambooSegment }}
   */
  tryTap(x, y, state) {
    const hitR = 36;
    const laneY = this.config.laneY ?? 220;
    if (Math.abs(y - laneY) > 50) return { result: 'miss' };

    for (let i = this.drifting.length - 1; i >= 0; i--) {
      const d = this.drifting[i];
      if (Math.abs(x - d.x) <= hitR) {
        this.drifting.splice(i, 1);
        const seg = d.segment;
        if (seg.isDecoy) {
          state.timeLeft = Math.max(0, state.timeLeft - (this.config.wrongTapPenaltySec ?? 3));
          return { result: 'bad', segment: seg };
        }
        if (state.collectedIds.has(seg.id)) {
          return { result: 'miss' };
        }
        state.collectedIds.add(seg.id);
        state.inventory.push(seg);
        state.correctCollects++;
        return { result: 'ok', segment: seg };
      }
    }
    return { result: 'miss' };
  }

  shouldAdvanceToAssemble(state) {
    return state.inventory.length >= state.actConfig.assembleTarget;
  }
}
