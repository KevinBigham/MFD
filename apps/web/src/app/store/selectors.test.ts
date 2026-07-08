import { describe, expect, it } from 'vitest';
import { applyRuleChange, createEmptyRecordBook, getSalaryCap, initializeOffseasonState } from '@mfd/engine';
import type { GameState, Player, Position } from '@mfd/engine';
import { createSeedGameState } from './seed';
import {
  selectCoachingMarket,
  selectCapProjection,
  selectCurrentOpponentIntel,
  selectFATargetBoard,
  selectGameDayPackageByBroadcastGameId,
  selectOffseasonCalendar,
  selectOwnerMandates,
  selectPlayerRivalries,
  selectPracticeSquadCandidates,
  selectPracticeSquadLimit,
  selectPracticeSquadRows,
  selectUserRecordWatch,
  selectRosterLimit,
  selectClaimResults,
  selectFreeAgentPlayers,
  selectWaiverWireBoard,
  type GameStoreState,
} from './selectors';

function buildState(game = createSeedGameState(42, 0, 'pro'), options: { preservePhase?: boolean } = {}): GameStoreState {
  if (!options.preservePhase) {
    game.phase = 'regular_season';
    game.week = 1;
  }

  return {
    game,
    initialized: true,
    undoSnapshot: null,
    undoLabel: null,
    recapPromptSeenThisSession: false,
    pendingPlayoffLoreReveal: null,
  };
}

function getUserTeam(game: GameState) {
  const team = Object.values(game.teams).find((candidate) => candidate.isUser);
  if (!team) throw new Error('Expected seed game to include a user team.');
  return team;
}

function emptySchedule(weeks: number): GameState['schedule'] {
  return Array.from({ length: weeks }, (_, index) => ({ week: index + 1, games: [] }));
}

function addFreeAgent(game: GameState, id: string, pos: Position, ovr: number, age: number): Player {
  const template = Object.values(game.teams)
    .flatMap((team) => team.roster)
    .find((player) => player.pos === pos) ?? Object.values(game.players)[0];
  if (!template) throw new Error('Expected seed game to include players.');
  const player: Player = {
    ...structuredClone(template),
    id,
    firstName: 'Free',
    lastName: id,
    name: `Free ${id}`,
    pos,
    age,
    ovr,
    teamId: null,
    contract: null,
  };
  game.players[id] = player;
  return player;
}

describe('selectCurrentOpponentIntel', () => {
  it('returns the same reference for repeated reads on an unchanged game state', () => {
    const state = buildState();

    const first = selectCurrentOpponentIntel(state);
    const second = selectCurrentOpponentIntel(state);

    expect(first).not.toBeNull();
    expect(second).toBe(first);
  });

  it('recomputes the intel when the game reference changes', () => {
    const state = buildState();
    const first = selectCurrentOpponentIntel(state);
    const nextGame = structuredClone(state.game!);
    nextGame.week = 2;

    const second = selectCurrentOpponentIntel(buildState(nextGame));

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second).not.toBe(first);
  });
});

describe('selectOwnerMandates', () => {
  it('returns a stable fallback when old saves are missing owner mandates', () => {
    const game = createSeedGameState(42, 0, 'pro');
    game.ownerMandates = undefined;
    const state = buildState(game);

    const first = selectOwnerMandates(state);
    const second = selectOwnerMandates(state);

    expect(first).toEqual([]);
    expect(second).toBe(first);
  });

  it('returns the same filtered mandate reference for repeated reads on an unchanged game state', () => {
    const game = createSeedGameState(43, 0, 'pro');
    const team = getUserTeam(game);
    game.ownerMandates = [{
      id: 'mandate-1',
      teamId: team.id,
      year: game.year,
      goalId: 'cap_health',
      label: 'Cap Health',
      description: 'Maintain healthy salary cap position.',
      slot: 'target',
      selectedIndex: 0,
      createdWeek: 1,
      status: 'active',
      progress: {
        value: 12,
        target: 20,
        percent: 60,
        label: '$12M cap space',
        detail: 'Target is $20M+ space.',
        status: 'at_risk',
      },
      evaluation: null,
    }];
    const state = buildState(game);

    const first = selectOwnerMandates(state);
    const second = selectOwnerMandates(state);

    expect(first).toHaveLength(1);
    expect(second).toBe(first);
  });
});

describe('selectFATargetBoard', () => {
  it('materializes current stored snapshots without rebuilding target metrics', () => {
    const game = createSeedGameState(42, 0, 'pro');
    const team = getUserTeam(game);
    const freeAgent = addFreeAgent(game, 'fa-current-cb', 'CB', 84, 26);
    game.freeAgents = [freeAgent.id];
    game.faTargetBoard = {
      teamId: team.id,
      watchlist: [freeAgent.id],
      targets: [{
        player: freeAgent,
        projectedSalary: 9.5,
        marketDemand: 'low',
        fitScore: 55,
        signProbability: 44,
        competingTeams: [],
      }],
    };

    const board = selectFATargetBoard(buildState(game));

    expect(board.watchlist).toEqual([freeAgent.id]);
    expect(board.targets).toHaveLength(1);
    expect(board.targets[0]?.projectedSalary).toBe(9.5);
    expect(board.targets[0]?.fitScore).toBe(55);
    expect(board.topAvailable[0]?.player.id).toBe(freeAgent.id);
  });

  it('rebuilds stale snapshots from the current free-agent pool while preserving saved watchlist ids', () => {
    const game = createSeedGameState(43, 0, 'pro');
    const team = getUserTeam(game);
    const staleFreeAgent = addFreeAgent(game, 'fa-stale-wr', 'WR', 82, 29);
    const liveFreeAgent = addFreeAgent(game, 'fa-live-cb', 'CB', 86, 24);
    game.freeAgents = [liveFreeAgent.id];
    game.faTargetBoard = {
      teamId: team.id,
      watchlist: [staleFreeAgent.id, liveFreeAgent.id],
      targets: [{
        player: staleFreeAgent,
        projectedSalary: 8.1,
        marketDemand: 'medium',
        fitScore: 70,
        signProbability: 50,
        competingTeams: [],
      }],
    };

    const board = selectFATargetBoard(buildState(game));

    expect(board.watchlist).toEqual([staleFreeAgent.id, liveFreeAgent.id]);
    expect(board.targets.map((target) => target.player.id)).toEqual([liveFreeAgent.id]);
    expect(board.targets[0]?.projectedSalary).not.toBe(8.1);
  });
});

describe('selectPracticeSquadLimit', () => {
  it('uses the current active practice squad size rule', () => {
    const game = createSeedGameState(45, 0, 'pro');
    game.leagueRules = applyRuleChange(game.leagueRules, {
      key: 'practice_squad_size',
      newValue: 12,
      source: 'commissioner_vote',
      proposedBy: 'commissioner',
      effectiveYear: game.year,
      rationale: 'Tighten the developmental roster.',
    });

    expect(selectPracticeSquadLimit(buildState(game))).toBe(12);
  });

  it('falls back to the default rule value when league rules are unavailable', () => {
    const game = createSeedGameState(46, 0, 'pro');
    game.leagueRules = null as never;

    expect(selectPracticeSquadLimit(buildState(game))).toBe(16);
  });
});

describe('selectPlayerRivalries', () => {
  it('returns the same filtered rivalry reference for repeated reads on an unchanged game state', () => {
    const game = createSeedGameState(44, 0, 'pro');
    const userTeam = getUserTeam(game);
    const [playerA, playerB] = userTeam.roster;
    if (!playerA || !playerB) throw new Error('Expected seed roster players.');
    game.playerRivalries = [{
      id: 'rivalry-1',
      playerAId: playerA.id,
      playerBId: playerB.id,
      playerAName: playerA.name,
      playerBName: playerB.name,
      teamAId: userTeam.id,
      teamBId: userTeam.id,
      intensity: 66,
      tier: 'heated',
      origin: 'Test rivalry',
      history: [{ year: game.year, week: 1, description: 'Test spike', intensityDelta: 12 }],
      seasonStarted: game.year,
    }];
    const state = buildState(game);
    const selector = selectPlayerRivalries(playerA.id);

    const first = selector(state);
    const second = selector(state);

    expect(first).toHaveLength(1);
    expect(second).toBe(first);
  });
});

describe('selectCapProjection', () => {
  it('uses the current active salary cap growth rule for future cap rows', () => {
    const game = createSeedGameState(49, 0, 'pro');
    game.leagueRules = applyRuleChange(game.leagueRules, {
      key: 'salary_cap_growth',
      newValue: 0.1,
      source: 'cba',
      proposedBy: 'owners',
      effectiveYear: game.year + 1,
      rationale: 'Raise the cap faster next year.',
    });

    const projection = selectCapProjection(buildState(game));

    expect(projection[0]?.totalCap).toBe(getSalaryCap(game.year + 1, game));
    expect(projection[0]?.totalCap).toBeGreaterThan(getSalaryCap(game.year + 1));
  });
});

describe('selectGameDayPackageByBroadcastGameId', () => {
  it('matches saved game-day packages to the selected broadcast result by year, week, and teams', () => {
    const game = createSeedGameState(59, 0, 'pro');
    const userTeam = getUserTeam(game);
    const opponent = Object.values(game.teams).find((team) => team.id !== userTeam.id);
    if (!opponent) throw new Error('Expected seed game to include an opponent.');
    const result = {
      id: 'broadcast-game-1',
      year: game.year,
      week: 4,
      homeTeamId: userTeam.id,
      awayTeamId: opponent.id,
      homeScore: 24,
      awayScore: 17,
      overtime: false,
      broadcast: {
        gameId: 'broadcast-game-1',
        quarters: [],
        highlights: [],
        momentumSwings: [],
        mvpPlayerIds: [],
        finalNarrative: 'Saved broadcast.',
        broadcastNetwork: 'MFN',
      },
    } as unknown as GameState['schedule'][number]['games'][number]['result'];
    game.schedule = [
      { week: 1, games: [] },
      { week: 2, games: [] },
      { week: 3, games: [] },
      {
        week: 4,
        games: [
          {
            homeTeamId: userTeam.id,
            awayTeamId: opponent.id,
            result,
          },
        ],
      },
    ];
    game.gameDayState = {
      latestPackageId: 'wrong-week',
      recentPackages: [
        {
          id: 'wrong-week',
          year: game.year,
          week: 3,
          teamId: userTeam.id,
          opponentTeamId: opponent.id,
          activeEffectSummaries: ['Halftime hell: stayed with the original script after the break.'],
        },
        {
          id: 'matching-package',
          year: game.year,
          week: 4,
          teamId: userTeam.id,
          opponentTeamId: opponent.id,
          activeEffectSummaries: ['Halftime hell: flipped the second-half plan to open the throttle.'],
        },
      ],
    } as unknown as GameState['gameDayState'];

    const packageData = selectGameDayPackageByBroadcastGameId('broadcast-game-1')(buildState(game, { preservePhase: true }));

    expect(packageData?.id).toBe('matching-package');
    expect(packageData?.activeEffectSummaries[0]).toContain('flipped the second-half plan');
  });
});

describe('selectOffseasonCalendar', () => {
  it('derives the free-agency window from current phase and offseason round', () => {
    const game = createSeedGameState(55, 0, 'pro');
    game.offseasonState = initializeOffseasonState(game);
    game.phase = 'free_agency';
    game.week = 2;
    game.offseasonState.round = 2;

    const calendar = selectOffseasonCalendar(buildState(game, { preservePhase: true }));

    expect(calendar.visible).toBe(true);
    expect(calendar.blocked).toBe(false);
    expect(calendar.activeStepId).toBe('free_agency');
    expect(calendar.steps.find((step) => step.id === 're_sign')).toMatchObject({
      status: 'complete',
      route: '/contracts',
    });
    expect(calendar.steps.find((step) => step.id === 'free_agency')).toMatchObject({
      status: 'active',
      route: '/free-agency',
      detail: 'Round 2 of 3.',
    });
    expect(calendar.steps.find((step) => step.id === 'draft')).toMatchObject({
      status: 'upcoming',
      route: '/draft',
    });
  });

  it('surfaces a CBA negotiation hold before offseason advancement', () => {
    const game = createSeedGameState(56, 0, 'pro');
    game.offseasonState = initializeOffseasonState(game);
    game.phase = 'offseason';
    game.cbaState.status = 'awaiting_owner_vote';

    const calendar = selectOffseasonCalendar(buildState(game, { preservePhase: true }));

    expect(calendar.blocked).toBe(true);
    expect(calendar.activeStepId).toBe('cba_hold');
    expect(calendar.steps[0]).toMatchObject({
      id: 'cba_hold',
      status: 'blocked',
      route: '/cba',
    });
    expect(calendar.steps.find((step) => step.id === 're_sign')?.status).toBe('upcoming');
  });

  it('surfaces an active expansion draft as the offseason blocker', () => {
    const game = createSeedGameState(57, 0, 'pro');
    game.offseasonState = initializeOffseasonState(game);
    game.phase = 'offseason';
    game.expansionDraftState = {
      expansionTeam: {
        city: 'Portland',
        name: 'Pioneers',
        abbr: 'POR',
        conference: 'NFC',
        division: 'NFC West',
      },
      protectedPlayers: {},
      availablePlayers: [],
      selectedPlayers: [],
      picksRemaining: 5,
      phase: 'drafting',
    };

    const calendar = selectOffseasonCalendar(buildState(game, { preservePhase: true }));

    expect(calendar.blocked).toBe(true);
    expect(calendar.activeStepId).toBe('expansion_draft');
    expect(calendar.steps[0]).toMatchObject({
      id: 'expansion_draft',
      status: 'blocked',
      route: '/expansion-draft',
    });
    expect(calendar.steps[0]?.detail).toContain('5 pick(s) remaining');
  });
});

describe('waiver and practice squad selectors', () => {
  it('labels pending waiver claims as future-resolution intents with a minimum-deal award policy', () => {
    const game = createSeedGameState(145, 0, 'pro');
    const team = getUserTeam(game);
    const player = addFreeAgent(game, 'waiver-wr', 'WR', 78, 25);
    game.freeAgents = [];
    game.waiverWire = [{
      playerId: player.id,
      releasedByTeamId: team.id,
      createdYear: game.year,
      createdWeek: game.week,
      expiresYear: game.year,
      expiresWeek: game.week + 1,
    }];
    game.waiverClaims = [{
      teamId: team.id,
      playerId: player.id,
      claimYear: game.year,
      claimWeek: game.week,
    }];

    const board = selectWaiverWireBoard(buildState(game));

    expect(board[0]).toMatchObject({
      playerId: player.id,
      salaryLabel: 'No active contract',
      contractStatus: 'no_active_contract',
      countdown: 'Clears after 1 week advance',
      claimPending: true,
      canSubmitClaim: false,
      actionLabel: 'Claim Pending',
      statusLabel: 'Pending waiver run',
      lifecycleNote: 'If awarded, the player signs a one-year minimum deal with the claiming team.',
    });
  });

  it('separates practice squad candidates that can be added now from players still blocked on waivers', () => {
    const game = createSeedGameState(146, 0, 'pro');
    const team = getUserTeam(game);
    const freeAgent = addFreeAgent(game, 'fa-eligible-rb', 'RB', 70, 23);
    const waiverPlayer = addFreeAgent(game, 'waiver-blocked-cb', 'CB', 76, 24);
    game.freeAgents = [freeAgent.id];
    game.waiverWire = [{
      playerId: waiverPlayer.id,
      releasedByTeamId: team.id,
      createdYear: game.year,
      createdWeek: game.week,
      expiresYear: game.year,
      expiresWeek: game.week + 1,
    }];
    game.waiverClaims = [{
      teamId: team.id,
      playerId: waiverPlayer.id,
      claimYear: game.year,
      claimWeek: game.week,
    }];

    const candidates = selectPracticeSquadCandidates(buildState(game));

    expect(candidates.map((entry) => entry.id)).toEqual([waiverPlayer.id, freeAgent.id]);
    expect(candidates[0]).toMatchObject({
      source: 'waiver',
      availability: 'blocked_on_waivers',
      canAdd: false,
      actionLabel: 'Claim Pending',
      statusLabel: 'Pending waiver claim',
    });
    expect(candidates[1]).toMatchObject({
      source: 'free_agent',
      availability: 'eligible',
      canAdd: true,
      actionLabel: 'Add',
      statusLabel: 'Practice-squad eligible',
    });
  });

  it('joins saved practice squad rows through game.players instead of the active roster', () => {
    const game = createSeedGameState(147, 0, 'pro');
    const team = getUserTeam(game);
    const player = addFreeAgent(game, 'ps-hidden-wr', 'WR', 68, 22);
    player.teamId = team.id;
    game.freeAgents = [];
    team.roster = team.roster.filter((entry) => entry.id !== player.id);
    team.practiceSquad = [{
      playerId: player.id,
      elevationsUsed: 1,
      maxElevations: 3,
      isElevated: false,
    }];

    const rows = selectPracticeSquadRows(buildState(game));

    expect(rows[0]).toMatchObject({
      playerId: player.id,
      name: 'Free ps-hidden-wr',
      pos: 'WR',
      ovr: 68,
      age: 22,
      statusLabel: 'Practice squad',
      canElevate: true,
    });
  });

  it('derives waiver and practice-squad names from schema-normalized players', () => {
    const game = createSeedGameState(1471, 0, 'pro');
    const team = getUserTeam(game);
    const cpuTeam = Object.values(game.teams).find((candidate) => candidate.id !== team.id);
    if (!cpuTeam) throw new Error('Expected seed game to include a CPU team.');
    const waiverPlayer = addFreeAgent(game, 'waiver-normalized-wr', 'WR', 75, 24);
    const squadPlayer = addFreeAgent(game, 'ps-normalized-cb', 'CB', 67, 22);
    const candidatePlayer = addFreeAgent(game, 'candidate-normalized-rb', 'RB', 69, 23);

    delete (waiverPlayer as Partial<Player>).name;
    delete (squadPlayer as Partial<Player>).name;
    delete (candidatePlayer as Partial<Player>).name;

    squadPlayer.teamId = team.id;
    game.freeAgents = [candidatePlayer.id];
    team.practiceSquad = [{
      playerId: squadPlayer.id,
      elevationsUsed: 0,
      maxElevations: 3,
    }];
    game.waiverWire = [{
      playerId: waiverPlayer.id,
      releasedByTeamId: cpuTeam.id,
      createdYear: game.year,
      createdWeek: game.week,
      expiresYear: game.year,
      expiresWeek: game.week + 1,
    }];
    game.waiverResults = [{
      id: 'waiver-results-normalized',
      year: game.year,
      week: game.week,
      entries: [{
        playerId: waiverPlayer.id,
        releasedByTeamId: cpuTeam.id,
        winningTeamId: team.id,
        losingTeamIds: [],
        clearedToFreeAgency: false,
      }],
    }];

    const state = buildState(game);

    expect(selectWaiverWireBoard(state)[0]?.name).toBe('Free waiver-normalized-wr');
    expect(selectClaimResults(state)[0]?.successfulClaims[0]?.playerName).toBe('Free waiver-normalized-wr');
    expect(selectPracticeSquadRows(state)[0]?.name).toBe('Free ps-normalized-cb');
    expect(selectFreeAgentPlayers(state)[0]?.name).toBe('Free candidate-normalized-rb');
    expect(selectPracticeSquadCandidates(state).find((entry) => entry.id === candidatePlayer.id)?.name)
      .toBe('Free candidate-normalized-rb');
  });

  it('labels cleared waiver rows as league-wide while keeping claim outcomes user-scoped', () => {
    const game = createSeedGameState(148, 0, 'pro');
    const team = getUserTeam(game);
    const cpuTeam = Object.values(game.teams).find((candidate) => candidate.id !== team.id);
    if (!cpuTeam) throw new Error('Expected seed game to include a CPU team.');
    const wonPlayer = addFreeAgent(game, 'waiver-win-wr', 'WR', 77, 25);
    const lostPlayer = addFreeAgent(game, 'waiver-loss-cb', 'CB', 76, 24);
    const clearedPlayer = addFreeAgent(game, 'waiver-clear-rb', 'RB', 71, 23);
    const cpuOnlyPlayer = addFreeAgent(game, 'waiver-cpu-only-dl', 'DL', 73, 25);
    game.waiverResults = [{
      id: 'waiver-results-test',
      year: game.year,
      week: game.week,
      entries: [
        {
          playerId: wonPlayer.id,
          releasedByTeamId: cpuTeam.id,
          winningTeamId: team.id,
          losingTeamIds: [cpuTeam.id],
          clearedToFreeAgency: false,
        },
        {
          playerId: lostPlayer.id,
          releasedByTeamId: cpuTeam.id,
          winningTeamId: cpuTeam.id,
          losingTeamIds: [team.id],
          clearedToFreeAgency: false,
        },
        {
          playerId: clearedPlayer.id,
          releasedByTeamId: cpuTeam.id,
          winningTeamId: null,
          losingTeamIds: [],
          clearedToFreeAgency: true,
        },
        {
          playerId: cpuOnlyPlayer.id,
          releasedByTeamId: team.id,
          winningTeamId: cpuTeam.id,
          losingTeamIds: [],
          clearedToFreeAgency: false,
        },
      ],
    }];

    const results = selectClaimResults(buildState(game));

    expect(results).toHaveLength(1);
    expect(results[0]?.successfulClaims.map((entry) => entry.playerId)).toEqual([wonPlayer.id]);
    expect(results[0]?.lostClaims.map((entry) => entry.playerId)).toEqual([lostPlayer.id]);
    expect(results[0]?.clearedPlayers).toEqual([{
      playerId: clearedPlayer.id,
      playerName: clearedPlayer.name,
      scopeLabel: 'League-wide clearance',
    }]);
  });
});

describe('selectRosterLimit', () => {
  it('uses the current active roster limit rule', () => {
    const game = createSeedGameState(47, 0, 'pro');
    game.leagueRules = applyRuleChange(game.leagueRules, {
      key: 'roster_limit',
      newValue: 50,
      source: 'commissioner_vote',
      proposedBy: 'commissioner',
      effectiveYear: game.year,
      rationale: 'Trim active rosters.',
    });

    expect(selectRosterLimit(buildState(game))).toBe(50);
  });

  it('falls back to the legacy active roster limit when league rules are unavailable', () => {
    const game = createSeedGameState(48, 0, 'pro');
    game.leagueRules = null as never;

    expect(selectRosterLimit(buildState(game))).toBe(53);
  });
});

describe('selectUserRecordWatch', () => {
  it('projects user record pace over the generated regular-season schedule length', () => {
    const game = createSeedGameState(49, 0, 'pro');
    const team = getUserTeam(game);
    const qb = team.roster.find((player) => player.pos === 'QB');
    if (!qb) throw new Error('Expected user team to include a quarterback.');

    game.records = createEmptyRecordBook();
    game.schedule = emptySchedule(19);
    team.seasonStats.gamesPlayed = 17;
    qb.stats.passYds = 3400;
    game.records.singleSeason.passYds = [{
      category: 'singleSeason',
      stat: 'passYds',
      value: 3700,
      teamId: 'legacy-team',
      teamName: 'Legacy Club',
      year: game.year - 1,
      playerId: 'legacy-qb',
      playerName: 'Legacy QB',
    }];

    const watch = selectUserRecordWatch(buildState(game));
    const passYardsWatch = watch.find((item) => item.playerId === qb.id && item.stat === 'passYds');

    expect(passYardsWatch).toMatchObject({
      currentValue: 3400,
      projectedValue: 3800,
      recordValue: 3700,
      recordHolder: 'Legacy QB',
    });
  });
});

describe('selectCoachingMarket', () => {
  it('rebuilds stale market views without mutating the saved cached market', () => {
    const game = createSeedGameState(44, 0, 'pro');
    const team = getUserTeam(game);
    game.week = 7;
    game.coachingMarket = {
      teamId: 'stale-team',
      updatedYear: game.year - 1,
      updatedWeek: 3,
      hotSeat: false,
      candidates: { HC: [], OC: [], DC: [] },
    };

    const market = selectCoachingMarket(buildState(game));

    expect(market.teamId).toBe(team.id);
    expect(market.updatedYear).toBe(game.year);
    expect(market.updatedWeek).toBe(game.week);
    expect(market.candidates.HC.length).toBeGreaterThan(0);
    expect(game.coachingMarket).toEqual({
      teamId: 'stale-team',
      updatedYear: game.year - 1,
      updatedWeek: 3,
      hotSeat: false,
      candidates: { HC: [], OC: [], DC: [] },
    });
  });
});
