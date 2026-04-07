import { describe, expect, it } from 'vitest';

import { makeContract } from '../src/systems/contracts.js';
import {
  getGMFABias,
  getGMDraftBias,
  getGMTradeThresholdMod,
  getTeamNeeds,
  getTradeValue,
} from '../src/systems/trade-ai.js';

describe('trade-ai.js', () => {
  const basePlayer = {
    ovr: 80,
    pot: 88,
    age: 26,
    pos: 'WR',
    contract: makeContract(8, 4, 2, 5),
    traits95: [],
    ratings: { routeRunning: 82, speed: 84, catching: 80 },
    personality: { workEthic: 6, loyalty: 5, greed: 5, pressure: 6, ambition: 6 },
  };

  it('getTradeValue returns 0 for null players', () => {
    expect(getTradeValue(null, null, null)).toBe(0);
  });

  it('needs multiplier increases value', () => {
    const base = getTradeValue(basePlayer, null, null);
    const withNeed = getTradeValue(basePlayer, { WR: 1 }, null);
    expect(withNeed).toBeGreaterThan(base);
  });

  it('trait penalties/bonuses affect value', () => {
    const cancer = getTradeValue({ ...basePlayer, traits95: ['cancer'] }, null, null);
    const captain = getTradeValue({ ...basePlayer, traits95: ['captain'] }, null, null);
    const normal = getTradeValue(basePlayer, null, null);

    expect(cancer).toBeLessThan(normal);
    expect(captain).toBeGreaterThan(normal);
  });

  it('position multipliers value QB above K for same profile', () => {
    const qb = getTradeValue({ ...basePlayer, pos: 'QB' }, null, null);
    const k = getTradeValue({ ...basePlayer, pos: 'K' }, null, null);
    expect(qb).toBeGreaterThan(k);
  });

  it('high dead-cap contracts are penalized', () => {
    const lowDead = getTradeValue(basePlayer, null, null);
    const highDead = getTradeValue(
      { ...basePlayer, contract: makeContract(8, 4, 80, 5) },
      null,
      null
    );
    expect(highDead).toBeLessThan(lowDead);
  });

  it('getTeamNeeds reports only shortfall positions', () => {
    const team = {
      roster: [{ pos: 'QB' }, { pos: 'OL' }, { pos: 'OL' }, { pos: 'WR' }],
    };
    const needs = getTeamNeeds(team);
    expect(needs.QB).toBe(1);
    expect(needs.OL).toBe(5);
    expect(needs.WR).toBe(3);
    expect(needs).not.toHaveProperty('P');
  });

  it('getGMTradeThresholdMod returns posture multipliers', () => {
    expect(getGMTradeThresholdMod('rebuild')).toEqual({ sellMod: 0.85, buyMod: 1.15 });
    expect(getGMTradeThresholdMod('contend')).toEqual({ sellMod: 1.15, buyMod: 0.88 });
    expect(getGMTradeThresholdMod('neutral')).toEqual({ sellMod: 1.0, buyMod: 1.0 });
  });

  it('getGMFABias handles rebuild and contend priorities', () => {
    expect(getGMFABias('rebuild', { age: 31, contract: { salary: 9 }, pot: 90, ovr: 80 })).toBe(0.5);
    expect(getGMFABias('rebuild', { age: 24, contract: { salary: 4 }, pot: 86, ovr: 78 })).toBe(1.4);
    expect(getGMFABias('contend', { age: 29, ovr: 83 })).toBe(1.3);
    expect(getGMFABias('contend', { age: 22, ovr: 65 })).toBe(0.7);
    expect(getGMFABias('neutral', { age: 29, ovr: 83 })).toBe(1.0);
  });

  it('getGMDraftBias favors upside for rebuild and readiness for contend', () => {
    const rebuild = getGMDraftBias('rebuild', {
      pot: 90,
      ovr: 75,
      age: 22,
      devTrait: 'superstar',
    });
    const contend = getGMDraftBias('contend', { ovr: 80, age: 27 });
    const neutral = getGMDraftBias('neutral', { ovr: 80, age: 27 });

    expect(rebuild).toBeGreaterThan(20);
    expect(contend).toBe(10);
    expect(neutral).toBe(0);
  });
});
