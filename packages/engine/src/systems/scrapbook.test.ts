import { describe, expect, it } from 'vitest';
import type { AwardResult, GameState, HallOfFameEntry, SeasonRecap } from '../index';
import { buildSeasonRecap } from './season-recap';
import { buildScrapbookEntry, summarizeScrapbook } from './scrapbook';
import { makeLeagueState } from './test-helpers';

function makeAwardResult(
  teamId: string,
  winnerId: string,
  winnerName: string,
  awardId: string,
  label: string,
  overrides: Partial<AwardResult> = {},
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
    ...overrides,
  };
}

function makeHallOfFameEntry(
  teamId: string,
  playerId: string,
  name: string,
  overrides: Partial<HallOfFameEntry> = {},
): HallOfFameEntry {
  return {
    playerId,
    name,
    position: 'QB',
    inductionYear: 2026,
    peakOvr: 97,
    careerYears: 12,
    score: 145.5,
    awards: {
      mvps: 2,
      allPros: 0,
      proBowls: 0,
      championships: 1,
    },
    highlights: [],
    teams: [teamId],
    ...overrides,
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

  it('auto-authors saved named games into season scrapbook moments', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2027;
    const { team } = seedCompletedSeason(game, 2026);
    game.leagueNews = [];
    game.awardsHistory = [];
    game.storyArcs = [];
    game.dynastyTimeline = [
      {
        id: 'named-game-2026-11-afce1',
        year: 2026,
        week: 11,
        type: 'named_game',
        headline: 'The Comeback: Club vs Rival',
        importance: 'major',
        playerIds: [],
        teamIds: [team.id, 'afce2'],
        namedGame: {
          name: 'The Comeback',
          archetype: 'comeback',
          gameId: 'game-2026-11',
          year: 2026,
          week: 11,
          homeTeamId: team.id,
          awayTeamId: 'afce2',
          winnerTeamId: team.id,
          homeScore: 31,
          awayScore: 28,
          reason: 'Won after trailing by 14+ entering the fourth quarter.',
        },
      },
      {
        id: 'named-game-2026-12-afce2',
        year: 2026,
        week: 12,
        type: 'named_game',
        headline: 'Wrong team named game',
        importance: 'landmark',
        playerIds: [],
        teamIds: ['afce2'],
        namedGame: {
          name: 'The Snow Bowl',
          archetype: 'snow_bowl',
          gameId: 'game-2026-12',
          year: 2026,
          week: 12,
          homeTeamId: 'afce2',
          awayTeamId: 'afce3',
          winnerTeamId: 'afce2',
          homeScore: 13,
          awayScore: 10,
          reason: 'Snow and a low-scoring grind turned the game into trench warfare.',
        },
      },
    ];

    const entry = buildScrapbookEntry(makeRecap(game), game);

    expect(entry.notableMoments).toEqual([
      {
        headline: 'The Comeback',
        detail: 'Won after trailing by 14+ entering the fourth quarter. Final: 31-28.',
        week: 11,
        importance: 'major',
      },
    ]);
  });

  it('auto-authors saved bloodline draft memories into season scrapbook moments', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2027;
    const { team, quarterback } = seedCompletedSeason(game, 2026);
    game.leagueNews = [];
    game.awardsHistory = [];
    game.storyArcs = [];
    game.hallOfFame = [];
    game.leagueRivalries = [];
    quarterback.name = 'Cole Bishop';
    quarterback.bloodline = {
      parentPlayerId: 'legend-qb',
      parentName: 'Marcus Cole',
      parentTeamId: team.id,
      parentPosition: 'QB',
      relationship: 'son',
      legacyTag: 'franchise_royalty',
    };
    game.players[quarterback.id] = quarterback;
    game.dynastyTimeline = [
      {
        id: 'draft-bloodline-cole-2026',
        year: 2026,
        week: 1,
        type: 'draft_pick',
        headline: `${team.city} drafts ${quarterback.name}, son of Marcus Cole`,
        importance: 'major',
        playerIds: [quarterback.id, 'legend-qb'],
        teamIds: [team.id],
      },
      {
        id: 'ordinary-draft-cole-2026',
        year: 2026,
        week: 1,
        type: 'draft_pick',
        headline: `${team.city} drafts ${quarterback.name} in Round 1`,
        importance: 'major',
        playerIds: [quarterback.id],
        teamIds: [team.id],
      },
      {
        id: 'wrong-year-bloodline',
        year: 2025,
        week: 1,
        type: 'draft_pick',
        headline: 'Old bloodline draft',
        importance: 'major',
        playerIds: [quarterback.id, 'legend-qb'],
        teamIds: [team.id],
      },
      {
        id: 'wrong-team-bloodline',
        year: 2026,
        week: 1,
        type: 'draft_pick',
        headline: 'Wrong team bloodline draft',
        importance: 'landmark',
        playerIds: [quarterback.id, 'legend-qb'],
        teamIds: ['afce2'],
      },
    ];

    const entry = buildScrapbookEntry(makeRecap(game), game);

    expect(entry.notableMoments).toEqual([
      {
        headline: `${team.city} drafts ${quarterback.name}, son of Marcus Cole`,
        detail: `Dynasty timeline connected ${quarterback.name} to Marcus Cole's franchise royalty legacy in ${team.city} ${team.name}.`,
        week: 1,
        importance: 'major',
      },
    ]);
  });

  it('auto-authors saved individual award winners into season scrapbook moments', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2027;
    const { team, quarterback, runningBack } = seedCompletedSeason(game, 2026);
    game.leagueNews = [];
    game.dynastyTimeline = [];
    game.hallOfFame = [];
    game.leagueRivalries = [];
    game.storyArcs = [];
    game.awardsHistory = [{
      year: 2026,
      awards: [
        makeAwardResult(team.id, quarterback.id, quarterback.name, 'mvp', 'MVP'),
        makeAwardResult(team.id, runningBack.id, runningBack.name, 'opoy', 'Offensive Player of the Year', {
          winnerPosition: 'RB',
          winnerStats: { rushYds: 1_487, rushTD: 14 },
        }),
        makeAwardResult(team.id, 'all-pro-row', 'All Pro Team', 'all_pro_first_team', 'All-Pro First Team'),
        makeAwardResult('afce2', 'wrong-team-award', 'Wrong Team Star', 'mvp', 'MVP'),
      ],
      ceremony: {
        headline: 'Awards Night',
        intro: 'The hardware changed hands.',
        blurbs: [],
      },
    }];

    const entry = buildScrapbookEntry(makeRecap(game), game);

    expect(entry.notableMoments).toEqual([
      {
        headline: `${quarterback.name} wins MVP`,
        detail: `Awards night recognized ${quarterback.name} (QB) with 99 award score. ${quarterback.name} took home MVP.`,
        week: null,
        importance: 'major',
      },
      {
        headline: `${runningBack.name} wins Offensive Player of the Year`,
        detail: `Awards night recognized ${runningBack.name} (RB) with 99 award score. ${runningBack.name} took home Offensive Player of the Year.`,
        week: null,
        importance: 'major',
      },
    ]);
  });

  it('auto-authors saved story arc beats into season scrapbook moments', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2027;
    const { team } = seedCompletedSeason(game, 2026);
    const duplicateArcId = `contender_window-${team.id}-2025`;
    game.leagueNews = [
      {
        id: `story-arc-${duplicateArcId}-2026`,
        year: 2026,
        week: 22,
        type: 'milestone',
        headline: 'Existing story arc news',
        body: 'Already recorded by league news.',
        teamIds: [team.id],
        playerIds: [],
        importance: 'major',
      },
    ];
    game.dynastyTimeline = [];
    game.awardsHistory = [];
    game.hallOfFame = [];
    game.leagueRivalries = [];
    game.storyArcs = [
      {
        id: `dynasty_run-${team.id}-2024`,
        type: 'dynasty_run',
        teamId: team.id,
        startYear: 2024,
        endYear: null,
        currentStage: 'dynasty_breakthrough',
        stageHistory: [
          {
            stage: 'foundation',
            year: 2025,
            note: `${team.city} posted another 12-win season.`,
            narrativeText: `${team.city} kept stacking double-digit wins without giving the conference much air.`,
          },
          {
            stage: 'dynasty_breakthrough',
            year: 2026,
            note: `${team.city} crossed into dynasty territory.`,
            narrativeText: `${team.city} reached three straight 12-win campaigns and forced the dynasty conversation.`,
          },
        ],
      },
      {
        id: duplicateArcId,
        type: 'contender_window',
        teamId: team.id,
        startYear: 2025,
        endYear: null,
        currentStage: 'window_extended',
        stageHistory: [
          {
            stage: 'window_extended',
            year: 2026,
            note: 'This should stay represented by league news.',
            narrativeText: 'This should not duplicate the saved league news item.',
          },
        ],
      },
      {
        id: 'wrong-team-arc',
        type: 'collapse',
        teamId: 'afce2',
        startYear: 2026,
        endYear: 2026,
        currentStage: 'cap_overflow',
        stageHistory: [
          {
            stage: 'cap_overflow',
            year: 2026,
            note: 'Wrong team arc',
            narrativeText: 'Wrong team arc should be ignored.',
          },
        ],
      },
      {
        id: `old-arc-${team.id}`,
        type: 'rebuild',
        teamId: team.id,
        startYear: 2025,
        endYear: 2025,
        currentStage: 'breakthrough',
        stageHistory: [
          {
            stage: 'breakthrough',
            year: 2025,
            note: 'Old arc',
            narrativeText: 'Old arc should be ignored.',
          },
        ],
      },
    ];

    const entry = buildScrapbookEntry(makeRecap(game), game);

    expect(entry.notableMoments).toEqual([
      {
        headline: `Story arc: ${team.city} crossed into dynasty territory.`,
        detail: `${team.city} reached three straight 12-win campaigns and forced the dynasty conversation.`,
        week: null,
        importance: 'breaking',
      },
      {
        headline: 'Existing story arc news',
        detail: 'Already recorded by league news.',
        week: 22,
        importance: 'major',
      },
    ]);
  });

  it('auto-authors saved season reports into season scrapbook moments', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2027;
    const { team } = seedCompletedSeason(game, 2026);
    game.leagueNews = [];
    game.dynastyTimeline = [];
    game.awardsHistory = [];
    game.storyArcs = [];
    game.hallOfFame = [];
    game.leagueRivalries = [];
    game.seasonReports = [
      {
        year: 2026,
        teamId: team.id,
        overallGrade: 'A+',
        sections: [
          {
            title: 'Season Overview',
            grade: 'A+',
            summary: '12-5 with a conference final exit defined the year.',
            highlights: ['Point differential: +88.'],
            stats: { record: '12-5' },
          },
        ],
      },
      {
        year: 2026,
        teamId: 'afce2',
        overallGrade: 'F',
        sections: [
          {
            title: 'Season Overview',
            grade: 'F',
            summary: 'Wrong team report should be ignored.',
            highlights: [],
            stats: {},
          },
        ],
      },
      {
        year: 2025,
        teamId: team.id,
        overallGrade: 'F',
        sections: [
          {
            title: 'Season Overview',
            grade: 'F',
            summary: 'Old report should be ignored.',
            highlights: [],
            stats: {},
          },
        ],
      },
    ];

    const entry = buildScrapbookEntry(makeRecap(game), game);

    expect(entry.notableMoments).toEqual([
      {
        headline: 'Season report: A+ overall grade',
        detail: 'Season report logged an A+ overall grade. 12-5 with a conference final exit defined the year.',
        week: null,
        importance: 'major',
      },
    ]);
  });

  it('auto-authors saved records and Hall of Fame inductions into season scrapbook moments', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2027;
    const { team, quarterback } = seedCompletedSeason(game, 2026);
    game.leagueNews = [];
    game.dynastyTimeline = [];
    game.awardsHistory = [];
    game.storyArcs = [];
    const history = game.franchiseHistory.find((entry) => entry.year === 2026 && entry.teamId === team.id)!;
    history.recordsBroken = [
      `Passing Yards: ${quarterback.name} (5114)`,
      'Team Wins: 12',
      '  ',
    ];
    game.hallOfFame = [
      makeHallOfFameEntry(team.id, quarterback.id, quarterback.name),
      makeHallOfFameEntry(team.id, 'future-hof', 'Future Inductee', { inductionYear: 2027 }),
      makeHallOfFameEntry('afce2', 'wrong-team-hof', 'Wrong Team Inductee'),
    ];

    const entry = buildScrapbookEntry(makeRecap(game), game);

    expect(entry.notableMoments).toEqual([
      {
        headline: `${quarterback.name} enters the Hall of Fame`,
        detail: 'QB inducted after 12 seasons with peak 97 OVR and 145.5 HOF score; 2 MVPs, 1 championship.',
        week: null,
        importance: 'breaking',
      },
      {
        headline: `Record book: Passing Yards: ${quarterback.name} (5114)`,
        detail: `Record book logged Passing Yards: ${quarterback.name} (5114).`,
        week: null,
        importance: 'major',
      },
      {
        headline: 'Record book: Team Wins: 12',
        detail: 'Record book logged Team Wins: 12.',
        week: null,
        importance: 'major',
      },
    ]);
  });

  it('auto-authors heated league rivalry chapters into season scrapbook moments', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2027;
    const { team } = seedCompletedSeason(game, 2026);
    const opponent = game.teams.afce2!;
    game.leagueNews = [];
    game.dynastyTimeline = [];
    game.awardsHistory = [];
    game.storyArcs = [];
    game.hallOfFame = [];
    game.leagueRivalries = [
      {
        id: `${team.id}::${opponent.id}`,
        teamA: team.id,
        teamB: opponent.id,
        intensity: 81,
        isDivision: true,
        history: ['2026 Week 15: close game 31-28'],
        lastMetYear: 2026,
        lastMetWeek: 15,
      },
      {
        id: `${team.id}::afce3`,
        teamA: team.id,
        teamB: 'afce3',
        intensity: 41,
        isDivision: true,
        history: ['2026 Week 12: seeded division context stayed mild'],
        lastMetYear: 2026,
        lastMetWeek: 12,
      },
      {
        id: 'afce2::afce3',
        teamA: 'afce2',
        teamB: 'afce3',
        intensity: 90,
        isDivision: true,
        history: ['2026 Week 16: wrong team blood feud'],
        lastMetYear: 2026,
        lastMetWeek: 16,
      },
      {
        id: `${team.id}::afce4`,
        teamA: team.id,
        teamB: 'afce4',
        intensity: 78,
        isDivision: true,
        history: ['2025 Week 16: old feud'],
        lastMetYear: 2025,
        lastMetWeek: 16,
      },
    ];

    const entry = buildScrapbookEntry(makeRecap(game), game);

    expect(entry.notableMoments).toEqual([
      {
        headline: `${team.city} ${team.name} vs ${opponent.city} ${opponent.name} reaches blood-feud heat`,
        detail: 'Latest chapter: 2026 Week 15: close game 31-28.',
        week: 15,
        importance: 'breaking',
      },
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
