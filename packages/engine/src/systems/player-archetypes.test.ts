import { describe, expect, it } from 'vitest';

import type { Position, PlayerRatings } from '../types';
import { AGE_CURVES, classifyArchetype, getAgeCurve } from './player-archetypes';

function ratings(values: PlayerRatings): PlayerRatings {
  return values;
}

describe('player-archetypes', () => {
  it('keeps base aging curves explicit for every roster position', () => {
    expect(AGE_CURVES).toEqual({
      QB: { prime: [26, 33], cliff: 36, decayRate: 0.9 },
      RB: { prime: [23, 27], cliff: 29, decayRate: 2.4 },
      WR: { prime: [24, 30], cliff: 32, decayRate: 1.5 },
      TE: { prime: [25, 31], cliff: 32, decayRate: 1.3 },
      OL: { prime: [25, 32], cliff: 34, decayRate: 1.0 },
      DL: { prime: [24, 30], cliff: 32, decayRate: 1.6 },
      LB: { prime: [24, 29], cliff: 31, decayRate: 1.7 },
      CB: { prime: [23, 28], cliff: 30, decayRate: 2.0 },
      S: { prime: [24, 30], cliff: 31, decayRate: 1.5 },
      K: { prime: [24, 38], cliff: 42, decayRate: 0.4 },
      P: { prime: [24, 38], cliff: 42, decayRate: 0.4 },
    });
  });

  it('classifies each supported position from its strongest rating cluster', () => {
    expect(classifyArchetype('QB', ratings({
      speed: 92,
      scramble: 91,
      acceleration: 90,
      agility: 89,
      accuracy: 60,
    }))).toMatchObject({
      archetype: 'dual_threat',
      label: 'Dual Threat',
    });

    expect(classifyArchetype('RB', ratings({
      catching: 91,
      routeRunning: 90,
      ballCarrierVision: 88,
      passProtection: 87,
      speed: 63,
    }))).toMatchObject({
      archetype: 'receiving_back',
      label: 'Receiving Back',
    });

    expect(classifyArchetype('WR', ratings({
      jumping: 93,
      catchInTraffic: 92,
      spectacularCatch: 91,
      strength: 88,
      speed: 66,
    }))).toMatchObject({
      archetype: 'red_zone',
      label: 'Red Zone Target',
    });

    expect(classifyArchetype('TE', ratings({
      blocking: 91,
      runBlocking: 89,
      impactBlocking: 88,
      passProtection: 86,
      catching: 61,
    }))).toMatchObject({
      archetype: 'blocking_te',
      label: 'Blocking TE',
    });

    expect(classifyArchetype('OL', ratings({
      handTechnique: 93,
      footwork: 92,
      assignmentIQ: 90,
      awareness: 88,
      strength: 60,
    }))).toMatchObject({
      archetype: 'technician',
      label: 'Technician',
    });

    expect(classifyArchetype('DL', ratings({
      runStop: 92,
      blockShedding: 90,
      strength: 89,
      toughness: 88,
      speed: 61,
    }))).toMatchObject({
      archetype: 'run_stuffer',
      label: 'Run Stuffer',
    });

    expect(classifyArchetype('LB', ratings({
      tackle: 93,
      hitPower: 90,
      strength: 88,
      toughness: 87,
      coverage: 60,
    }))).toMatchObject({
      archetype: 'thumper',
      label: 'Thumper',
    });

    expect(classifyArchetype('CB', ratings({
      ballSkills: 92,
      zoneCoverage: 91,
      awareness: 89,
      jumping: 87,
      manCoverage: 64,
    }))).toMatchObject({
      archetype: 'ball_hawk',
      label: 'Ball Hawk',
    });

    expect(classifyArchetype('S', ratings({
      zoneCoverage: 92,
      ballSkills: 90,
      speed: 88,
      awareness: 87,
      hitPower: 61,
    }))).toMatchObject({
      archetype: 'free_safety',
      label: 'Free Safety',
    });
  });

  it('uses neutral missing ratings and first listed archetype as the tie fallback', () => {
    expect(classifyArchetype('QB', {})).toMatchObject({ archetype: 'pocket_passer' });
    expect(classifyArchetype('RB', {})).toMatchObject({ archetype: 'power_back' });
    expect(classifyArchetype('WR', {})).toMatchObject({ archetype: 'deep_threat' });
    expect(classifyArchetype('TE', {})).toMatchObject({ archetype: 'blocking_te' });
    expect(classifyArchetype('OL', {})).toMatchObject({ archetype: 'pass_protector' });
    expect(classifyArchetype('DL', {})).toMatchObject({ archetype: 'power_rusher' });
    expect(classifyArchetype('LB', {})).toMatchObject({ archetype: 'coverage_lb' });
    expect(classifyArchetype('CB', {})).toMatchObject({ archetype: 'lockdown' });
    expect(classifyArchetype('S', {})).toMatchObject({ archetype: 'free_safety' });
  });

  it('does not classify special teams or unknown positions', () => {
    expect(classifyArchetype('K', {})).toBeNull();
    expect(classifyArchetype('P', {})).toBeNull();
    expect(classifyArchetype('LS' as Position, {})).toBeNull();
  });

  it('returns the base curve object for null or unknown archetype ids', () => {
    expect(getAgeCurve('WR', null)).toBe(AGE_CURVES.WR);
    expect(getAgeCurve('WR', 'unknown_arch')).toBe(AGE_CURVES.WR);
  });

  it('falls back to the receiver curve for unknown positions', () => {
    expect(getAgeCurve('LS' as Position, null)).toBe(AGE_CURVES.WR);
  });

  it('applies archetype aging modifiers without mutating base curves', () => {
    const qbBase = { ...AGE_CURVES.QB, prime: [...AGE_CURVES.QB.prime] };
    const dualThreat = getAgeCurve('QB', 'dual_threat');
    const gameManager = getAgeCurve('QB', 'game_manager');

    expect(dualThreat).not.toBe(AGE_CURVES.QB);
    expect(dualThreat).toEqual({ prime: [26, 32], cliff: 34, decayRate: 1.26 });
    expect(gameManager).not.toBe(AGE_CURVES.QB);
    expect(gameManager).toEqual({ prime: [26, 34], cliff: 38, decayRate: 0.63 });
    expect(AGE_CURVES.QB).toEqual(qbBase);
  });

  it('rounds modified decay rates to two decimals', () => {
    expect(getAgeCurve('WR', 'possession')).toEqual({
      prime: [24, 31],
      cliff: 34,
      decayRate: 1.13,
    });
  });
});
