/**
 * Seed data factory — generates a realistic initial GameState.
 *
 * Uses the engine's RNG module so saves are reproducible from the same seed.
 */
import type {
  GameState, Player, Team, Contract, Owner, OwnerState,
  PlayerRatings, Personality, PlayerSeasonStats, CareerStats,
  TeamStaff, StaffMember, ClinicState, TradeState, DraftPick,
  CoachingStaff, Coach, FrontOffice, NarrativeState,
  DifficultyLevel, Position, DeadCapByYear,
} from '@mfd/engine';
import {
  setSeed, uid, rng, pick,
  ALL_POSITIONS, POS_DEF, getSalaryCap,
  makeContract, initOwner, OWNER_ARCHETYPES,
  generatePersonality, SAVE_VERSION, createEmptySeasonStats,
  CONTRACT_VALUE_TABLE, AGE_VALUE_CURVE, MIN_SALARY, emptyPlayerStats,
  createDefaultScoutingDepartment,
  createDefaultDifficultyState,
  createDefaultNarrativeIntensity,
  createDefaultTutorialState,
  createDefaultAchievements,
  createDefaultDashboardState,
  createSetupState,
  createDefaultFranchiseIdentity,
  createFacilityState,
  buildSeasonSchedule,
  buildSpecialTeamsState,
  getDefaultHalftimeDecisionSetting,
  initCBA,
  initCommissioner,
  initLaborState,
  initLeagueRules,
  ensureAgentsInitialized,
  initializeFranchiseIdentity,
  initializeLockerRoom,
  assignJerseyNumber,
  syncAllPlayerArchiveEntries,
} from '@mfd/engine';
import { createEmptyRecordBook } from '@mfd/engine';

// ── Name pools ─────────────────────────────────────────────

const FIRST_NAMES = [
  'James', 'Marcus', 'Tyrell', 'Devon', 'Khalil', 'Isaiah', 'Darius',
  'Malik', 'Andre', 'Jaylen', 'Terrance', 'DeAndre', 'Lamar', 'Jalen',
  'Cam', 'Justin', 'Caleb', 'Trevor', 'Kyler', 'Tua', 'Patrick',
  'Josh', 'Joe', 'Dak', 'Derek', 'Brock', 'CJ', 'Drake', 'Bryce',
  'Anthony', 'Christian', 'Derrick', 'Nick', 'Micah', 'TJ', 'Myles',
  'Aaron', 'Davante', 'Tyreek', 'Stefon', 'AJ', 'Ja\'Marr', 'Amon-Ra',
  'Saquon', 'Jonathan', 'Breece', 'Kenneth', 'Travis', 'George', 'Mark',
  'Trent', 'Penei', 'Rashawn', 'Laremy',
];

const LAST_NAMES = [
  'Williams', 'Johnson', 'Smith', 'Brown', 'Jones', 'Davis', 'Wilson',
  'Jackson', 'Thomas', 'Anderson', 'Taylor', 'Moore', 'Robinson', 'Clark',
  'Lewis', 'Walker', 'Hall', 'Young', 'Allen', 'King', 'Wright',
  'Hill', 'Scott', 'Green', 'Adams', 'Baker', 'Nelson', 'Carter',
  'Mitchell', 'Campbell', 'Roberts', 'Turner', 'Phillips', 'Parker',
  'Evans', 'Edwards', 'Collins', 'Stewart', 'Morris', 'Parsons',
  'Hutchinson', 'Garrett', 'Kelce', 'Andrews', 'Sewell', 'Slater',
  'Chase', 'Jefferson', 'Lamb', 'Henry', 'Barkley', 'McCaffrey',
];

const COLLEGES = [
  'Alabama', 'Ohio State', 'Georgia', 'Clemson', 'LSU', 'Michigan',
  'Oklahoma', 'USC', 'Texas', 'Penn State', 'Oregon', 'Notre Dame',
  'Florida', 'Auburn', 'Tennessee', 'Miami', 'Wisconsin', 'Iowa',
  'Stanford', 'Washington', 'Colorado', 'Ole Miss', 'Florida State',
];

const TEAM_DEFS = [
  // AFC East — Northeast corridor
  { city: 'New York',       name: 'Concrete Jungle Cabbies',              abbr: 'NYC', conf: 'AFC' as const, div: 'East' },
  { city: 'Boston',         name: 'Hub of the Universe Chowderheads',     abbr: 'BOS', conf: 'AFC' as const, div: 'East' },
  { city: 'Philadelphia',   name: 'City of Brotherly Love Bell-Ringers',  abbr: 'PHI', conf: 'AFC' as const, div: 'East' },
  { city: 'Baltimore',      name: 'Charm City Crab Pickers',              abbr: 'BAL', conf: 'AFC' as const, div: 'East' },
  // AFC North — Rust Belt / Great Lakes
  { city: 'Pittsburgh',     name: 'Steel City Iron Smelters',             abbr: 'PIT', conf: 'AFC' as const, div: 'North' },
  { city: 'Cleveland',      name: 'Forest City Rockers',                  abbr: 'CLE', conf: 'AFC' as const, div: 'North' },
  { city: 'Cincinnati',     name: 'Porkopolis Flying Pigs',               abbr: 'CIN', conf: 'AFC' as const, div: 'North' },
  { city: 'Columbus',       name: 'Cowtown Astronauts',                   abbr: 'COL', conf: 'AFC' as const, div: 'North' },
  // AFC South — Texas / South Central
  { city: 'Houston',        name: 'Brisket Spaceships',                   abbr: 'HOU', conf: 'AFC' as const, div: 'South' },
  { city: 'Dallas',         name: 'Pegasus Rodeos',                       abbr: 'DAL', conf: 'AFC' as const, div: 'South' },
  { city: 'San Antonio',    name: 'Puroville Rivers',                     abbr: 'SA',  conf: 'AFC' as const, div: 'South' },
  { city: 'Nashville',      name: 'Buckle of the Bible Belt',             abbr: 'NSH', conf: 'AFC' as const, div: 'South' },
  // AFC West — Plains / Mountain / Desert
  { city: 'Kansas City',    name: 'BBQ Fountains',                        abbr: 'KC',  conf: 'AFC' as const, div: 'West' },
  { city: 'Denver',         name: 'Wall Street of the West',              abbr: 'DEN', conf: 'AFC' as const, div: 'West' },
  { city: 'Las Vegas',      name: 'Sin City Cardsharks',                  abbr: 'LV',  conf: 'AFC' as const, div: 'West' },
  { city: 'Phoenix',        name: 'Valley of the Sun Grand Canyons',      abbr: 'PHX', conf: 'AFC' as const, div: 'West' },
  // NFC East — Southeast
  { city: 'Washington',     name: 'Bi-Partisan Filibusters',              abbr: 'DC',  conf: 'NFC' as const, div: 'East' },
  { city: 'Charlotte',      name: 'Queen City Bootleggers',               abbr: 'CLT', conf: 'NFC' as const, div: 'East' },
  { city: 'Atlanta',        name: 'Empire City of the South Peaches',     abbr: 'ATL', conf: 'NFC' as const, div: 'East' },
  { city: 'Miami',          name: 'Sunny Place for Shady People',         abbr: 'MIA', conf: 'NFC' as const, div: 'East' },
  // NFC North — Great Lakes / Midwest
  { city: 'Chicago',        name: 'City of Broad Shoulders Deep-Dish',    abbr: 'CHI', conf: 'NFC' as const, div: 'North' },
  { city: 'Detroit',        name: 'Motown Music Machine',                 abbr: 'DET', conf: 'NFC' as const, div: 'North' },
  { city: 'Minneapolis',    name: 'Juicy-Lucy Lakers',                    abbr: 'MIN', conf: 'NFC' as const, div: 'North' },
  { city: 'St. Louis',      name: 'Gateway to the West Toasted Raviolis', abbr: 'STL', conf: 'NFC' as const, div: 'North' },
  // NFC South — Florida + Indy
  { city: 'Tampa Bay',      name: 'The Big Guava Pirates',                abbr: 'TB',  conf: 'NFC' as const, div: 'South' },
  { city: 'Orlando',        name: 'Theme Park Capital Rollercoasters',    abbr: 'ORL', conf: 'NFC' as const, div: 'South' },
  { city: 'Jacksonville',   name: 'Bold New City Swamps',                 abbr: 'JAX', conf: 'NFC' as const, div: 'South' },
  { city: 'Indianapolis',   name: 'Nap Town Speed Racers',                abbr: 'IND', conf: 'NFC' as const, div: 'South' },
  // NFC West — Pacific Coast
  { city: 'Los Angeles',    name: 'La-La Land Traffic Jams',              abbr: 'LA',  conf: 'NFC' as const, div: 'West' },
  { city: 'San Francisco',  name: 'City by the Bay Sourdoughs',           abbr: 'SF',  conf: 'NFC' as const, div: 'West' },
  { city: 'Seattle',        name: 'Emerald City Grunge',                  abbr: 'SEA', conf: 'NFC' as const, div: 'West' },
  { city: 'San Diego',      name: "America's Finest City Surfers",        abbr: 'SD',  conf: 'NFC' as const, div: 'West' },
];

// ── Position roster template (53-man distribution) ─────────

const ROSTER_TEMPLATE: { pos: Position; count: number; starterCount: number }[] = [
  { pos: 'QB', count: 3, starterCount: 1 },
  { pos: 'RB', count: 4, starterCount: 1 },
  { pos: 'WR', count: 6, starterCount: 3 },
  { pos: 'TE', count: 3, starterCount: 1 },
  { pos: 'OL', count: 9, starterCount: 5 },
  { pos: 'DL', count: 7, starterCount: 4 },
  { pos: 'LB', count: 7, starterCount: 3 },
  { pos: 'CB', count: 6, starterCount: 3 },
  { pos: 'S',  count: 5, starterCount: 2 },
  { pos: 'K',  count: 1, starterCount: 1 },
  { pos: 'P',  count: 1, starterCount: 1 },
];
// Total: 52 (K+P fill spots 52-53, close enough for a 53-man)

const OFF_SCHEME_IDS = ['spread', 'west_coast', 'power_run', 'air_raid', 'rpo'];
const DEF_SCHEME_IDS = ['cover_3', 'cover_2', 'man_press', 'hybrid_34', 'tampa_2'];
const DOME_CITIES = new Set(['Indianapolis', 'Houston', 'Atlanta', 'Detroit', 'Minneapolis', 'Phoenix', 'Dallas', 'Las Vegas', 'San Antonio']);

// ── Helpers ────────────────────────────────────────────────

function genRatings(pos: Position, ovr: number): PlayerRatings {
  const base: PlayerRatings = {};
  const posDef = POS_DEF[pos];
  if (posDef?.r) {
    for (const r of posDef.r) {
      base[r] = Math.max(40, Math.min(99, ovr + rng(-12, 12)));
    }
  }
  // Fallback ratings every player has
  base.speed = Math.max(40, Math.min(99, ovr + rng(-10, 5)));
  base.stamina = Math.max(50, Math.min(99, ovr + rng(-8, 8)));
  base.awareness = Math.max(40, Math.min(99, ovr + rng(-15, 10)));
  return base;
}

function genStats(): PlayerSeasonStats {
  return emptyPlayerStats();
}

function genCareerStats(yoe: number): CareerStats {
  return { seasons: yoe, gp: yoe * rng(12, 17), snaps: yoe * rng(400, 900) };
}

function genPlayer(
  pos: Position,
  teamId: string,
  isStarter: boolean,
  year: number,
): Player {
  const firstName = FIRST_NAMES[rng(0, FIRST_NAMES.length - 1)]!;
  const lastName = LAST_NAMES[rng(0, LAST_NAMES.length - 1)]!;
  const age = isStarter ? rng(23, 31) : rng(22, 28);
  const yoe = Math.max(0, age - 22);
  const baseOvr = isStarter ? rng(72, 92) : rng(58, 75);
  const pot = Math.min(99, baseOvr + rng(0, 15));
  const devTraits = ['normal', 'normal', 'normal', 'star', 'star', 'superstar', 'x-factor'] as const;
  const devTrait = devTraits[rng(0, devTraits.length - 1)]!;

  // Position-based salary using the engine's CONTRACT_VALUE_TABLE + age curve
  const table = CONTRACT_VALUE_TABLE[pos];
  const tier = isStarter ? (baseOvr >= 85 ? 'elite' : 'starter') : 'backup';
  const baseSal = table[tier];
  const ageIdx = Math.min(Math.max(age - 21, 0), 17);
  const ageMult = (AGE_VALUE_CURVE[pos] ?? AGE_VALUE_CURVE.WR)[ageIdx] ?? 0.8;
  // ±20% variance keeps rosters distinct
  const variance = 1 + (rng(-20, 20) / 100);
  const salary = Math.round(Math.max(MIN_SALARY, baseSal * ageMult * variance) * 10) / 10;
  const contractYears = rng(1, 5);

  const id = uid();
  const contract = makeContract(salary, contractYears, salary * 0.3, salary * 0.5, id, teamId);

  return {
    id,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    pos,
    age,
    ovr: baseOvr,
    pot,
    ratings: genRatings(pos, baseOvr),
    devTrait,
    personality: generatePersonality(pos, age, devTrait),
    traits: [],
    archetype: null,
    contract,
    teamId,
    draftYear: year - yoe,
    draftRound: isStarter ? rng(1, 3) : rng(3, 7),
    draftPick: rng(1, 32),
    college: COLLEGES[rng(0, COLLEGES.length - 1)]!,
    yearsExp: yoe,
    careerStats: genCareerStats(yoe),
    traitMilestones: {},
    traitPowerLevel: {},
    injury: null,
    morale: rng(50, 90),
    chemistry: rng(40, 85),
    systemFit: rng(50, 90),
    cliqueId: null,
    jerseyNumber: 0,
    endorsements: [],
    isStarter,
    role: isStarter ? 'Starter' : 'Backup',
    roleWeeks: rng(0, 40),
    tradeBlock: false,
    holdout: false,
    agentId: null,
    stats: genStats(),
  };
}

function genDraftPicks(teamId: string, year: number): DraftPick[] {
  return Array.from({ length: 7 }, (_, i) => ({
    round: i + 1,
    pick: rng(1, 32),
    originalTeamId: teamId,
    currentTeamId: teamId,
    year,
    isCompPick: false,
  }));
}

function genCoach(role: 'HC' | 'OC' | 'DC'): StaffMember {
  const firstName = FIRST_NAMES[rng(0, FIRST_NAMES.length - 1)]!;
  const lastName = LAST_NAMES[rng(0, LAST_NAMES.length - 1)]!;
  return {
    id: uid(),
    name: `${firstName} ${lastName}`,
    role,
    archetype: role === 'HC' ? 'balanced' : role === 'OC' ? 'spread' : 'zone',
    traits: [],
    ratings: { gameplan: rng(60, 90), development: rng(55, 85), motivation: rng(50, 85) },
    level: rng(1, 5),
    age: rng(36, 64),
    term: role === 'HC' ? 4 : 3,
    buyoutPenalty: role === 'HC' ? 3 : 2,
    loyalty: rng(4, 8),
    ambition: rng(4, 8),
    schemeLean: {
      offense: pick(OFF_SCHEME_IDS),
      defense: pick(DEF_SCHEME_IDS),
    },
    lastHiredYear: 2026,
  };
}

function genTeam(
  def: typeof TEAM_DEFS[number],
  year: number,
  isUser: boolean,
): { team: Team; players: Player[] } {
  const teamId = uid();
  const players: Player[] = [];

  for (const slot of ROSTER_TEMPLATE) {
    for (let i = 0; i < slot.count; i++) {
      players.push(genPlayer(slot.pos, teamId, i < slot.starterCount, year));
    }
  }

  // KC BBQ Fountains: league's premier franchise — elite young QB, dominant DE, best OL/WR corps
  if (def.abbr === 'KC') {
    const qb = players.find(p => p.pos === 'QB' && p.isStarter)!;
    qb.age = 23; qb.ovr = 97; qb.pot = 99; qb.yearsExp = 1; qb.draftYear = year - 1;
    qb.draftRound = 1; qb.draftPick = 1; qb.devTrait = 'x-factor';
    qb.ratings = genRatings('QB', 97);
    qb.careerStats = genCareerStats(1);

    const de = players.find(p => p.pos === 'DL' && p.isStarter)!;
    de.age = 25; de.ovr = 98; de.pot = 99; de.yearsExp = 3; de.draftYear = year - 3;
    de.draftRound = 1; de.draftPick = 2; de.devTrait = 'x-factor';
    de.ratings = genRatings('DL', 98);
    de.careerStats = genCareerStats(3);

    for (const p of players) {
      if (p.pos === 'OL' && p.isStarter) {
        p.ovr = Math.max(p.ovr, rng(88, 94)); p.pot = Math.min(99, p.ovr + rng(2, 8));
        p.ratings = genRatings('OL', p.ovr); p.devTrait = 'star';
      }
      if (p.pos === 'WR' && p.isStarter) {
        p.ovr = Math.max(p.ovr, rng(87, 93)); p.pot = Math.min(99, p.ovr + rng(2, 8));
        p.ratings = genRatings('WR', p.ovr); p.devTrait = 'star';
      }
    }
  }

  let capUsed = players.reduce((s, p) => s + (p.contract ? p.contract.totalValue / p.contract.years : 0), 0);
  const capTotal = getSalaryCap(year);

  // Cap enforcement: if over 95% of cap, scale all contracts down proportionally
  const capTarget = capTotal * 0.95;
  if (capUsed > capTarget) {
    const scale = capTarget / capUsed;
    for (const p of players) {
      if (p.contract) {
        const newSal = Math.round(Math.max(MIN_SALARY, p.contract.baseSalary * scale) * 10) / 10;
        p.contract = makeContract(newSal, p.contract.years, newSal * 0.3, newSal * 0.5, p.id, teamId);
      }
    }
    capUsed = players.reduce((s, p) => s + (p.contract ? p.contract.totalValue / p.contract.years : 0), 0);
  }

  const ownerState = initOwner();
  const offScheme = OFF_SCHEME_IDS[rng(0, OFF_SCHEME_IDS.length - 1)]!;
  const defScheme = DEF_SCHEME_IDS[rng(0, DEF_SCHEME_IDS.length - 1)]!;

  const team: Team = {
    id: teamId,
    city: def.city,
    name: def.name,
    abbr: def.abbr,
    icon: def.abbr.toLowerCase(),
    conference: def.conf,
    division: def.div,
    roster: players,
    capSpace: Math.round((capTotal - capUsed) * 10) / 10,
    capUsed: Math.round(capUsed * 10) / 10,
    deadCap: 0,
    deadCapByYear: {} as DeadCapByYear,
    wins: 0,
    losses: 0,
    ties: 0,
    streak: 0,
    offScheme,
    defScheme,
    schemeOff: offScheme,
    schemeDef: defScheme,
    coachingStaff: { hc: null, oc: null, dc: null },
    staff: {
      hc: genCoach('HC'),
      oc: genCoach('OC'),
      dc: genCoach('DC'),
    },
    ownerId: uid(),
    owner: ownerState,
    ownerMood: 70,
    fanConfidence: 70,
    ownerPatience80: 80,
    gmStrategy: 'neutral',
    philosophy: 'maintain',
    draftPicks: genDraftPicks(teamId, year + 1),
    rivalries: [],
    rivals: {},
    franchiseTag973: null,
    franchiseTags: [],
    isUser,
    clinic: { xp: {}, perks: [] },
    skillSelections: {},
    tradeState: { gmTrustByTeam: {}, recentTrades: [] },
    txLog: [],
    seasonStats: createEmptySeasonStats(),
    mentoringPairs: [],
    trainingAssignments: {},
    medicalStaff: null,
    fatigueState: {},
    facilityState: createFacilityState(ownerState.archetypeId, !isUser, () => rng(0, 1000) / 1000),
    practiceSquad: [],
    stadiumType: DOME_CITIES.has(def.city) ? 'dome' : 'outdoor',
    franchiseIdentity: createDefaultFranchiseIdentity({
      city: def.city,
      stadiumType: DOME_CITIES.has(def.city) ? 'dome' : 'outdoor',
    }),
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
  };
  for (const player of players) {
    assignJerseyNumber(team, player);
  }
  team.specialTeams = buildSpecialTeamsState(team);
  team.franchiseIdentity = initializeFranchiseIdentity(team, () => rng(0, 1000) / 1000);
  team.lockerRoom = initializeLockerRoom(team, () => rng(0, 1000) / 1000);

  return { team, players };
}

// ── Main factory ───────────────────────────────────────────

export function createSeedGameState(
  seed: number,
  userTeamIndex: number = 0,
  difficulty: DifficultyLevel = 'pro',
): GameState {
  setSeed(seed);

  const year = 2026;
  const allPlayers: Record<string, Player> = {};
  const allTeams: Record<string, Team> = {};
  const allOwners: Record<string, Owner> = {};
  const teamIds: string[] = [];
  const leagueRules = initLeagueRules(year);

  for (let i = 0; i < TEAM_DEFS.length; i++) {
    const def = TEAM_DEFS[i]!;
    const isUser = i === userTeamIndex;
    const { team, players } = genTeam(def, year, isUser);

    allTeams[team.id] = team;
    teamIds.push(team.id);

    for (const p of players) {
      allPlayers[p.id] = p;
    }

    allOwners[team.ownerId] = {
      id: team.ownerId,
      name: `Owner of ${def.city}`,
      archetype: team.owner.archetypeId,
      patience: rng(40, 90),
      goals: { floor: 'Winning record', target: 'Playoff berth', ceiling: 'Championship' },
      personality: { spending: rng(3, 9), patience: rng(3, 9), mediaAwareness: rng(2, 8) },
    };
  }

  const schedule = buildSeasonSchedule(teamIds, year, { leagueRules } as GameState);

  const frontOffice: FrontOffice = {
    xp: 0,
    level: 1,
    achievements: [],
    perks: [],
    reputation: { players: 50, media: 50, owner: 60 },
  };

  const narrativeState: NarrativeState = {
    activeArcs: [],
    hooks: [],
    recentHeadlines: [
      'Training camp opens across the league',
      'New coaching hires look to make an impact',
      'Preseason predictions have the league buzzing',
    ],
  };

  const gameDayState = {
    recentPackages: [],
    latestPackageId: null,
  };

  const gameState: GameState = {
    version: SAVE_VERSION,
    seed,
    year,
    week: 1,
    phase: 'preseason',
    difficulty,
    settings: {
      halftimeDecisions: getDefaultHalftimeDecisionSetting(difficulty),
    },
    players: allPlayers,
    teams: allTeams,
    owners: allOwners,
    schedule,
    draftClass: [],
    freeAgents: [],
    records: createEmptyRecordBook(),
    activeRecordChases: [],
    recentBrokenRecords: [],
    recentMilestones: [],
    awardsHistory: [],
    hallOfFame: [],
    ballotWaitlist: [],
    ballotEliminatedIds: [],
    allDecadeTeams: [],
    powerRankings: [],
    franchiseHistory: [],
    playerArchive: [],
    playerSeasonHistory: {},
    playerRivalries: [],
    farewellTours: [],
    endorsementOffers: [],
    leagueRules,
    cbaState: initCBA(year),
    commissionerState: initCommissioner(year),
    laborState: initLaborState(),
    frontOffice,
    eventLog: [],
    narrativeState,
    offFieldEvents: [],
    recentPressConferences: [],
    coachingHistory: [],
    leagueRivalries: [],
    activeEffects: [],
    gameDayState,
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
      updatedYear: year,
      updatedWeek: 1,
      hotSeat: false,
      candidates: { HC: [], OC: [], DC: [] },
    },
    weeklyPrepPlans: {},
    weeklyPrepHistory: [],
    filmRoomHistory: [],
    difficultyState: createDefaultDifficultyState(),
    availableMedicalStaff: [],
    playoffMomentum: {},
    scoutingDepartment: createDefaultScoutingDepartment(),
    conditionalPicks: [],
    waiverOrder: [...teamIds],
    waiverWire: [],
    waiverClaims: [],
    waiverResults: [],
    handshakes: [],
    tutorialState: createDefaultTutorialState(true),
    agents: [],
    narrativeIntensity: createDefaultNarrativeIntensity(),
    apologyTourThreads: [],
    ceremonies: [],
    dynastyTimeline: [],
    storyArcs: [],
    achievements: createDefaultAchievements(),
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
    breakingNewsQueue: [],
    ownerPersonalityInbox: [],
    commissionerDisciplineLog: [],
    earnedDoctrines: [],
    seasonNearMissReceipts: [],
    setupState: createSetupState(),
  };

  ensureAgentsInitialized(gameState);
  syncAllPlayerArchiveEntries(gameState, year);
  return gameState;
}

/** Get the team definitions for team selection UI */
export function getTeamOptions() {
  return TEAM_DEFS.map((d, i) => ({
    index: i,
    city: d.city,
    name: d.name,
    abbr: d.abbr,
    icon: d.abbr.toLowerCase(),
    conference: d.conf,
    division: d.div,
    fullName: `${d.city} ${d.name}`,
  }));
}
