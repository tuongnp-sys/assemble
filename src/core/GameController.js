import { GameState } from './GameState.js';
import { CollectEngine } from './CollectEngine.js';
import { AssembleEngine } from './AssembleEngine.js';
import { RitualEngine } from './RitualEngine.js';
import { SaboteurDirector } from './SaboteurDirector.js';
import { findButHint, pickButHelpMessage } from './butHelpService.js';
import { applyButGhepMagic, pickButGhepMessage } from './butGhepService.js';
import balance from '../data/balance.json';
import { getActConfig, getAssembleBonusSec, getRitualBonusSec } from './actConfig.js';

/**
 * Điều phối logic trận — GameScene chỉ render + input.
 */
export class GameController {
  /**
   * @param {string} [actId]
   * @param {number} [dailySeed]
   */
  constructor(actId = '1', dailySeed = 0) {
    this.state = new GameState(actId, dailySeed);
    const cfg = this.state.actConfig;
    this.collect = new CollectEngine(cfg.collect);
    this.assemble = new AssembleEngine(cfg.assemble);
    this.ritual = new RitualEngine(cfg.ritual);
    this.saboteur = new SaboteurDirector();
    this.paused = false;
    this.butHelpFrozen = false;
  }

  /**
   * @param {import('./GameState.js').GameState} state
   * @param {Array<{ type: string, [key: string]: unknown }>} events
   */
  _advanceToAssemble(state, events) {
    if (state.phase === 'ASSEMBLE' || state.phase === 'RITUAL') return;
    state.setPhase('ASSEMBLE');
    events.push({ type: 'phase', phase: 'ASSEMBLE' });
    if (!state.assembleBonusGranted) {
      const sec = getAssembleBonusSec(state.actConfig, balance);
      state.addTime(sec);
      state.assembleBonusGranted = true;
      events.push({ type: 'time_bonus', seconds: sec, label: 'GHÉP LÓNG' });
    }
  }

  /**
   * @param {import('./GameState.js').GameState} state
   * @param {Array<{ type: string, [key: string]: unknown }>} events
   */
  _advanceToRitual(state, events) {
    if (state.phase === 'RITUAL') return;
    state.setPhase('RITUAL');
    events.push({ type: 'phase', phase: 'RITUAL' });
    if (!state.ritualBonusGranted) {
      const sec = getRitualBonusSec(balance);
      state.addTime(sec);
      state.ritualBonusGranted = true;
      events.push({ type: 'time_bonus', seconds: sec, label: 'KHẮC NHẬP' });
    }
  }

  setPaused(v) {
    this.paused = v;
    if (v && this.state.ritualHolding) {
      this.ritual.cancelHold(this.state);
    }
  }

  setButHelpFrozen(v) {
    this.butHelpFrozen = v;
  }

  /** @param {number} laneY */
  setCollectLaneY(laneY) {
    this.collect.config.laneY = laneY;
  }

  /**
   * Lựa chọn khi gọi Bụt trong ASSEMBLE.
   */
  getButCallOptions() {
    const state = this.state;
    if (state.ended || state.phase !== 'ASSEMBLE') {
      return { hint: false, ghep: false };
    }
    return {
      hint: state.butHelpUsesLeft > 0,
      ghep: state.butGhepUsesLeft > 0,
    };
  }

  /**
   * Gọi Bụt — chỉ bài lóng đúng (không tự ghép).
   */
  handleButHelp() {
    const state = this.state;
    if (this.butHelpFrozen || this.paused || state.ended) {
      return { events: [] };
    }
    if (state.phase !== 'ASSEMBLE') {
      return { events: [], reason: 'wrong_phase' };
    }
    if (state.butHelpUsesLeft <= 0) {
      return { events: [], reason: 'no_uses' };
    }

    const hint = findButHint(state, this.assemble);
    state.butHelpUsesLeft -= 1;
    const message = pickButHelpMessage(hint.kind, state.actId);

    return {
      events: [
        {
          type: 'but_help',
          hint,
          message,
          usesLeft: state.butHelpUsesLeft,
        },
      ],
    };
  }

  /**
   * Bụt ghép phép — biến hóa cột/kho + ghép hộ (trừ 50% điểm màn).
   */
  handleButGhep() {
    const state = this.state;
    if (this.butHelpFrozen || this.paused || state.ended) {
      return { events: [] };
    }
    if (state.phase !== 'ASSEMBLE') {
      return { events: [], reason: 'wrong_phase' };
    }
    if (state.butGhepUsesLeft <= 0) {
      return { events: [], reason: 'no_ghep' };
    }

    const result = applyButGhepMagic(state);
    if (result.placedCount <= 0 && result.transformedPrefix <= 0) {
      return { events: [], reason: 'nothing_to_place' };
    }

    state.butGhepUsesLeft -= 1;
    state.butGhepUsed = true;
    this.assemble.reset();

    const message = pickButGhepMessage(state.actId, result);

    return {
      events: [
        {
          type: 'but_ghep',
          ...result,
          message,
          ghepUsesLeft: state.butGhepUsesLeft,
        },
      ],
    };
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    const state = this.state;
    /** @type {Array<{ type: string, [key: string]: unknown }>} */
    const events = [];

    if (this.paused || state.ended) {
      return { ended: state.ended, victory: state.victory, events, phaseChanged: false };
    }

    if (this.butHelpFrozen) {
      return {
        ended: state.ended,
        victory: state.victory,
        events,
        phaseChanged: false,
        firstBadIndex: null,
        hudHidden: this.saboteur.isHudHidden(),
      };
    }

    const prevPhase = state.phase;
    state.tickTime(dt);

    if (state.timeUp && !state.ended) {
      state.finishDefeat(null);
      events.push({ type: 'time_up' });
      return { ended: true, victory: false, events, phaseChanged: false, firstBadIndex: null };
    }

    if (state.phase === 'COLLECT') {
      this.collect.tick(dt, state);
      if (this.collect.shouldAdvanceToAssemble(state)) {
        this._advanceToAssemble(state, events);
      }
    } else if (state.phase === 'ASSEMBLE') {
      const sab = this.saboteur.tick(dt, state);
      if (sab) {
        state.recordSaboteurEvent();
        events.push(sab);
      }
      if (this.assemble.shouldAdvanceToRitual(state)) {
        this._advanceToRitual(state, events);
      }
    } else if (state.phase === 'RITUAL') {
      this.ritual.tick(dt, state);
      const sab = this.saboteur.tick(dt, state);
      if (sab) {
        state.recordSaboteurEvent();
        events.push(sab);
      }
      if (state.ritualHolding && !state.ended) {
        const auto = this.ritual.tryAutoComplete(state, this.assemble);
        if (auto.resolved) {
          events.push({
            type: auto.victory ? 'khac_nhap' : 'khac_xuat',
            firstBadIndex: auto.firstBadIndex,
          });
        }
      }
    }

    return {
      ended: state.ended,
      victory: state.victory,
      events,
      phaseChanged: prevPhase !== state.phase,
      firstBadIndex: state.firstBadIndex,
      hudHidden: this.saboteur.isHudHidden(),
    };
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  handleTap(x, y) {
    const state = this.state;
    if (this.paused || this.butHelpFrozen || state.ended) return { events: [] };

    /** @type {Array<{ type: string, [key: string]: unknown }>} */
    const events = [];

    if (state.phase === 'COLLECT') {
      const hit = this.collect.tryTap(x, y, state);
      if (hit.result === 'ok') events.push({ type: 'collect_ok', segment: hit.segment });
      else if (hit.result === 'bad') {
        state.recordWrongDecoyTap();
        events.push({ type: 'collect_bad', segment: hit.segment });
      }
      if (this.collect.shouldAdvanceToAssemble(state)) {
        this._advanceToAssemble(state, events);
      }
    }

    return { events };
  }

  /**
   * Chạm lóng trong kho — khớp mắt thì tự ghép lên cột.
   * @param {string} segmentId
   */
  handlePoolSelect(segmentId) {
    if (this.state.phase !== 'ASSEMBLE' || this.paused || this.butHelpFrozen) {
      return { events: [] };
    }
    const result = this.assemble.tryAutoPlace(segmentId, this.state);
    /** @type {Array<{ type: string, [key: string]: unknown }>} */
    const events = [];
    if (result.placed) {
      events.push({ type: 'snap', segment: result.segment });
      if (this.assemble.shouldAdvanceToRitual(this.state)) {
        this._advanceToRitual(this.state, events);
      }
    } else if (result.wrongJoint) {
      events.push({ type: 'wrong_joint' });
    }
    return { events };
  }

  /** Trả lóng dưới cùng về kho (ASSEMBLE hoặc RITUAL — hết giờ mới khóa). */
  handleColumnUndo() {
    if (this.paused || this.butHelpFrozen || this.state.ended) return { events: [] };
    if (this.state.phase !== 'ASSEMBLE' && this.state.phase !== 'RITUAL') {
      return { events: [] };
    }

    const wasRitual = this.state.phase === 'RITUAL';
    if (wasRitual) {
      this.ritual.cancelHold(this.state);
    }

    const result = this.assemble.popBottomToPool(this.state);
    if (!result.removed) return { events: [] };

    /** @type {Array<{ type: string, [key: string]: unknown }>} */
    const events = [{ type: 'unsnap', segment: result.segment }];

    if (
      wasRitual &&
      this.state.column.length < this.state.actConfig.assembleTarget
    ) {
      this.state.phase = 'ASSEMBLE';
      events.push({ type: 'phase', phase: 'ASSEMBLE' });
    }

    return { events };
  }

  /**
   * Đặt lóng đang chọn lên cột (drag fallback).
   */
  handleColumnPlace() {
    if (this.state.phase !== 'ASSEMBLE') return { events: [] };
    const result = this.assemble.tryPlaceOnColumn(this.state);
    /** @type {Array<{ type: string, [key: string]: unknown }>} */
    const events = [];
    if (result.placed) {
      events.push({ type: 'snap', segment: result.segment });
      if (this.assemble.shouldAdvanceToRitual(this.state)) {
        this._advanceToRitual(this.state, events);
      }
    } else if (result.wrongJoint) {
      events.push({ type: 'wrong_joint' });
    }
    return { events };
  }

  handleDragStart(segmentId) {
    return this.handlePoolSelect(segmentId).events.length > 0;
  }

  handleDragEnd() {
    return this.handleColumnPlace();
  }

  handleRitualDown() {
    if (this.state.phase !== 'RITUAL' || this.paused) return;
    this.ritual.holdStart(this.state);
  }

  handleRitualUp() {
    if (this.state.phase !== 'RITUAL' || this.paused || !this.state.ritualHolding) {
      return { ended: false, victory: false, events: [], tooEarly: false };
    }
    const res = this.ritual.holdEnd(this.state, this.assemble);
    /** @type {Array<{ type: string, [key: string]: unknown }>} */
    const events = [];
    if (res.resolved) {
      events.push({
        type: res.victory ? 'khac_nhap' : 'khac_xuat',
        firstBadIndex: res.firstBadIndex,
      });
    }
    return {
      ended: this.state.ended,
      victory: this.state.victory,
      events,
      firstBadIndex: res.firstBadIndex,
      tooEarly: res.tooEarly === true,
    };
  }
}
