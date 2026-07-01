import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getActConfig } from '../src/core/actConfig.js';
import {
  generateActSegments,
  generateChain,
  createRng,
  validateColumn,
  jointsMatch,
} from '../src/core/SegmentGenerator.js';

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

console.log('Segment generator tests\n');

// 1. Chain internal joints
const rng = createRng(42);
const chain = generateChain(10, 4, rng, 'test');
for (let i = 1; i < chain.length; i++) {
  assert(jointsMatch(chain[i - 1], chain[i]), `chain joint ${i - 1}→${i} matches`);
}
assert(chain[0].jointTop === 'flat', 'first segment top is flat');
assert(chain[chain.length - 1].jointBottom === 'flat', 'last segment bottom is flat');
assert(chain.length === 10, 'chain length is 10');

// 2. validateColumn — joint-based
const okResult = validateColumn(chain, chain);
assert(okResult.ok === true, 'validateColumn accepts correct column');

const shuffledWrong = [...chain].reverse();
const badResult = validateColumn(shuffledWrong, chain);
assert(badResult.ok === false, 'validateColumn rejects reversed column');
assert(typeof badResult.firstBadIndex === 'number', 'returns firstBadIndex on fail');

const withDecoy = [...chain];
const act1 = getActConfig(balance, '1');
const set1 = generateActSegments('1', act1, 123);
withDecoy[3] = { ...set1.decoys[0] };
const decoyResult = validateColumn(withDecoy, chain);
assert(decoyResult.ok === false, 'validateColumn rejects decoy in column');

// 3. Act 1 generation
assert(set1.chain.length === act1.assembleTarget, `act1 chain length ${act1.assembleTarget}`);
assert(set1.decoys.length >= 1, 'act1 has decoys');
assert(set1.pool.length === set1.chain.length + set1.decoys.length, 'pool size matches');

// 4. Deterministic seed
const a = generateActSegments('1', act1, 999);
const b = generateActSegments('1', act1, 999);
assert(a.chain[0].id === b.chain[0].id, 'same seed → same chain id');

const c = generateActSegments('1', act1, 1000);
const sameShape =
  a.chain.length === c.chain.length &&
  a.chain.every((seg, i) => seg.jointBottom === c.chain[i].jointBottom);
assert(!sameShape, 'different seed → different chain shape');

// 5. Wrong column length
const shortCol = chain.slice(0, 5);
const shortResult = validateColumn(shortCol, chain);
assert(shortResult.ok === false && shortResult.firstBadIndex === 5, 'short column fails at index 5');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
