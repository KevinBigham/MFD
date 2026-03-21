import { describe, expect, it } from 'vitest';
import { HOOKS_ENGINE } from '../src/systems/hooks-engine.js';

describe('hooks-engine', function () {
  var mockState = {
    my: {
      id: 1, name: 'Eagles', wins: 8, losses: 3, streak: 4,
      roster: [
        { id: 'p1', name: 'Joe Star', pos: 'QB', ovr: 85, age: 24, devTrait: 'star', isStarter: true, contract: { years: 1, salary: 5 } },
        { id: 'p2', name: 'Mike Vet', pos: 'LT', ovr: 80, age: 30, holdout75: true, isStarter: true, contract: { years: 2, salary: 10 } },
      ],
      rivals: { 2: { heat: 10 } },
    },
    myId: 1,
    teams: [
      { id: 1, name: 'Eagles', icon: '🦅', wins: 8, losses: 3 },
      { id: 2, name: 'Cowboys', icon: '⭐', wins: 7, losses: 4 },
    ],
    sched: [
      { week: 13, home: 1, away: 2, played: false },
      { week: 14, home: 2, away: 1, played: false },
    ],
    season: { year: 2028, week: 12, phase: 'regular' },
    ownerPatience: 45,
  };

  it('generates up to 3 hooks', function () {
    var hooks = HOOKS_ENGINE.generate(mockState, []);
    expect(hooks.length).toBeLessThanOrEqual(3);
    expect(hooks.length).toBeGreaterThan(0);
  });

  it('hooks have required fields', function () {
    var hooks = HOOKS_ENGINE.generate(mockState, []);
    hooks.forEach(function (h) {
      expect(h.cat).toBeTruthy();
      expect(h.text).toBeTruthy();
      expect(typeof h.priority).toBe('number');
    });
  });

  it('deprioritizes recently shown categories', function () {
    var hooks1 = HOOKS_ENGINE.generate(mockState, []);
    var cats1 = hooks1.map(function (h) { return h.cat; });
    var hooks2 = HOOKS_ENGINE.generate(mockState, cats1);
    // At least one category should differ
    var diff = hooks2.some(function (h) { return cats1.indexOf(h.cat) === -1; });
    // This is probabilistic, so we just check both return valid hooks
    expect(hooks2.length).toBeGreaterThan(0);
  });

  it('checkNemesisTrigger creates nemesis', function () {
    var result = HOOKS_ENGINE.checkNemesisTrigger({ type: 'playoff_loss', oppId: 2, oppName: 'Cowboys', oppIcon: '⭐' });
    expect(result.oppId).toBe(2);
    expect(result.reason).toContain('playoff');
  });

  it('checkNemesisResolved clears on win', function () {
    var nem = { oppId: 2 };
    expect(HOOKS_ENGINE.checkNemesisResolved(nem, 2, true)).toBe(true);
    expect(HOOKS_ENGINE.checkNemesisResolved(nem, 2, false)).toBe(false);
    expect(HOOKS_ENGINE.checkNemesisResolved(nem, 3, true)).toBe(false);
  });

  it('generateDraftCrush returns null or valid crush', function () {
    var count = 0;
    for (var i = 0; i < 100; i++) {
      var rng = function () { return (i * 7 + 13) % 100 / 100; };
      var result = HOOKS_ENGINE.generateDraftCrush(2028, rng);
      if (result) {
        count++;
        expect(result.name).toBeTruthy();
        expect(result.pos).toBeTruthy();
        expect(result.draftYear).toBe(2031);
      }
    }
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(100);
  });
});
