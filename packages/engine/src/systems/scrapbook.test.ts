import { describe, expect, it } from 'vitest';
import type { AwardResult, GameState, SeasonRecap } from '../index';
import { buildSeasonRecap } from './season-recap';
import { buildScrapbookEntry, summarizeScrapbook } from './scrapbook';
import { makeLeagueState } from './test-helpers';

function makeAwardResult(
  teamId: string,
  winnerId: string,
  winnerName: string,
  awardId: string,
  label: string,
): AwardResult {
  return {
    awardId,
    label,
    winnerId,
    winnerName,
    winnerTeamId: teamId,
    winnerTeam: teamId.toUpperCase(),
    winnerPosition: 'QB',
    winnerStats: { passYds: 4_612, passTD: 36 },
    score: 99,
    runnersUp: [],
    narrative: `${winnerName} took home ${label}.`,
  };
}

function seedCompletedSeason(game: GameState, year: number, teamId = 'afce1') {
  const team = game.teams[teamId]!;
  const quarterback = team.roster.find((player) => player.pos === 'QB')!;
  const runningBack = team.roster.find((player) => player.pos === 'RB')!;
  const breakout = team.roster.find((player) => player.pos === 'WR')!;
  const secondBreakout = team.roster.find((player) => player.id.endsWith('wr2'))!;

  quarterback.stats.gamesPlayed = 17;
  quarterback.stats.passYds = 4_612;
  quarterback.stats.passTD = 36;
  runningBack.stats.gamesPlayed = 17;
  runningBack.stats.rushYds = 1_487;
  runningBack.stats.rushTD = 14;
  breakout.age = 24;
  breakout.ovr = 82;
  breakout.careerStats.previousSeasonOvr = 77;
  secondBreakout.age = 23;
  secondBreakout.ovr = 80;
  secondBreakout.careerStats.previousSeasonOvr = 74;

  game.franchiseHistory = game.franchiseHistory.filter((entry) => entry.year !== year);
  game.franchiseHistory.push(
    {
      year,
      teamId: 'afce1',
      wins: 12,
      losses: 5,
      ties: 0,
      record: '12-5',
      pointDifferential: 88,
      playoffFinish: 'conference_final_exit',
      majorEvents: ['Won 8 of the last 10 games to seize control of the conference race.'],
      awardsWon: [],
      recordsBroken: [],
    },
    {
      year,
      teamId: 'afce2',
      wins: 10,
      losses: 7,
      ties: 0,
      record: '10-7',
      pointDifferential: 15,
      playoffFinish: 'wild_card_exit',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    },
    {
      year,
      teamId: 'afce3',
      wins: 9,
      losses: 8,
      ties: 0,
      record: '9-8',
      pointDifferential: -4,
      playoffFinish: 'missed_playoffs',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    },
    {
      year,
      teamId: 'afce4',
      wins: 6,
      losses: 11,
      ties: 0,
      record: '6-11',
      pointDifferential: -80,
      playoffFinish: 'missed_playoffs',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    },
    {
      year,
      teamId: 'afcn1',
      wins: 13,
      losses: 4,
      ties: 0,
      record: '13-4',
      pointDifferential: 111,
      playoffFinish: 'champion',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    },
  );

  game.awardsHistory = [{
    year,
    awards: [makeAwardResult(team.id, quarterback.id, quarterback.name, 'mvp', 'MVP')],
    ceremony: {
      headline: 'Awards Night',
      intro: 'The hardware changed hands.',
      blurbs: [],
    },
  }];

  game.storyArcs = [{
    id: `contender_window-${team.id}-${year - 1}`,
    type: 'contender_window',
    teamId: team.id,
    startYear: year - 1,
    endYear: null,
    currentStage: 'window_extended',
    stageHistory: [
      {
        stage: 'window_extended',
        year,
        note: 'Window extended',
        narrativeText: 'The core group forced the window open for another shot.',
      },
    ],
  }];

  return { team, quarterback, runningBack, breakout };
}

function makeRecap(game: GameState, teamId = 'afce1'): SeasonRecap {
  const recap = buildSeasonRecap(game, teamId);
  if (!recap) throw new Error('Expected completed season recap');
  return recap;
}

function makeScrapbookEntry(
  year: number,
  overrides: Partial<ReturnType<typeof buildScrapbookEntry>> = {},
): ReturnType<typeof buildScrapbookEntry> {
  return {
    year,
    eraTag: `Era ${year}`,
    seasonHighlightLine: `Highlight ${year}`,
    notableMoments: [],
    recap: {
      teamId: 'afce1',
      teamName: 'Club',
      teamCity: 'Chicago',
      teamAbbr: 'CHI',
      seasonYear: year,
      record: '10-7',
      wins: 10,
      losses: 7,
      ties: 0,
      division: 'East',
      conference: 'AFC',
      divisionFinish: 1,
      conferenceFinish: 2,
      playoffResult: 'wild-card-loss',
      teamAwards: [],
      topPerformers: {
        passingLeader: null,
        rushingLeader: null,
      },
      seasonStory: 'Story',
      teamMotto: null,
      breakoutCandidates: [],
    },
    ...overrides,
  };
}

describe('scrapbook', () => {
  it('builds a scrapbook entry for a completed season recap', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2027;
    seedCompletedSeason(game, 2026);

    const entry = buildScrapbookEntry(makeRecap(game), game);

    expect(entry.year).toBe(2026);
    expect(entry.recap.record).toBe('12-5');
    expect(entry.seasonHighlightLine).toContain('4,612');
  });

  it('uses the franchise-book era title when the recap year falls inside a named era', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2027;
    seedCompletedSeason(game, 2026);
    game.userDynastyEras = [{
      name: 'Steel Rebuild',
      startYear: 2026,
      endYear: 2026,
      trigger: 'manual',
      achievements: ['Stayed the course'],
    }];

    const entry = buildScrapbookEntry(makeRecap(game), game);

    expect(entry.eraTag).toBe('Steel Rebuild');
  });

  it('falls back to regular-era when no franchise-book era matches the recap year', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2027;
    seedCompletedSeason(game, 2026);

    const recap = {
      ...makeRecap(game),
      seasonYear: 2030,
    };

    const entry = buildScrapbookEntry(recap, game);

    expect(entry.eraTag).toBe('regular-era');
  });

  it('collects the top three matching league news items for the recap year and team in stable order', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2027;
    const { team } = seedCompletedSeason(game, 2026);
    game.leagueNews = [
      {
        id: 'late-minor',
        year: 2026,
        week: 12,
        type: 'milestone',
        headline: 'Late minor',
        body: 'Should sort after higher-importance items.',
        teamIds: [team.id],
        playerIds: [],
        importance: 'minor',
      },
      {
        id: 'major-early',
        year: 2026,
        week: 3,
        type: 'rivalry',
        headline: 'Major early',
        body: 'Should come before the other major item.',
        teamIds: [team.id],
        playerIds: [],
        importance: 'major',
      },
      {
        id: 'breaking-mid',
        year: 2026,
        week: 8,
        type: 'coaching',
        headline: 'Breaking mid',
        body: 'Top priority item.',
        teamIds: [team.id],
        playerIds: [],
        importance: 'breaking',
      },
      {
        id: 'major-late',
        year: 2026,
        week: 10,
        type: 'draft',
        headline: 'Major late',
        body: 'Second major item.',
        teamIds: [team.id],
        playerIds: [],
        importance: 'major',
      },
      {
        id: 'wrong-team',
        year: 2026,
        week: 1,
        type: 'draft',
        headline: 'Wrong team',
        body: 'Should be ignored.',
        teamIds: ['afce2'],
        playerIds: [],
        importance: 'breaking',
      },
      {
        id: 'wrong-year',
        year: 2025,
        week: 18,
        type: 'draft',
        headline: 'Wrong year',
        body: 'Should be ignored.',
        teamIds: [team.id],
        playerIds: [],
        importance: 'breaking',
      },
    ];

    const entry = buildScrapbookEntry(makeRecap(game), game);

    expect(entry.notableMoments).toHaveLength(3);
    expect(entry.notableMoments.map((moment) => moment.headline)).toEqual([
      'Breaking mid',
      'Major early',
      'Major late',
    ]);
  });

  it('is deterministic for the same recap and game state', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2027;
    seedCompletedSeason(game, 2026);
    const recap = makeRecap(game);

    expect(buildScrapbookEntry(recap, game)).toEqual(buildScrapbookEntry(recap, game));
  });

  it('summarizes seasons, championships, winning-season streaks, best record, and unique breakouts', () => {
    const summary = summarizeScrapbook([
      makeScrapbookEntry(2024, {
        recap: {
          ...makeScrapbookEntry(2024).recap,
          seasonYear: 2024,
          record: '11-6',
          wins: 11,
          losses: 6,
          playoffResult: 'champion',
          breakoutCandidates: [{ playerId: 'p1', playerName: 'A', pos: 'WR', ovrDelta: 4 }],
        },
      }),
      makeScrapbookEntry(2022, {
        recap: {
          ...makeScrapbookEntry(2022).recap,
          seasonYear: 2022,
          record: '10-7',
          wins: 10,
          losses: 7,
          playoffResult: 'wild-card-loss',
          breakoutCandidates: [{ playerId: 'p1', playerName: 'A', pos: 'WR', ovrDelta: 3 }],
        },
      }),
      makeScrapbookEntry(2023, {
        recap: {
          ...makeScrapbookEntry(2023).recap,
          seasonYear: 2023,
          record: '11-6',
          wins: 11,
          losses: 6,
          playoffResult: 'missed',
          breakoutCandidates: [{ playerId: 'p2', playerName: 'B', pos: 'RB', ovrDelta: 5 }],
        },
      }),
      makeScrapbookEntry(2025, {
        recap: {
          ...makeScrapbookEntry(2025).recap,
          seasonYear: 2025,
          record: '6-11',
          wins: 6,
          losses: 11,
          playoffResult: 'missed',
          breakoutCandidates: [],
        },
      }),
    ]);

    expect(summary).toEqual({
      totalSeasons: 4,
      totalChampionships: 1,
      longestWinStreak: 3,
      bestSingleSeasonRecord: {
        year: 2024,
        record: '11-6',
        wins: 11,
        losses: 6,
        ties: 0,
      },
      totalBreakouts: 2,
    });
  });

  it('returns a zeroed summary for empty input', () => {
    expect(summarizeScrapbook([])).toEqual({
      totalSeasons: 0,
      totalChampionships: 0,
      longestWinStreak: 0,
      bestSingleSeasonRecord: null,
      totalBreakouts: 0,
    });
  });
});
