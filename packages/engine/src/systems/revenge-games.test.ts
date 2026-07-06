import { describe, expect, it } from 'vitest';
import type { GameState, PlayerArchiveEntry } from '../types';
import { makeLeagueState } from './test-helpers';
import {
  getRevengeFlavorForMatchup,
  hashMatchupSeed,
  pickRevengeLine,
  scanRevengeMatchups,
} from './revenge-games';

function archiveEntry(
  playerId: string,
  peakOvr: number,
  teamHistory: PlayerArchiveEntry['teamHistory'],
): PlayerArchiveEntry {
  return {
    playerId,
    firstName: playerId,
    lastName: 'Player',
    name: `${playerId} Player`,
    positions: ['QB'],
    jerseyNumber: 12,
    peakOvr,
    peakYear: 2025,
    firstYear: teamHistory[0]?.firstYear ?? 2020,
    lastYear: teamHistory[teamHistory.length - 1]?.lastYear ?? 2025,
    retirementYear: null,
    teamHistory,
  };
}

/**
 * Seed a revenge scenario:
 *   - `game.year = 2026`
 *   - one marquee QB on `afce1` who left `afce2` two years ago (2024)
 *   - `afce1 vs afce2` is already the default week-1 matchup in test-helpers
 */
function seedRevengeScenario(): GameState {
  const game = makeLeagueState('regular_season', 1);
  const marqueeId = 'afce1-qb';
  const marquee = game.players[marqueeId];
  if (marquee) {
    marquee.ovr = 88;
  }
  game.playerArchive = [
    archiveEntry(marqueeId, 90, [
      { teamId: 'afce2', firstYear: 2020, lastYear: 2024 },
      { teamId: 'afce1', firstYear: 2025, lastYear: 2026 },
    ]),
  ];
  return game;
}

describe('revenge-games scanner', () => {
  it('tags a matchup when a marquee player faces his former team within lookback', () => {
    const game = seedRevengeScenario();

    const flavor = getRevengeFlavorForMatchup(
      game,
      { homeTeamId: 'afce1', awayTeamId: 'afce2' },
      1,
    );

    expect(flavor).not.toBeNull();
    expect(flavor!.matchupKey).toBe('1:afce1:afce2');
    expect(flavor!.headline.subjectId).toBe('afce1-qb');
    expect(flavor!.headline.formerTeamId).toBe('afce2');
    expect(flavor!.headline.currentTeamId).toBe('afce1');
    expect(flavor!.headline.yearsSinceDeparture).toBe(2);
  });

  it('returns null when departure is outside the lookback window', () => {
    const game = seedRevengeScenario();
    const entry = game.playerArchive[0]!;
    entry.teamHistory[0]!.lastYear = 2020; // 6 years ago

    const flavor = getRevengeFlavorForMatchup(
      game,
      { homeTeamId: 'afce1', awayTeamId: 'afce2' },
      1,
    );

    expect(flavor).toBeNull();
  });

  it('returns null when peak OVR is below the marquee threshold', () => {
    const game = seedRevengeScenario();
    const entry = game.playerArchive[0]!;
    entry.peakOvr = 70;
    const marquee = game.players['afce1-qb'];
    if (marquee) marquee.ovr = 68;

    const flavor = getRevengeFlavorForMatchup(
      game,
      { homeTeamId: 'afce1', awayTeamId: 'afce2' },
      1,
    );

    expect(flavor).toBeNull();
  });

  it('orders multiple protagonists by peak OVR then freshness', () => {
    const game = seedRevengeScenario();
    // Add a second protagonist, lower peak, more recent departure.
    const secondId = 'afce2-rb';
    const second = game.players[secondId];
    if (second) second.ovr = 85;
    game.playerArchive.push(
      archiveEntry(secondId, 85, [
        { teamId: 'afce1', firstYear: 2022, lastYear: 2025 },
        { teamId: 'afce2', firstYear: 2026, lastYear: 2026 },
      ]),
    );

    const flavor = getRevengeFlavorForMatchup(
      game,
      { homeTeamId: 'afce1', awayTeamId: 'afce2' },
      1,
    );

    expect(flavor).not.toBeNull();
    expect(flavor!.protagonists.length).toBe(2);
    expect(flavor!.protagonists[0]!.subjectId).toBe('afce1-qb'); // higher peak wins
    expect(flavor!.protagonists[1]!.subjectId).toBe('afce2-rb');
  });

  it('scans the full schedule and returns flavors ordered by week ascending', () => {
    const game = seedRevengeScenario();
    const flavors = scanRevengeMatchups(game);

    expect(flavors.length).toBeGreaterThan(0);
    expect(flavors[0]!.week).toBeLessThanOrEqual(flavors[flavors.length - 1]!.week);
  });

  it('is deterministic: same inputs produce identical output', () => {
    const a = scanRevengeMatchups(seedRevengeScenario());
    const b = scanRevengeMatchups(seedRevengeScenario());
    expect(a).toEqual(b);
  });

  it('ignores stints where the former team is also the current team', () => {
    const game = seedRevengeScenario();
    // Replace history with a same-team stint pattern — player rejoined
    // his only team. Should not trigger revenge against itself.
    game.playerArchive = [
      archiveEntry('afce1-qb', 90, [
        { teamId: 'afce1', firstYear: 2020, lastYear: 2023 },
        { teamId: 'afce1', firstYear: 2025, lastYear: 2026 },
      ]),
    ];

    const flavor = getRevengeFlavorForMatchup(
      game,
      { homeTeamId: 'afce1', awayTeamId: 'afce2' },
      1,
    );

    expect(flavor).toBeNull();
  });

  it('does not synthesize coach revenge from saved coach career history yet', () => {
    const game = seedRevengeScenario();
    game.playerArchive = [];
    game.coachingHistory = [{
      coachId: 'coach-1',
      name: 'Former Coach',
      archetype: 'Strategist',
      age: 55,
      seasonsCoached: 4,
      wins: 40,
      losses: 28,
      championships: 0,
      awards: 0,
      retired: false,
      teams: [
        { teamId: 'afce2', startYear: 2022, endYear: 2024, wins: 22, losses: 12, championships: 0 },
        { teamId: 'afce1', startYear: 2025, endYear: 2026, wins: 18, losses: 16, championships: 0 },
      ],
    }];

    const flavor = getRevengeFlavorForMatchup(
      game,
      { homeTeamId: 'afce1', awayTeamId: 'afce2' },
      1,
    );

    expect(flavor).toBeNull();
  });

  it('hashMatchupSeed is deterministic and non-negative', () => {
    const a = hashMatchupSeed('1:afce1:afce2::agm');
    const b = hashMatchupSeed('1:afce1:afce2::agm');
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
  });

  it('pickRevengeLine returns the same line for the same key/category pair', () => {
    const pool = ['alpha', 'beta', 'gamma', 'delta'];
    const first = pickRevengeLine(pool, '1:afce1:afce2', 'agm');
    const second = pickRevengeLine(pool, '1:afce1:afce2', 'agm');
    expect(first).toBe(second);
    expect(pool).toContain(first);
  });

  it('pickRevengeLine picks differently for different categories', () => {
    const pool = Array.from({ length: 32 }, (_, i) => `line-${i}`);
    const agm = pickRevengeLine(pool, '5:afce1:afce2', 'pregame.agm');
    const post = pickRevengeLine(pool, '5:afce1:afce2', 'postgame.agm');
    // Not a guarantee — but highly likely given 32-item pool.
    expect(agm).not.toBe(post);
  });

  it('pickRevengeLine returns null for an empty pool', () => {
    expect(pickRevengeLine([], '1:x:y', 'agm')).toBeNull();
  });
});
