import { describe, expect, it } from 'vitest';
import {
  buildFranchiseBook,
  detectNewEraChapter,
  getDynastyByYear,
  getDynastyHighlights,
  partitionEras,
  recordDynastyEvent,
} from './dynasty-timeline';
import { makeLeagueState } from './test-helpers';
import type {
  FranchiseHistoryEntry,
  GameState,
  PlayerArchiveEntry,
} from '../types';

function makeHistoryEntry(overrides: Partial<FranchiseHistoryEntry> & {
  year: number;
  teamId: string;
  wins: number;
  losses: number;
}): FranchiseHistoryEntry {
  return {
    ties: 0,
    record: `${overrides.wins}-${overrides.losses}`,
    pointDifferential: 0,
    playoffFinish: 'missed_playoffs',
    majorEvents: [],
    awardsWon: [],
    recordsBroken: [],
    ...overrides,
  };
}

function seedHistory(game: GameState, teamId: string, entries: Array<Partial<FranchiseHistoryEntry> & {
  year: number;
  wins: number;
  losses: number;
}>): void {
  for (const entry of entries) {
    game.franchiseHistory.push(makeHistoryEntry({ teamId, ties: 0, ...entry }));
  }
}

function seedArchivedPlayer(game: GameState, entry: Partial<PlayerArchiveEntry> & {
  playerId: string;
  teamId: string;
  peakOvr: number;
  peakYear: number;
  firstYear: number;
  lastYear: number;
}): void {
  const archive = (game.playerArchive ??= []);
  archive.push({
    playerId: entry.playerId,
    firstName: entry.firstName ?? 'First',
    lastName: entry.lastName ?? 'Last',
    name: entry.name ?? `${entry.firstName ?? 'First'} ${entry.lastName ?? 'Last'}`,
    positions: entry.positions ?? ['QB'],
    jerseyNumber: entry.jerseyNumber ?? 12,
    peakOvr: entry.peakOvr,
    peakYear: entry.peakYear,
    firstYear: entry.firstYear,
    lastYear: entry.lastYear,
    retirementYear: entry.retirementYear ?? entry.lastYear,
    teamHistory: entry.teamHistory ?? [{
      teamId: entry.teamId,
      firstYear: entry.firstYear,
      lastYear: entry.lastYear,
    }],
    ...(entry.careerStats ? { careerStats: entry.careerStats } : {}),
  } as PlayerArchiveEntry);
}

describe('dynasty timeline', () => {
  it('records championships as landmark events', () => {
    const game = makeLeagueState('offseason');

    recordDynastyEvent(game, {
      id: 'title-1',
      year: 2026,
      week: null,
      type: 'championship',
      headline: 'Won the title',
      importance: 'landmark',
      playerIds: [],
      teamIds: ['afce1'],
    });

    expect(game.dynastyTimeline[0]?.importance).toBe('landmark');
  });

  it('records a round one draft pick event', () => {
    const game = makeLeagueState('draft');

    recordDynastyEvent(game, {
      id: 'draft-1',
      year: 2026,
      week: 1,
      type: 'draft_pick',
      headline: 'Selected a franchise tackle in round one',
      importance: 'major',
      playerIds: ['prospect-1'],
      teamIds: ['afce1'],
    });

    expect(game.dynastyTimeline.at(-1)?.type).toBe('draft_pick');
  });

  it('returns the top events by importance first', () => {
    const game = makeLeagueState('offseason');
    recordDynastyEvent(game, {
      id: 'minor-1',
      year: 2026,
      week: 1,
      type: 'signing',
      headline: 'Signed a depth player',
      importance: 'minor',
      playerIds: [],
      teamIds: ['afce1'],
    });
    recordDynastyEvent(game, {
      id: 'major-1',
      year: 2026,
      week: 2,
      type: 'trade',
      headline: 'Won a blockbuster trade',
      importance: 'major',
      playerIds: [],
      teamIds: ['afce1'],
    });
    recordDynastyEvent(game, {
      id: 'landmark-1',
      year: 2026,
      week: null,
      type: 'championship',
      headline: 'Won the championship',
      importance: 'landmark',
      playerIds: [],
      teamIds: ['afce1'],
    });

    expect(getDynastyHighlights(game, 2).map((event) => event.id)).toEqual(['landmark-1', 'major-1']);
  });

  it('filters timeline events by year', () => {
    const game = makeLeagueState('offseason');
    recordDynastyEvent(game, {
      id: 'event-2026',
      year: 2026,
      week: 1,
      type: 'record',
      headline: 'Record broken',
      importance: 'major',
      playerIds: [],
      teamIds: ['afce1'],
    });
    recordDynastyEvent(game, {
      id: 'event-2027',
      year: 2027,
      week: 1,
      type: 'award',
      headline: 'Award won',
      importance: 'major',
      playerIds: [],
      teamIds: ['afce1'],
    });

    expect(getDynastyByYear(game, 2026).map((event) => event.id)).toEqual(['event-2026']);
  });
});

describe('partitionEras', () => {
  it('honors user-named eras when present', () => {
    const history: FranchiseHistoryEntry[] = [];
    for (let year = 2026; year <= 2035; year++) {
      history.push(makeHistoryEntry({ year, teamId: 'afce1', wins: 9, losses: 8 }));
    }
    const userEras = [
      { name: 'The Rebuild', startYear: 2026, endYear: 2028, trigger: 'manual' as const, achievements: [] },
      { name: 'The Run', startYear: 2029, endYear: 2035, trigger: 'championship' as const, achievements: [] },
    ];

    const bounds = partitionEras(history, userEras);

    expect(bounds).toHaveLength(2);
    expect(bounds[0]?.userTitle).toBe('The Rebuild');
    expect(bounds[0]?.trigger).toBe('user_named');
    expect(bounds[1]?.userTitle).toBe('The Run');
    expect(bounds[1]?.endYear).toBe(2035);
  });

  it('auto-splits at a championship after a minimum era length', () => {
    const history: FranchiseHistoryEntry[] = [
      makeHistoryEntry({ year: 2026, teamId: 'afce1', wins: 6, losses: 11 }),
      makeHistoryEntry({ year: 2027, teamId: 'afce1', wins: 8, losses: 9 }),
      makeHistoryEntry({ year: 2028, teamId: 'afce1', wins: 11, losses: 6 }),
      makeHistoryEntry({ year: 2029, teamId: 'afce1', wins: 14, losses: 3, playoffFinish: 'champion' }),
      makeHistoryEntry({ year: 2030, teamId: 'afce1', wins: 9, losses: 8 }),
      makeHistoryEntry({ year: 2031, teamId: 'afce1', wins: 10, losses: 7 }),
      makeHistoryEntry({ year: 2032, teamId: 'afce1', wins: 11, losses: 6 }),
    ];

    const bounds = partitionEras(history, undefined);

    expect(bounds.length).toBeGreaterThanOrEqual(2);
    const championshipBound = bounds.find((b) => b.trigger === 'championship');
    expect(championshipBound).toBeDefined();
    expect(championshipBound?.endYear).toBe(2029);
  });

  it('closes an era on a collapse season after the minimum era length', () => {
    const history: FranchiseHistoryEntry[] = [
      makeHistoryEntry({ year: 2026, teamId: 'afce1', wins: 11, losses: 6 }),
      makeHistoryEntry({ year: 2027, teamId: 'afce1', wins: 12, losses: 5 }),
      makeHistoryEntry({ year: 2028, teamId: 'afce1', wins: 11, losses: 6 }),
      makeHistoryEntry({ year: 2029, teamId: 'afce1', wins: 4, losses: 13 }), // collapse
      makeHistoryEntry({ year: 2030, teamId: 'afce1', wins: 5, losses: 12 }),
    ];

    const bounds = partitionEras(history, undefined);

    const collapseBound = bounds.find((b) => b.trigger === 'collapse');
    expect(collapseBound).toBeDefined();
    expect(collapseBound?.endYear).toBe(2029);
  });

  it('returns an empty array for no history', () => {
    expect(partitionEras([], undefined)).toEqual([]);
  });
});

describe('buildFranchiseBook', () => {
  it('returns an empty shell for teams with no history', () => {
    const game = makeLeagueState('offseason');
    const book = buildFranchiseBook(game, 'afce1');

    expect(book).not.toBeNull();
    expect(book!.teamId).toBe('afce1');
    expect(book!.eras).toEqual([]);
    expect(book!.totals.seasons).toBe(0);
    expect(book!.firstYear).toBe(book!.lastYear);
  });

  it('returns null for unknown team ids', () => {
    const game = makeLeagueState('offseason');
    expect(buildFranchiseBook(game, 'not-a-real-team')).toBeNull();
  });

  it('builds chapters with aggregated records, championships, and playoff counts', () => {
    const game = makeLeagueState('offseason');
    seedHistory(game, 'afce1', [
      { year: 2026, wins: 6, losses: 11 },
      { year: 2027, wins: 8, losses: 9 },
      { year: 2028, wins: 12, losses: 5, playoffFinish: 'divisional_round' },
      { year: 2029, wins: 14, losses: 3, playoffFinish: 'champion' },
      { year: 2030, wins: 10, losses: 7, playoffFinish: 'wild_card' },
      { year: 2031, wins: 13, losses: 4, playoffFinish: 'champion' },
    ]);

    const book = buildFranchiseBook(game, 'afce1');

    expect(book).not.toBeNull();
    expect(book!.totals.seasons).toBe(6);
    expect(book!.totals.championships).toBe(2);
    expect(book!.totals.playoffAppearances).toBe(4);
    expect(book!.eras.length).toBeGreaterThanOrEqual(1);
    const titles = book!.eras.map((era) => era.championships).reduce((a, b) => a + b, 0);
    expect(titles).toBe(2);
  });

  it('treats canonical "regular_season" finish as no playoff appearance', () => {
    // Regression: pre-fix, hasPlayoffFinish() only filtered strings containing
    // "missed", so 'regular_season' (the canonical no-playoff value written by
    // stat-central.ts) was counted as a playoff appearance — inflating
    // playoffAppearances on every era and breaking classifyEraArc's rebuild
    // detection (which requires playoffAppearances === 0).
    const game = makeLeagueState('offseason');
    seedHistory(game, 'afce1', [
      { year: 2026, wins: 8, losses: 9, playoffFinish: 'regular_season' },
      { year: 2027, wins: 9, losses: 8, playoffFinish: 'regular_season' },
      { year: 2028, wins: 7, losses: 10, playoffFinish: 'regular_season' },
    ]);

    const book = buildFranchiseBook(game, 'afce1');

    expect(book).not.toBeNull();
    expect(book!.totals.seasons).toBe(3);
    expect(book!.totals.championships).toBe(0);
    expect(book!.totals.playoffAppearances).toBe(0);
    expect(book!.eras[0]?.playoffAppearances).toBe(0);
  });

  it('classifies a back-to-back champion era as "golden"', () => {
    const game = makeLeagueState('offseason');
    seedHistory(game, 'afce1', [
      { year: 2026, wins: 13, losses: 4, playoffFinish: 'champion' },
      { year: 2027, wins: 14, losses: 3, playoffFinish: 'champion' },
      { year: 2028, wins: 15, losses: 2, playoffFinish: 'champion' },
    ]);

    const book = buildFranchiseBook(game, 'afce1');
    const firstEra = book!.eras[0];

    expect(firstEra?.arcType).toBe('golden');
    expect(firstEra?.milestoneFlags).toContain('dynasty_run');
    expect(firstEra?.milestoneFlags).toContain('three_peat_plus');
  });

  it('is deterministic — identical state produces identical output', () => {
    const seed = () => {
      const game = makeLeagueState('offseason');
      seedHistory(game, 'afce1', [
        { year: 2026, wins: 8, losses: 9 },
        { year: 2027, wins: 11, losses: 6, playoffFinish: 'wild_card' },
        { year: 2028, wins: 13, losses: 4, playoffFinish: 'champion' },
        { year: 2029, wins: 9, losses: 8 },
      ]);
      seedArchivedPlayer(game, {
        playerId: 'qb-1', teamId: 'afce1', peakOvr: 94, peakYear: 2028,
        firstYear: 2026, lastYear: 2029, positions: ['QB'], name: 'Ace Thrower',
      });
      seedArchivedPlayer(game, {
        playerId: 'wr-1', teamId: 'afce1', peakOvr: 91, peakYear: 2028,
        firstYear: 2026, lastYear: 2029, positions: ['WR'], name: 'Big Play',
      });
      return game;
    };

    const bookA = buildFranchiseBook(seed(), 'afce1');
    const bookB = buildFranchiseBook(seed(), 'afce1');

    expect(JSON.stringify(bookA)).toBe(JSON.stringify(bookB));
  });

  it('surfaces signature players capped at six per era, sorted by peak OVR', () => {
    const game = makeLeagueState('offseason');
    seedHistory(game, 'afce1', [
      { year: 2026, wins: 10, losses: 7 },
      { year: 2027, wins: 12, losses: 5 },
      { year: 2028, wins: 11, losses: 6 },
      { year: 2029, wins: 13, losses: 4, playoffFinish: 'champion' },
    ]);
    for (let i = 0; i < 10; i++) {
      seedArchivedPlayer(game, {
        playerId: `p${i}`,
        teamId: 'afce1',
        peakOvr: 80 + i,
        peakYear: 2028,
        firstYear: 2026,
        lastYear: 2029,
        positions: ['WR'],
        name: `Player ${i}`,
      });
    }

    const book = buildFranchiseBook(game, 'afce1');
    const era = book!.eras[0]!;

    expect(era.signaturePlayers.length).toBeLessThanOrEqual(6);
    // Highest peak OVR should be the top entry
    expect(era.signaturePlayers[0]?.peakOvr).toBe(89);
  });

  it('produces defining moments from dynasty timeline events within the era window', () => {
    const game = makeLeagueState('offseason');
    seedHistory(game, 'afce1', [
      { year: 2026, wins: 9, losses: 8 },
      { year: 2027, wins: 12, losses: 5 },
      { year: 2028, wins: 14, losses: 3, playoffFinish: 'champion' },
    ]);
    recordDynastyEvent(game, {
      id: 'title-2028',
      year: 2028,
      week: null,
      type: 'championship',
      headline: 'Won the championship',
      importance: 'landmark',
      playerIds: ['qb-1'],
      teamIds: ['afce1'],
    });

    const book = buildFranchiseBook(game, 'afce1');
    const moments = book!.eras[0]?.definingMoments ?? [];
    const championshipMoment = moments.find((m) => m.kind === 'championship');

    expect(championshipMoment).toBeDefined();
    expect(championshipMoment?.headline).toBe('Won the championship');
    expect(championshipMoment?.importance).toBe('landmark');
  });

  it('synthesizes a breakthrough moment from a large year-over-year win swing', () => {
    const game = makeLeagueState('offseason');
    seedHistory(game, 'afce1', [
      { year: 2026, wins: 4, losses: 13 },
      { year: 2027, wins: 5, losses: 12 },
      { year: 2028, wins: 11, losses: 6, playoffFinish: 'wild_card' },
    ]);

    const book = buildFranchiseBook(game, 'afce1');
    const moments = book!.eras.flatMap((era) => era.definingMoments);
    const breakthrough = moments.find((m) => m.kind === 'playoff_run');

    expect(breakthrough).toBeDefined();
    expect(breakthrough?.headline).toContain('breakthrough');
  });
});

describe('detectNewEraChapter', () => {
  it('returns the newest chapter when count grows', () => {
    const game = makeLeagueState('offseason');
    seedHistory(game, 'afce1', [
      { year: 2026, wins: 11, losses: 6 },
      { year: 2027, wins: 12, losses: 5 },
      { year: 2028, wins: 14, losses: 3, playoffFinish: 'champion' },
      { year: 2029, wins: 9, losses: 8 },
    ]);
    const book = buildFranchiseBook(game, 'afce1');

    const newChapter = detectNewEraChapter(book!, book!.eras.length - 1);

    expect(newChapter).not.toBeNull();
    expect(newChapter?.id).toBe(book!.eras[book!.eras.length - 1]?.id);
  });

  it('returns null when the chapter count is unchanged', () => {
    const game = makeLeagueState('offseason');
    seedHistory(game, 'afce1', [
      { year: 2026, wins: 8, losses: 9 },
      { year: 2027, wins: 9, losses: 8 },
      { year: 2028, wins: 10, losses: 7 },
    ]);
    const book = buildFranchiseBook(game, 'afce1');

    expect(detectNewEraChapter(book!, book!.eras.length)).toBeNull();
  });
});
