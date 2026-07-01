import { jointsMatch, validateColumn } from './SegmentGenerator.js';
import { FLAT_JOINT } from './SegmentTypes.js';

/**
 * AssembleEngine — chọn lóng + đặt lên cột.
 */
export class AssembleEngine {
  /**
   * @param {object} assembleConfig
   */
  constructor(assembleConfig) {
    this.config = assembleConfig;
    /** @type {string|null} */
    this.selectedId = null;
    /** @type {string|null} */
    this.dragSegmentId = null;
  }

  reset() {
    this.selectedId = null;
    this.dragSegmentId = null;
  }

  /**
   * @param {import('./SegmentTypes.js').BambooSegment} segment
   * @param {import('./SegmentTypes.js').BambooSegment[]} column
   */
  canPlaceOnColumn(segment, column) {
    if (column.length === 0) {
      return segment.jointTop === FLAT_JOINT;
    }
    const below = column[column.length - 1];
    return jointsMatch(below, segment);
  }

  /**
   * @param {string} segmentId
   * @param {import('./GameState.js').GameState} state
   */
  selectSegment(segmentId, state) {
    if (!state.assemblePool.some((s) => s.id === segmentId)) return false;
    this.selectedId = segmentId;
    this.dragSegmentId = segmentId;
    return true;
  }

  /**
   * @param {string} segmentId
   * @param {import('./GameState.js').GameState} state
   */
  beginDrag(segmentId, state) {
    return this.selectSegment(segmentId, state);
  }

  cancelDrag() {
    this.dragSegmentId = null;
    this.selectedId = null;
  }

  /**
   * @param {string} segmentId
   * @param {import('./GameState.js').GameState} state
   * @returns {{ placed: boolean, segment?: import('./SegmentTypes.js').BambooSegment, wrongJoint?: boolean }}
   */
  tryAutoPlace(segmentId, state) {
    const seg = state.assemblePool.find((s) => s.id === segmentId);
    if (!seg) return { placed: false };
    if (!this.canPlaceOnColumn(seg, state.column)) {
      return { placed: false, wrongJoint: true };
    }
    state.assemblePool = state.assemblePool.filter((s) => s.id !== seg.id);
    state.column.push(seg);
    this.selectedId = null;
    this.dragSegmentId = null;
    return { placed: true, segment: seg };
  }

  /**
   * Trả lóng dưới cùng về kho.
   * @param {import('./GameState.js').GameState} state
   */
  popBottomToPool(state) {
    if (state.column.length === 0) return { removed: false };
    const seg = state.column.pop();
    state.assemblePool.push(seg);
    this.selectedId = null;
    this.dragSegmentId = null;
    return { removed: true, segment: seg };
  }

  /**
   * @param {import('./GameState.js').GameState} state
   * @returns {{ placed: boolean, segment?: import('./SegmentTypes.js').BambooSegment, wrongJoint?: boolean }}
   */
  tryPlaceOnColumn(state) {
    const id = this.selectedId ?? this.dragSegmentId;
    if (!id) return { placed: false };
    return this.tryAutoPlace(id, state);
  }

  /**
   * @param {import('./GameState.js').GameState} state
   */
  shouldAdvanceToRitual(state) {
    return state.column.length >= state.actConfig.assembleTarget;
  }

  /**
   * @param {import('./GameState.js').GameState} state
   */
  validateForRitual(state) {
    return validateColumn(state.column, state.segmentSet.chain);
  }
}
