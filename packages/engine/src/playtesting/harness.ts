import { SAVE_VERSION, getDefaultHalftimeDecisionSetting } from '../config/difficulty';
import { initCBA } from '../systems/cba-engine';
import { initCommissioner } from '../systems/commissioner';
import { makeContract } from '../systems/contracts';
import { createDefaultFranchiseIdentity } from '../systems/franchise-identity';
import { syncAllPlayerArchiveEntries } from '../systems/history';
import { initLaborState } from '../systems/labor-relations';
import { initLeagueRules } from '../systems/league-rules';
import { initializeLockerRoom } from '../systems/locker-room';
import { createEmptyRecordBook } from '../systems/records';
import { assignJerseyNumber } from '../systems/jersey-retirement';
import { STARTER_SLOTS } from '../systems/roster-management';
import { emptyPlayerStats } from '../systems/season-stats';
import { advanceFranchiseWeek } from '../systems/franchise-week';
import { finalizeDeadline } from '../systems/trade-deadline';
import type { GameState, GameDayState, Player, ScheduleWeek, Team } from '../types';
import { PLAYTEST_DETECTORS, PLAYTEST_PHASE_ORDER, saveRoundTripBytes } from './anomaly-detectors';
import { getPlaytestPersona } from './personas';
import type {
  PlaytestAnomaly,
  PlaytestFrame,
  PlaytestPersona,
  PlaytestReport,
} from './types';

export const MAX_PLAYTEST_STEPS = 800;
const ELAPSED_HISTORY_LIMIT = 32;
const HOST_NOISE_DETECTOR_IDS = new Set(['perf-budget']);

function createEmptyGameDayState(): GameDayState {
  return {
    recentPackages: [],
    latestPackageId: null,
  };
}

function makePlayer(
  id: string,
  teamId: string | null,
  pos: Player['pos'],
  ovr: number,
  isStarter = true,
): Player {
  const contractSalary = isStarter ? Math.max(1, Math.round(ovr / 10)) : Math.max(1, Math.round(ovr / 20));
  const contractYears = isStarter ? 3 : 2;
  return {
    id,
    firstName: id,
    lastName: 'Player',
    name: `${id} Player`,
    pos,
    age: 26,
    ovr,
    pot: ovr + 4,
    ratings: { awareness: ovr, speed: ovr, stamina: ovr },
    devTrait: 'normal',
    personality: { workEthic: 7, loyalty: 5, greed: 5, pressure: 5, ambition: 6 },
    traits: [],
    archetype: null,
    contract: teamId
      ? makeContract(
        contractSalary,
        contractYears,
        Math.max(1, Math.round(contractSalary * contractYears * 0.2)),
        Math.max(1, Math.round(contractSalary * Math.min(contractYears, 2))),
        id,
        teamId,
      )
      : null,
    teamId,
    draftYear: 2022,
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
    cliqueId: null,
    jerseyNumber: 0,
    endorsements: [],
    isStarter,
    role: isStarter ? 'Starter' : 'Backup',
    roleWeeks: 10,
    tradeBlock: false,
    holdout: false,
    agentId: null,
    stats: emptyPlayerStats(),
  };
}

function makeRoster(teamId: string, ratingBase: number): Player[] {
  const rosterTargets: Partial<Record<Player['pos'], number>> = {
    QB: 3,
    RB: 4,
    WR: 6,
    TE: 3,
    OL: 10,
    DL: 8,
    LB: 6,
    CB: 6,
    S: 4,
    K: 2,
    P: 2,
  };

  return Object.entries(STARTER_SLOTS).flatMap(([pos, starters]) => {
    const position = pos as Player['pos'];
    const totalPlayers = rosterTargets[position] ?? starters + 2;
    return Array.from({ length: totalPlayers }, (_, index) => {
      const isStarter = index < starters;
      const suffix = index + 1;
      const depthPenalty = isStarter ? 0 : index - starters + 1;
      const ovr = ratingBase + (
        position === 'QB' ? 8
          : position === 'RB' ? 4
            : position === 'WR' ? 3
              : position === 'TE' ? 1
                : position === 'OL' || position === 'DL' ? 2
                  : 0
      ) - depthPenalty;
      return makePlayer(`${teamId}-${position.toLowerCase()}-${suffix}`, teamId, position, ovr, isStarter);
    });
  });
}

function makeFreeAgents(): Player[] {
  const positionRatings: Partial<Record<Player['pos'], number>> = {
    QB: 70,
    RB: 68,
    WR: 69,
    TE: 67,
    OL: 68,
    DL: 68,
    LB: 67,
    CB: 68,
    S: 67,
    K: 64,
    P: 64,
  };
  const counts: Partial<Record<Player['pos'], number>> = {
    QB: 6,
    RB: 10,
    WR: 12,
    TE: 8,
    OL: 18,
    DL: 14,
    LB: 12,
    CB: 12,
    S: 10,
    K: 4,
    P: 4,
  };

  return Object.entries(positionRatings).flatMap(([pos, ratingBase]) =>
    Array.from({ length: counts[pos as Player['pos']] ?? 4 }, (_, index) =>
      makePlayer(
        `fa-${pos.toLowerCase()}-${index + 1}`,
        null,
        pos as Player['pos'],
        ratingBase - Math.floor(index / 3),
        false,
      ),
    ),
  );
}

function makeTeam(
  id: string,
  conference: Team['conference'],
  division: string,
  ratingBase = 70,
  draftSlot = 1,
): Team {
  const roster = makeRoster(id, ratingBase);
  const team = {
    id,
    city: id.toUpperCase(),
    name: 'Club',
    abbr: id.slice(0, 3).toUpperCase(),
    icon: id.slice(0, 3).toUpperCase(),
    conference,
    division,
    roster,
    capSpace: 75,
    capUsed: 180,
    deadCap: 0,
    deadCapByYear: {},
    wins: 0,
    losses: 0,
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
    fanConfidence: 60,
    ownerPatience80: 60,
    gmStrategy: 'neutral',
    philosophy: 'maintain',
    draftPicks: Array.from({ length: 11 }, (_, yearOffset) =>
      Array.from({ length: 7 }, (_, roundOffset) => ({
        round: roundOffset + 1,
        pick: draftSlot,
        originalTeamId: id,
        currentTeamId: id,
        year: 2026 + yearOffset,
        isCompPick: false,
      })),
    ).flat(),
    rivalries: [],
    rivals: {},
    franchiseTag973: null,
    isUser: false,
    clinic: { xp: {}, perks: [] },
    skillSelections: {},
    tradeState: { gmTrustByTeam: {}, recentTrades: [] },
    txLog: [],
    seasonStats: {
      gamesPlayed: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDifferential: 0,
      totalYards: 0,
      passingYards: 0,
      rushingYards: 0,
      turnoversLost: 0,
      turnoversForced: 0,
      sacksFor: 0,
      sacksAgainst: 0,
      drives: 0,
      thirdDownConversions: 0,
      thirdDownAttempts: 0,
      timeOfPossession: 0,
      fgMade: 0,
      fgAttempted: 0,
      punts: 0,
      pressuresAllowed: 0,
      yacYards: 0,
      redZoneTrips: 0,
      redZoneScores: 0,
    },
    mentoringPairs: [],
    trainingAssignments: {},
    medicalStaff: null,
    fatigueState: {},
    facilityState: {
      facilities: [
        'training_complex',
        'medical_center',
        'film_room',
        'weight_room',
        'recovery_suite',
      ].map((type) => ({
        type,
        level: 1,
        effect: {
          trainingXPBonus: 1,
          recoveryBonus: 1,
          injuryPreventionBonus: 1,
          scoutingBonus: 1,
          moraleBonus: 1,
          fatigueGainBonus: 1,
        },
      })) as Team['facilityState']['facilities'],
      budget: 10,
      maxFacilities: 5,
      upgradeCosts: {
        training_complex: [4, 8, 12],
        medical_center: [4, 8, 12],
        film_room: [3, 6, 9],
        weight_room: [3, 6, 9],
        recovery_suite: [5, 10, 15],
      },
    },
    practiceSquad: [],
    stadiumType: 'outdoor',
    franchiseIdentity: createDefaultFranchiseIdentity({ city: id.toUpperCase(), stadiumType: 'outdoor' }),
    lockerRoom: {
      cliques: [],
      captains: [],
      culture: 'stable',
      cultureScore: 50,
      tensions: [],
      lastMeetingWeek: null,
    },
    retiredJerseys: [],
    specialTeams: {
      kickReturner: null,
      puntReturner: null,
      longSnapper: null,
      kickCoverageUnit: [],
      puntCoverageUnit: [],
    },
  } as unknown as Team;

  for (const player of roster) {
    assignJerseyNumber(team, player);
  }
  team.lockerRoom = initializeLockerRoom(team, () => 0.42);
  return team;
}

function makeSchedule(teamIds: string[]): ScheduleWeek[] {
  const teams = [...teamIds].sort();
  const weeks: ScheduleWeek[] = [];
  const working = [...teams];

  for (let week = 1; week <= 18; week += 1) {
    const games = [];
    for (let index = 0; index < working.length / 2; index += 1) {
      const home = week % 2 === 0 ? working[working.length - 1 - index] : working[index];
      const away = week % 2 === 0 ? working[index] : working[working.length - 1 - index];
      games.push({ homeTeamId: home!, awayTeamId: away!, result: null });
    }
    weeks.push({ week, games });
    const fixed = working[0]!;
    const rotated = [fixed, working[working.length - 1]!, ...working.slice(1, -1)];
    working.splice(0, working.length, ...rotated);
  }

  return weeks;
}

function makeLeagueState(seed: number): GameState {
  const teams: Record<string, Team> = {};
  const players: GameState['players'] = {};
  const defs: Array<[string, Team['conference'], string, number]> = [
    ['afce1', 'AFC', 'East', 84],
    ['afce2', 'AFC', 'East', 75],
    ['afcn1', 'AFC', 'North', 81],
    ['afcn2', 'AFC', 'North', 72],
    ['afcs1', 'AFC', 'South', 80],
    ['afcs2', 'AFC', 'South', 71],
    ['afcw1', 'AFC', 'West', 79],
    ['afcw2', 'AFC', 'West', 70],
    ['nfce1', 'NFC', 'East', 83],
    ['nfce2', 'NFC', 'East', 74],
    ['nfcn1', 'NFC', 'North', 82],
    ['nfcn2', 'NFC', 'North', 73],
    ['nfcs1', 'NFC', 'South', 78],
    ['nfcs2', 'NFC', 'South', 69],
    ['nfcw1', 'NFC', 'West', 77],
    ['nfcw2', 'NFC', 'West', 68],
  ];

  for (const [index, [id, conference, division, ratingBase]] of defs.entries()) {
    const team = makeTeam(id, conference, division, ratingBase, index + 1);
    teams[id] = team;
    for (const player of team.roster) {
      players[player.id] = player;
    }
  }

  const freeAgents = makeFreeAgents();
  for (const player of freeAgents) {
    players[player.id] = player;
  }

  const game = {
    version: SAVE_VERSION,
    seed,
    year: 2026,
    week: 1,
    phase: 'preseason',
    difficulty: 'pro',
    settings: {
      halftimeDecisions: getDefaultHalftimeDecisionSetting('pro'),
    },
    players,
    teams,
    owners: {
      'afce1-owner': {
        id: 'afce1-owner',
        name: 'Owner',
        archetype: 'win_now',
        patience: 24,
        goals: { floor: '7 wins', target: 'playoffs', ceiling: 'title' },
        personality: { spending: 5, patience: 3, mediaAwareness: 6 },
      },
    },
    schedule: makeSchedule(Object.keys(teams)),
    draftClass: [],
    freeAgents: freeAgents.map((player) => player.id),
    records: createEmptyRecordBook(),
    activeRecordChases: [],
    recentBrokenRecords: [],
    recentMilestones: [],
    awardsHistory: [],
    hallOfFame: [],
    allDecadeTeams: [],
    powerRankings: [],
    franchiseHistory: [],
    playerArchive: [],
    playerSeasonHistory: {},
    playerRivalries: [],
    farewellTours: [],
    endorsementOffers: [],
    leagueRules: initLeagueRules(2026),
    cbaState: initCBA(2026),
    commissionerState: initCommissioner(2026),
    laborState: initLaborState(),
    frontOffice: {
      xp: 0,
      level: 1,
      achievements: [],
      perks: [],
      reputation: { players: 50, media: 50, owner: 50 },
    },
    eventLog: [],
    narrativeState: { activeArcs: [], hooks: [], recentHeadlines: [] },
    offFieldEvents: [],
    recentPressConferences: [],
    coachingHistory: [],
    leagueRivalries: [],
    activeEffects: [],
    gameDayState: createEmptyGameDayState(),
    weekSummaries: [],
    playoffBracket: null,
    offseasonState: null,
    expansionDraftState: undefined,
    stadiumDealOffers: [],
    leagueNews: [],
    socialFeed: [],
    activeProposals: [],
    tradeDeadlineState: undefined,
    faTargetBoard: {
      teamId: null,
      watchlist: [],
      targets: [],
    },
    teamNeedsCache: {},
    scenarioState: undefined,
    warRoomState: null,
    contractExtensions: [],
    coachingMarket: {
      teamId: null,
      updatedYear: 2026,
      updatedWeek: 1,
      hotSeat: false,
      candidates: { HC: [], OC: [], DC: [] },
    },
    weeklyPrepPlans: {},
    weeklyPrepHistory: [],
    filmRoomHistory: [],
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
    apologyTourThreads: [],
    ceremonies: [],
    dynastyTimeline: [],
    storyArcs: [],
    achievements: [],
    dashboardState: {
      activeLayoutId: 'layout:default',
      layouts: [{
        id: 'layout:default',
        name: 'Command Center',
        widgets: [
          'team_record',
          'next_game',
          'injury_report',
          'cap_snapshot',
          'power_ranking',
          'league_headlines',
          'promise_tracker',
          'training_report',
        ],
        columns: 3,
      }],
      pinnedWidgets: [],
    },
    seasonReports: [],
    gamePlan: null,
    opponentReports: [],
    draftRecaps: [],
    tradeSuggestions: [],
  } as unknown as GameState;

  syncAllPlayerArchiveEntries(game, game.year);
  return game;
}

function nowMs(): number {
  return Date.now();
}

function roundElapsedMs(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function recordElapsedDuration(history: number[], elapsedMs: number): void {
  history.push(elapsedMs);
  if (history.length > ELAPSED_HISTORY_LIMIT) {
    history.splice(0, history.length - ELAPSED_HISTORY_LIMIT);
  }
}

function captureFrame(state: GameState): PlaytestFrame {
  return {
    year: state.year,
    week: state.week,
    phase: state.phase,
  };
}

function phaseRank(phase: PlaytestFrame['phase']): number {
  const idx = PLAYTEST_PHASE_ORDER.indexOf(phase);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

function sortAnomalies(anomalies: readonly PlaytestAnomaly[]): PlaytestAnomaly[] {
  return [...anomalies].sort((left, right) =>
    left.step - right.step
    || left.year - right.year
    || phaseRank(left.phase) - phaseRank(right.phase)
    || left.week - right.week
    || left.detectorId.localeCompare(right.detectorId)
    || left.detail.localeCompare(right.detail));
}

function canonicalAnomalies(anomalies: readonly PlaytestAnomaly[]): PlaytestAnomaly[] {
  return sortAnomalies(anomalies.filter((anomaly) => !HOST_NOISE_DETECTOR_IDS.has(anomaly.detectorId)));
}

export function buildPlaytestReport(params: {
  persona: PlaytestPersona;
  seed: number;
  seasonsRequested: number;
  seasonsCompleted: number;
  weeksAdvanced: number;
  anomalies: PlaytestAnomaly[];
}): PlaytestReport {
  const anomalies = canonicalAnomalies(params.anomalies);
  const highSeverityCount = anomalies.filter((anomaly) => anomaly.severity === 'high').length;

  return {
    personaId: params.persona.id,
    personaLabel: params.persona.label,
    seed: params.seed,
    seasonsRequested: params.seasonsRequested,
    seasonsCompleted: params.seasonsCompleted,
    weeksAdvanced: params.weeksAdvanced,
    anomalyCount: anomalies.length,
    highSeverityCount,
    anomalies,
  };
}

export function runPlaytest(
  personaInput: PlaytestPersona | string,
  seed: number,
  seasons: number,
): PlaytestReport {
  const persona = typeof personaInput === 'string'
    ? getPlaytestPersona(personaInput)
    : personaInput;

  if (!persona) {
    throw new Error(`Unknown playtest persona: ${String(personaInput)}`);
  }

  let state = makeLeagueState(seed);
  let weeksAdvanced = 0;
  let completedSeasons = 0;
  let step = 0;
  const anomalies: PlaytestAnomaly[] = [];
  const elapsedHistoryMs: number[] = [];

  while (completedSeasons < seasons && step < MAX_PLAYTEST_STEPS) {
    if (state.tradeDeadlineState) {
      const resolved = finalizeDeadline(state, state.tradeDeadlineState);
      resolved.eventLog.push({
        id: `playtest-deadline-${seed}-${step}`,
        type: 'trade_deadline_resolved',
        timestamp: step,
        description: 'Playtest harness deadline auto-resolve.',
        data: { year: resolved.year, week: resolved.week },
      });
      state = resolved;
    }

    const previousFrame = captureFrame(state);
    const serializedState = saveRoundTripBytes(state);
    const originalMathRandom = Math.random;
    let mathRandomCalls = 0;
    Math.random = (() => {
      mathRandomCalls += 1;
      return originalMathRandom();
    }) as typeof Math.random;

    const startedAt = nowMs();
    try {
      state = advanceFranchiseWeek(state, { playtestBias: persona.aiBias }).nextState;
    } finally {
      Math.random = originalMathRandom;
    }

    const currentFrame = captureFrame(state);
    const deadlinePause = currentFrame.year === previousFrame.year
      && currentFrame.week === previousFrame.week
      && currentFrame.phase === previousFrame.phase
      && Boolean(state.tradeDeadlineState);
    if (deadlinePause) {
      continue;
    }

    const elapsedMs = roundElapsedMs(nowMs() - startedAt);
    recordElapsedDuration(elapsedHistoryMs, elapsedMs);
    weeksAdvanced += 1;
    step += 1;

    if (previousFrame.phase === 'playoffs' && currentFrame.phase === 'offseason') {
      completedSeasons += 1;
    }

    const roundTripSerializedState = saveRoundTripBytes(JSON.parse(serializedState) as GameState);
    const detectorContext = {
      step,
      seed,
      persona,
      previousFrame,
      currentFrame,
      state,
      serializedState,
      roundTripSerializedState,
      mathRandomCalls,
      elapsedMs,
      elapsedHistoryMs: [...elapsedHistoryMs],
      completedSeasons,
      weeksAdvanced,
    } as const;

    for (const detector of PLAYTEST_DETECTORS) {
      const verdict = detector.detect(detectorContext);
      if (verdict.ok) continue;
      anomalies.push({
        detectorId: detector.id,
        severity: verdict.severity,
        detail: verdict.detail,
        reproSeed: verdict.reproSeed,
        step,
        year: currentFrame.year,
        week: currentFrame.week,
        phase: currentFrame.phase,
      });
    }
  }

  if (completedSeasons < seasons) {
    anomalies.push({
      detectorId: 'harness-guard',
      severity: 'high',
      detail: `Playtest loop hit the guard before completing ${seasons} seasons.`,
      reproSeed: seed,
      step,
      year: state.year,
      week: state.week,
      phase: state.phase,
    });
  }

  return buildPlaytestReport({
    persona,
    seed,
    seasonsRequested: seasons,
    seasonsCompleted: completedSeasons,
    weeksAdvanced,
    anomalies,
  });
}
