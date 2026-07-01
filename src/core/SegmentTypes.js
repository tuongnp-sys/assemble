/** @typedef {'flat'|'circle'|'triangle'|'wave'|'cross'|'diamond'|'zigzag'|'dot'|'line'|'star'|'moon'} JointPattern */

/** @type {readonly JointPattern[]} */
export const ALL_JOINT_PATTERNS = [
  'circle',
  'triangle',
  'wave',
  'cross',
  'diamond',
  'zigzag',
  'dot',
  'line',
  'star',
  'moon',
];

/** @type {JointPattern} */
export const FLAT_JOINT = 'flat';

/**
 * @typedef {{
 *   id: string,
 *   jointTop: JointPattern,
 *   jointBottom: JointPattern,
 *   isDecoy: boolean,
 *   rotation: 0|180,
 *   sequenceIndex: number
 * }} BambooSegment
 */

/**
 * @typedef {{
 *   chain: BambooSegment[],
 *   decoys: BambooSegment[],
 *   pool: BambooSegment[]
 * }} ActSegmentSet
 */

/**
 * @typedef {{ ok: true } | { ok: false, firstBadIndex: number }} ColumnValidation
 */

export {};
