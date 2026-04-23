import { SAVE_VERSION, getDefaultHalftimeDecisionSetting } from '../config';
import type { PrngFn } from '../rng';
import { SaveStateSchema } from '../save/schema';
import { initCBA } from './cba-engine';
import { initCommissioner } from './commissioner';
import { makeContract } from './contracts';
import { createDefaultDashboardState } from './dashboard-config';
import { createDefaultFranchiseIdentity } from './franchise-identity';
import { generateOpponentScouting } from './game-plan';
import { initLaborState } from './labor-relations';
import { initLeagueRules } from './league-rules';
import { initializeLockerRoom } from './locker-room';
import { createEmptyRecordBook } from './records';
import { assignJerseyNumber } from './jersey-retirement';
import { createEmptySeasonStats, emptyPlayerStats } from './season-stats';
import { createDefaultTutorialState } from './tutorial';
import type { GameState, Owner, Player, Team } from '../types';

const SCENARIO_YEAR = 2026;
const SCENARIO_WEEK = 14;
const USER_WINS = 9;
const USER_LOSSES = 4;
const RIVAL_WINS = 10;
const RIVAL_LOSSES = 3;
const USER_APPROVAL = 68;
const OWNER_PATIENCE = 24;
const PLAYOFF_DEADLINE_WEEK = 18;
const USER_RB_TARGET_YARDS = 948;
const USER_WR_TARGET_RECEPTIONS = 76;
const USER_QB_TARGET_PASSING = 3780;
const DEFAULT_LOCKER_ROOM_ROLL = 0.42;

const FIRST_NAMES = ['Jalen', 'Micah', 'Caleb', 'Jordan', 'Roman', 'Darius', 'Miles', 'Ty', 'Nico', 'Avery'] as const;
const LAST_NAMES = ['Stone', 'Carter', 'Vale', 'Mercer', 'Knox', 'Boone', 'Cross', 'Rhodes', 'Pryor', 'Banks'] as const;
const POSITIONS: Player['pos'][] = ['QB', 'RB', 'WR', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'];

const TEAM_DEFINITIONS = [
  { id: 'afce1', city: 'Lakeview', name: 'Caps', conference: 'AFC', division: 'East', ratingBase: 84 },
  { id: 'afce2', city: 'Harbor', name: 'Kings', conference: 'AFC', division: 'East', ratingBase: 79 },
  { id: 'afcn1', city: 'Steelport', name: 'Forge', conference: 'AFC', division: 'North', ratingBase: 81 },
  { id: 'afcn2', city: 'Canton', name: 'Pilots', conference: 'AFC', division: 'North', ratingBase: 73 },
  { id: 'afcs1', city: 'Bayou', name: 'Gators', conference: 'AFC', division: 'South', ratingBase: 80 },
  { id: 'afcs2', city: 'Mesa', name: 'Stallions', conference: 'AFC', division: 'South', ratingBase: 72 },
  { id: 'afcw1', city: 'Summit', name: 'Outlaws', conference: 'AFC', division: 'West', ratingBase: 78 },
  { id: 'afcw2', city: 'Redrock', name: 'Rattlers', conference: 'AFC', division: 'West', ratingBase: 70 },
  { id: 'nfce1', city: 'Empire', name: 'Guard', conference: 'NFC', division: 'East', ratingBase: 83 },
  { id: 'nfce2', city: 'Liberty', name: 'Foxes', conference: 'NFC', division: 'East', ratingBase: 74 },
  { id: 'nfcn1', city: 'Northwind', name: 'Wolves', conference: 'NFC', division: 'North', ratingBase: 82 },
  { id: 'nfcn2', city: 'Great Lakes', name: 'Lynx', conference: 'NFC', division: 'North', ratingBase: 72 },
  { id: 'nfcs1', city: 'Suncoast', name: 'Wave', conference: 'NFC', division: 'South', ratingBase: 78 },
  { id: 'nfcs2', city: 'Delta', name: 'Raiders', conference: 'NFC', division: 'South', ratingBase: 69 },
  { id: 'nfcw1', city: 'Cascadia', name: 'Evergreen', conference: 'NFC', division: 'West', ratingBase: 77 },
  { id: 'nfcw2', city: 'Desert', name: 'Comets', conference: 'NFC', division: 'West', ratingBase: 68 },
] as const;

const CONFERENCE_RECORDS = {
  sameConference: [
    [8, 5],
    [8, 5],
    [7, 6],
    [7, 6],
    [6, 7],
    [5, 8],
  ],
  otherConference: [
    [10, 3],
    [9, 4],
    [8, 5],
    [8, 5],
    [7, 6],
    [6, 7],
    [5, 8],
    [4, 9],
  ],
} as const;

export const CONVENTION_SAVE_METADATA = {
  description: 'Week 14 playoff-race scenario with a division showdown, milestone chases, and a satisfied owner demanding a postseason berth.',
  team: 'User-selected contender',
  week: SCENARIO_WEEK,
  headline: 'One game back. Four weeks left. The division still runs through tonight.',
} as const;

function teamDefinition(teamId: string) {
  return TEAM_DEFINITIONS.find((entry) => entry.id === teamId) ?? null;
}

function hashValue(value: string): number {
  return [...value].reduce((hash, char) => ((hash * 33) ^ char.charCodeAt(0)) >>> 0, 5381);
}

function pickOne<T>(items: readonly T[], rng: PrngFn): T {
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))]!;
}

function createOwner(teamId: string): Owner {
  return {
    id: `${teamId}-owner`,
    name: `${teamId.toUpperCase()} Ownership`,
    archetype: 'win_now',
    patience: OWNER_PATIENCE,
    goals: { floor: '9 wins', target: 'playoffs', ceiling: 'title' },
    personality: { spending: 6, patience: 4, mediaAwareness: 7 },
  };
}

function createPlayerName(teamId: string, pos: Player['pos'], depth: number) {
  const seed = hashValue(`${teamId}:${pos}:${depth}`);
  const firstName = FIRST_NAMES[seed % FIRST_NAMES.length]!;
  const lastName = LAST_NAMES[Math.floor(seed / FIRST_NAMES.length) % LAST_NAMES.length]!;
  return {
    firstName,
    lastName: `${lastName}-${pos}${depth + 1}`,
  };
}

function createPlayer(
  teamId: string,
  pos: Player['pos'],
  ovr: number,
  depth: number,
  isStarter = true,
): Player {
  const name = createPlayerName(teamId, pos, depth);
  const id = `${teamId}-${pos.toLowerCase()}-${depth + 1}`;
  return {
    id,
    firstName: name.firstName,
    lastName: name.lastName,
    name: `${name.firstName} ${name.lastName}`,
    pos,
    age: pos === 'K' || pos === 'P' ? 28 : 26,
    ovr,
    pot: Math.min(99, ovr + 4),
    ratings: { awareness: ovr, speed: ovr, stamina: ovr },
    devTrait: ovr >= 84 ? 'star' : 'normal',
    personality: { workEthic: 7, loyalty: 5, greed: 5, pressure: 5, ambition: 7 },
    traits: [],
    archetype: null,
    contract: makeContract(8, 3, 4, 3, id, teamId),
    teamId,
    draftYear: SCENARIO_YEAR - 3,
    draftRound: 1,
    draftPick: depth + 1,
    college: 'Dynasty State',
    yearsExp: 3,
    careerStats: { seasons: 3, gp: 51, snaps: 2200 },
    traitMilestones: {},
    traitPowerLevel: {},
    injury: null,
    morale: 72,
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

function createRoster(teamId: string, ratingBase: number): Player[] {
  return POSITIONS.map((pos, index) => createPlayer(teamId, pos, ratingBase + (pos === 'QB' ? 8 : pos === 'RB' ? 4 : pos === 'WR' ? 3 - Math.min(index, 1) : pos === 'OL' || pos === 'DL' ? 2 : 0), index));
}

function createTeam(definition: (typeof TEAM_DEFINITIONS)[number], isUser: boolean): Team {
  const roster = createRoster(definition.id, definition.ratingBase);
  const team = {
    id: definition.id,
    city: definition.city,
    name: definition.name,
    abbr: definition.id.slice(0, 3).toUpperCase(),
    icon: definition.id.slice(0, 3).toUpperCase(),
    conference: definition.conference,
    division: definition.division,
    roster,
    capSpace: 25,
    capUsed: 210,
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
    ownerId: `${definition.id}-owner`,
    owner: { archetypeId: 'win_now', label: 'Win Now', approval: isUser ? USER_APPROVAL : 58, history: [] },
    ownerMood: isUser ? USER_APPROVAL : 58,
    fanConfidence: isUser ? USER_APPROVAL : 58,
    ownerPatience80: OWNER_PATIENCE,
    gmStrategy: isUser ? 'neutral' : definition.ratingBase >= 79 ? 'buy' : definition.ratingBase <= 71 ? 'rebuild' : 'neutral',
    philosophy: 'maintain',
    draftPicks: [],
    rivalries: [],
    rivals: {},
    franchiseTag973: null,
    isUser,
    clinic: { xp: {}, perks: [] },
    skillSelections: {},
    tradeState: { gmTrustByTeam: {}, recentTrades: [] },
    txLog: [],
    seasonStats: createEmptySeasonStats(13),
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
    stadiumType: definition.id.endsWith('1') ? 'outdoor' : 'dome',
    franchiseIdentity: createDefaultFranchiseIdentity({ city: definition.city, stadiumType: definition.id.endsWith('1') ? 'outdoor' : 'dome' }),
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
  team.lockerRoom = initializeLockerRoom(team, () => DEFAULT_LOCKER_ROOM_ROLL);
  return team;
}

function createEmptyGameDayState(): GameState['gameDayState'] {
  return {
    recentPackages: [],
    latestPackageId: null,
  };
}

function createBaseState(userTeamId: string, rng: PrngFn): GameState {
  const teams: Record<string, Team> = {};
  const players: GameState['players'] = {};
  const owners: GameState['owners'] = {};

  for (const definition of TEAM_DEFINITIONS) {
    const team = createTeam(definition, definition.id === userTeamId);
    teams[team.id] = team;
    owners[team.ownerId] = createOwner(team.id);
    for (const player of team.roster) {
      players[player.id] = player;
    }
  }

  return {
    version: SAVE_VERSION,
    seed: Math.floor(rng() * 0xFFFFFFFF) >>> 0,
    year: SCENARIO_YEAR,
    week: SCENARIO_WEEK,
    phase: 'regular_season',
    difficulty: 'pro',
    settings: {
      halftimeDecisions: getDefaultHalftimeDecisionSetting('pro'),
    },
    players,
    teams,
    owners,
    schedule: [],
    draftClass: [],
    freeAgents: [],
    records: createEmptyRecordBook(),
    activeRecordChases: [],
    recentBrokenRecords: [],
    recentMilestones: [],
    awardsHistory: [],
    hallOfFame: [],
    allDecadeTeams: [],
    powerRankings: [],
    mediaCycle: {
      weeklyDigests: [],
      powerRankingHistory: [],
    },
    franchiseHistory: [],
    playerArchive: [],
    playerSeasonHistory: {},
    playerRivalries: [],
    farewellTours: [],
    endorsementOffers: [],
    leagueRules: initLeagueRules(SCENARIO_YEAR),
    cbaState: initCBA(SCENARIO_YEAR),
    commissionerState: initCommissioner(SCENARIO_YEAR),
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
      updatedYear: SCENARIO_YEAR,
      updatedWeek: SCENARIO_WEEK,
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
      currentStreak: 2,
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
    tutorialState: createDefaultTutorialState(false),
    agents: [],
    narrativeIntensity: {
      current: 58,
      recentBeats: [],
      cooldownWeeks: 0,
    },
    apologyTourThreads: [],
    ceremonies: [],
    dynastyTimeline: [],
    storylineThreads: [],
    storyArcs: [],
    achievements: [],
    dashboardState: createDefaultDashboardState(),
    seasonReports: [],
    gamePlan: null,
    opponentReports: [],
    draftRecaps: [],
    tradeSuggestions: [],
    postGameUi: {
      pressConferenceQueue: [],
      audioCueQueue: [],
      pendingHalftimeDecision: null,
    },
  } as GameState;
}

function setTeamRecord(team: Team, wins: number, losses: number) {
  const pointDifferential = (wins - losses) * 18 + (team.roster[0]?.ovr ?? 70) - 70;
  const pointsFor = 240 + wins * 14 + Math.max(0, pointDifferential);
  const pointsAgainst = pointsFor - pointDifferential;

  team.wins = wins;
  team.losses = losses;
  team.ties = 0;
  team.streak = wins > losses ? 2 : -1;
  team.seasonStats = {
    ...createEmptySeasonStats(wins + losses),
    pointsFor,
    pointsAgainst,
    pointDifferential,
    totalYards: 4300 + wins * 45,
    passingYards: 2700 + wins * 28,
    rushingYards: 1600 + wins * 17,
    turnoversLost: 13 - Math.max(0, wins - losses),
    turnoversForced: 12 + Math.max(0, wins - losses),
    sacksFor: 26 + wins,
    sacksAgainst: 18 + losses,
    drives: 145,
    thirdDownConversions: 74,
    thirdDownAttempts: 168,
    timeOfPossession: 392,
    fgMade: 24,
    fgAttempted: 29,
    punts: 48,
    pressuresAllowed: 31,
    yacYards: 520,
    redZoneTrips: 42,
    redZoneScores: 28,
  };
}

function assignStandings(game: GameState, userTeamId: string, rivalTeamId: string) {
  const userTeam = game.teams[userTeamId]!;
  const rivalTeam = game.teams[rivalTeamId]!;
  const sameConference = Object.values(game.teams)
    .filter((team) => team.conference === userTeam.conference && team.id !== userTeamId && team.id !== rivalTeamId)
    .sort((a, b) => (b.roster[0]?.ovr ?? 0) - (a.roster[0]?.ovr ?? 0) || a.id.localeCompare(b.id));
  const otherConference = Object.values(game.teams)
    .filter((team) => team.conference !== userTeam.conference)
    .sort((a, b) => (b.roster[0]?.ovr ?? 0) - (a.roster[0]?.ovr ?? 0) || a.id.localeCompare(b.id));

  setTeamRecord(userTeam, USER_WINS, USER_LOSSES);
  setTeamRecord(rivalTeam, RIVAL_WINS, RIVAL_LOSSES);

  sameConference.forEach((team, index) => {
    const record = CONFERENCE_RECORDS.sameConference[index] ?? [5, 8];
    setTeamRecord(team, record[0], record[1]);
  });
  otherConference.forEach((team, index) => {
    const record = CONFERENCE_RECORDS.otherConference[index] ?? [5, 8];
    setTeamRecord(team, record[0], record[1]);
  });
}

function pairRemainingTeams(teamIds: string[], weekOffset: number): Array<[string, string]> {
  const rotated = [...teamIds.slice(weekOffset), ...teamIds.slice(0, weekOffset)];
  const matchups: Array<[string, string]> = [];
  for (let index = 0; index < rotated.length / 2; index += 1) {
    matchups.push([rotated[index]!, rotated[rotated.length - 1 - index]!]);
  }
  return matchups;
}

function buildSchedule(game: GameState, userTeamId: string, rivalTeamId: string) {
  const allTeamIds = Object.keys(game.teams).sort();
  const remainingIds = allTeamIds.filter((teamId) => teamId !== userTeamId && teamId !== rivalTeamId);

  game.schedule = Array.from({ length: 5 }, (_, index) => {
    const week = SCENARIO_WEEK + index;
    const extraGames = pairRemainingTeams(remainingIds, index % remainingIds.length)
      .slice(0, remainingIds.length / 2)
      .map(([homeTeamId, awayTeamId]) => ({
        homeTeamId,
        awayTeamId,
        result: null,
        weather: null,
        flexed: false,
        primetime: false,
        broadcastNetwork: null,
      }));

    const featured = index === 0
      ? [{
        homeTeamId: userTeamId,
        awayTeamId: rivalTeamId,
        result: null,
        weather: 'clear' as const,
        flexed: true,
        primetime: true,
        broadcastNetwork: 'MFN' as const,
      }]
      : [];

    return {
      week,
      games: [...featured, ...extraGames],
    };
  });
}

function configureUserShowcase(game: GameState, userTeamId: string, rivalTeamId: string, rng: PrngFn) {
  const userTeam = game.teams[userTeamId]!;
  const rivalTeam = game.teams[rivalTeamId]!;
  const qb = userTeam.roster.find((player) => player.pos === 'QB')!;
  const rb = userTeam.roster.find((player) => player.pos === 'RB')!;
  const wr = userTeam.roster.find((player) => player.pos === 'WR')!;
  const rivalCb = rivalTeam.roster.find((player) => player.pos === 'CB')!;

  qb.traits = ['captain', 'clutch'];
  qb.stats.passYds = USER_QB_TARGET_PASSING;
  qb.stats.passTD = 29;
  qb.stats.passAtt = 462;
  qb.stats.passComp = 308;
  qb.stats.gamesPlayed = 13;
  qb.careerStats.passYds = 12_480;
  qb.careerStats.passTD = 91;
  qb.careerStats.passAtt = 1_462;
  qb.careerStats.passComp = 968;
  qb.careerStats.gp = 51;

  rb.traits = ['workhorse'];
  rb.stats.rushYds = USER_RB_TARGET_YARDS;
  rb.stats.rushAtt = 214;
  rb.stats.rushTD = 9;
  rb.stats.gamesPlayed = 13;
  rb.careerStats.rushYds = 4_920;
  rb.careerStats.rushAtt = 1_018;
  rb.careerStats.rushTD = 36;
  rb.careerStats.gp = 49;

  wr.traits = ['showtime'];
  wr.stats.rec = USER_WR_TARGET_RECEPTIONS;
  wr.stats.recYds = 1_082;
  wr.stats.recTD = 8;
  wr.stats.targets = 114;
  wr.stats.gamesPlayed = 13;
  wr.careerStats.rec = 254;
  wr.careerStats.recYds = 3_640;
  wr.careerStats.recTD = 24;
  wr.careerStats.targets = 382;
  wr.careerStats.gp = 46;

  rivalCb.traits = ['chip'];
  rivalCb.stats.defINT = 4;
  rivalCb.stats.tackles = 49;
  rivalCb.stats.gamesPlayed = 13;
  rivalCb.careerStats.defINT = 11;
  rivalCb.careerStats.tackles = 171;
  rivalCb.careerStats.gp = 48;

  userTeam.owner.approval = USER_APPROVAL;
  userTeam.ownerMood = USER_APPROVAL;
  userTeam.owner.history = [{
    year: SCENARIO_YEAR,
    week: SCENARIO_WEEK - 1,
    approval: USER_APPROVAL,
    delta: 3,
  }];

  const arcTitle = pickOne([
    'Division Crown Still in Reach',
    'December Pressure, Dynasty Stakes',
    'One Game Back With No Margin Left',
  ], rng);

  game.narrativeState.activeArcs = [{
    id: 'arc-2026-14-playoff-chase',
    template: 'revenge_game',
    playerId: qb.id,
    teamId: userTeam.id,
    stage: 2,
    title: arcTitle,
    summary: `${userTeam.city} is chasing ${rivalTeam.city} with a head-to-head showdown and a playoff spot hanging in the balance.`,
    startedYear: SCENARIO_YEAR,
    startedWeek: 11,
    updatedYear: SCENARIO_YEAR,
    updatedWeek: SCENARIO_WEEK,
    expiresAfterWeek: PLAYOFF_DEADLINE_WEEK,
    data: { rivalTeamId: rivalTeam.id },
  }];
  game.narrativeState.hooks = [{
    id: 'hook-2026-14-playoff-push',
    type: 'playoff_race',
    description: `${userTeam.city} is one game back in the division and the wild-card margin is a single loss.`,
    resolved: false,
    deadline: PLAYOFF_DEADLINE_WEEK,
  }];
  game.narrativeState.recentHeadlines = [CONVENTION_SAVE_METADATA.headline];

  game.playerRivalries = [{
    id: 'rivalry-user-qb-vs-rival-cb',
    playerAId: qb.id,
    playerBId: rivalCb.id,
    playerAName: qb.name,
    playerBName: rivalCb.name,
    teamAId: userTeam.id,
    teamBId: rivalTeam.id,
    intensity: 67,
    tier: 'heated',
    origin: 'Week 14 division race collision',
    history: [{
      year: SCENARIO_YEAR,
      week: 9,
      description: `${rivalCb.name} baited ${qb.name} into a late interception that flipped the first meeting.`,
      intensityDelta: 12,
    }],
    seasonStarted: SCENARIO_YEAR,
  }];
  userTeam.rivalries = [{
    teamId: rivalTeam.id,
    heat: 72,
    trophyName: null,
    history: [{
      year: SCENARIO_YEAR,
      week: 8,
      winner: rivalTeam.id,
      score: `${rivalTeam.city} 24, ${userTeam.city} 20`,
    }],
  }];
  rivalTeam.rivalries = [{
    teamId: userTeam.id,
    heat: 72,
    trophyName: null,
    history: [{
      year: SCENARIO_YEAR,
      week: 8,
      winner: rivalTeam.id,
      score: `${rivalTeam.city} 24, ${userTeam.city} 20`,
    }],
  }];
  userTeam.rivals = { [rivalTeam.id]: { heat: 72 } };
  rivalTeam.rivals = { [userTeam.id]: { heat: 72 } };
  game.leagueRivalries = [{
    id: 'league-rivalry-afce1-afce2',
    teamA: userTeam.id,
    teamB: rivalTeam.id,
    intensity: 72,
    isDivision: true,
    history: ['Split the last two meetings by a combined six points.'],
    lastMetYear: SCENARIO_YEAR,
    lastMetWeek: 8,
  }];

  game.handshakes = [{
    id: 'owner-playoff-push',
    type: 'owner',
    promiseText: 'Make the playoffs and keep the dynasty window open.',
    targetId: userTeam.ownerId,
    teamId: userTeam.id,
    madeYear: SCENARIO_YEAR,
    madeWeek: SCENARIO_WEEK,
    deadline: { year: SCENARIO_YEAR, week: PLAYOFF_DEADLINE_WEEK },
    condition: { metric: 'playoff', target: true },
    status: 'active',
    consequence: 'Miss it, and ownership patience drops fast.',
  }];

  game.leagueNews = [
    {
      id: 'convention-news-1',
      year: SCENARIO_YEAR,
      week: SCENARIO_WEEK,
      type: 'record',
      headline: `${userTeam.city} enters Week 14 with the division still in play`,
      body: `${userTeam.city} sits at ${USER_WINS}-${USER_LOSSES}, one game behind ${rivalTeam.city} and shoulder-to-shoulder with the wild-card pack.`,
      teamIds: [userTeam.id, rivalTeam.id],
      playerIds: [qb.id],
      importance: 'breaking',
    },
    {
      id: 'convention-news-2',
      year: SCENARIO_YEAR,
      week: SCENARIO_WEEK,
      type: 'rivalry',
      headline: `${qb.name} and ${rivalCb.name} bring bad blood into primetime`,
      body: `${qb.name} is closing on another statement year, but ${rivalCb.name} still owns the defining turnover from the first meeting.`,
      teamIds: [userTeam.id, rivalTeam.id],
      playerIds: [qb.id, rivalCb.id],
      importance: 'major',
    },
  ];

  game.socialFeed = [{
    id: 'social-2026-14-playoff-race',
    source: 'analyst',
    authorName: 'MFSN Playoff Desk',
    content: `${userTeam.city} vs ${rivalTeam.city} is the swing game of the week. Division title odds move hard either way tonight.`,
    trigger: 'weekly',
    sentiment: 'positive',
    likes: 420 + Math.floor(rng() * 80),
    timestamp: SCENARIO_WEEK,
  }];
}

function configureUpcomingGamePlan(game: GameState, userTeamId: string, rivalTeamId: string) {
  const userTeam = game.teams[userTeamId]!;
  const rivalTeam = game.teams[rivalTeamId]!;
  const report = generateOpponentScouting(game, userTeamId, rivalTeamId);
  const userQb = userTeam.roster.find((player) => player.pos === 'QB')!;
  const rivalCb = rivalTeam.roster.find((player) => player.pos === 'CB')!;

  game.opponentReports = [report];
  game.gamePlan = {
    offensiveScheme: report.schemeRecommendation.offense,
    defensiveScheme: report.schemeRecommendation.defense,
    keyMatchup: { playerA: userQb.id, playerB: rivalCb.id },
    gamePlanBonus: 4,
    contingencyRules: [{
      id: 'conv-trailing-half',
      trigger: 'trailing_7_at_half',
      action: { type: 'go_aggressive' },
      label: 'Open the throttle at halftime',
      description: 'If trailing by one score or more after halftime, speed up and attack.',
    }],
  };
}

export function generateConventionSave(teamId: string, rng: PrngFn): GameState {
  const definition = teamDefinition(teamId);
  if (!definition) {
    throw new Error(`Unknown convention save team: ${teamId}`);
  }

  const game = createBaseState(teamId, rng);
  const rivalTeamId = TEAM_DEFINITIONS.find((entry) =>
    entry.id !== teamId &&
    entry.conference === definition.conference &&
    entry.division === definition.division)?.id;

  if (!rivalTeamId) {
    throw new Error(`Could not find division rival for ${teamId}`);
  }

  assignStandings(game, teamId, rivalTeamId);
  buildSchedule(game, teamId, rivalTeamId);
  configureUserShowcase(game, teamId, rivalTeamId, rng);
  configureUpcomingGamePlan(game, teamId, rivalTeamId);

  const parsed = SaveStateSchema.safeParse(game);
  if (!parsed.success) {
    throw new Error(`Convention save validation failed: ${parsed.error.message}`);
  }

  return game;
}
