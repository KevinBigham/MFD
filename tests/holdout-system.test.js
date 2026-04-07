import { afterEach, describe, expect, it } from 'vitest';

import { HOLDOUT_SYSTEM, getPosMarketTier86 } from '../src/systems/holdout-system.js';
import { RNG } from '../src/utils/rng.js';

describe('holdout-system.js', () => {
  const originalAi = RNG.ai;

  afterEach(() => {
    RNG.ai = originalAi;
  });

  it('getPosMarketTier86 returns defaults and specific tiers', () => {
    expect(getPosMarketTier86('QB').tier).toBe(1);
    expect(getPosMarketTier86('K').tier).toBe(4);
    expect(getPosMarketTier86('UNKNOWN').tier).toBe(3);
  });

  it('checkHoldouts flags eligible stars when RNG passes threshold', () => {
    RNG.ai = () => 0;
    const player = {
      id: 'p1',
      name: 'Star QB',
      pos: 'QB',
      age: 27,
      ovr: 90,
      morale: 55,
      contract: { salary: 8, years: 1 },
      ratings: { accuracy: 88, awareness: 85, arm: 90 },
      personality: { greed: 7, loyalty: 3, ambition: 7, workEthic: 6, pressure: 7 },
    };
    const team = {
      id: 'me',
      schemeOff: 'balanced',
      roster: [player],
      staff: {},
    };

    const holdouts = HOLDOUT_SYSTEM.checkHoldouts(team, true);
    expect(holdouts).toHaveLength(1);
    expect(player.holdout75).toBeTruthy();
    expect(player.holdout75.severity).toBe('moderate');
  });

  it('weeklyHoldout progresses stages and resolve clears holdout', () => {
    const p = { name: 'RB A', pos: 'RB', ovr: 84, morale: 70, onTradeBlock: false, holdout75: { week: 0, severity: 'moderate' } };
    const w1 = HOLDOUT_SYSTEM.weeklyHoldout(p);
    const w2 = HOLDOUT_SYSTEM.weeklyHoldout(p);
    const w3 = HOLDOUT_SYSTEM.weeklyHoldout(p);
    const w4 = HOLDOUT_SYSTEM.weeklyHoldout(p);
    const w5 = HOLDOUT_SYSTEM.weeklyHoldout(p);
    const w6 = HOLDOUT_SYSTEM.weeklyHoldout(p);
    const w7 = HOLDOUT_SYSTEM.weeklyHoldout(p);

    expect(w1.type).toBe('holdout_noshow');
    expect(w2.type).toBe('holdout_statement');
    expect(w3.type).toBe('trade_request');
    expect(w5.type).toBe('suspend_option');
    expect(w7.type).toBe('nuclear');
    expect(p.onTradeBlock).toBe(true);

    HOLDOUT_SYSTEM.resolve(p);
    expect(p.holdout75).toBeUndefined();
    expect(p.morale).toBeGreaterThan(10);
  });
});
