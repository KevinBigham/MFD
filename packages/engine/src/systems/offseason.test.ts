import { describe, expect, it } from 'vitest';
import {
  acceptTradeOffer,
  advanceFranchiseWeek,
  makeDraftPick,
  initializeOffseasonState,
  makeContract,
  rejectTradeOffer,
  runScoutingAction,
  SAVE_VERSION,
  submitFreeAgentBid,
  submitReSignOffer,
} from '../index';
import type { DraftPick, DraftProspect, GameState, Player, Team, TradeOffer } from '../types';

function makePlayer(id: string, teamId: string, pos: Player['pos'], ovr: number, isStarter = true): Player {
  return {
    id,
    firstName: id,
    lastName: 'Player',
    name: `${id} Player`,
    pos,
    age: 26,
    ovr,
    pot: ovr + 5,
    ratings: { awareness: ovr, speed: ovr, stamina: ovr },
    devTrait: 'normal',
    personality: { workEthic: 7, loyalty: 6, greed: 5, pressure: 5, ambition: 6 },
    traits: [],
    archetype: null,
    contract: makeContract(8, 3, 4, 3, id, teamId),
    teamId,
    draftYear: 2023,
    draftRound: 1,
    draftPick: 1,
    college: 'Test U',
    yearsExp: 3,
    careerStats: { seasons: 3, gp: 51, snaps: 2200 },
    traitMilestones: {},
    traitPowerLevel: {},
    injury: null,
    morale: 70,
    chemistry: 68,
    systemFit: 67,
    isStarter,
    role: isStarter ? 'Starter' : 'Backup',
    roleWeeks: 10,
    tradeBlock: false,
    holdout: false,
    stats: { passYds: 0, passTD: 0, passINT: 0, passAtt: 0, passComp: 0, rushYds: 0, rushAtt: 0, rushTD: 0, fumbles: 0, rec: 0, recYds: 0, recTD: 0, targets: 0, sacks: 0, defINT: 0, tackles: 0, fgMade: 0, fgAtt: 0 },
  };
}

function makeRoster(teamId: string, ratingBase: number): Player[] {
  return [
    makePlayer(`${teamId}-qb`, teamId, 'QB', ratingBase + 8),
    makePlayer(`${teamId}-rb`, teamId, 'RB', ratingBase + 4),
    makePlayer(`${teamId}-wr`, teamId, 'WR', ratingBase + 3),
    makePlayer(`${teamId}-te`, teamId, 'TE', ratingBase + 1),
    makePlayer(`${teamId}-ol`, teamId, 'OL', ratingBase + 2),
    makePlayer(`${teamId}-dl`, teamId, 'DL', ratingBase + 2),
    makePlayer(`${teamId}-lb`, teamId, 'LB', ratingBase + 1),
    makePlayer(`${teamId}-cb`, teamId, 'CB', ratingBase),
    makePlayer(`${teamId}-s`, teamId, 'S', ratingBase),
    makePlayer(`${teamId}-k`, teamId, 'K', ratingBase - 1),
    makePlayer(`${teamId}-p`, teamId, 'P', ratingBase - 1),
  ];
}

function makeDraftPicks(teamId: string, year: number): DraftPick[] {
  return Array.from({ length: 7 }, (_, index) => ({
    round: index + 1,
    pick: index + 1,
    originalTeamId: teamId,
    currentTeamId: teamId,
    year,
    isCompPick: false,
  }));
}

function makeTeam(id: string, conference: Team['conference'], division: string, isUser = false, ratingBase = 70): Team {
  const roster = makeRoster(id, ratingBase);

  return {
    id,
    city: id.toUpperCase(),
    name: 'Club',
    abbr: id.slice(0, 3).toUpperCase(),
    icon: id.slice(0, 3).toUpperCase(),
    conference,
    division,
    roster,
    capSpace: 80,
    capUsed: 180,
    deadCap: 0,
    deadCapByYear: {},
    wins: isUser ? 11 : 8,
    losses: isUser ? 6 : 9,
    ties: 0,
    streak: 0,
    offScheme: 'spread',
    defScheme: 'cover_3',
    schemeOff: 'spread',
    schemeDef: 'cover_3',
    coachingStaff: { hc: null, oc: null, dc: null },
    staff: { hc: null, oc: null, dc: null },
    ownerId: `${id}-owner`,
    owner: { archetypeId: 'win_now', label: 'Win Now', approval: 60, history: [] },
    ownerMood: 60,
    ownerPatience80: 60,
    gmStrategy: 'neutral',
    draftPicks: makeDraftPicks(id, 2027),
    rivalries: [],
    rivals: {},
    franchiseTag973: null,
    isUser,
    clinic: { xp: {}, perks: [] },
    skillSelections: {},
    tradeState: { gmTrustByTeam: {}, recentTrades: [] },
    txLog: [],
    seasonStats: {
      gamesPlayed: 17,
      pointsFor: 320,
      pointsAgainst: 300,
      pointDifferential: 20,
      totalYards: 5100,
      passingYards: 3200,
      rushingYards: 1900,
      turnoversLost: 15,
      turnoversForced: 16,
      sacksFor: 32,
      sacksAgainst: 27,
    },
  } as Team;
}

function makeOffseasonGame(): GameState {
  const teams: Record<string, Team> = {
    user: makeTeam('user', 'AFC', 'East', true, 84),
    ai1: makeTeam('ai1', 'AFC', 'North', false, 78),
    ai2: makeTeam('ai2', 'NFC', 'East', false, 76),
    ai3: makeTeam('ai3', 'NFC', 'West', false, 74),
  };
  const players: Record<string, Player> = {};

  for (const team of Object.values(teams)) {
    for (const player of team.roster) players[player.id] = player;
  }

  const game: GameState = {
    version: SAVE_VERSION,
    seed: 42,
    year: 2027,
    week: 1,
    phase: 'offseason',
    difficulty: 'pro',
    players,
    teams,
    owners: {},
    schedule: [],
    draftClass: [],
    freeAgents: [],
    records: [],
    hallOfFame: [],
    frontOffice: {
      xp: 0,
      level: 1,
      achievements: [],
      perks: [],
      reputation: { players: 50, media: 50, owner: 50 },
    },
    eventLog: [],
    narrativeState: { activeArcs: [], hooks: [], recentHeadlines: [] },
    gameDayState: { recentPackages: [], latestPackageId: null },
    weekSummaries: [],
    playoffBracket: null,
    offseasonState: null,
  };

  game.teams.user.roster[0]!.contract!.years = 1;
  game.teams.user.roster[1]!.contract!.years = 1;
  game.teams.ai1.roster[0]!.contract!.years = 1;
  game.offseasonState = initializeOffseasonState(game);

  return game;
}

function makeChampionshipGame(): GameState {
  const game = makeOffseasonGame();
  game.year = 2026;
  game.phase = 'playoffs';
  game.week = 22;
  game.offseasonState = null;
  game.playoffBracket = {
    season: 2026,
    afc: [],
    nfc: [],
    matchups: [],
    championTeamId: 'user',
  };
  for (const team of Object.values(game.teams)) {
    for (const pick of team.draftPicks) {
      pick.year = 2027;
    }
  }

  return game;
}

function makeProspect(id: string, pos: Player['pos'], trueGrade = 84): DraftProspect {
  return {
    id,
    firstName: 'Draft',
    lastName: `Prospect${id}`,
    pos,
    college: 'Test State',
    ratings: { awareness: trueGrade, speed: trueGrade, stamina: trueGrade },
    projectedRound: 1,
    scoutGrade: trueGrade - 8,
    trueGrade,
    personality: { workEthic: 7, loyalty: 5, greed: 4, pressure: 6, ambition: 7 },
    traits: [],
    archetype: null,
    characterArchetype: 'balanced',
    bustProbability: 0.15,
    stealProbability: 0.1,
    scoutingReports: [],
  };
}

describe('offseason systems', () => {
  it('stores a user re-sign offer and carries unsigned players into free agency', () => {
    const game = makeOffseasonGame();
    const userQuarterback = game.teams.user.roster[0]!;
    const userRunningBack = game.teams.user.roster[1]!;
    const askingPrice = game.offseasonState!.reSignDecisions[userQuarterback.id]!.askingPrice;

    const offered = submitReSignOffer(game, userQuarterback.id, askingPrice);
    const result = advanceFranchiseWeek(offered.nextState);

    expect(result.nextState.phase).toBe('free_agency');
    expect(result.nextState.teams.user.roster.some((player) => player.id === userQuarterback.id)).toBe(true);
    expect(result.nextState.freeAgents).toContain(userRunningBack.id);
    expect(result.nextState.freeAgents).not.toContain(userQuarterback.id);
  });

  it('resolves free agency rounds deterministically and transitions into the draft', () => {
    const game = makeOffseasonGame();
    const expiringRunner = game.teams.user.roster[1]!;
    const toMarket = advanceFranchiseWeek(game);
    const bidState = submitFreeAgentBid(toMarket.nextState, expiringRunner.id, {
      years: 3,
      salary: 14,
      signingBonus: 8,
      guaranteed: 24,
    });

    const roundOne = advanceFranchiseWeek(bidState.nextState);
    const roundTwo = advanceFranchiseWeek(roundOne.nextState);
    const roundThree = advanceFranchiseWeek(roundTwo.nextState);

    expect(roundOne.nextState.teams.user.roster.some((player) => player.id === expiringRunner.id)).toBe(true);
    expect(roundOne.nextState.freeAgents).not.toContain(expiringRunner.id);
    expect(roundThree.nextState.phase).toBe('draft');
    expect(roundThree.nextState.offseasonState?.draftOrder.length).toBeGreaterThan(0);
  });

  it('builds a draft class and trade board when the offseason begins', () => {
    const game = makeChampionshipGame();
    game.teams.user.roster[2]!.tradeBlock = true;

    const result = advanceFranchiseWeek(game);

    expect(result.nextState.phase).toBe('offseason');
    expect(result.nextState.draftClass.length).toBeGreaterThan(0);
    expect(result.nextState.offseasonState?.tradeOffers.length).toBeGreaterThan(0);
  });

  it('updates scouting reports without mutating prospect true grade', () => {
    const game = makeOffseasonGame();
    game.draftClass = [makeProspect('prospect-1', 'QB', 88)];

    const result = runScoutingAction(game, 'prospect-1', 'film');

    expect(result.nextState.offseasonState?.scoutingState['prospect-1']?.actions).toEqual(['film']);
    expect(result.nextState.offseasonState?.scoutingState['prospect-1']?.accuracy).toBeGreaterThan(0);
    expect(result.nextState.draftClass[0]!.trueGrade).toBe(88);
  });

  it('accepts and rejects trade offers deterministically', () => {
    const game = makeOffseasonGame();
    game.teams.user.roster[2]!.tradeBlock = true;
    const userReceiver = game.teams.user.roster[2]!;
    const aiCorner = game.teams.ai1.roster[7]!;
    const offer: TradeOffer = {
      id: 'trade-1',
      fromTeamId: 'ai1',
      toTeamId: 'user',
      direction: 'inbound',
      summary: 'Swap receiver for corner and a pick',
      status: 'pending',
      send: [
        {
          type: 'player',
          teamId: 'user',
          playerId: userReceiver.id,
          pickId: null,
          description: userReceiver.name,
        },
      ],
      receive: [
        {
          type: 'player',
          teamId: 'ai1',
          playerId: aiCorner.id,
          pickId: null,
          description: aiCorner.name,
        },
        {
          type: 'pick',
          teamId: 'ai1',
          playerId: null,
          pickId: 'ai1-2027-2-2-ai1',
          description: 'Round 2 pick',
        },
      ],
    };
    game.offseasonState!.tradeOffers = [offer];

    const accepted = acceptTradeOffer(game, 'trade-1');
    expect(accepted.nextState.teams.user.roster.some((player) => player.id === aiCorner.id)).toBe(true);
    expect(accepted.nextState.teams.ai1.roster.some((player) => player.id === userReceiver.id)).toBe(true);
    expect(accepted.nextState.offseasonState?.tradeOffers[0]?.status).toBe('accepted');

    const rejected = rejectTradeOffer(game, 'trade-1');
    expect(rejected.nextState.offseasonState?.tradeOffers[0]?.status).toBe('rejected');
    expect(rejected.nextState.teams.user.roster.some((player) => player.id === userReceiver.id)).toBe(true);
  });

  it('adds drafted players to the user roster and resets the league for preseason', () => {
    const game = makeOffseasonGame();
    game.phase = 'draft';
    game.draftClass = [makeProspect('prospect-2', 'WR', 86)];
    game.offseasonState!.draftOrder = [{
      id: 'user-2027-1-1-user',
      teamId: 'user',
      round: 1,
      pick: 1,
      overall: 1,
      originalTeamId: 'user',
    }];
    game.offseasonState!.currentDraftPickIndex = 0;

    const drafted = makeDraftPick(game, 'prospect-2');
    expect(drafted.nextState.teams.user.roster.some((player) => player.id === 'prospect-2')).toBe(true);
    expect(drafted.nextState.offseasonState?.currentDraftPickIndex).toBe(1);

    drafted.nextState.phase = 'post_draft';
    drafted.nextState.weekSummaries = [{
      id: 'wk',
      year: 2027,
      week: 1,
      phase: 'playoffs',
      teamId: 'user',
      opponentTeamId: null,
      opponentName: 'Bye',
      result: 'win',
      teamScore: 24,
      opponentScore: 17,
      record: '10-7',
      headline: 'Test',
      ownerDelta: 1,
      injuries: [],
      mvpPlayerId: null,
      notes: [],
    }];
    drafted.nextState.playoffBracket = {
      season: 2026,
      afc: [],
      nfc: [],
      matchups: [],
      championTeamId: 'user',
    };
    drafted.nextState.teams.user.wins = 10;
    drafted.nextState.teams.user.losses = 7;
    drafted.nextState.teams.user.roster[0]!.injury = { type: 'ankle', severity: 'out', gamesOut: 3 };

    const reset = advanceFranchiseWeek(drafted.nextState);

    expect(reset.nextState.phase).toBe('preseason');
    expect(reset.nextState.week).toBe(1);
    expect(reset.nextState.weekSummaries).toEqual([]);
    expect(reset.nextState.playoffBracket).toBeNull();
    expect(reset.nextState.offseasonState).toBeNull();
    expect(reset.nextState.teams.user.wins).toBe(0);
    expect(reset.nextState.teams.user.losses).toBe(0);
    expect(reset.nextState.teams.user.roster[0]!.injury).toBeNull();
  });

  it('produces the same next preseason state for the same offseason actions', () => {
    const playSequence = (initial: GameState) => {
      let state = advanceFranchiseWeek(initial).nextState;
      const userQuarterback = state.teams.user.roster[0]!;
      const askingPrice = state.offseasonState!.reSignDecisions[userQuarterback.id]!.askingPrice;

      state = submitReSignOffer(state, userQuarterback.id, askingPrice).nextState;
      state = advanceFranchiseWeek(state).nextState;

      const freeAgentId = state.freeAgents[0]!;
      state = submitFreeAgentBid(state, freeAgentId, {
        years: 3,
        salary: 12,
        signingBonus: 6,
        guaranteed: 18,
      }).nextState;

      state = advanceFranchiseWeek(state).nextState;
      state = advanceFranchiseWeek(state).nextState;
      state = advanceFranchiseWeek(state).nextState;
      state = advanceFranchiseWeek(state).nextState;

      const userPick = state.draftClass[0]!;
      state = makeDraftPick(state, userPick.id).nextState;
      while (state.phase !== 'preseason') {
        state = advanceFranchiseWeek(state).nextState;
      }

      return state;
    };

    const firstGame = makeChampionshipGame();
    const secondGame = makeChampionshipGame();
    for (const team of Object.values(firstGame.teams)) team.draftPicks = team.draftPicks.slice(0, 1);
    for (const team of Object.values(secondGame.teams)) team.draftPicks = team.draftPicks.slice(0, 1);

    const first = playSequence(firstGame);
    const second = playSequence(secondGame);

    expect(first.phase).toBe('preseason');
    expect(first).toEqual(second);
  });
});
