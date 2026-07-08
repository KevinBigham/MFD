import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContingencyRule, ContractOffer, DraftProspect, GameResult, ScrapbookEntry, TeamNeedsReport, TradeOffer, TradeOfferAsset } from '@mfd/engine';
import { calcCapHit, createTradeProposal as createTradeProposalEngine, getFacilityLevelEffect, getSalaryCap, initializeOffseasonState, mulberry32, startScenario, validateGameState } from '@mfd/engine';
import { createSeedGameState } from './seed';
import { useGameStore } from './game-store';
import { selectActiveEndorsements, selectEndorsementRevenue } from './selectors';
import { autosaveDynasty } from './persistence';
import { useUiStore } from './ui-store';
import { deriveDynastyId } from '../../lib/career-meta';
import {
  appendScrapbookEntry,
  readScrapbookForDynasty,
} from '../../lib/scrapbook-store';
import {
  readDynastyStarters,
  upsertDynastyStarters,
} from '../../lib/roster-continuity-store';
import {
  readRookieOfYearEntries,
  upsertRookieOfYearEntry,
} from '../../lib/rookie-of-year-store';
import { loadRivalries, saveRivalries } from '../../lib/rivalry-storage';
import { MemoryStorage } from './game-store.test-helpers';

// Note: the heavy week-advancing / halftime / playoff-lore / trade-deadline
// tests live in `game-store.gameweek.test.ts`. Split 2026-04-22 to dodge
// vitest's internal worker RPC timeout ("Timeout calling onTaskUpdate") that
// was firing on CI when this file ran 60+ seconds. Shared test utilities live
// in `game-store.test-helpers.ts`.

vi.mock('./persistence', () => ({
  autosaveDynasty: vi.fn().mockResolvedValue(1),
  loadLatestAutosaveGame: vi.fn().mockResolvedValue(null),
}));

function makeProspect(id: string): DraftProspect {
  return {
    id,
    firstName: 'Store',
    lastName: 'Prospect',
    pos: 'WR',
    college: 'Test State',
    region: 'south',
    ratings: { awareness: 82, speed: 84, stamina: 83 },
    projectedRound: 1,
    scoutGrade: 76,
    trueGrade: 84,
    personality: { workEthic: 7, loyalty: 5, greed: 4, pressure: 6, ambition: 7 },
    traits: [],
    archetype: null,
    characterArchetype: 'balanced',
    bustProbability: 0.12,
    stealProbability: 0.08,
    scoutingReports: [],
    combine: null,
  };
}

function makeRivalryResult(
  homeTeamId: string,
  awayTeamId: string,
  week: number,
  homeScore: number,
  awayScore: number,
): GameResult {
  return {
    id: `${homeTeamId}-${awayTeamId}-${week}`,
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    week,
    year: 2026,
    overtime: false,
    mvpPlayerId: null,
    stats: {
      [homeTeamId]: {} as never,
      [awayTeamId]: {} as never,
    },
    playerMatchupEvents: [],
  };
}

function addCompletedRivalryMatchup(game: ReturnType<typeof createSeedGameState>): [string, string] {
  const [home, away] = Object.values(game.teams);
  if (!home || !away) throw new Error('Expected at least two teams');

  game.schedule = [{
    week: 1,
    games: [{
      homeTeamId: home.id,
      awayTeamId: away.id,
      result: makeRivalryResult(home.id, away.id, 1, 24, 17),
    }],
  }];

  return [home.id, away.id];
}

function setBlockDraftScenario(game: ReturnType<typeof createSeedGameState>): void {
  game.scenarioState = {
    activeScenario: {
      id: 'draft_lock',
      name: 'Draft Lock',
      tagline: 'No user draft picks.',
      description: 'A test scenario that blocks user draft selections.',
      difficulty: 'pro',
      seasonLimit: 1,
      objectives: [],
      bonusObjectives: [],
      constraints: {
        blockTrades: false,
        blockFreeAgency: false,
        blockDraft: true,
        forcedDifficulty: undefined,
      },
    },
    scenarioSeason: 1,
    completedScenarios: [],
  };
}

function setBlockFreeAgencyScenario(game: ReturnType<typeof createSeedGameState>): void {
  game.scenarioState = {
    activeScenario: {
      id: 'waiver_lock',
      name: 'Waiver Lock',
      tagline: 'No external claims.',
      description: 'A test scenario that blocks waiver claim submissions.',
      difficulty: 'pro',
      seasonLimit: 1,
      objectives: [],
      bonusObjectives: [],
      constraints: {
        blockTrades: false,
        blockFreeAgency: true,
        blockDraft: false,
        forcedDifficulty: undefined,
      },
    },
    scenarioSeason: 1,
    completedScenarios: [],
  };
}

function makeScrapbookEntry(year: number): ScrapbookEntry {
  return {
    year,
    eraTag: `Era ${year}`,
    seasonHighlightLine: `Highlight ${year}`,
    notableMoments: [{
      headline: `Moment ${year}`,
      detail: 'A notable season detail.',
      week: 8,
      importance: 'major',
    }],
    recap: {
      teamId: 'afce1',
      teamName: 'Blaze',
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
        passingLeader: {
          playerId: `qb-${year}`,
          playerName: `QB ${year}`,
          pos: 'QB',
          value: 4100,
          gamesPlayed: 17,
          perGame: 241.2,
        },
        rushingLeader: {
          playerId: `rb-${year}`,
          playerName: `RB ${year}`,
          pos: 'RB',
          value: 1200,
          gamesPlayed: 17,
          perGame: 70.6,
        },
      },
      seasonStory: `Season story ${year}`,
      teamMotto: 'Keep climbing.',
      breakoutCandidates: [{
        playerId: `breakout-${year}`,
        playerName: `Breakout ${year}`,
        pos: 'WR',
        age: 24,
        ovr: 82,
        ovrDelta: 4,
        reason: 'Strong offseason leap.',
      }],
    },
  };
}

function makeCachedNeedsReport(overall: string): TeamNeedsReport {
  return {
    overall,
    positionGrades: [],
    criticalNeeds: ['QB'],
    strengths: ['WR'],
    draftTargets: ['QB'],
    faTargets: ['QB'],
    capFlexibility: 'moderate',
  };
}

describe('game store offseason actions', () => {
  beforeEach(() => {
    useGameStore.setState((state) => ({
      ...state,
      game: null,
      initialized: false,
      pendingPlayoffLoreReveal: null,
    }));
    useUiStore.setState((state) => ({
      ...state,
      autosaveEnabled: true,
      simSpeed: 'normal',
      broadcastGameId: null,
    }));
    vi.stubGlobal('PopStateEvent', class PopStateEventMock {
      type: string;

      constructor(type: string) {
        this.type = type;
      }
    });
    vi.stubGlobal('localStorage', new MemoryStorage());
    vi.clearAllMocks();
  });

  afterEach(() => {
    useGameStore.setState((state) => ({
      ...state,
      game: null,
      initialized: false,
      pendingPlayoffLoreReveal: null,
    }));
    useUiStore.setState((state) => ({
      ...state,
      autosaveEnabled: true,
      simSpeed: 'normal',
      broadcastGameId: null,
    }));
    vi.unstubAllGlobals();
  });

  it('stores a re-sign offer and autosaves the updated game', async () => {
    const game = createSeedGameState(42, 0, 'pro');
    game.year = 2027;
    game.phase = 'offseason';
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    userTeam.roster[0]!.contract!.years = 1;
    game.offseasonState = initializeOffseasonState(game);

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    const asking = game.offseasonState.reSignDecisions[userTeam.roster[0]!.id]!.askingPrice;
    await useGameStore.getState().actions.submitReSignOffer(userTeam.roster[0]!.id, asking);

    const nextGame = useGameStore.getState().game!;
    expect(nextGame.offseasonState?.reSignDecisions[userTeam.roster[0]!.id]?.lastOffer).toEqual(asking);
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('records scouting actions through the store and persists the result', async () => {
    const game = createSeedGameState(7, 0, 'pro');
    game.year = 2027;
    game.phase = 'offseason';
    game.offseasonState = initializeOffseasonState(game);
    game.draftClass = [makeProspect('store-prospect')];

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.runScoutingAction('store-prospect', 'film');

    const scouting = useGameStore.getState().game?.offseasonState?.scoutingState['store-prospect'];
    expect(scouting?.actions).toEqual(['film']);
    expect(scouting?.accuracy).toBeGreaterThan(0);
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('persists starter changes and mirrors the global player map', async () => {
    const game = createSeedGameState(126, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const cpuTeam = Object.values(game.teams).find((team) => !team.isUser)!;
    const backup = userTeam.roster.find((player) => !player.isStarter && game.players[player.id]);
    if (!backup) throw new Error('Expected a seeded backup player for starter persistence test.');
    const depthChartStepIndex = game.tutorialState.steps.findIndex((step) => step.id === 'set_depth_chart');
    game.tutorialState.currentStepIndex = depthChartStepIndex;
    game.teamNeedsCache = {
      [userTeam.id]: makeCachedNeedsReport('cached user report'),
      [cpuTeam.id]: makeCachedNeedsReport('cached CPU report'),
    };

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.setStarter(userTeam.id, backup.id, true);

    const nextGame = useGameStore.getState().game!;
    const rosterPlayer = nextGame.teams[userTeam.id]!.roster.find((player) => player.id === backup.id);
    expect(rosterPlayer?.isStarter).toBe(true);
    expect(nextGame.players[backup.id]?.isStarter).toBe(true);
    expect(nextGame.teamNeedsCache).toEqual({});
    expect(nextGame.tutorialState.completedSteps).toContain('set_depth_chart');
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('toggles trade-block status through the durable store path and mirrors the player map', async () => {
    const game = createSeedGameState(127, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const player = userTeam.roster.find((entry) => game.players[entry.id])!;
    player.tradeBlock = false;
    game.players[player.id] = { ...player, tradeBlock: false };

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.toggleTradeBlock(userTeam.id, player.id);

    const nextGame = useGameStore.getState().game!;
    const nextPlayer = nextGame.teams[userTeam.id]!.roster.find((entry) => entry.id === player.id)!;
    expect(nextPlayer.tradeBlock).toBe(true);
    expect(nextGame.players[player.id]?.tradeBlock).toBe(true);
    expect(player.tradeBlock).toBe(false);
    expect(game.players[player.id]?.tradeBlock).toBe(false);
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
    expect(autosaveDynasty).toHaveBeenCalledWith(nextGame);
  });

  it('clears only the new dynasty scrapbook bucket when starting a new game', async () => {
    const game = createSeedGameState(41, 0, 'pro');
    const dynastyId = deriveDynastyId(game);

    appendScrapbookEntry(dynastyId, makeScrapbookEntry(2026));
    appendScrapbookEntry('other-dynasty', makeScrapbookEntry(2025));

    await useGameStore.getState().actions.newGame(game);

    expect(readScrapbookForDynasty(dynastyId)).toEqual([]);
    expect(readScrapbookForDynasty('other-dynasty')).toHaveLength(1);
  });

  it('clears only the new dynasty continuity snapshot when starting a new game', async () => {
    const game = createSeedGameState(42, 0, 'pro');
    const dynastyId = deriveDynastyId(game);

    upsertDynastyStarters(dynastyId, 2026, ['qb-1', 'rb-1']);
    upsertDynastyStarters('other-dynasty', 2025, ['qb-9']);

    await useGameStore.getState().actions.newGame(game);

    expect(readDynastyStarters(dynastyId)).toBeNull();
    expect(readDynastyStarters('other-dynasty')).toEqual({
      lastSyncedYear: 2025,
      starterIds: ['qb-9'],
    });
  });

  it('clears only the new dynasty rookie award archive when starting a new game', async () => {
    const game = createSeedGameState(43, 0, 'pro');
    const dynastyId = deriveDynastyId(game);

    upsertRookieOfYearEntry(dynastyId, {
      playerId: 'rookie-1',
      playerName: 'Jalen Banks',
      teamId: 'team-1',
      teamAbbr: 'CHI',
      position: 'WR',
      compositeScore: 121.5,
      headline: 'Jalen Banks: CHI rookie WR takes ROY honors',
      highlights: ['Strong rookie season'],
      season: 2026,
    });
    upsertRookieOfYearEntry('other-dynasty', {
      playerId: 'rookie-9',
      playerName: 'Other Rookie',
      teamId: 'team-9',
      teamAbbr: 'HOU',
      position: 'QB',
      compositeScore: 119.4,
      headline: 'Other Rookie: HOU rookie QB takes ROY honors',
      highlights: ['Strong rookie season'],
      season: 2025,
    });

    await useGameStore.getState().actions.newGame(game);

    expect(readRookieOfYearEntries(dynastyId)).toEqual([]);
    expect(readRookieOfYearEntries('other-dynasty')).toHaveLength(1);
  });

  it('resets the derived rivalry sidecar when starting a new game', async () => {
    const game = createSeedGameState(44, 0, 'pro');
    saveRivalries({
      schemaVersion: 1,
      generatedAt: 123,
      teams: {
        stale: [],
      },
    });

    await useGameStore.getState().actions.newGame(game);

    expect(loadRivalries().teams).toEqual({});
  });

  it('syncs the derived rivalry sidecar when loading a save', () => {
    const game = createSeedGameState(45, 0, 'pro');
    const [homeTeamId, awayTeamId] = addCompletedRivalryMatchup(game);

    useGameStore.getState().actions.loadGame(game);

    expect(loadRivalries().teams[homeTeamId]?.[0]).toMatchObject({
      opponentId: awayTeamId,
      lastMatchup: {
        result: 'win',
        margin: 7,
      },
    });
  });

  it('runs a private workout and spends one scouting workout slot', async () => {
    const game = createSeedGameState(8, 0, 'pro');
    game.year = 2027;
    game.phase = 'offseason';
    game.offseasonState = initializeOffseasonState(game);
    game.draftClass = [makeProspect('workout-prospect')];

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.runPrivateWorkout('workout-prospect');

    const nextGame = useGameStore.getState().game!;
    const scouting = nextGame.offseasonState?.scoutingState['workout-prospect'];
    expect(scouting?.actions).toContain('private_workout');
    expect(scouting?.privateWorkoutRatings).toEqual(expect.any(Array));
    expect(nextGame.scoutingDepartment.privateWorkoutsRemaining).toBe(2);
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('toggles a scouting watchlist entry through the store', async () => {
    const game = createSeedGameState(9, 0, 'pro');
    game.year = 2027;
    game.phase = 'offseason';
    game.offseasonState = initializeOffseasonState(game);
    game.draftClass = [makeProspect('watch-prospect')];

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.toggleScoutingWatchlist('watch-prospect');

    expect(useGameStore.getState().game?.offseasonState?.scoutingWatchlist).toEqual(['watch-prospect']);
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('drafts a player through the store and advances the user draft index', async () => {
    const game = createSeedGameState(11, 0, 'pro');
    game.year = 2027;
    game.phase = 'draft';
    game.offseasonState = initializeOffseasonState(game);
    game.draftClass = [makeProspect('draft-store-prospect')];
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    game.offseasonState.draftOrder = [{
      id: 'user-2027-1-1-user',
      teamId: userTeam.id,
      round: 1,
      pick: 1,
      overall: 1,
      originalTeamId: userTeam.id,
    }];
    game.offseasonState.currentDraftPickIndex = 0;

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.makeDraftPick('draft-store-prospect');

    const nextGame = useGameStore.getState().game!;
    expect(nextGame.teams[userTeam.id]!.roster.some((player) => player.id === 'draft-store-prospect')).toBe(true);
    expect(nextGame.offseasonState?.currentDraftPickIndex).toBe(1);
    expect(nextGame.postGameUi?.audioCueQueue.at(-1)?.event).toBe('draft_pick');
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('blocks draft picks through the store when scenario constraints disable drafting', async () => {
    const game = createSeedGameState(325, 0, 'pro');
    game.phase = 'draft';
    game.offseasonState = initializeOffseasonState(game);
    game.draftClass = [makeProspect('blocked-store-prospect')];
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    game.offseasonState.draftOrder = [{
      id: 'user-2027-1-1-user',
      teamId: userTeam.id,
      round: 1,
      pick: 1,
      overall: 1,
      originalTeamId: userTeam.id,
    }];
    game.offseasonState.currentDraftPickIndex = 0;
    setBlockDraftScenario(game);

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.makeDraftPick('blocked-store-prospect');

    const nextGame = useGameStore.getState().game!;
    expect(nextGame.teams[userTeam.id]!.roster.some((player) => player.id === 'blocked-store-prospect')).toBe(false);
    expect(nextGame.draftClass.some((prospect) => prospect.id === 'blocked-store-prospect')).toBe(true);
    expect(nextGame.offseasonState?.currentDraftPickIndex).toBe(0);
    expect(nextGame.postGameUi?.audioCueQueue ?? []).toEqual([]);
    expect(autosaveDynasty).not.toHaveBeenCalled();
  });

  it('queues a free-agent signing cue when a street free agent signs', async () => {
    const game = createSeedGameState(24, 0, 'pro');
    game.phase = 'offseason';
    game.offseasonState = initializeOffseasonState(game);
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const sourceTeam = Object.values(game.teams).find((team) => !team.isUser)!;
    const untouchedTeam = Object.values(game.teams).find((team) => !team.isUser && team.id !== sourceTeam.id)!;
    const player = sourceTeam.roster[0]!;
    sourceTeam.roster = sourceTeam.roster.filter((entry) => entry.id !== player.id);
    player.teamId = null;
    player.contract = null;
    game.players[player.id] = player;
    game.freeAgents = [player.id];
    game.teamNeedsCache = {
      [userTeam.id]: makeCachedNeedsReport('cached user report'),
      [sourceTeam.id]: makeCachedNeedsReport('cached source report'),
      [untouchedTeam.id]: makeCachedNeedsReport('cached untouched report'),
    };
    const playerId = player.id;
    const offer: ContractOffer = {
      years: 1,
      salary: 1.1,
      signingBonus: 0.2,
      guaranteed: 0.6,
    };

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.signStreetFreeAgent(playerId, offer);

    const nextGame = useGameStore.getState().game!;
    const nextUserTeam = nextGame.teams[userTeam.id]!;
    const signedPlayer = nextGame.players[playerId]!;
    expect(signedPlayer.teamId).toBe(userTeam.id);
    expect(signedPlayer.contract?.teamId).toBe(userTeam.id);
    expect(nextUserTeam.roster.some((player) => player.id === playerId && player.teamId === userTeam.id)).toBe(true);
    expect(nextGame.freeAgents).not.toContain(playerId);
    expect(nextGame.teamNeedsCache).toEqual({});
    expect(validateGameState(nextGame).violations.filter((entry) => entry.context?.playerId === playerId)).toEqual([]);
    expect(nextGame.postGameUi?.audioCueQueue.at(-1)?.event).toBe('free_agent_signed');
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('does not cue or autosave when a street free-agent signing is blocked by scenario constraints', async () => {
    const game = createSeedGameState(325, 0, 'pro');
    game.phase = 'offseason';
    game.offseasonState = initializeOffseasonState(game);
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const sourceTeam = Object.values(game.teams).find((team) => !team.isUser)!;
    const player = sourceTeam.roster[0]!;
    sourceTeam.roster = sourceTeam.roster.filter((entry) => entry.id !== player.id);
    player.teamId = null;
    player.contract = null;
    game.players[player.id] = player;
    game.freeAgents = [player.id];
    game.teamNeedsCache = {
      [userTeam.id]: makeCachedNeedsReport('cached user report'),
    };
    const offer: ContractOffer = {
      years: 1,
      salary: 1.1,
      signingBonus: 0.2,
      guaranteed: 0.6,
    };
    setBlockFreeAgencyScenario(game);

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.signStreetFreeAgent(player.id, offer);

    const nextGame = useGameStore.getState().game!;
    expect(nextGame).toBe(game);
    expect(nextGame.teams[userTeam.id]!.roster.some((entry) => entry.id === player.id)).toBe(false);
    expect(nextGame.freeAgents).toContain(player.id);
    expect(nextGame.players[player.id]?.teamId).toBeNull();
    expect(nextGame.teamNeedsCache[userTeam.id]?.overall).toBe('cached user report');
    expect(nextGame.postGameUi?.audioCueQueue ?? []).toEqual([]);
    expect(autosaveDynasty).not.toHaveBeenCalled();
  });

  it('blocks waiver claim submissions through the store when scenario constraints disable free agency', async () => {
    const game = createSeedGameState(326, 0, 'pro');
    const releasedBy = Object.values(game.teams).find((team) => !team.isUser)!;
    const player = releasedBy.roster[0]!;
    game.waiverWire = [{
      playerId: player.id,
      releasedByTeamId: releasedBy.id,
      createdYear: game.year,
      createdWeek: game.week,
      expiresYear: game.year,
      expiresWeek: game.week + 1,
    }];
    game.waiverClaims = [];
    setBlockFreeAgencyScenario(game);

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.submitWaiverClaim('afce1', player.id);

    expect(useGameStore.getState().game?.waiverClaims).toEqual([]);
    expect(useGameStore.getState().game?.waiverWire).toHaveLength(1);
    expect(autosaveDynasty).not.toHaveBeenCalled();
  });

  it('blocks practice-squad acquisitions through the store when scenario constraints disable free agency', async () => {
    const game = createSeedGameState(327, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const sourceTeam = Object.values(game.teams).find((team) => !team.isUser)!;
    const player = sourceTeam.roster[0]!;
    sourceTeam.roster = sourceTeam.roster.filter((entry) => entry.id !== player.id);
    player.teamId = null;
    player.contract = null;
    game.players[player.id] = player;
    game.freeAgents = [player.id];
    setBlockFreeAgencyScenario(game);

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.addToPracticeSquad(userTeam.id, player.id);

    const nextGame = useGameStore.getState().game!;
    expect(nextGame.teams[userTeam.id]?.practiceSquad ?? []).not.toContainEqual(expect.objectContaining({ playerId: player.id }));
    expect(nextGame.freeAgents).toContain(player.id);
    expect(nextGame.players[player.id]?.teamId).toBeNull();
    expect(autosaveDynasty).not.toHaveBeenCalled();
  });

  it('persists call your shot declarations through the store', async () => {
    const game = createSeedGameState(777, 0, 'pro');

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.setCallYourShot('air_attack');

    expect(useGameStore.getState().game?.activeCallYourShot).toBe('air_attack');
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('records the current season as the last portable export year and autosaves the receipt', async () => {
    const game = createSeedGameState(778, 0, 'pro');
    game.year = 2034;

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.recordPortableExport();

    expect(useGameStore.getState().game?.lastPortableExportYear).toBe(2034);
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
    expect(autosaveDynasty).toHaveBeenCalledWith(expect.objectContaining({
      lastPortableExportYear: 2034,
    }));
  });

  it('stores contingency rules and trick plays on weekly prep plans', async () => {
    const game = createSeedGameState(888, 0, 'pro');
    game.phase = 'regular_season';
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const matchingWeek = game.schedule.find((week) => week.week === game.week);
    const matchup = matchingWeek?.games
      .find((entry) => entry.homeTeamId === userTeam.id || entry.awayTeamId === userTeam.id);

    if (matchup === undefined) {
      throw new Error('Expected a scheduled user matchup for weekly prep plan persistence.');
    }

    const opponentTeamId = matchup.homeTeamId === userTeam.id ? matchup.awayTeamId : matchup.homeTeamId;
    const contingencyRule: ContingencyRule = {
      id: 'contingency-1',
      trigger: 'trailing_14_at_half',
      action: { type: 'go_aggressive' },
      label: 'IF: Trailing by 14+ at half → Go Aggressive',
      description: 'If we are down big at halftime, empty the clip.',
    };

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.saveWeeklyPrepPlan({
      teamId: userTeam.id,
      opponentTeamId,
      year: game.year,
      week: game.week,
      offensiveFocus: 'balanced',
      defensiveFocus: 'heat_qb',
      practiceIntensity: 'normal',
      keyMatchupPlayerId: null,
      snapManagement: 'normal',
      specialSituation: 'third_down',
      contingencyRules: [contingencyRule],
      trickPlays: ['flea_flicker', 'fake_punt'],
    });

    const nextGame = useGameStore.getState().game!;
    expect(nextGame.weeklyPrepPlans?.[userTeam.id]?.contingencyRules).toEqual([contingencyRule]);
    expect(nextGame.weeklyPrepPlans?.[userTeam.id]?.trickPlays).toEqual(['flea_flicker', 'fake_punt']);
    expect(nextGame.gamePlan?.contingencyRules).toEqual([contingencyRule]);
    expect(nextGame.gamePlan?.trickPlays).toEqual(['flea_flicker', 'fake_punt']);
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('sets the season phase through the durable store commit path', async () => {
    const game = createSeedGameState(122, 0, 'pro');
    game.phase = 'regular_season';

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.setPhase('offseason');

    const nextGame = useGameStore.getState().game!;
    expect(nextGame.phase).toBe('offseason');
    expect(game.phase).toBe('regular_season');
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
    expect(autosaveDynasty).toHaveBeenCalledWith(nextGame);
  });

  it('commits setup progress actions through the durable store path', async () => {
    const game = createSeedGameState(123, 0, 'pro');
    const originalSetupState = game.setupState!;

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.applySetupChoice({ agmProfileId: 'marcus_webb' });

    let nextGame = useGameStore.getState().game!;
    expect(nextGame.setupState?.decisions.agmProfileId).toBe('marcus_webb');
    expect(nextGame.setupState?.crisisProfile?.pressureCards.length).toBeGreaterThan(0);
    expect(nextGame.setupState?.forecastBoard).not.toBeNull();
    expect(game.setupState).toBe(originalSetupState);
    expect(game.setupState?.decisions.agmProfileId).toBeNull();

    await useGameStore.getState().actions.advanceSetup();
    nextGame = useGameStore.getState().game!;
    expect(nextGame.setupState?.currentPhase).toBe('intel_briefing');

    const pressureId = nextGame.setupState?.crisisProfile?.pressureCards[0]?.id;
    if (!pressureId) {
      throw new Error('Expected setup pressure cards after applying setup choice.');
    }

    await useGameStore.getState().actions.toggleSetupDrilldown(pressureId);
    nextGame = useGameStore.getState().game!;
    expect(nextGame.setupState?.openedDrilldowns).toContain(pressureId);

    await useGameStore.getState().actions.goBackSetup();
    nextGame = useGameStore.getState().game!;
    expect(nextGame.setupState?.currentPhase).toBe('choose_agm');
    expect(autosaveDynasty).toHaveBeenCalledTimes(4);
    expect(autosaveDynasty).toHaveBeenLastCalledWith(nextGame);
  });

  it('updates difficulty without autosaving when UI autosave is disabled', async () => {
    const game = createSeedGameState(124, 0, 'pro');

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));
    useUiStore.setState((state) => ({
      ...state,
      autosaveEnabled: false,
    }));

    await useGameStore.getState().actions.setDifficulty('legend');

    expect(useGameStore.getState().game?.difficulty).toBe('legend');
    expect(autosaveDynasty).not.toHaveBeenCalled();
  });

  it('adds coaching clinic XP through the durable store commit path', async () => {
    const game = createSeedGameState(124, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.addClinicXP(userTeam.id, 'offense', 10);

    expect(useGameStore.getState().game?.teams[userTeam.id]?.clinic.xp.offense).toBe(10);
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('ignores unknown coaching clinic actions without autosaving', async () => {
    const game = createSeedGameState(125, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.addClinicXP(userTeam.id, 'unknown_action', 10);

    expect(useGameStore.getState().game?.teams[userTeam.id]?.clinic.xp).toEqual({});
    expect(autosaveDynasty).not.toHaveBeenCalled();
  });

  it('sets the head coach skill selection through the durable store commit path', async () => {
    const game = createSeedGameState(126, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const headCoach = userTeam.staff.hc!;

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.setHeadCoachSkillSelection('air_raid', 1);

    expect(useGameStore.getState().game?.teams[userTeam.id]?.skillSelections[headCoach.id]).toEqual({
      branch: 'air_raid',
      tier: 1,
      archForLookup: headCoach.archetype,
    });
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('initializes position coaches through the durable store commit path', async () => {
    const game = createSeedGameState(127, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    userTeam.positionCoaches = undefined;

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    const staff = await useGameStore.getState().actions.initializePositionCoachesForTeam(userTeam.id);

    const savedStaff = useGameStore.getState().game?.teams[userTeam.id]?.positionCoaches;
    expect(staff?.coaches).toHaveLength(7);
    expect(savedStaff?.coaches.map((coach) => coach.role).sort()).toEqual(['DB', 'DL', 'LB', 'OL', 'RB_TE', 'ST', 'WR']);
    expect(validateGameState(useGameStore.getState().game!)).toBeTruthy();
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('upgrades a position coach role through the durable store commit path', async () => {
    const game = createSeedGameState(128, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    userTeam.positionCoaches = undefined;

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    const initialStaff = await useGameStore.getState().actions.initializePositionCoachesForTeam(userTeam.id);
    const beforeOl = initialStaff?.coaches.find((coach) => coach.role === 'OL');
    const upgradedStaff = await useGameStore.getState().actions.upgradePositionCoachRole(userTeam.id, 'OL');
    const afterOl = upgradedStaff?.coaches.find((coach) => coach.role === 'OL');

    expect(beforeOl).toBeDefined();
    expect(afterOl).toBeDefined();
    expect(afterOl).not.toEqual(beforeOl);
    expect(upgradedStaff?.coaches).toHaveLength(7);
    expect(useGameStore.getState().game?.teams[userTeam.id]?.positionCoaches?.coaches.find((coach) => coach.role === 'OL')).toEqual(afterOl);
    expect(validateGameState(useGameStore.getState().game!)).toBeTruthy();
    expect(autosaveDynasty).toHaveBeenCalledTimes(2);
  });

  it('assigns player training through the store and persists the updated game', async () => {
    const game = createSeedGameState(222, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const player = userTeam.roster[0]!;

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.assignTraining(userTeam.id, player.id, 'film_study');

    expect(useGameStore.getState().game?.teams[userTeam.id]?.trainingAssignments[player.id]?.focus).toBe('film_study');
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('creates and submits a user trade proposal through the store', async () => {
    const game = createSeedGameState(333, 0, 'pro');
    game.phase = 'offseason';
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const partner = Object.values(game.teams).find((team) => !team.isUser)!;

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    const created = await useGameStore.getState().actions.createTradeProposal(
      userTeam.id,
      partner.id,
      [{ type: 'pick', teamId: userTeam.id, playerId: null, pickId: `${userTeam.id}-${game.year}-1-1-${userTeam.id}`, description: 'Round 1 pick' }],
      [{ type: 'pick', teamId: partner.id, playerId: null, pickId: `${partner.id}-${game.year}-7-7-${partner.id}`, description: 'Round 7 pick' }],
    );

    expect(created).not.toBeNull();
    const submitted = await useGameStore.getState().actions.submitTradeProposal(created!.id);

    expect(submitted?.status).not.toBe('draft');
    expect(useGameStore.getState().game?.activeProposals.length).toBeGreaterThan(0);
    expect(autosaveDynasty).toHaveBeenCalledTimes(2);
  });

  it('no-ops trade-center commit actions through the store when scenario constraints disable trades', async () => {
    const base = createSeedGameState(334, 0, 'pro');
    base.phase = 'offseason';
    base.offseasonState = initializeOffseasonState(base);
    const userTeam = Object.values(base.teams).find((team) => team.isUser)!;
    const partner = Object.values(base.teams).find((team) => !team.isUser)!;
    const offering: TradeOfferAsset[] = [
      { type: 'pick', teamId: userTeam.id, playerId: null, pickId: `${userTeam.id}-${base.year}-1-1-${userTeam.id}`, description: 'Round 1 pick' },
    ];
    const requesting: TradeOfferAsset[] = [
      { type: 'pick', teamId: partner.id, playerId: null, pickId: `${partner.id}-${base.year}-7-7-${partner.id}`, description: 'Round 7 pick' },
    ];
    const generatedOffer: TradeOffer = {
      id: 'blocked-offer',
      fromTeamId: partner.id,
      toTeamId: userTeam.id,
      direction: 'inbound',
      summary: 'Scenario should block this generated offer.',
      status: 'pending',
      send: requesting,
      receive: offering,
    };
    base.offseasonState.tradeOffers = [generatedOffer];
    const proposal = createTradeProposalEngine(base, userTeam.id, partner.id, offering, requesting);
    proposal.counterOffer = {
      ...proposal,
      offering,
      requesting,
      status: 'countered',
      aiResponse: 'We need another premium pick.',
      valueDiff: 0.8,
      counterOffer: null,
    };
    const game = startScenario('the_savant', base, mulberry32(334));

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    const created = await useGameStore.getState().actions.createTradeProposal(userTeam.id, partner.id, offering, requesting);
    const submitted = await useGameStore.getState().actions.submitTradeProposal(proposal.id);
    const acceptedCounter = await useGameStore.getState().actions.acceptCounter(proposal.id);
    await useGameStore.getState().actions.acceptTradeOffer(generatedOffer.id);

    const nextGame = useGameStore.getState().game!;
    expect(created).toBeNull();
    expect(submitted).toBeNull();
    expect(acceptedCounter).toBeNull();
    expect(nextGame.activeProposals).toHaveLength(1);
    expect(nextGame.activeProposals[0]?.status).toBe('draft');
    expect(nextGame.offseasonState?.tradeOffers).toHaveLength(1);
    expect(nextGame.offseasonState?.tradeOffers[0]?.status).toBe('pending');
    expect(nextGame.postGameUi?.audioCueQueue ?? []).toEqual([]);
    expect(useGameStore.getState().undoSnapshot).toBeNull();
    expect(autosaveDynasty).not.toHaveBeenCalled();
  });

  it('blocks draft war-room trade accepts through the store when scenario constraints disable trades', async () => {
    const base = createSeedGameState(335, 0, 'pro');
    base.phase = 'draft';
    const game = startScenario('the_savant', base, mulberry32(335));
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const partner = Object.values(game.teams).find((team) => !team.isUser)!;
    game.warRoomState = {
      currentPick: 1,
      onTheClock: userTeam.id,
      timeRemaining: 90,
      incomingOffers: [{
        from: partner.id,
        targetPick: 1,
        offer: {
          offering: [{
            type: 'pick',
            teamId: partner.id,
            playerId: null,
            pickId: `${partner.id}-1-1-${partner.id}`,
            description: 'Round 1 pick',
          }],
          requesting: [{
            type: 'pick',
            teamId: userTeam.id,
            playerId: null,
            pickId: `${userTeam.id}-1-1-${userTeam.id}`,
            description: 'Round 1 pick',
          }],
          type: 'mixed',
        },
        urgency: 'interested',
        reasoning: 'Scenario should block this trade.',
      }],
      userCanTradeUp: [],
      draftGrade: 'B',
    };

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.acceptDraftTradeOffer(game.warRoomState.incomingOffers[0]!);

    expect(useGameStore.getState().game?.warRoomState?.incomingOffers).toHaveLength(1);
    expect(autosaveDynasty).not.toHaveBeenCalled();
  });

  it('accepts draft war-room trade offers through the store and updates live draft order ownership', async () => {
    const game = createSeedGameState(336, 0, 'pro');
    game.phase = 'draft';
    game.offseasonState = initializeOffseasonState(game);
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const partner = Object.values(game.teams).find((team) => !team.isUser)!;
    game.teams[userTeam.id]!.draftPicks = [
      { round: 1, pick: 1, originalTeamId: userTeam.id, currentTeamId: userTeam.id, year: game.year, isCompPick: false },
    ];
    game.teams[partner.id]!.draftPicks = [
      { round: 1, pick: 2, originalTeamId: partner.id, currentTeamId: partner.id, year: game.year, isCompPick: false },
    ];
    game.offseasonState.draftOrder = [
      { id: `${userTeam.id}-${game.year}-1-1-${userTeam.id}`, teamId: userTeam.id, round: 1, pick: 1, overall: 1, originalTeamId: userTeam.id },
      { id: `${partner.id}-${game.year}-1-2-${partner.id}`, teamId: partner.id, round: 1, pick: 2, overall: 2, originalTeamId: partner.id },
    ];
    game.offseasonState.currentDraftPickIndex = 0;
    const offer = {
      from: partner.id,
      targetPick: 1,
      offer: {
        offering: [{
          type: 'pick' as const,
          teamId: partner.id,
          playerId: null,
          pickId: `${partner.id}-1-2-${partner.id}`,
          description: 'Round 1, Pick 2',
        }],
        requesting: [{
          type: 'pick' as const,
          teamId: userTeam.id,
          playerId: null,
          pickId: `${userTeam.id}-1-1-${userTeam.id}`,
          description: 'Round 1, Pick 1',
        }],
        type: 'mixed' as const,
      },
      urgency: 'desperate' as const,
      reasoning: 'Move down one slot.',
    };
    game.warRoomState = {
      currentPick: 1,
      onTheClock: userTeam.id,
      timeRemaining: 90,
      incomingOffers: [offer],
      userCanTradeUp: [],
      draftGrade: 'B',
    };

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.acceptDraftTradeOffer(offer);

    const nextGame = useGameStore.getState().game!;
    expect(nextGame.teams[userTeam.id]!.draftPicks).toEqual([
      { round: 1, pick: 2, originalTeamId: partner.id, currentTeamId: userTeam.id, year: game.year, isCompPick: false },
    ]);
    expect(nextGame.teams[partner.id]!.draftPicks).toEqual([
      { round: 1, pick: 1, originalTeamId: userTeam.id, currentTeamId: partner.id, year: game.year, isCompPick: false },
    ]);
    expect(nextGame.offseasonState?.draftOrder).toEqual([
      { id: `${partner.id}-${game.year}-1-1-${userTeam.id}`, teamId: partner.id, round: 1, pick: 1, overall: 1, originalTeamId: userTeam.id },
      { id: `${userTeam.id}-${game.year}-1-2-${partner.id}`, teamId: userTeam.id, round: 1, pick: 2, overall: 2, originalTeamId: partner.id },
    ]);
    expect(nextGame.warRoomState?.onTheClock).toBe(partner.id);
    expect(nextGame.warRoomState?.incomingOffers).toEqual([]);
    expect(nextGame.postGameUi?.audioCueQueue.at(-1)?.event).toBe('trade_complete');
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('does not commit stale draft war-room trade accepts when a live pick is missing', async () => {
    const game = createSeedGameState(337, 0, 'pro');
    game.phase = 'draft';
    game.offseasonState = initializeOffseasonState(game);
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const partner = Object.values(game.teams).find((team) => !team.isUser)!;
    game.teams[userTeam.id]!.draftPicks = [
      { round: 1, pick: 1, originalTeamId: userTeam.id, currentTeamId: userTeam.id, year: game.year, isCompPick: false },
    ];
    game.teams[partner.id]!.draftPicks = [];
    game.offseasonState.draftOrder = [
      { id: `${userTeam.id}-${game.year}-1-1-${userTeam.id}`, teamId: userTeam.id, round: 1, pick: 1, overall: 1, originalTeamId: userTeam.id },
      { id: `${partner.id}-${game.year}-1-2-${partner.id}`, teamId: partner.id, round: 1, pick: 2, overall: 2, originalTeamId: partner.id },
    ];
    game.offseasonState.currentDraftPickIndex = 0;
    const offer = {
      from: partner.id,
      targetPick: 1,
      offer: {
        offering: [{
          type: 'pick' as const,
          teamId: partner.id,
          playerId: null,
          pickId: `${partner.id}-1-2-${partner.id}`,
          description: 'Round 1, Pick 2',
        }],
        requesting: [{
          type: 'pick' as const,
          teamId: userTeam.id,
          playerId: null,
          pickId: `${userTeam.id}-1-1-${userTeam.id}`,
          description: 'Round 1, Pick 1',
        }],
        type: 'mixed' as const,
      },
      urgency: 'desperate' as const,
      reasoning: 'Missing offered pick should not commit.',
    };
    game.warRoomState = {
      currentPick: 1,
      onTheClock: userTeam.id,
      timeRemaining: 90,
      incomingOffers: [offer],
      userCanTradeUp: [],
      draftGrade: 'B',
    };

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.acceptDraftTradeOffer(offer);

    const nextGame = useGameStore.getState().game!;
    expect(nextGame).toBe(game);
    expect(nextGame.warRoomState?.incomingOffers).toHaveLength(1);
    expect(nextGame.postGameUi?.audioCueQueue ?? []).toEqual([]);
    expect(autosaveDynasty).not.toHaveBeenCalled();
  });

  it('advances and dismisses tutorial state through the store', async () => {
    const game = createSeedGameState(345, 0, 'pro');

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.advanceTutorial();
    expect(useGameStore.getState().game?.tutorialState.currentStepIndex).toBe(1);

    await useGameStore.getState().actions.advanceTutorial('screen:/roster');
    expect(useGameStore.getState().game?.tutorialState.currentStepIndex).toBe(2);

    await useGameStore.getState().actions.dismissTutorial();
    expect(useGameStore.getState().game?.tutorialState.dismissed).toBe(true);
    expect(autosaveDynasty).toHaveBeenCalledTimes(3);
  });

  it('routes IR placement and activation through the store', async () => {
    const game = createSeedGameState(444, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const player = userTeam.roster[0]!;
    game.players[player.id] = structuredClone(player);
    player.injury = {
      id: 'inj-store',
      type: 'hamstring',
      severity: 'out',
      severityTier: 'severe',
      gamesOut: 2,
      gamesRecovered: 0,
      reinjuryRisk: 0.2,
      affectedRatings: ['speed'],
      ratingPenalty: 0,
      onIR: false,
    };

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.placeOnIR(userTeam.id, player.id);
    expect(useGameStore.getState().game?.teams[userTeam.id]?.roster[0]?.injury?.onIR).toBe(true);
    expect(useGameStore.getState().game?.players[player.id]?.injury?.onIR).toBe(true);
    expect(useGameStore.getState().game?.players[player.id]?.injury?.gamesOut).toBe(4);

    const clearedGame = structuredClone(useGameStore.getState().game!);
    clearedGame.teams[userTeam.id]!.roster[0]!.injury!.gamesOut = 0;
    useGameStore.setState((state) => ({
      ...state,
      game: clearedGame,
      initialized: true,
    }));
    await useGameStore.getState().actions.activateFromIR(userTeam.id, player.id);

    expect(useGameStore.getState().game?.teams[userTeam.id]?.roster[0]?.injury?.onIR).toBe(false);
    expect(useGameStore.getState().game?.players[player.id]?.injury?.onIR).toBe(false);
    expect(useGameStore.getState().game?.players[player.id]?.injury?.gamesOut).toBe(0);
    expect(autosaveDynasty).toHaveBeenCalledTimes(2);
  });

  it('upgrades facilities and hires medical staff through the store', async () => {
    const game = createSeedGameState(555, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    game.phase = 'offseason';
    game.availableMedicalStaff = [{
      id: 'med-store',
      name: 'Parker Lane',
      tier: 'elite',
      salary: 2.8,
      recoveryBonus: 0.8,
      preventionBonus: 0.8,
    }];

    const startingBudget = userTeam.facilityState.budget;

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    const facilityType = 'film_room';
    await useGameStore.getState().actions.upgradeFacility(userTeam.id, facilityType);
    await useGameStore.getState().actions.hireMedicalStaff(userTeam.id, 'med-store');

    const nextGame = useGameStore.getState().game!;
    const upgradedFacility = nextGame.teams[userTeam.id]!.facilityState.facilities.find((facility) => facility.type === facilityType);
    expect(nextGame.teams[userTeam.id]!.facilityState.budget).toBeLessThan(startingBudget);
    expect(upgradedFacility?.level).toBe(2);
    expect(upgradedFacility?.effect).toStrictEqual(getFacilityLevelEffect(facilityType, 2));
    expect(nextGame.teams[userTeam.id]!.medicalStaff?.id).toBe('med-store');
    expect(autosaveDynasty).toHaveBeenCalledTimes(2);
  });

  it('routes locker room meetings through the store', async () => {
    const game = createSeedGameState(606, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    userTeam.lockerRoom = {
      cliques: [
        { id: 0, label: 'Vets', playerIds: [userTeam.roster[0]!.id], cohesion: 62, influence: 55 },
        { id: 1, label: 'Young Core', playerIds: [userTeam.roster[1]!.id], cohesion: 58, influence: 45 },
        { id: 2, label: 'Stars', playerIds: [], cohesion: 50, influence: 0 },
      ],
      captains: [{ playerId: userTeam.roster[0]!.id, playerName: userTeam.roster[0]!.name, captainMoments: 0, rallyCooldown: 0, perks: ['rally_cry'] }],
      culture: 'stable',
      cultureScore: 54,
      tensions: [{ id: 'ten-1', type: 'playing_time', involvedPlayerIds: [userTeam.roster[0]!.id], involvedCliqueIds: [0], severity: 'minor', weekCreated: 1, resolved: false, narrative: 'Snap count tension.' }],
      lastMeetingWeek: null,
    };

    useGameStore.setState((state) => ({ ...state, game, initialized: true }));

    const receipt = await useGameStore.getState().actions.callTeamMeeting();

    const nextLockerRoom = useGameStore.getState().game!.teams[userTeam.id]!.lockerRoom;
    expect(nextLockerRoom.lastMeetingWeek).toBe(game.week);
    expect(nextLockerRoom.tensions.some((tension) => tension.resolved)).toBe(true);
    expect(receipt).toMatchObject({
      kind: 'meeting',
      title: 'Team Meeting Receipt',
    });
    expect(receipt?.detail).toContain('cooled off');
    expect(receipt?.source).toContain('this confirmation appears here only');
  });

  it('routes captain rallies through the store', async () => {
    const game = createSeedGameState(707, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    userTeam.streak = -3;
    userTeam.lockerRoom = {
      cliques: [
        { id: 0, label: 'Vets', playerIds: [userTeam.roster[0]!.id], cohesion: 50, influence: 55 },
        { id: 1, label: 'Young Core', playerIds: [userTeam.roster[1]!.id], cohesion: 51, influence: 45 },
        { id: 2, label: 'Stars', playerIds: [], cohesion: 52, influence: 0 },
      ],
      captains: [{ playerId: userTeam.roster[0]!.id, playerName: userTeam.roster[0]!.name, captainMoments: 0, rallyCooldown: 0, perks: ['rally_cry'] }],
      culture: 'fragile',
      cultureScore: 39,
      tensions: [],
      lastMeetingWeek: null,
    };

    useGameStore.setState((state) => ({ ...state, game, initialized: true }));

    const receipt = await useGameStore.getState().actions.triggerCaptainRally(userTeam.roster[0]!.id);

    const nextLockerRoom = useGameStore.getState().game!.teams[userTeam.id]!.lockerRoom;
    expect(nextLockerRoom.cliques[0]?.cohesion).toBe(55);
    expect(nextLockerRoom.captains[0]?.rallyCooldown).toBe(4);
    expect(receipt).toMatchObject({
      kind: 'rally',
      title: 'Captain Rally Receipt',
    });
    expect(receipt?.detail).toContain('triggered rally_cry');
    expect(receipt?.source).toContain('rally cooldown is 4 weeks');
  });

  it('accepts endorsement offers through the store and keeps player records in sync', async () => {
    const game = createSeedGameState(818, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const player = userTeam.roster[0]!;
    game.players[player.id] = structuredClone(player);
    game.endorsementOffers = [{
      id: 'offer-store',
      playerId: player.id,
      brandName: 'Apex Athletics',
      revenuePerYear: 5.2,
      yearsTotal: 3,
      yearsRemaining: 3,
      tier: 'national',
      moraleBonus: 4,
      requirement: { type: 'min_ovr', value: 80 },
      active: false,
    }];

    useGameStore.setState((state) => ({ ...state, game, initialized: true }));

    await useGameStore.getState().actions.acceptEndorsement('offer-store');

    const nextGame = useGameStore.getState().game!;
    const nextUserTeam = Object.values(nextGame.teams).find((team) => team.isUser)!;
    const rosterPlayer = nextUserTeam.roster.find((entry) => entry.id === player.id)!;
    const flatPlayer = nextGame.players[player.id]!;
    expect(nextGame.endorsementOffers).toHaveLength(0);
    expect(rosterPlayer.endorsements).toHaveLength(1);
    expect(flatPlayer.endorsements).toEqual(rosterPlayer.endorsements);
    expect(flatPlayer.morale).toBe(rosterPlayer.morale);
    expect(rosterPlayer.endorsements[0]?.active).toBe(true);
    expect(selectActiveEndorsements(useGameStore.getState())).toHaveLength(1);
    expect(selectEndorsementRevenue(useGameStore.getState())).toBe(5.2);
  });

  it('declines endorsement offers through the store', async () => {
    const game = createSeedGameState(819, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    game.endorsementOffers = [{
      id: 'offer-decline',
      playerId: userTeam.roster[0]!.id,
      brandName: 'Metro Health',
      revenuePerYear: 1.2,
      yearsTotal: 2,
      yearsRemaining: 2,
      tier: 'regional',
      moraleBonus: 3,
      requirement: { type: 'team_wins', value: 8 },
      active: false,
    }];

    useGameStore.setState((state) => ({ ...state, game, initialized: true }));

    await useGameStore.getState().actions.declineEndorsement('offer-decline');

    expect(useGameStore.getState().game?.endorsementOffers).toHaveLength(0);
  });

  it('starts farewell tours and elects captains through the store', async () => {
    const game = createSeedGameState(920, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const player = userTeam.roster[0]!;
    player.age = 38;
    player.yearsExp = 15;
    player.ovr = Math.max(player.ovr, 80);
    userTeam.lockerRoom = {
      cliques: [
        { id: 0, label: 'Vets', playerIds: [player.id], cohesion: 60, influence: 55 },
        { id: 1, label: 'Young Core', playerIds: [], cohesion: 50, influence: 0 },
        { id: 2, label: 'Stars', playerIds: [], cohesion: 50, influence: 0 },
      ],
      captains: [],
      culture: 'stable',
      cultureScore: 50,
      tensions: [],
      lastMeetingWeek: null,
    };

    useGameStore.setState((state) => ({ ...state, game, initialized: true }));

    await useGameStore.getState().actions.startFarewellTour(player.id);
    await useGameStore.getState().actions.electCaptain(player.id);

    const nextGame = useGameStore.getState().game!;
    const farewellTour = nextGame.farewellTours.find((tour) => tour.playerId === player.id);
    expect(farewellTour).toBeDefined();
    expect(farewellTour?.moments.length).toBeGreaterThanOrEqual(3);
    expect(farewellTour?.moments.some((moment) => moment.type === 'final_game')).toBe(true);
    expect(farewellTour?.moments.every((moment) => moment.week >= nextGame.week)).toBe(true);
    expect(nextGame.teams[userTeam.id]!.lockerRoom.captains.some((captain) => captain.playerId === player.id)).toBe(true);
  });

  it('stores the selected broadcast game and navigates to the broadcast route', () => {
    const pushState = vi.fn();
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', {
      history: { pushState },
      dispatchEvent,
    });

    useGameStore.getState().actions.watchBroadcast('game-42');

    expect(useUiStore.getState().broadcastGameId).toBe('game-42');
    expect(pushState).toHaveBeenCalledWith({}, '', '/broadcast');
    expect(dispatchEvent).toHaveBeenCalled();
  });

  it('starts a fresh scenario challenge from the current user franchise identity', async () => {
    const pushState = vi.fn();
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', {
      history: { pushState },
      dispatchEvent,
    });

    const game = createSeedGameState(1001, 5, 'legend');
    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    const previousUser = Object.values(game.teams).find((team) => team.isUser)!;
    await useGameStore.getState().actions.startScenarioChallenge('the_savant');

    const nextGame = useGameStore.getState().game!;
    const nextUser = Object.values(nextGame.teams).find((team) => team.isUser)!;
    expect(nextGame.scenarioState?.activeScenario?.id).toBe('the_savant');
    expect(nextGame.scenarioState?.activeScenario?.constraints.blockTrades).toBe(true);
    expect(nextGame.setupState).toBeUndefined();
    expect(nextUser.city).toBe(previousUser.city);
    expect(nextUser.name).toBe(previousUser.name);
    expect(pushState).toHaveBeenCalledWith({}, '', '/');
  });

  it('files an owner petition for a new league rule proposal', async () => {
    const game = createSeedGameState(1200, 0, 'pro');
    game.phase = 'offseason';

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.petitionRuleChange('practice_squad_size', 10);

    const proposal = useGameStore.getState().game?.commissionerState.activeProposals[0];
    expect(proposal?.source).toBe('owner_petition');
    expect(proposal?.ruleKey).toBe('practice_squad_size');
    expect(proposal?.proposedValue).toBe(10);
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('refreshes owner approval through the commit path and stores a single history receipt', async () => {
    const game = createSeedGameState(1210, 12, 'pro');
    game.phase = 'regular_season';
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    userTeam.wins = 10;
    userTeam.losses = 2;
    userTeam.owner = {
      archetypeId: 'win_now',
      label: 'Win Now',
      approval: 50,
      history: [],
    };

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.refreshOwner(userTeam.id);

    const nextGame = useGameStore.getState().game!;
    const nextTeam = nextGame.teams[userTeam.id]!;
    expect(nextTeam.owner.approval).toBe(65);
    expect(nextTeam.owner.history).toEqual([{
      year: game.year,
      week: game.week,
      approval: 65,
      delta: 15,
    }]);
    expect(userTeam.owner.approval).toBe(50);
    expect(userTeam.owner.history).toHaveLength(0);
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
    expect(autosaveDynasty).toHaveBeenCalledWith(nextGame);
  });

  it('resolves a passed rule proposal and records the vote result', async () => {
    const game = createSeedGameState(1300, 0, 'pro');
    game.phase = 'offseason';
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const supportingTeam = Object.values(game.teams).find((team) => team.id !== userTeam.id)!;

    game.commissionerState.activeProposals = [{
      id: 'proposal-pass',
      ruleKey: 'practice_squad_size',
      currentValue: 8,
      proposedValue: 10,
      rationale: 'Expand practice depth.',
      source: 'commissioner',
      votes: { [supportingTeam.id]: 'yes' },
      requiredMajority: 2,
      deadline: game.year,
      effectiveYear: game.year + 1,
      proposedByTeamId: null,
    }];

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.voteOnProposal('proposal-pass', 'yes');

    const nextGame = useGameStore.getState().game!;
    expect(nextGame.commissionerState.activeProposals).toHaveLength(0);
    expect(nextGame.commissionerState.history.at(-1)?.passed).toBe(true);
    expect(nextGame.leagueRules.entries.practice_squad_size.value).toBe(10);
    expect(nextGame.leagueRules.entries.practice_squad_size.effectiveYear).toBe(game.year + 1);
  });

  it('charges owner goodwill when a user petition fails', async () => {
    const game = createSeedGameState(1400, 0, 'pro');
    game.phase = 'offseason';
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const startingMood = userTeam.ownerMood;

    game.commissionerState.activeProposals = [{
      id: 'proposal-fail',
      ruleKey: 'schedule_weeks',
      currentValue: 18,
      proposedValue: 19,
      rationale: 'Stretch the season.',
      source: 'owner_petition',
      votes: {},
      requiredMajority: 99,
      deadline: game.year,
      effectiveYear: game.year + 1,
      proposedByTeamId: userTeam.id,
    }];

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.voteOnProposal('proposal-fail', 'no');

    expect(useGameStore.getState().game?.teams[userTeam.id]?.ownerMood).toBe(startingMood - 10);
    expect(useGameStore.getState().game?.commissionerState.history.at(-1)?.passed).toBe(false);
  });

  it('advances one cba negotiation round from an expired agreement', async () => {
    const game = createSeedGameState(1500, 0, 'pro');
    game.phase = 'offseason';
    game.cbaState.status = 'expired';
    if (game.cbaState.currentDeal) {
      game.cbaState.currentDeal.endYear = game.year - 1;
    }

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.advanceCBANegotiation();

    const nextGame = useGameStore.getState().game!;
    expect(nextGame.cbaState.negotiationState?.round).toBe(1);
    expect(['negotiating', 'awaiting_owner_vote', 'lockout']).toContain(nextGame.cbaState.status);
  });

  it('ratifies a cba proposal after owner approval and applies its rule changes', async () => {
    const game = createSeedGameState(1600, 0, 'pro');
    game.phase = 'offseason';
    const currentTerms = game.cbaState.currentDeal!.terms;
    const proposal = {
      id: 'cba-proposal',
      side: 'owners' as const,
      year: game.year,
      round: 2,
      rationale: 'A compromise is ready for approval.',
      terms: {
        ...currentTerms,
        capGrowthRate: Number((currentTerms.capGrowthRate + 0.005).toFixed(3)),
        practiceSquadSize: currentTerms.practiceSquadSize + 2,
      },
    };

    game.cbaState.status = 'awaiting_owner_vote';
    game.cbaState.negotiationState = {
      round: 2,
      ownersProposal: proposal,
      playersProposal: proposal,
      currentProposal: proposal,
      gap: 10,
      mediator: true,
      publicPressure: 70,
      ownerVotes: {},
      userVote: null,
    };

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.voteOnCBA('approve');

    const nextGame = useGameStore.getState().game!;
    expect(nextGame.cbaState.status).toBe('active');
    expect(nextGame.cbaState.currentDeal?.terms.practiceSquadSize).toBe(currentTerms.practiceSquadSize + 2);
    expect(nextGame.leagueRules.entries.practice_squad_size.value).toBe(currentTerms.practiceSquadSize + 2);
    expect(nextGame.laborState.activeStoppage).toBeNull();
  });

  it('accepts a cba abstain vote and records a three-way vote summary when the deal fails', async () => {
    const game = createSeedGameState(1650, 0, 'pro');
    game.phase = 'offseason';
    const teams = Object.values(game.teams);
    const userTeam = teams.find((team) => team.isUser)!;
    const cpuTeams = teams.filter((team) => team.id !== userTeam.id).slice(0, 2);
    game.teams = Object.fromEntries([userTeam, ...cpuTeams].map((team) => [team.id, team])) as typeof game.teams;

    const currentTerms = game.cbaState.currentDeal!.terms;
    const proposal = {
      id: 'cba-abstain-fail',
      side: 'owners' as const,
      year: game.year,
      round: 2,
      rationale: 'A deal with little owner support is ready for approval.',
      terms: {
        ...currentTerms,
        revenueSplit: Number((currentTerms.revenueSplit - 0.03).toFixed(3)),
        capGrowthRate: Number((currentTerms.capGrowthRate + 0.05).toFixed(3)),
        capFloorPct: Number((currentTerms.capFloorPct + 0.05).toFixed(3)),
        franchiseTagLimit: currentTerms.franchiseTagLimit + 1,
        rosterLimit: currentTerms.rosterLimit - 1,
        practiceSquadSize: currentTerms.practiceSquadSize - 2,
        playoffSeeds: currentTerms.playoffSeeds - 1,
      },
    };

    game.cbaState.status = 'awaiting_owner_vote';
    game.cbaState.negotiationState = {
      round: 2,
      ownersProposal: proposal,
      playersProposal: proposal,
      currentProposal: proposal,
      gap: 10,
      mediator: true,
      publicPressure: 70,
      ownerVotes: {},
      userVote: null,
    };

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.voteOnCBA('abstain');

    const nextGame = useGameStore.getState().game!;
    const rejectionNews = nextGame.leagueNews.find((entry) => entry.headline === 'Owners reject the current CBA offer');
    expect(nextGame.cbaState.status).toBe('negotiating');
    expect(nextGame.cbaState.negotiationState?.currentProposal).toBeNull();
    expect(nextGame.cbaState.negotiationState?.ownerVotes).toEqual({});
    expect(nextGame.cbaState.negotiationState?.userVote).toBeNull();
    expect(rejectionNews?.body).toContain('(approve-reject-abstain)');
    expect(rejectionNews?.body).toMatch(/\d+-\d+-1/);
  });

  it('records neutral cpu owner cba votes as abstentions in the failed vote summary', async () => {
    const game = createSeedGameState(1651, 0, 'pro');
    game.phase = 'offseason';
    const teams = Object.values(game.teams);
    const userTeam = teams.find((team) => team.isUser)!;
    const cpuTeams = teams.filter((team) => team.id !== userTeam.id).slice(0, 2);
    for (const team of cpuTeams) {
      team.gmStrategy = 'contend';
      team.franchiseIdentity.marketSize = 'large';
    }
    game.teams = Object.fromEntries([userTeam, ...cpuTeams].map((team) => [team.id, team])) as typeof game.teams;

    const currentTerms = game.cbaState.currentDeal!.terms;
    const proposal = {
      id: 'cba-cpu-neutral-fail',
      side: 'owners' as const,
      year: game.year,
      round: 2,
      rationale: 'A polarizing deal leaves some owners on the fence.',
      terms: {
        ...currentTerms,
        revenueSplit: Number((currentTerms.revenueSplit + 0.02).toFixed(3)),
        franchiseTagLimit: currentTerms.franchiseTagLimit + 1,
        rosterLimit: currentTerms.rosterLimit - 1,
      },
    };

    game.cbaState.status = 'awaiting_owner_vote';
    game.cbaState.negotiationState = {
      round: 2,
      ownersProposal: proposal,
      playersProposal: proposal,
      currentProposal: proposal,
      gap: 10,
      mediator: true,
      publicPressure: 70,
      ownerVotes: {},
      userVote: null,
    };

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.voteOnCBA('reject');

    const nextGame = useGameStore.getState().game!;
    const rejectionNews = nextGame.leagueNews.find((entry) => entry.headline === 'Owners reject the current CBA offer');
    expect(nextGame.cbaState.status).toBe('negotiating');
    expect(rejectionNews?.body).toContain('0-1-2 (approve-reject-abstain)');
  });

  it('applies a cap move through the store and records the cap reaction post', async () => {
    const game = createSeedGameState(1700, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const player = userTeam.roster.find((entry) => entry.contract && entry.contract.years > 1)!;
    const startingCapSpace = userTeam.capSpace;

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.executeCapMove({ type: 'restructure', playerId: player.id });

    const nextGame = useGameStore.getState().game!;
    const nextTeam = nextGame.teams[userTeam.id]!;
    expect(nextTeam.capSpace).toBeGreaterThan(startingCapSpace);
    expect(nextGame.socialFeed[0]?.content).toContain(player.name);
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('commits direct restructures through cap sync and mirrors the player map', async () => {
    const game = createSeedGameState(1701, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const player = userTeam.roster.find((entry) => entry.contract && entry.contract.years > 1)!;
    game.players[player.id] = { ...player, contract: { ...player.contract! } };

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.restructure(userTeam.id, player.id);

    const nextGame = useGameStore.getState().game!;
    const nextTeam = nextGame.teams[userTeam.id]!;
    const rosterPlayer = nextTeam.roster.find((entry) => entry.id === player.id)!;
    const expectedCapUsed = Math.round((nextTeam.roster.reduce((sum, entry) => sum + calcCapHit(entry.contract ?? null), 0) + nextTeam.deadCap) * 10) / 10;
    expect(rosterPlayer.contract?.restructured).toBe(true);
    expect(nextGame.players[player.id]?.contract?.restructured).toBe(true);
    expect(player.contract?.restructured).toBeFalsy();
    expect(nextTeam.capUsed).toBe(expectedCapUsed);
    expect(nextTeam.capSpace).toBe(Math.round((getSalaryCap(nextGame.year, nextGame) - expectedCapUsed) * 10) / 10);
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
    expect(autosaveDynasty).toHaveBeenCalledWith(nextGame);
  });

  it('commits direct backloads through cap sync and mirrors the player map', async () => {
    const game = createSeedGameState(1702, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const player = userTeam.roster.find((entry) => entry.contract && entry.contract.years > 1)!;
    game.players[player.id] = { ...player, contract: { ...player.contract! } };

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.backload(userTeam.id, player.id, 3);

    const nextGame = useGameStore.getState().game!;
    const nextTeam = nextGame.teams[userTeam.id]!;
    const rosterPlayer = nextTeam.roster.find((entry) => entry.id === player.id)!;
    const expectedCapUsed = Math.round((nextTeam.roster.reduce((sum, entry) => sum + calcCapHit(entry.contract ?? null), 0) + nextTeam.deadCap) * 10) / 10;
    expect(rosterPlayer.contract?.voidYears).toBeGreaterThan(0);
    expect(nextGame.players[player.id]?.contract?.voidYears).toBe(rosterPlayer.contract?.voidYears);
    expect(player.contract?.voidYears ?? 0).toBe(0);
    expect(nextTeam.capUsed).toBe(expectedCapUsed);
    expect(nextTeam.capSpace).toBe(Math.round((getSalaryCap(nextGame.year, nextGame) - expectedCapUsed) * 10) / 10);
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
    expect(autosaveDynasty).toHaveBeenCalledWith(nextGame);
  });

  it('applies a franchise tag through the store, mirrors the player map, and refreshes cap totals', async () => {
    const game = createSeedGameState(1710, 0, 'pro');
    game.phase = 'offseason';
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const cpuTeam = Object.values(game.teams).find((team) => !team.isUser)!;
    const player = userTeam.roster.find((entry) => entry.contract)!;
    player.contract!.years = 1;
    game.players[player.id] = { ...player, contract: { ...player.contract! } };
    game.teamNeedsCache = {
      [userTeam.id]: makeCachedNeedsReport('cached user report'),
      [cpuTeam.id]: makeCachedNeedsReport('cached CPU report'),
    };

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    const result = await useGameStore.getState().actions.applyFranchiseTag(userTeam.id, player.id, 'transition');

    const nextGame = useGameStore.getState().game!;
    const nextTeam = nextGame.teams[userTeam.id]!;
    const rosterPlayer = nextTeam.roster.find((entry) => entry.id === player.id)!;
    const expectedCapUsed = Math.round((nextTeam.roster.reduce((sum, entry) => sum + calcCapHit(entry.contract ?? null), 0) + nextTeam.deadCap) * 10) / 10;
    expect(result?.ok).toBe(true);
    expect(rosterPlayer.contract?.franchiseTag).toBe('transition');
    expect(nextGame.players[player.id]?.contract?.franchiseTag).toBe('transition');
    expect(nextTeam.franchiseTags?.[0]?.playerId).toBe(player.id);
    expect(nextTeam.franchiseTag973?.playerId).toBe(player.id);
    expect(nextTeam.capUsed).toBe(expectedCapUsed);
    expect(nextTeam.capSpace).toBe(Math.round((getSalaryCap(nextGame.year, nextGame) - expectedCapUsed) * 10) / 10);
    expect(nextGame.teamNeedsCache[userTeam.id]).toBeUndefined();
    expect(nextGame.teamNeedsCache[cpuTeam.id]?.overall).toBe('cached CPU report');
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('does not commit a franchise tag for a non-expiring contract', async () => {
    const game = createSeedGameState(1720, 0, 'pro');
    game.phase = 'offseason';
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const player = userTeam.roster.find((entry) => entry.contract)!;
    player.contract!.years = 3;

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    const result = await useGameStore.getState().actions.applyFranchiseTag(userTeam.id, player.id, 'exclusive');

    expect(result?.ok).toBe(false);
    expect(result?.msg).toContain('Only expiring contracted players');
    expect(useGameStore.getState().game!.teams[userTeam.id]!.franchiseTags).toHaveLength(0);
    expect(useGameStore.getState().game!.players[player.id]?.contract?.franchiseTag).toBeNull();
    expect(autosaveDynasty).not.toHaveBeenCalled();
  });

  it('applies multiple cap moves sequentially and updates the player contract state', async () => {
    const game = createSeedGameState(1800, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const player = userTeam.roster.find((entry) => entry.contract && entry.contract.years > 1)!;

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.executeCapMoves([
      { type: 'backload', playerId: player.id, params: { voidYears: 1 } },
      { type: 'extend', playerId: player.id, params: { years: 3, avgSalary: 18 } },
    ]);

    const nextPlayer = useGameStore.getState().game!.players[player.id]!;
    expect(nextPlayer.contract?.years).toBe(3);
    expect(nextPlayer.contract?.voidYears).toBeGreaterThanOrEqual(0);
    expect(useGameStore.getState().game!.socialFeed[0]?.content).toContain(player.name);
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });
});
