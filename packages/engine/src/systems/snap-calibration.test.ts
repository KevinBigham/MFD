import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import { simGameWithContext } from './game-sim';
import { calibrateSnapShadow, type ShadowCalibrationSample } from './snap-shadow';
import { makeTeam } from './test-helpers';

const CALIBRATION_GAMES = 2_048;

describe('snap engine calibration against the frozen drive-sim contract', () => {
  it(`stays within scoring, play-mix, stat-line, and upset tolerances over ${CALIBRATION_GAMES} paired seeds`, () => {
    const teams = Array.from({ length: 12 }, (_, index) =>
      makeTeam(`cal-${index}`, index < 6 ? 'AFC' : 'NFC', index % 2 === 0 ? 'East' : 'West', index === 0, 68 + index * 2));
    const samples: ShadowCalibrationSample[] = [];

    for (let index = 0; index < CALIBRATION_GAMES; index += 1) {
      const home = teams[index % teams.length]!;
      let awayIndex = (index * 7 + 3) % teams.length;
      if (awayIndex === index % teams.length) awayIndex = (awayIndex + 1) % teams.length;
      const away = teams[awayIndex]!;
      const seed = (50_000 + index * 7_919) >>> 0;
      const canonical = simGameWithContext(home, away, {
        rng: { play: mulberry32(seed), event: mulberry32(seed + 7) },
        gameId: `calibration-${index}`,
      });
      const passAttempts = canonical.homeStats.passAttempts + canonical.awayStats.passAttempts;
      const rushAttempts = canonical.homeStats.rushAttempts + canonical.awayStats.rushAttempts;
      samples.push({
        seed,
        gameId: `calibration-${index}`,
        home: { id: home.id, overall: 68 + (index % teams.length) * 2 },
        away: { id: away.id, overall: 68 + awayIndex * 2 },
        canonicalHomeScore: canonical.homeScore,
        canonicalAwayScore: canonical.awayScore,
        canonicalPassRate: passAttempts / Math.max(1, passAttempts + rushAttempts),
        canonicalYardsPerTeam: (canonical.homeStats.totalYards + canonical.awayStats.totalYards) / 2,
      });
    }

    const report = calibrateSnapShadow(samples);

    expect(report.games).toBe(CALIBRATION_GAMES);
    expect(report.withinTolerance, JSON.stringify(report, null, 2)).toBe(true);
  });
});
