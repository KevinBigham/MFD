import { describe, expect, it } from 'vitest';
import { computeDraftOrder } from './draft-order';
import { mulberry32 } from '../rng';

function correlation(left: number[], right: number[]): number {
  const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length;
  const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length;
  const numerator = left.reduce((sum, value, index) => sum + (value - leftMean) * ((right[index] ?? 0) - rightMean), 0);
  const leftSpread = Math.sqrt(left.reduce((sum, value) => sum + (value - leftMean) ** 2, 0));
  const rightSpread = Math.sqrt(right.reduce((sum, value) => sum + (value - rightMean) ** 2, 0));
  return numerator / (leftSpread * rightSpread);
}

describe('computeDraftOrder', () => {
  it('orders non-playoff teams by inverse record then strength of schedule', () => {
    const order = computeDraftOrder([
      { teamId: 'four-wins', wins: 4, losses: 13, ties: 0, strengthOfSchedule: 0.55 },
      { teamId: 'six-wins-hard', wins: 6, losses: 11, ties: 0, strengthOfSchedule: 0.62 },
      { teamId: 'six-wins-easy', wins: 6, losses: 11, ties: 0, strengthOfSchedule: 0.41 },
      { teamId: 'champion', wins: 12, losses: 5, ties: 0, strengthOfSchedule: 0.5 },
    ], [{ teamId: 'champion', finish: 'champion' }]);

    expect(order.map((entry) => entry.teamId)).toEqual([
      'four-wins',
      'six-wins-easy',
      'six-wins-hard',
      'champion',
    ]);
    expect(order.map((entry) => entry.slot)).toEqual([1, 2, 3, 4]);
  });

  it('places playoff teams by exit round regardless of regular-season record', () => {
    const order = computeDraftOrder([
      { teamId: 'missed', wins: 11, losses: 6, ties: 0, strengthOfSchedule: 0.5 },
      { teamId: 'wild-card', wins: 8, losses: 9, ties: 0, strengthOfSchedule: 0.5 },
      { teamId: 'conference', wins: 9, losses: 8, ties: 0, strengthOfSchedule: 0.5 },
      { teamId: 'runner-up', wins: 10, losses: 7, ties: 0, strengthOfSchedule: 0.5 },
      { teamId: 'champion', wins: 7, losses: 10, ties: 0, strengthOfSchedule: 0.5 },
    ], [
      { teamId: 'wild-card', finish: 'wild_card' },
      { teamId: 'conference', finish: 'conference' },
      { teamId: 'runner-up', finish: 'super_bowl' },
      { teamId: 'champion', finish: 'champion' },
    ]);

    expect(order.map((entry) => entry.teamId)).toEqual([
      'missed',
      'wild-card',
      'conference',
      'runner-up',
      'champion',
    ]);
  });

  it('is deterministic when every football tiebreak is equal', () => {
    const standings = ['z', 'a', 'm'].map((teamId) => ({
      teamId,
      wins: 8,
      losses: 9,
      ties: 0,
      strengthOfSchedule: 0.5,
    }));

    expect(computeDraftOrder(standings, []).map((entry) => entry.teamId)).toEqual(['a', 'm', 'z']);
  });

  it('keeps 100 seeded seasons collision-free with inverse-standings correlation above 0.9', () => {
    const rng = mulberry32(20260721);
    for (let season = 0; season < 100; season += 1) {
      const standings = Array.from({ length: 32 }, (_, index) => {
        const wins = Math.floor(rng() * 18);
        return {
          teamId: `team-${String(index + 1).padStart(2, '0')}`,
          wins,
          losses: 17 - wins,
          ties: 0,
          strengthOfSchedule: rng(),
        };
      });
      const order = computeDraftOrder(standings, []);

      expect(order.map((entry) => entry.slot)).toEqual(Array.from({ length: 32 }, (_, index) => index + 1));
      expect(new Set(order.map((entry) => entry.teamId)).size).toBe(32);
      expect(correlation(order.map((entry) => entry.wins / 17), order.map((entry) => entry.slot))).toBeGreaterThanOrEqual(0.9);
    }
  });
});
