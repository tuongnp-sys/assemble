import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameState } from '../src/core/GameState.js';
import { computeActScore, computeScoreBreakdown, getActWeight } from '../src/core/scoring.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const balance = JSON.parse(
  readFileSync(path.join(__dirname, '../src/data/balance.json'), 'utf8')
);

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

function makeState(actId, overrides = {}) {
  const s = new GameState(actId, 0);
  Object.assign(s, overrides);
  return s;
}

console.log('Scoring tests\n');

assert(getActWeight('1') === 1, 'act 1 weight');
assert(getActWeight('finale') === 5, 'finale weight 5');

const act1Perfect = makeState('1', {
  timeLeft: 75,
  wrongDecoyTaps: 0,
  saboteurEvents: 0,
  victory: true,
  butGhepUsed: false,
});
const b1 = computeScoreBreakdown(act1Perfect, true);
assert(b1.base === 10000, 'act1 base 10k');
assert(b1.timeBonus === 5000, 'act1 full time bonus');
assert(b1.total === 15000, 'act1 perfect 15k');

const act1Sloppy = makeState('1', {
  timeLeft: 40,
  wrongDecoyTaps: 2,
  victory: true,
});
const b1s = computeScoreBreakdown(act1Sloppy, true);
assert(b1s.decoyPenalty === 400, '2 decoy taps = 400 penalty');
assert(b1s.total < b1.total, 'sloppy < perfect');

const finale = makeState('finale', {
  timeLeft: 55,
  wrongDecoyTaps: 0,
  saboteurEvents: 3,
  victory: true,
});
const bf = computeScoreBreakdown(finale, true);
assert(bf.base === 50000, 'finale base 50k');
assert(bf.saboteurBonus === 300, '3 saboteur events capped partial');
assert(bf.total > b1.total, 'finale beats act1 perfect');

const defeat = makeState('1', { timeLeft: 50, victory: false });
assert(computeActScore(defeat, false) === 0, 'defeat score is 0');

const act2Ghep = makeState('2', {
  timeLeft: 90,
  wrongDecoyTaps: 0,
  victory: true,
  butGhepUsed: true,
});
const act2Normal = makeState('2', {
  timeLeft: 90,
  wrongDecoyTaps: 0,
  victory: true,
  butGhepUsed: false,
});
const b2g = computeScoreBreakdown(act2Ghep, true);
const b2n = computeScoreBreakdown(act2Normal, true);
assert(b2g.butGhepPenalty > 0, 'but ghep penalty applied');
assert(b2g.total === Math.max(100, b2n.total - b2g.butGhepPenalty), 'ghep halves score');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
