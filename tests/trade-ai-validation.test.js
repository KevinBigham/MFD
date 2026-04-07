import { describe, expect, it } from 'vitest';

import { makeContract } from '../src/systems/contracts.js';
import {
  getGMDraftBias,
  getGMFABias,
  getGMTradeThresholdMod,
  getTeamNeeds,
  getTradeValue,
} from '../src/systems/trade-ai.js';

function mkPlayer(overrides) {
  return Object.assign(
    {
      ovr: 78,
      pot: 84,
      age: 26,
      pos: 'WR',
      contract: makeContract(7, 4, 3, 8),
      traits95: [],
      ratings: {
        routeRunning: 80,
        speed: 82,
        catching: 79,
      },
    },
    overrides || {}
  );
}

describe('trade-ai validation', () => {
  it('getTradeValue is finite and non-negative across malformed inputs', () => {
    var cases = [
      mkPlayer({ contract: null }),
      mkPlayer({ age: 38, ovr: 65, pot: 66 }),
      mkPlayer({ pos: 'K', contract: makeContract(20, 1, 0, 0) }),
      mkPlayer({ traits95: ['cancer', 'glass', 'captain', 'clutch'] }),
    ];

    cases.forEach(function (p) {
      var v = getTradeValue(p, { WR: 1 }, { offenseScheme: 'spread', defenseScheme: '3-4' });
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    });
  });

  it('extreme age + dead cap penalties materially reduce value', () => {
    var prime = mkPlayer({ age: 25, ovr: 84, pot: 90, contract: makeContract(7, 4, 0, 0) });
    var aging = mkPlayer({ age: 36, ovr: 84, pot: 84, contract: makeContract(25, 4, 80, 80) });

    var primeValue = getTradeValue(prime, null, null);
    var agingValue = getTradeValue(aging, null, null);
    expect(primeValue).toBeGreaterThan(agingValue);
  });

  it('getTeamNeeds returns empty object for complete roster minimums', () => {
    var roster = [
      { pos: 'QB' }, { pos: 'QB' },
      { pos: 'OL' }, { pos: 'OL' }, { pos: 'OL' }, { pos: 'OL' }, { pos: 'OL' }, { pos: 'OL' }, { pos: 'OL' },
      { pos: 'DL' }, { pos: 'DL' }, { pos: 'DL' }, { pos: 'DL' }, { pos: 'DL' },
      { pos: 'LB' }, { pos: 'LB' }, { pos: 'LB' }, { pos: 'LB' },
      { pos: 'CB' }, { pos: 'CB' }, { pos: 'CB' }, { pos: 'CB' },
      { pos: 'WR' }, { pos: 'WR' }, { pos: 'WR' }, { pos: 'WR' },
      { pos: 'S' }, { pos: 'S' },
      { pos: 'RB' }, { pos: 'RB' },
      { pos: 'TE' }, { pos: 'TE' },
      { pos: 'K' },
    ];
    expect(getTeamNeeds({ roster: roster })).toEqual({});
  });

  it('strategy modifiers preserve expected ordering', () => {
    var rebuild = getGMTradeThresholdMod('rebuild');
    var contend = getGMTradeThresholdMod('contend');
    expect(rebuild.sellMod).toBeLessThan(1);
    expect(rebuild.buyMod).toBeGreaterThan(1);
    expect(contend.sellMod).toBeGreaterThan(1);
    expect(contend.buyMod).toBeLessThan(1);

    var youngUpside = { age: 22, ovr: 70, pot: 86, devTrait: 'superstar', contract: { salary: 2 } };
    var veteran = { age: 31, ovr: 84, pot: 84, devTrait: 'normal', contract: { salary: 12 } };
    expect(getGMFABias('rebuild', youngUpside)).toBeGreaterThan(getGMFABias('rebuild', veteran));
    expect(getGMDraftBias('rebuild', youngUpside)).toBeGreaterThan(getGMDraftBias('contend', youngUpside));
  });
});
