import { describe, expect, it } from 'vitest';
import {
  acceptTradeOffer,
  advanceFranchiseWeek,
  createEmptyRecordBook,
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
    mentoringPairs: [],
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
    records: createEmptyRecordBook(),
    awardsHistory: [],
    hallOfFame: [],
    powerRankings: [],
    franchiseHistory: [],
    playerArchive: [],
    playerSeasonHistory: {},
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
    leagueNews: [],
    activeProposals: [],
    faTargetBoard: {
      teamId: null,
      watchlist: [],
      targets: [],
    },
    teamNeedsCache: {},
    warRoomState: null,
    contractExtensions: [],
    difficultyState: {
      enabled: true,
      adaptiveSlider: 50,
      recentUserResults: [],
      currentStreak: 0,
      adjustmentHistory: [],
    },
    availableMedicalStaff: [],
    playoffMomentum: {},
    scoutingDepartment: {
      scouts: [],
      availableScouts: [],
      budget: 5,
      maxScouts: 5,
      privateWorkoutsRemaining: 3,
    },
    conditionalPicks: [],
    waiverOrder: Object.keys(teams),
    waiverWire: [],
    waiverClaims: [],
    waiverResults: [],
    handshakes: [],
    tutorialState: {
      active: false,
      currentStepIndex: 0,
      steps: [],
      completedSteps: [],
      dismissed: false,
    },
    agents: [],
    narrativeIntensity: {
      current: 50,
      recentBeats: [],
      cooldownWeeks: 0,
    },
    ceremonies: [],
    dynastyTimeline: [],
    achievements: [],
    dashboardState: {
      activeLayoutId: 'layout:default',
      layouts: [{
        id: 'layout:default',
        name: 'Command Center',
        widgets: [],
        columns: 3,
      }],
      pinnedWidgets: [],
    },
    seasonReports: [],
    gamePlan: null,
    opponentReports: [],
    draftRecaps: [],
    tradeSuggestions: [],
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
    region: 'south',
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
    combine: null,
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

  it('archives the completed season when the league rolls into the offseason', () => {
    const game = makeChampionshipGame();
    game.teams.user.wins = 12;
    game.teams.user.losses = 5;
    game.teams.user.seasonStats.pointDifferential = 88;

    const result = advanceFranchiseWeek(game);

    expect(result.nextState.franchiseHistory.some((entry) =>
      entry.year === 2026 &&
      entry.teamId === 'user' &&
      entry.playoffFinish === 'champion' &&
      entry.record === '12-5'
    )).toBe(true);
  });

  it('archives player season snapshots before offseason progression changes ratings', () => {
    const game = makeChampionshipGame();
    const userQuarterback = game.teams.user.roster[0]!;
    userQuarterback.age = 24;
    userQuarterback.ovr = 88;
    userQuarterback.stats.gamesPlayed = 17;
    userQuarterback.stats.passYds = 4625;
    userQuarterback.stats.passTD = 36;

    const result = advanceFranchiseWeek(game);
    const snapshot = result.nextState.playerSeasonHistory[userQuarterback.id]?.[0];

    expect(snapshot?.season).toBe(2026);
    expect(snapshot?.ovr).toBe(88);
    expect(snapshot?.age).toBe(24);
    expect(snapshot?.gamesPlayed).toBe(17);
    expect(snapshot?.keyStats.passYds).toBe(4625);
  });

  it('progresses players and records retirements on the first offseason advance', () => {
    const game = makeChampionshipGame();
    const youngQuarterback = game.teams.user.roster[0]!;
    youngQuarterback.age = 23;
    youngQuarterback.ovr = 82;
    youngQuarterback.devTrait = 'superstar';
    youngQuarterback.stats.passAtt = 550;
    youngQuarterback.stats.passComp = 374;
    youngQuarterback.stats.passYds = 4480;
    youngQuarterback.stats.passTD = 35;
    youngQuarterback.stats.passINT = 8;

    const oldRunner = game.teams.user.roster[1]!;
    oldRunner.age = 35;
    oldRunner.ovr = 58;
    oldRunner.stats.rushAtt = 84;
    oldRunner.stats.rushYds = 260;

    game.teams.user.staff.hc = {
      id: 'user-hc',
      name: 'User Coach',
      role: 'HC',
      archetype: 'Strategist',
      traits: [],
      ratings: { development: 92, gameplan: 78, motivation: 75 },
      level: 5,
      specialty75: null,
    };

    const offseasonStart = advanceFranchiseWeek(game);
    const progressed = advanceFranchiseWeek(offseasonStart.nextState);

    expect(progressed.nextState.players[youngQuarterback.id]!.ovr).toBeGreaterThanOrEqual(85);
    expect(progressed.nextState.teams.user.roster.some((player) => player.id === oldRunner.id)).toBe(false);
    expect(progressed.nextState.playerArchive.find((entry) => entry.playerId === oldRunner.id)?.retirementYear)
      .toBe(progressed.nextState.year);
    expect(progressed.nextState.eventLog.some((event) => event.type === 'player_retired' && event.data.playerId === oldRunner.id))
      .toBe(true);
  });

  it('re-evaluates AI team strategy before the trade market refreshes', () => {
    const game = makeChampionshipGame();
    const aiTeam = game.teams.ai1;
    aiTeam.gmStrategy = 'rebuild';
    aiTeam.wins = 11;
    aiTeam.losses = 6;
    aiTeam.roster.forEach((player, index) => {
      player.ovr = index < 4 ? 83 : 79;
      player.age = index < 4 ? 24 : 25;
    });
    aiTeam.staff.hc = {
      id: 'ai1-hc',
      name: 'AI Coach',
      role: 'HC',
      archetype: 'Strategist',
      traits: [],
      ratings: { development: 88, gameplan: 76, motivation: 74 },
      level: 5,
      specialty75: null,
    };

    const offseasonStart = advanceFranchiseWeek(game);
    const progressed = advanceFranchiseWeek(offseasonStart.nextState);

    expect(progressed.nextState.teams.ai1.gmStrategy).toBe('contend');
    expect(progressed.nextState.eventLog.some((event) =>
      event.type === 'gm_strategy_shift' &&
      event.data.teamId === 'ai1' &&
      event.data.to === 'contend'
    )).toBe(true);
  });

  it('generates awards, hall of fame entries, season records, and mentoring pairs on offseason advance', () => {
    const game = makeChampionshipGame();
    game.playerArchive = [{
      playerId: 'legend-1',
      firstName: 'Legend',
      lastName: 'One',
      name: 'Legend One',
      positions: ['QB'],
      peakOvr: 91,
      peakYear: 2024,
      firstYear: 2020,
      lastYear: 2025,
      retirementYear: 2025,
      teamHistory: [{ teamId: 'user', firstYear: 2020, lastYear: 2030 }],
      careerStats: { gp: 170, seasons: 10, mvps: 1, allPros: 4, proBowls: 6, championships: 2, passYds: 43000 },
    }];

    const userQb = game.teams.user.roster.find((player) => player.pos === 'QB')!;
    userQb.age = 23;
    userQb.ovr = 90;
    userQb.stats.passAtt = 575;
    userQb.stats.passComp = 399;
    userQb.stats.passYds = 4980;
    userQb.stats.passTD = 41;
    userQb.stats.passINT = 7;

    const mentor = game.teams.user.roster.find((player) => player.pos === 'RB')!;
    mentor.age = 30;
    mentor.ovr = 85;
    mentor.traits = ['captain'];
    mentor.contract!.years = 2;

    const mentee = game.teams.user.roster.find((player) => player.pos === 'WR')!;
    mentee.pos = 'RB';
    mentee.age = 22;
    mentee.ovr = 73;
    mentee.devTrait = 'star';
    mentee.personality.ambition = 8;

    const offseasonStart = advanceFranchiseWeek(game);
    const advanced = advanceFranchiseWeek(offseasonStart.nextState);

    expect(advanced.nextState.awardsHistory.at(-1)?.year).toBe(2026);
    expect(advanced.nextState.awardsHistory.at(-1)?.awards.some((award) => award.awardId === 'mvp')).toBe(true);
    expect(advanced.nextState.hallOfFame.some((entry) => entry.playerId === 'legend-1')).toBe(true);
    expect(advanced.nextState.records.singleSeason.passYds[0]?.year).toBe(2026);
    expect(advanced.nextState.teams.user.mentoringPairs.length).toBeGreaterThan(0);
    expect(advanced.nextState.franchiseHistory.find((entry) => entry.year === 2026 && entry.teamId === 'user')?.awardsWon.length).toBeGreaterThan(0);
    expect(advanced.nextState.franchiseHistory.find((entry) => entry.year === 2026 && entry.teamId === 'user')?.majorEvents.some((event) => event.startsWith('Mentoring:'))).toBe(true);
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
