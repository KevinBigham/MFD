import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import { simGameWithContext } from './game-sim';
import { makeTeam } from './test-helpers';

const MEASURED_GAMES = 5_000;

describe('Snap Core fast-sim budget', () => {
  it('does not regress wall time by more than ten percent against the drive simulator', () => {
    const home = makeTeam('perf-home', 'AFC', 'East', true, 80);
    const away = makeTeam('perf-away', 'NFC', 'West', false, 78);
    const runBatch = (canonical: boolean, games: number): { elapsedMs: number; checksum: number } => {
      let checksum = 0;
      const started = Date.now();
      for (let index = 0; index < games; index += 1) {
        const seed = 100_000 + index * 97;
        const result = simGameWithContext(home, away, {
          rng: { play: mulberry32(seed), event: mulberry32(seed + 7) },
          ...(canonical ? { shadowSeed: seed + 17, snapMode: 'canonical' as const } : {}),
          gameId: `perf-${canonical ? 'snap' : 'drive'}-${index}`,
        });
        checksum += result.homeScore + result.awayScore + result.homeStats.totalYards;
      }
      return { elapsedMs: Date.now() - started, checksum };
    };

    runBatch(false, 100);
    runBatch(true, 100);
    const legacy = runBatch(false, MEASURED_GAMES);
    const snap = runBatch(true, MEASURED_GAMES);
    const ratio = snap.elapsedMs / Math.max(1, legacy.elapsedMs);

    expect(legacy.checksum).toBeGreaterThan(0);
    expect(snap.checksum).toBeGreaterThan(0);
    expect(ratio, JSON.stringify({ games: MEASURED_GAMES, legacyMs: legacy.elapsedMs, snapMs: snap.elapsedMs, ratio }, null, 2)).toBeLessThanOrEqual(1.1);
  });
});
