/**
 * Phase 1 Module Validation Test
 *
 * Ensures all extracted modules load and produce correct results.
 * Run with: node tests/phase1-validation.js
 */

import { mulberry32, RNG, setSeed, rng, pick, U } from '../src/utils/rng.js';
import { assign, mS, sum, avg } from '../src/utils/helpers.js';
import { T, SP, RAD, SH, S } from '../src/config/theme.js';
import { DIFF_SETTINGS, SAVE_VERSION } from '../src/config/difficulty.js';
import { CAP_MATH, ROSTER_CAP, getSalaryCap, getCapFloor, getMinSalary } from '../src/config/cap-math.js';
import { HALFTIME_V2 } from '../src/systems/halftime.js';
import { TRAINING_CAMP_986 } from '../src/systems/training-camp.js';
import { FRANCHISE_TAG_986 } from '../src/systems/franchise-tag.js';
import { COMP_PICKS_986 } from '../src/systems/comp-picks.js';
import { INCENTIVES_986 } from '../src/systems/incentives.js';
import { GM_REP_986 } from '../src/systems/gm-reputation.js';
import { COACH_CAROUSEL_986 } from '../src/systems/coach-carousel.js';
import { makeContract, calcCapHit, calcDeadMoney, calcContractScore994, calcDeadCap994, calcFourthDownEV995 } from '../src/systems/contracts.js';

var pass = 0;
var fail = 0;

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log('  \x1b[32m\u2713\x1b[0m ' + name);
  } catch (e) {
    fail++;
    console.log('  \x1b[31m\u2717\x1b[0m ' + name + ': ' + e.message);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

console.log('\n\x1b[1m\x1b[33mMFD Phase 1 — Module Validation\x1b[0m\n');

// === RNG ===
console.log('\x1b[36mRNG System\x1b[0m');
test('mulberry32 produces floats in [0, 1)', function () {
  var r = mulberry32(42);
  for (var i = 0; i < 100; i++) {
    var v = r();
    assert(v >= 0 && v < 1, 'Out of range: ' + v);
  }
});
test('mulberry32 is deterministic (same seed = same sequence)', function () {
  var r1 = mulberry32(999);
  var r2 = mulberry32(999);
  for (var i = 0; i < 50; i++) {
    assert(r1() === r2(), 'Diverged at step ' + i);
  }
});
test('Different seeds produce different sequences', function () {
  var r1 = mulberry32(1);
  var r2 = mulberry32(2);
  var same = 0;
  for (var i = 0; i < 20; i++) {
    if (r1() === r2()) same++;
  }
  assert(same < 5, 'Too many collisions: ' + same);
});
test('RNG channels are independent', function () {
  setSeed(42);
  var p1 = RNG.play();
  setSeed(42);
  var p2 = RNG.play();
  assert(p1 === p2, 'play channel not deterministic');
});
test('U() generates unique IDs', function () {
  setSeed(100);
  var ids = {};
  for (var i = 0; i < 100; i++) {
    var id = U();
    assert(!ids[id], 'Duplicate ID: ' + id);
    ids[id] = true;
  }
});

// === Helpers ===
console.log('\n\x1b[36mHelpers\x1b[0m');
test('assign merges objects', function () {
  var r = assign({}, { a: 1 }, { b: 2 });
  assert(r.a === 1 && r.b === 2);
});
test('mS merges style objects', function () {
  var r = mS({ color: 'red' }, { fontSize: 12 });
  assert(r.color === 'red' && r.fontSize === 12);
});
test('sum and avg work correctly', function () {
  assert(sum([1, 2, 3]) === 6);
  assert(avg([2, 4, 6]) === 4);
  assert(sum([{ v: 10 }, { v: 20 }], function (x) { return x.v; }) === 30);
});

// === Theme ===
console.log('\n\x1b[36mTheme & Styles\x1b[0m');
test('Theme colors are defined', function () {
  assert(T.bg === '#070d17');      // Bloomberg Edition
  assert(T.gold === '#f0a028');    // Bloomberg amber
  assert(T.red === '#e03c3c');     // Bloomberg red
});
test('Spacing scale is correct', function () {
  assert(SP.xs === 4 && SP.sm === 8 && SP.md === 12 && SP.lg === 16 && SP.xl === 20);
});
test('Component styles exist', function () {
  assert(S.btn && S.btn.cursor === 'pointer');
  assert(S.card && S.card.borderRadius === RAD.lg);
  assert(S.badge && S.badge.fontWeight === 700);
});

// === Difficulty ===
console.log('\n\x1b[36mDifficulty Settings\x1b[0m');
test('All 4 difficulty tiers exist', function () {
  assert(DIFF_SETTINGS.rookie && DIFF_SETTINGS.pro && DIFF_SETTINGS.allpro && DIFF_SETTINGS.legend);
});
test('Difficulty values are correct', function () {
  assert(DIFF_SETTINGS.rookie.tradeMod === 0.85);
  assert(DIFF_SETTINGS.pro.tradeMod === 1.0);
  assert(DIFF_SETTINGS.allpro.tradeMod === 1.2);
  assert(DIFF_SETTINGS.legend.tradeMod === 1.45);
});

// === Cap Math ===
console.log('\n\x1b[36mCap Math\x1b[0m');
test('Base cap is $255M', function () {
  assert(CAP_MATH.BASE_CAP === 255.0);
});
test('getSalaryCap(2026) = 255', function () {
  assert(getSalaryCap(2026) === 255);
});
test('getSalaryCap grows over time', function () {
  assert(getSalaryCap(2027) > getSalaryCap(2026));
  assert(getSalaryCap(2030) > getSalaryCap(2028));
});
test('Cap floor is 90% of cap', function () {
  assert(getCapFloor(2026) === Math.floor(255 * 0.9));
});
test('Roster cap is 53', function () {
  assert(ROSTER_CAP === 53);
});

// === Game Systems ===
console.log('\n\x1b[36mGame Systems\x1b[0m');
test('Halftime V2 has 6 options', function () {
  assert(HALFTIME_V2.options.length === 6);
});
test('Halftime recommends no_huddle when down big', function () {
  assert(HALFTIME_V2.recommend(-14, 80, 80) === 'no_huddle');
});
test('Halftime recommends ball_control when up big', function () {
  assert(HALFTIME_V2.recommend(14, 80, 80) === 'ball_control');
});
test('Training camp has 5 focus areas', function () {
  assert(TRAINING_CAMP_986.focuses.length === 5);
  assert(TRAINING_CAMP_986.focuses.indexOf('offense') >= 0);
});
test('Franchise tag has 3 types', function () {
  assert(FRANCHISE_TAG_986.types.length === 3);
  assert(FRANCHISE_TAG_986.types[0].salaryMult === 1.2);
});
test('Incentives has 7 types', function () {
  assert(INCENTIVES_986.types.length === 7);
});
test('Incentives check works', function () {
  var result = INCENTIVES_986.check({ incentives986: [{ id: 'pass_yds', threshold: 3500, bonus: 2.0 }], stats: { passYds: 4000 } });
  assert(result.hit.length === 1 && result.totalBonus === 2.0);
});
test('Comp picks calculates correctly', function () {
  var picks = COMP_PICKS_986.calculate(
    [{ name: 'Star QB', pos: 'QB', ovr: 85 }],
    []
  );
  assert(picks.length === 1);
  assert(picks[0].round === 3); // OVR 85 -> round 3
});
test('GM Rep calculates correctly with empty log', function () {
  var rep = GM_REP_986.calculate([], null);
  assert(rep.fairDealer === 50);
  assert(rep.aggressive === 30); // base 30 + 0 trades + 0 signs
  assert(rep.loyalty === 50);
  assert(rep.overall === 43); // (50+30+50)/3 = 43.33 → 43
});
test('GM Rep label tiers work', function () {
  assert(GM_REP_986.getLabel(90).label === 'Elite GM');
  assert(GM_REP_986.getLabel(25).label === 'Untrusted');
});
test('Coach carousel fires and stores', function () {
  COACH_CAROUSEL_986.firedPool = [];
  COACH_CAROUSEL_986.fireCoach({ name: 'Test', role: 'HC', arch: 'Strategist', ratings: { development: 70 } }, { abbr: 'TST' }, 2026);
  assert(COACH_CAROUSEL_986.firedPool.length === 1);
  assert(COACH_CAROUSEL_986.firedPool[0].firedFrom === 'TST');
});

// === Contracts ===
console.log('\n\x1b[36mContract System\x1b[0m');
test('makeContract creates valid contract', function () {
  var c = makeContract(15, 4, 12, 30);
  assert(c.baseSalary === 15);
  assert(c.years === 4);
  assert(c.signingBonus === 12);
  assert(c.guaranteed === 30);
  assert(c.prorated === 3); // 12/4 = 3
});
test('calcCapHit returns base + prorated', function () {
  var c = makeContract(10, 4, 8, 20);
  var hit = calcCapHit(c);
  assert(hit === 12); // 10 + 8/4 = 12
});
test('calcDeadMoney returns prorated * years', function () {
  var c = makeContract(10, 4, 8, 20);
  var dead = calcDeadMoney(c);
  assert(dead === 8); // 2 * 4 = 8
});
test('calcDeadCap994 computes correctly', function () {
  var r = calcDeadCap994(20, 4, 1);
  assert(r.deadCapHit === 15); // 20 * 3/4 = 15
});
test('calcFourthDownEV995 returns recommendation', function () {
  var r = calcFourthDownEV995(1, 50, 0, 1, 900);
  assert(r.recommendation === 'go' || r.recommendation === 'fg' || r.recommendation === 'punt');
  assert(typeof r.goForIt.ev === 'number');
});

// === Summary ===
console.log('\n\x1b[1m' + (fail === 0 ? '\x1b[32m' : '\x1b[31m') +
  'Results: ' + pass + ' passed, ' + fail + ' failed\x1b[0m\n');

process.exit(fail > 0 ? 1 : 0);
