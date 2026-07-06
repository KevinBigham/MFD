import { describe, expect, it } from 'vitest';
import { SAVE_VERSION, SaveStateSchema } from '../index';
import {
  createEmptyGameDayState,
  makeLeagueState,
  makePlayer,
  makeRoster,
  makeTeam,
} from './test-helpers';

describe('engine test helpers player and roster fixtures', () => {
  it('creates a current player fixture with deterministic defaults', () => {
    const player = makePlayer('fixture-qb', 'team-a', 'QB', 82, false);

    expect(player).toMatchObject({
      id: 'fixture-qb',
      firstName: 'fixture-qb',
      lastName: 'Player',
      name: 'fixture-qb Player',
      pos: 'QB',
      age: 26,
      ovr: 82,
      pot: 86,
      ratings: { awareness: 82, speed: 82, stamina: 82 },
      devTrait: 'normal',
      personality: { workEthic: 7, loyalty: 5, greed: 5, pressure: 5, ambition: 6 },
      teamId: 'team-a',
      draftYear: 2022,
      draftRound: 1,
      draftPick: 1,
      college: 'Test U',
      yearsExp: 3,
      careerStats: { seasons: 3, gp: 51, snaps: 2200 },
      morale: 70,
      chemistry: 68,
      systemFit: 67,
      isStarter: false,
      role: 'Backup',
      roleWeeks: 10,
      tradeBlock: false,
      holdout: false,
      agentId: null,
    });
    expect(player.contract).toMatchObject({
      playerId: 'fixture-qb',
      teamId: 'team-a',
      years: 3,
    });
    expect(player.stats.gamesPlayed).toBe(0);
  });

  it('omits contracts for free-agent player fixtures', () => {
    const player = makePlayer('free-agent', null, 'WR', 76);

    expect(player.teamId).toBeNull();
    expect(player.contract).toBeNull();
    expect(player.isStarter).toBe(true);
    expect(player.role).toBe('Starter');
  });

  it('builds the canonical twelve-player positional roster around the rating base', () => {
    const roster = makeRoster('abc', 70);

    expect(roster.map((player) => `${player.pos}:${player.ovr}`)).toEqual([
      'QB:78',
      'RB:74',
      'WR:73',
      'WR:71',
      'TE:70',
      'OL:72',
      'DL:72',
      'LB:71',
      'CB:70',
      'S:70',
      'K:68',
      'P:68',
    ]);
    expect(roster.every((player) => player.teamId === 'abc')).toBe(true);
  });
});

describe('engine test helpers team fixtures', () => {
  it('creates a user-team fixture with current organizational defaults', () => {
    const team = makeTeam('afce1', 'AFC', 'East', true, 84);

    expect(team).toMatchObject({
      id: 'afce1',
      city: 'AFCE1',
      name: 'Club',
      abbr: 'AFC',
      conference: 'AFC',
      division: 'East',
      capSpace: 25,
      capUsed: 210,
      wins: 0,
      losses: 0,
      ties: 0,
      offScheme: 'spread',
      defScheme: 'cover_3',
      ownerId: 'afce1-owner',
      owner: { archetypeId: 'win_now', approval: 28 },
      ownerMood: 28,
      fanConfidence: 28,
      ownerPatience80: 24,
      gmStrategy: 'neutral',
      philosophy: 'maintain',
      isUser: true,
      stadiumType: 'outdoor',
    });
    expect(team.roster).toHaveLength(12);
    expect(new Set(team.roster.map((player) => player.jerseyNumber)).size).toBe(12);
    expect(team.facilityState.facilities.map((facility) => facility.type)).toEqual([
      'training_complex',
      'medical_center',
      'film_room',
      'weight_room',
      'recovery_suite',
    ]);
    expect(team.lockerRoom.culture).toBe('strong');
    expect(team.specialTeams).toEqual({
      kickReturner: null,
      puntReturner: null,
      longSnapper: null,
      kickCoverageUnit: [],
      puntCoverageUnit: [],
    });
  });

  it('creates a non-user team with neutral owner pressure defaults', () => {
    const team = makeTeam('nfcn2', 'NFC', 'North', false, 73);

    expect(team.isUser).toBe(false);
    expect(team.owner.approval).toBe(60);
    expect(team.ownerMood).toBe(60);
    expect(team.fanConfidence).toBe(60);
    expect(team.ownerPatience80).toBe(60);
  });
});

describe('engine test helpers league fixtures', () => {
  it('creates empty game-day state objects without shared mutable arrays', () => {
    const first = createEmptyGameDayState();
    const second = createEmptyGameDayState();

    first.recentPackages.push({ id: 'pkg-1' } as never);

    expect(first.latestPackageId).toBeNull();
    expect(second.latestPackageId).toBeNull();
    expect(second.recentPackages).toEqual([]);
  });

  it('creates a current-version synthetic league with the requested phase and week', () => {
    const game = makeLeagueState('playoffs', 22);

    expect(game.version).toBe(SAVE_VERSION);
    expect(game.seed).toBe(42);
    expect(game.year).toBe(2026);
    expect(game.phase).toBe('playoffs');
    expect(game.week).toBe(22);
    expect(game.difficulty).toBe('pro');
    expect(game.settings.halftimeDecisions).toBe('on');
    expect(Object.keys(game.teams)).toHaveLength(16);
    expect(Object.keys(game.players)).toHaveLength(16 * 12);
    expect(game.schedule.map((entry) => entry.week)).toEqual([1, 18]);
    expect(game.schedule[0]!.games).toHaveLength(8);
    expect(game.schedule[1]!.games).toHaveLength(4);
    expect(game.teams.afce1.isUser).toBe(true);
    expect(Object.values(game.teams).filter((team) => team.isUser)).toHaveLength(1);
    expect(game.players['afce1-qb']).toBe(game.teams.afce1.roster[0]);
    expect(game.ballotWaitlist).toEqual([]);
    expect(game.ballotEliminatedIds).toEqual([]);
    expect(game.owners['afce1-owner']).toMatchObject({
      archetype: 'win_now',
      patience: 24,
      goals: { floor: '7 wins', target: 'playoffs', ceiling: 'title' },
    });
  });

  it('initializes broad saved subsystems used by engine tests', () => {
    const game = makeLeagueState('regular_season', 9);

    expect(game.records.singleGame.passYds).toEqual([]);
    expect(game.gameDayState).toEqual({ recentPackages: [], latestPackageId: null });
    expect(game.weekSummaries).toEqual([]);
    expect(game.powerRankings).toEqual([]);
    expect(game.narrativeState).toEqual({ activeArcs: [], hooks: [], recentHeadlines: [] });
    expect(game.mediaCycle).toEqual({ weeklyDigests: [], powerRankingHistory: [] });
    expect(game.coachingMarket).toMatchObject({
      teamId: null,
      updatedYear: 2026,
      updatedWeek: 9,
      hotSeat: false,
      candidates: { HC: [], OC: [], DC: [] },
    });
    expect(game.dashboardState.activeLayoutId).toBe('layout:default');
    expect(game.scoutingDepartment).toMatchObject({
      budget: 5,
      maxScouts: 5,
      privateWorkoutsRemaining: 3,
    });
    expect(game.faTargetBoard).toEqual({ teamId: null, watchlist: [], targets: [] });
    expect(game.tradeSuggestions).toEqual([]);
  });

  it('produces a fixture that parses as the current save schema', () => {
    const result = SaveStateSchema.safeParse(makeLeagueState('regular_season', 1));

    expect(result.success).toBe(true);
  });
});
