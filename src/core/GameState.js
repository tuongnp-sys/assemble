import { getActConfig, getGoldReward } from './actConfig.js';
import { generateActSegments } from './SegmentGenerator.js';
import { computeActScore, computeScoreBreakdown } from './scoring.js';
import { getButHelpMaxUses } from './butHelpService.js';
import { getButGhepMaxUses } from './butGhepService.js';
import balance from '../data/balance.json' with { type: 'json' };
/**
 * Trạng thái trận — không phụ thuộc Phaser.
 */
export class GameState {
  /**
   * @param {string} [actId]
   * @param {number} [dailySeed]
   */
  constructor(actId = '1', dailySeed = 0) {
    this.actId = actId;
    this.dailySeed = dailySeed;
    /** @type {ReturnType<typeof getActConfig>} */
    this.actConfig = getActConfig(balance, actId);
    /** @type {import('./GamePhase.js').GamePhase} */
    this.phase = 'COLLECT';
    this.timeLeft = this.actConfig.timeSec;
    /** @type {import('./SegmentTypes.js').ActSegmentSet} */
    this.segmentSet = generateActSegments(actId, this.actConfig, dailySeed);
    /** @type {import('./SegmentTypes.js').BambooSegment[]} */
    this.inventory = [];
    /** @type {import('./SegmentTypes.js').BambooSegment[]} */
    this.assemblePool = [];
    /** @type {import('./SegmentTypes.js').BambooSegment[]} */
    this.column = [];
    this.correctCollects = 0;
    this.ritualHoldSec = 0;
    this.ritualHolding = false;
    this.ended = false;
    this.victory = false;
    /** @type {number|null} */
    this.firstBadIndex = null;
    this.goldEarned = 0;
    this.elapsed = 0;
    /** @type {Set<string>} */
    this.collectedIds = new Set();
    this.wrongDecoyTaps = 0;
    this.saboteurEvents = 0;
    this.assembleBonusGranted = false;
    this.ritualBonusGranted = false;
    this.butHelpUsesLeft = getButHelpMaxUses(actId);
    this.butGhepUsesLeft = getButGhepMaxUses(actId);
    this.butGhepUsed = false;
    /** @type {import('./scoring.js').ScoreBreakdown|null} */
    this.scoreBreakdown = null;
  }

  reset(actId = '1', dailySeed = 0) {
    this.actId = actId;
    this.dailySeed = dailySeed;
    this.actConfig = getActConfig(balance, actId);
    this.phase = 'COLLECT';
    this.timeLeft = this.actConfig.timeSec;
    this.segmentSet = generateActSegments(actId, this.actConfig, dailySeed);
    this.inventory = [];
    this.assemblePool = [];
    this.column = [];
    this.correctCollects = 0;
    this.ritualHoldSec = 0;
    this.ritualHolding = false;
    this.ended = false;
    this.victory = false;
    this.firstBadIndex = null;
    this.goldEarned = 0;
    this.elapsed = 0;
    this.collectedIds = new Set();
    this.wrongDecoyTaps = 0;
    this.saboteurEvents = 0;
    this.assembleBonusGranted = false;
    this.ritualBonusGranted = false;
    this.butHelpUsesLeft = getButHelpMaxUses(actId);
    this.butGhepUsesLeft = getButGhepMaxUses(actId);
    this.butGhepUsed = false;
    this.scoreBreakdown = null;
  }
  tickTime(dt) {
    if (this.ended || this.phase === 'RITUAL' && this.ritualHolding) {
      // still tick during ritual hold? yes keep pressure
    }
    this.elapsed += dt;
    this.timeLeft = Math.max(0, this.timeLeft - dt);
  }

  get timeUp() {
    return this.timeLeft <= 0;
  }

  /** @param {number} sec */
  addTime(sec) {
    if (sec > 0) this.timeLeft += sec;
  }

  get assembleProgress() {
    return this.column.length / this.actConfig.assembleTarget;
  }

  get collectProgress() {
    return this.inventory.length / this.actConfig.assembleTarget;
  }

  get score() {
    if (this.scoreBreakdown) return this.scoreBreakdown.total;
    if (!this.victory) return 0;
    return computeActScore(this, true);
  }

  recordWrongDecoyTap() {
    this.wrongDecoyTaps += 1;
  }

  recordSaboteurEvent() {
    this.saboteurEvents += 1;
  }

  finishVictory() {
    this.ended = true;
    this.victory = true;
    this.phase = 'ENDED';
    this.goldEarned = getGoldReward(this.actId);
    this.scoreBreakdown = computeScoreBreakdown(this, true);
  }

  /**
   * @param {number|null} badIndex
   */
  finishDefeat(badIndex = null) {
    this.ended = true;
    this.victory = false;
    this.phase = 'ENDED';
    this.firstBadIndex = badIndex;
  }

  /**
   * @param {import('./GamePhase.js').GamePhase} next
   */
  setPhase(next) {
    this.phase = next;
    if (next === 'ASSEMBLE') {
      this.assemblePool = [...this.inventory];
    }
  }
}
