import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameState } from '../src/core/GameState.js';
import { generateActSegments } from '../src/core/SegmentGenerator.js';
import { getActConfig } from '../src/core/actConfig.js';
import { validateColumn } from '../src/core/SegmentGenerator.js';
import {
  applyButGhepMagic,
  computePlaceCount,
  getButGhepMaxUses,
} from '../src/core/butGhepService.js';
import { computeScoreBreakdown } from '../src/core/scoring.js';
import { AssembleEngine } from '../src/core/AssembleEngine.js';

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

function makeAssembleState(actId, columnLength = 0, wrongColumn = false) {
  const actConfig = getActConfig(balance, actId);
  const state = new GameState(actId, 42);
  state.phase = 'ASSEMBLE';
  state.setPhase('ASSEMBLE');
  const chain = state.segmentSet.chain;

  if (wrongColumn && columnLength > 0) {
    state.column = chain.slice(0, columnLength).map((s) => ({
      ...s,
      jointBottom: 'circle',
      jointTop: columnLength === 1 ? 'flat' : 'triangle',
    }));
  } else if (columnLength > 0) {
    state.column = chain.slice(0, columnLength).map((s) => ({ ...s }));
  }

  state.assemblePool = [...state.inventory];
  return state;
}

console.log('But Ghép phép tests\n');

assert(getButGhepMaxUses('1') === 0, 'act1 no ghep');
assert(getButGhepMaxUses('2') === 1, 'act2 one ghep');
assert(getButGhepMaxUses('finale') === 1, 'finale one ghep');

assert(
  computePlaceCount('finale', 0, 40, { config: balance.butGhep }) === 37,
  'finale from empty leaves 3 manual'
);
assert(
  computePlaceCount('finale', 10, 40, { config: balance.butGhep }) === 27,
  'finale from 10 leaves 3 manual'
);
assert(
  computePlaceCount('finale', 38, 40, { config: balance.butGhep }) === 0,
  'finale with 2 left places 0 (fewer than 3 manual)'
);

const act2Count = computePlaceCount('2', 5, 20, {
  config: balance.butGhep,
  rng: () => 0,
});
assert(act2Count >= 5 && act2Count <= 10, 'act2 rolled in 5-10 range');

const wrongState = makeAssembleState('3', 4, true);
const wrongBefore = validateColumn(wrongState.column, wrongState.segmentSet.chain);
assert(!wrongBefore.ok, 'wrong column fails validation before magic');

function columnPrefixMatchesChain(column, chain) {
  if (column.length > chain.length) return false;
  for (let i = 0; i < column.length; i++) {
    if (column[i].id !== chain[i].id) return false;
    if (column[i].jointTop !== chain[i].jointTop) return false;
    if (column[i].jointBottom !== chain[i].jointBottom) return false;
  }
  if (column.length > 1) {
    for (let i = 1; i < column.length; i++) {
      if (column[i - 1].jointBottom !== column[i].jointTop) return false;
    }
  }
  return true;
}

const magic = applyButGhepMagic(wrongState, { rng: () => 0.99 });
assert(magic.manualLeft >= 1, 'act3 leaves manual segments');
assert(
  columnPrefixMatchesChain(wrongState.column, wrongState.segmentSet.chain),
  'column prefix matches chain after magic'
);

const engine = new AssembleEngine(balance.assemble);
const nextNeeded = wrongState.segmentSet.chain[wrongState.column.length];
const poolHasNext = wrongState.assemblePool.some(
  (s) => s.id === nextNeeded.id && engine.canPlaceOnColumn(s, wrongState.column)
);
assert(poolHasNext, 'pool has placeable next chain segment');

const finaleState = makeAssembleState('finale', 0);
applyButGhepMagic(finaleState);
assert(finaleState.column.length === 37, 'finale magic places 37');
assert(finaleState.actConfig.assembleTarget - finaleState.column.length === 3, 'finale leaves 3 manual');

const scored = new GameState('2', 0);
scored.victory = true;
scored.timeLeft = 90;
scored.butGhepUsed = true;
const scoredNormal = new GameState('2', 0);
scoredNormal.victory = true;
scoredNormal.timeLeft = 90;
scoredNormal.butGhepUsed = false;
const b = computeScoreBreakdown(scored, true);
const bNo = computeScoreBreakdown(scoredNormal, true);
assert(b.butGhepPenalty === Math.floor(bNo.total * 0.5), '50% penalty on act score');
assert(b.total === bNo.total - b.butGhepPenalty, 'total after penalty');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
