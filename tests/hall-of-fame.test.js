import { describe, expect, it } from 'vitest';

import { HALL_OF_FAME_LOG, autoHallOfFame, buildCapFixes, calcLegacyScore, getHOFSpeech } from '../src/systems/hall-of-fame.js';
import { setSeed } from '../src/utils/rng.js';

describe('hall-of-fame.js', () => {
  it('getHOFSpeech selects by trait and falls back safely', () => {
    const speech = getHOFSpeech('workEthic', () => 0);
    const fallback = getHOFSpeech('unknown', () => 0);
    expect(typeof speech).toBe('string');
    expect(typeof fallback).toBe('string');
    expect(speech.length).toBeGreaterThan(10);
  });

  it('getHOFSpeech uses the seeded draft channel when rng is omitted', () => {
    setSeed(42);
    const first = getHOFSpeech('workEthic');
    setSeed(42);
    const second = getHOFSpeech('workEthic');
    expect(first).toBe(second);
  });

  it('calcLegacyScore returns expected shape with derived career values', () => {
    const history = [
      {
        year: 2026,
        champId: 'a',
        teams: [
          { id: 'a', abbr: 'PHI', roster: [{ name: 'Pat Field', pos: 'QB', ovr: 92, stats: { passYds: 4500 } }] },
        ],
      },
      {
        year: 2027,
        champId: 'a',
        teams: [
          { id: 'a', abbr: 'PHI', roster: [{ name: 'Pat Field', pos: 'QB', ovr: 90, stats: { passYds: 4200 } }] },
        ],
      },
    ];
    const legacy = calcLegacyScore('Pat Field', history);
    expect(legacy.score).toBeGreaterThan(0);
    expect(legacy.rings).toBe(2);
    expect(legacy.seasons).toBe(2);
    expect(legacy.totalYds).toBe(8700);
  });

  it('autoHallOfFame inducts retired elite players and avoids duplicates', () => {
    const currentTeams = [{ id: 'a', abbr: 'PHI', roster: [] }];
    const history = Array.from({ length: 6 }).map((_, i) => ({
      year: 2020 + i,
      champId: 'a',
      teams: [
        { id: 'a', abbr: 'PHI', roster: [{ name: 'Legend QB', pos: 'QB', ovr: 92, stats: { passYds: 4500 }, trait: 'workEthic' }] },
      ],
    }));

    const before = HALL_OF_FAME_LOG.length;
    const inducted = autoHallOfFame(currentTeams, history, 2030, () => 0);
    const secondRun = autoHallOfFame(currentTeams, history, 2031);

    expect(inducted.length).toBeGreaterThanOrEqual(1);
    expect(HALL_OF_FAME_LOG.length).toBe(before + inducted.length);
    expect(secondRun).toHaveLength(0);
    expect(inducted[0].speech).toBe(getHOFSpeech('workEthic', () => 0));
  });

  it('buildCapFixes returns suggestions when cap room is tight', () => {
    const team = {
      deadCap: 8,
      roster: [
        { name: 'Exp QB', pos: 'QB', ovr: 82, contract: { salary: 60, years: 3, guaranteed: 25 } },
        { name: 'Mid WR', pos: 'WR', ovr: 74, contract: { salary: 45, years: 2, guaranteed: 10 } },
        { name: 'Overpaid Vet', pos: 'LB', ovr: 68, contract: { salary: 40, years: 1, guaranteed: 2 } },
      ],
    };
    const fixes = buildCapFixes(team, 2026);
    expect(Array.isArray(fixes)).toBe(true);
    expect(fixes.length).toBeGreaterThan(0);
    expect(fixes[0].savings).toBeGreaterThanOrEqual(fixes[fixes.length - 1].savings);
  });
});
