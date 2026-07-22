import { describe, expect, it } from 'vitest';
import { makeLeagueState } from './test-helpers';
import { measureStatePerformance } from './state-performance';

describe('state performance measurement seam', () => {
  it('measures clone and autosave encoding without mutating the dynasty', () => {
    const game = makeLeagueState();
    const before = structuredClone(game);
    const ticks = [0, 4, 4, 11, 11, 16, 16, 21, 21, 29, 29, 35];
    let index = 0;
    const result = measureStatePerformance(game, { iterations: 2, now: () => ticks[index++] ?? 24 });

    expect(result).toEqual({
      stateBytes: expect.any(Number),
      largestRegions: expect.arrayContaining([
        expect.objectContaining({ key: 'players', bytes: expect.any(Number) }),
      ]),
      cloneMedianMs: 4.5,
      autosaveEncodeMedianMs: 7.5,
      cartridgeLoadMedianMs: 5.5,
      loadTargetPassed: true,
      iterations: 2,
      workerRecommended: false,
    });
    expect(result.stateBytes).toBeGreaterThan(1_000);
    expect(game).toEqual(before);
  });
});
