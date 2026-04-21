import type {
  Achievement,
  AchievementProgress,
  AgentProfile,
  AllDecadeTeam,
  ApologyTourThread,
  AwardsHistoryEntry,
  BrokenRecord,
  BroadcastOutput,
  CBAState,
  CapCandidate,
  CapHealthReport,
  CapProjectionYear,
  CareerLeader,
  CareerTimeline,
  Ceremony,
  CommissionerRuling,
  CommissionerState,
  CoachingMarketState,
  ConditionalPick,
  ContractExtensionRecord,
  FATargetBoard,
  DashboardState,
  DifficultyState,
  DraftTradeOffer,
  ExpansionDraftState,
  DraftRecap,
  DraftOrderEntry,
  DraftProspect,
  DynastyEvent,
  EndorsementDeal,
  FacilityState,
  FarewellTour,
  FranchiseDashboard,
  FranchiseEra,
  FranchiseLegend,
  GameEvent,
  GameDayPackage,
  GameDayState,
  GameResult,
  GameState,
  GamePlan,
  HallOfFameEntry,
  JerseyRetirement,
  LaborState,
  LeagueAverageEntry,
  LeagueRuleHistoryGroup,
  LeagueRules,
  LockerRoomState,
  LeagueRivalry,
  MentoringPair,
  MedicalStaff,
  MilestoneReached,
  MultiYearProjection,
  NewsItem,
  OffseasonState,
  OffFieldEvent,
  OpponentIntel,
  OpponentReport,
  NarrativeIntensity,
  PracticeSquadPlayer,
  Player,
  PlayerComparison,
  PlayerProfile,
  PlayerProjection,
  PlayerRivalry,
  PlayerValue,
  Position,
  PositionRanking,
  PowerRanking,
  PressConference,
  PositionGroup,
  RecordBook,
  RecordChase,
  RecordEntry,
  RuleDiff,
  RuleProposal,
  RivalryGameContext,
  ScoutingDepartment,
  ScenarioDefinition,
  ScenarioState,
  SeasonPhase,
  SeasonReport,
  SocialPost,
  SpecialTeamsState,
  SchemeInstallState,
  StoryArc,
  StatLeaderEntry,
  Team,
  TeamNeedsComparisonEntry,
  TeamNeedsReport,
  TeamSeasonSummary,
  TradeDeadlineState,
  TradeSuggestion,
  TradeProposal,
  TransactionLogEntry,
  TutorialState,
  TradeOffer,
  TrainingAssignment,
  WaiverClaim,
  WaiverRunResult,
  WaiverWireEntry,
  WeatherCondition,
  WarRoomState,
  WeeklyPrepPlan,
  WeeklySummary,
  Handshake,
  FilmRoomReport,
  StadiumDeal,
} from '@mfd/engine';
import type { SetupState, SetupPhase, SetupDecisions } from '@mfd/engine';
import {
  analyzeTeamNeeds,
  buildFranchiseDashboard,
  buildCoachingMarket,
  buildDraftWarRoomState,
  buildFATargetBoard,
  buildLeagueAverageByGroup,
  buildMultiYearProjection,
  buildOpponentIntel,
  buildPlayerProfile,
  comparePlayerCareers,
  detectRetirementCandidates,
  capProjection,
  checkIncentives,
  buildPlayoffPicture,
  calculateAdvancedStats,
  canRelocate,
  createDefaultDashboardState,
  createDefaultSpecialTeamsState,
  diffRules,
  detectFranchiseEras,
  generateBroadcast,
  generateOpponentScouting,
  getAchievementProgress,
  getAvailableScenarios,
  getAnalyticsStatLeaders,
  getCapHealth,
  getCareerLeaders,
  getDecadeNarrative,
  getFullSchedule,
  PHASE_ORDER,
  getLeagueAverages,
  getPlayerComparables,
  getPlayerCareerTimeline,
  getPlayerProjection,
  getPlayerValue,
  getPositionRankings,
  getFranchiseLegends,
  getEndorsementRevenue,
  getActiveRivalries,
  getUnionLeader,
  getStoredOpponentReport,
  getPlayerComparison,
  getCooldownStatus,
  getPlayerAgent,
  getStatLeaderboard,
  getTeamSeasonHistory,
  initLeagueRules,
  identifyCapCandidates,
  LEAGUE_RULE_DEFINITIONS,
  getRelocationDestinations,
  getTeamRankings,
  getWeekSchedule as getWeekScheduleEntries,
  getWeeklyTrend,
  createDefaultNarrativeIntensity,
  createDefaultTutorialState,
  createDefaultDifficultyState,
  createEmptyRecordBook,
  getDivisionStandings,
  getRecentNews,
  getWorkloadReport,
  getRivalryGameContext,
  getStatLeaders,
  getTeamNews,
  getRetiredJerseys,
  mulberry32,
  projectSchemeTransition,
} from '@mfd/engine';

export interface GameStoreState {
  game: GameState | null;
  initialized: boolean;
  undoSnapshot: GameState | null;
  undoLabel: string | null;
  recapPromptSeenThisSession: boolean;
}

// Stable empty arrays — prevents infinite re-renders when selectors
// would otherwise return a new [] reference every call.
const EMPTY_PLAYERS: Player[] = [];
const EMPTY_ROSTER: Player[] = [];
const EMPTY_SCHEDULE: never[] = [];
const EMPTY_AGENTS: AgentProfile[] = [];
const EMPTY_ARCS: StoryArc[] = [];
const EMPTY_PROSPECTS: DraftProspect[] = [];
const EMPTY_TRADES: TradeOffer[] = [];
const EMPTY_PROPOSALS: TradeProposal[] = [];
const EMPTY_NEWS: NewsItem[] = [];
const EMPTY_AWARDS: AwardsHistoryEntry[] = [];
const EMPTY_CEREMONIES: Ceremony[] = [];
const EMPTY_DYNASTY_EVENTS: DynastyEvent[] = [];
const EMPTY_HALL_OF_FAME: HallOfFameEntry[] = [];
const EMPTY_POWER_RANKINGS: PowerRanking[] = [];
const EMPTY_MENTORING: MentoringPair[] = [];
const EMPTY_OFF_FIELD_EVENTS: OffFieldEvent[] = [];
const EMPTY_PRESS_CONFERENCES: PressConference[] = [];
const EMPTY_LEAGUE_RIVALRIES: LeagueRivalry[] = [];
const EMPTY_GAME_EVENTS: GameEvent[] = [];
const EMPTY_PRACTICE_SQUAD: PracticeSquadPlayer[] = [];
const EMPTY_ACHIEVEMENTS: Achievement[] = [];
const EMPTY_APOLOGY_TOUR_THREADS: ApologyTourThread[] = [];
const EMPTY_SEASON_REPORTS: SeasonReport[] = [];
const EMPTY_WAIVER_WIRE: WaiverWireEntry[] = [];
const EMPTY_WAIVER_CLAIMS: WaiverClaim[] = [];
const EMPTY_WAIVER_RESULTS: WaiverRunResult[] = [];
const EMPTY_HANDSHAKES: Handshake[] = [];
const EMPTY_CONDITIONAL_PICKS: ConditionalPick[] = [];
const EMPTY_STADIUM_DEALS: StadiumDeal[] = [];
const EMPTY_ALL_DECADE_TEAMS: AllDecadeTeam[] = [];
const EMPTY_FRANCHISE_LEGENDS: FranchiseLegend[] = [];
const EMPTY_FRANCHISE_ERAS: FranchiseEra[] = [];
const EMPTY_LOCKER_ROOM: LockerRoomState = {
  cliques: [],
  captains: [],
  culture: 'stable',
  cultureScore: 50,
  tensions: [],
  lastMeetingWeek: null,
};
const EMPTY_ENDORSEMENTS: EndorsementDeal[] = [];
const EMPTY_PLAYER_RIVALRIES: PlayerRivalry[] = [];
const EMPTY_FAREWELL_TOURS: FarewellTour[] = [];
const EMPTY_RETIRED_JERSEYS: JerseyRetirement[] = [];
const EMPTY_RULE_PROPOSALS: RuleProposal[] = [];
const EMPTY_RULE_DIFFS: RuleDiff[] = [];
const EMPTY_RULE_HISTORY: LeagueRuleHistoryGroup[] = [];
const EMPTY_IDS: string[] = [];
const EMPTY_TRAINING_ASSIGNMENTS: Record<string, TrainingAssignment> = {};
const EMPTY_FACILITY_STATE: FacilityState = {
  facilities: [],
  budget: 0,
  maxFacilities: 5,
  upgradeCosts: {
    training_complex: [4, 8, 12],
    medical_center: [4, 8, 12],
    film_room: [3, 6, 9],
    weight_room: [3, 6, 9],
    recovery_suite: [5, 10, 15],
  },
};
const EMPTY_MEDICAL_STAFF: MedicalStaff[] = [];
const EMPTY_DIFFICULTY_STATE: DifficultyState = createDefaultDifficultyState();
const EMPTY_TUTORIAL_STATE: TutorialState = createDefaultTutorialState(false);
const EMPTY_NARRATIVE_INTENSITY: NarrativeIntensity = createDefaultNarrativeIntensity();
const EMPTY_DASHBOARD_STATE: DashboardState = createDefaultDashboardState();
const EMPTY_SPECIAL_TEAMS: SpecialTeamsState = createDefaultSpecialTeamsState();
const EMPTY_ACHIEVEMENT_PROGRESS: AchievementProgress = {
  achievementId: '',
  current: 0,
  target: 1,
  percentage: 0,
  label: '0/1',
  hidden: false,
  complete: false,
};
/**
 * Memoizes a selector by the identity of `state.game`.
 * Immer produces a new frozen reference on every mutation, so
 * same reference ⇒ same derived data ⇒ return cached result.
 * Prevents React 19 useSyncExternalStore infinite-loop when
 * a selector builds a new object/array on every call.
 */
function memoByGame<T>(fn: (state: GameStoreState) => T): (state: GameStoreState) => T {
  let prevGame: GameState | null | undefined;
  let prevResult: T;
  let initialized = false;
  return (state) => {
    if (initialized && state.game === prevGame) return prevResult;
    prevGame = state.game;
    prevResult = fn(state);
    initialized = true;
    return prevResult;
  };
}

/**
 * Memoizes a parameterized selector factory by parameter key + state.game identity.
 * Each distinct parameter string gets its own single-slot cache keyed by state.game.
 * Prevents infinite loops from `useGameStore(selectFoo(param))` patterns where
 * each call creates a new closure that returns a new object.
 */
function memoParamByGame<P extends string | number | null | undefined, T>(
  fn: (param: P, state: GameStoreState) => T,
): (param: P) => (state: GameStoreState) => T {
  const cache = new Map<P, (state: GameStoreState) => T>();
  return (param: P) => {
    let selector = cache.get(param);
    if (!selector) {
      selector = memoByGame((state) => fn(param, state));
      cache.set(param, selector);
      // Bound cache to prevent unbounded growth from dynamic params
      if (cache.size > 64) {
        const first = cache.keys().next().value;
        if (first !== undefined) cache.delete(first);
      }
    }
    return selector;
  };
}

const EMPTY_TEAM_SCHEDULE = [] as ReturnType<typeof getFullSchedule>;
const EMPTY_WEEK_SCHEDULE = [] as ReturnType<typeof getWeekScheduleEntries>;
const EMPTY_TRANSACTION_LOG: TransactionLogEntry[] = [];
const EMPTY_DRAFT_RECAPS: DraftRecap[] = [];
const EMPTY_TRADE_SUGGESTIONS: TradeSuggestion[] = [];
const EMPTY_PLAYOFF_PICTURE = { afc: [], nfc: [] };
const EMPTY_TEAM_NEEDS_REPORT: TeamNeedsReport = {
  overall: 'No report available',
  positionGrades: [],
  criticalNeeds: [],
  strengths: [],
  draftTargets: [],
  faTargets: [],
  capFlexibility: 'moderate',
};
const EMPTY_FA_TARGET_BOARD: FATargetBoard = {
  watchlist: [],
  targets: [],
  topAvailable: [],
  bestFits: [],
  bargains: [],
};
const EMPTY_CAP_PROJECTION: CapProjectionYear[] = [];
const EMPTY_CONTRACT_EXTENSIONS: ContractExtensionRecord[] = [];
const EMPTY_WAR_ROOM_STATE: WarRoomState | null = null;
const EMPTY_SOCIAL_FEED: SocialPost[] = [];
const EMPTY_AVAILABLE_SCENARIOS: ScenarioDefinition[] = getAvailableScenarios();
const EMPTY_TRADE_DEADLINE_STATE: TradeDeadlineState | null = null;
const EMPTY_SCENARIO_STATE: ScenarioState | null = null;
const EMPTY_EXPANSION_DRAFT_STATE: ExpansionDraftState | null = null;
const EMPTY_FRANCHISE_DASHBOARD: FranchiseDashboard | null = null;
const EMPTY_RELOCATION_DESTINATIONS: ReturnType<typeof getRelocationDestinations> = [];
const EMPTY_COACHING_MARKET: CoachingMarketState = {
  teamId: null,
  updatedYear: 0,
  updatedWeek: 0,
  hotSeat: false,
  candidates: { HC: [], OC: [], DC: [] },
};
const EMPTY_FILM_ROOM_HISTORY: FilmRoomReport[] = [];
const EMPTY_CBA_STATE: CBAState | null = null;
const EMPTY_COMMISSIONER_STATE: CommissionerState | null = null;
const EMPTY_LABOR_STATE: LaborState | null = null;
const EMPTY_RECORD_CHASES: RecordChase[] = [];
const EMPTY_BROKEN_RECORDS: BrokenRecord[] = [];
const EMPTY_MILESTONES: MilestoneReached[] = [];
const EMPTY_CAP_HEALTH: CapHealthReport = {
  grade: 'C',
  capSpace: 0,
  capUsed: 0,
  deadCapPct: 0,
  topHeavyScore: 0,
  flexibilityScore: 0,
  futureRisk: 0,
  recommendations: [],
};
const EMPTY_CAP_CANDIDATES: CapCandidate[] = [];
const EMPTY_MULTI_YEAR_PROJECTION: MultiYearProjection = { years: [] };
const EMPTY_STAT_LEADERBOARD: StatLeaderEntry[] = [];
const EMPTY_CAREER_LEADERS: CareerLeader[] = [];
const EMPTY_LEAGUE_AVERAGES: LeagueAverageEntry[] = [];
const EMPTY_POSITION_RANKINGS: PositionRanking[] = [];
const EMPTY_TEAM_SEASON_HISTORY: TeamSeasonSummary[] = [];
const EMPTY_PLAYER_COMPARISON: PlayerComparison = {
  players: [],
  statColumns: [],
  peakComparison: {},
};

export interface LeagueRuleDisplay {
  key: keyof LeagueRules['entries'];
  label: string;
  category: RuleDiff['category'];
  value: string;
  source: LeagueRules['entries'][keyof LeagueRules['entries']]['source'];
  effectiveYear: number;
  changedFromDefault: boolean;
}

function stringifyRuleValue(value: LeagueRules['entries'][keyof LeagueRules['entries']]['value']): string {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'number' && value > 0 && value < 1) {
    return Number.isInteger(value * 100) ? `${Math.round(value * 100)}%` : `${(value * 100).toFixed(1)}%`;
  }
  return String(value);
}
const EMPTY_STAT_LEADERS = { passYds: [], rushYds: [], recYds: [], sacks: [], defINT: [] };
const EMPTY_ADVANCED_STATS = {
  stats: { qbr: 0, epa: 0, successRate: 0, yac: 0, pressureRate: 0, thirdDownRate: 0, redZoneRate: 0, turnoverRate: 0 },
  ranks: { offense: null as number | null, defense: null as number | null, specialTeams: null as number | null },
  teamRankings: { offense: [], defense: [], specialTeams: [] },
};
const STANDINGS_DIVISIONS = [
  ['AFC', 'East'],
  ['AFC', 'North'],
  ['AFC', 'South'],
  ['AFC', 'West'],
  ['NFC', 'East'],
  ['NFC', 'North'],
  ['NFC', 'South'],
  ['NFC', 'West'],
] as const;
const EMPTY_SCOUTING_DEPARTMENT: ScoutingDepartment = {
  scouts: [],
  availableScouts: [],
  budget: 0,
  maxScouts: 5,
  privateWorkoutsRemaining: 3,
};
const EMPTY_RECORD_BOOK: RecordBook = createEmptyRecordBook();
const EMPTY_CAP = { capSpace: 0, capUsed: 0, deadCap: 0 };

const SEASON_LENGTH = 17;
const RECORD_WATCH_STATS = ['passYds', 'rushYds', 'recYds', 'passTD', 'rushTD', 'sacks', 'defINT'] as const;

export interface RecordWatchItem {
  id: string;
  playerId: string;
  playerName: string;
  stat: typeof RECORD_WATCH_STATS[number];
  label: string;
  currentValue: number;
  projectedValue: number;
  recordValue: number;
  recordHolder: string;
}

export interface MentoringHistoryNote {
  id: string;
  year: number;
  summary: string;
}

const EMPTY_RECORD_WATCH: RecordWatchItem[] = [];
const EMPTY_MENTORING_HISTORY: MentoringHistoryNote[] = [];

export interface PlayerProfileBundle {
  profile: PlayerProfile;
  value: PlayerValue;
  comparables: Player[];
  projection: PlayerProjection;
}

export interface BroadcastViewModel {
  gameResult: GameResult;
  broadcast: BroadcastOutput;
  homeTeam: Team;
  awayTeam: Team;
}

function buildIntelSeed(game: GameState, salt: string): number {
  const saltHash = [...salt].reduce((hash, char) => ((hash * 33) ^ char.charCodeAt(0)) >>> 0, 5381);
  return (game.seed ^ (game.year * 131) ^ (game.week * 977) ^ saltHash) >>> 0;
}

function intelRng(game: GameState, salt: string): () => number {
  return mulberry32(buildIntelSeed(game, salt));
}

function hashString(value: string): number {
  return [...value].reduce((hash, char) => ((hash * 33) ^ char.charCodeAt(0)) >>> 0, 5381);
}

function buildBroadcastSeed(game: GameState, gameResult: GameResult): number {
  return (
    game.seed
    ^ (gameResult.year * 131)
    ^ (gameResult.week * 977)
    ^ hashString(gameResult.id)
    ^ hashString(`${gameResult.homeTeamId}:${gameResult.awayTeamId}`)
  ) >>> 0;
}

function rebuildBroadcast(game: GameState, gameResult: GameResult): BroadcastViewModel | null {
  const homeTeam = game.teams[gameResult.homeTeamId];
  const awayTeam = game.teams[gameResult.awayTeamId];
  if (!homeTeam || !awayTeam) return null;

  return {
    gameResult,
    broadcast: gameResult.broadcast ?? generateBroadcast(gameResult, homeTeam, awayTeam, mulberry32(buildBroadcastSeed(game, gameResult))),
    homeTeam,
    awayTeam,
  };
}

function findGameResultById(game: GameState, gameId: string): GameResult | null {
  for (const week of game.schedule) {
    for (const matchup of week.games) {
      if (matchup.result?.id === gameId) {
        return matchup.result;
      }
    }
  }

  for (const matchup of game.playoffBracket?.matchups ?? []) {
    if (matchup.result?.id === gameId) {
      return matchup.result;
    }
  }

  return null;
}

function teamNeedsReportFor(game: GameState, team: Team): TeamNeedsReport {
  const cached = game.teamNeedsCache[team.id];
  if (cached) return cached;
  return analyzeTeamNeeds(team, buildLeagueAverageByGroup(Object.values(game.teams)));
}

function faBoardSnapshotCurrent(game: GameState, teamId: string): boolean {
  if (game.faTargetBoard.teamId !== teamId || game.faTargetBoard.targets.length === 0) {
    return false;
  }
  const freeAgentIds = new Set(game.freeAgents);
  return game.faTargetBoard.targets.every((target) => freeAgentIds.has(target.player.id));
}

function bargainScore(target: FATargetBoard['targets'][number]): number {
  return (target.fitScore + target.player.ovr) - target.projectedSalary * 6;
}

function materializeStoredFATargetBoard(game: GameState): FATargetBoard {
  const targets = [...game.faTargetBoard.targets];
  return {
    watchlist: [...game.faTargetBoard.watchlist],
    targets,
    topAvailable: [...targets].sort((a, b) => b.player.ovr - a.player.ovr || a.projectedSalary - b.projectedSalary).slice(0, 10),
    bestFits: [...targets].sort((a, b) => b.fitScore - a.fitScore || b.player.ovr - a.player.ovr).slice(0, 5),
    bargains: [...targets].sort((a, b) => bargainScore(b) - bargainScore(a) || a.projectedSalary - b.projectedSalary).slice(0, 5),
  };
}

export const selectUserTeam = (state: GameStoreState): Team | null =>
  state.game ? Object.values(state.game.teams).find((team) => team.isUser) ?? null : null;

export const selectLockerRoom = (state: GameStoreState): LockerRoomState =>
  selectUserTeam(state)?.lockerRoom ?? EMPTY_LOCKER_ROOM;

export const selectEndorsementOffers = (state: GameStoreState): EndorsementDeal[] =>
  state.game?.endorsementOffers ?? EMPTY_ENDORSEMENTS;

export const selectActiveEndorsements: (state: GameStoreState) => EndorsementDeal[] = memoByGame((state) =>
  selectUserTeam(state)?.roster.flatMap((player) => player.endorsements.filter((deal) => deal.active)) ?? EMPTY_ENDORSEMENTS);

export const selectEndorsementRevenue = (state: GameStoreState): number =>
  getEndorsementRevenue(selectActiveEndorsements(state));

export const selectPlayerRivalries = (playerId: string) => (state: GameStoreState): PlayerRivalry[] =>
  state.game ? getActiveRivalries(state.game.playerRivalries ?? EMPTY_PLAYER_RIVALRIES, playerId) : EMPTY_PLAYER_RIVALRIES;

export const selectAllPlayerRivalries = (state: GameStoreState): PlayerRivalry[] =>
  state.game?.playerRivalries ?? EMPTY_PLAYER_RIVALRIES;

export const selectFarewellTours = (state: GameStoreState): FarewellTour[] =>
  state.game?.farewellTours ?? EMPTY_FAREWELL_TOURS;

export const selectFarewellCandidates = memoByGame((state: GameStoreState): Player[] => {
  if (!state.game) return EMPTY_PLAYERS;
  const team = selectUserTeam(state);
  return team ? detectRetirementCandidates(team, state.game.playerSeasonHistory ?? {}) : EMPTY_PLAYERS;
});

export const selectRetiredJerseys = memoByGame((state: GameStoreState): JerseyRetirement[] => {
  const team = selectUserTeam(state);
  return team ? getRetiredJerseys(team) : EMPTY_RETIRED_JERSEYS;
});

export const selectLeagueRules = (state: GameStoreState): LeagueRules | null =>
  state.game?.leagueRules ?? null;

export const selectLeagueRuleDiffs = memoByGame((state: GameStoreState): RuleDiff[] => {
  if (!state.game?.leagueRules) return EMPTY_RULE_DIFFS;
  return diffRules(initLeagueRules(state.game.year), state.game.leagueRules)
    .sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label));
});

export const selectLeagueRulesByCategory = memoByGame((state: GameStoreState): Record<string, LeagueRuleDisplay[]> => {
  const rules = state.game?.leagueRules;
  if (!rules) return {};
  const defaultDiffs = new Map(selectLeagueRuleDiffs(state).map((entry) => [entry.key, entry]));

  return Object.values(rules.entries).reduce<Record<string, LeagueRuleDisplay[]>>((groups, rule) => {
    const definition = LEAGUE_RULE_DEFINITIONS[rule.key];
    const diff = defaultDiffs.get(rule.key);
    const category = definition.category;
    groups[category] = groups[category] ?? [];
    groups[category].push({
      key: rule.key,
      label: definition.label,
      category,
      value: stringifyRuleValue(rule.value),
      source: rule.source,
      effectiveYear: rule.effectiveYear,
      changedFromDefault: Boolean(diff?.changed),
    });
    groups[category].sort((a, b) => a.label.localeCompare(b.label));
    return groups;
  }, {});
});

export const selectLeagueRuleHistory = memoByGame((state: GameStoreState): LeagueRuleHistoryGroup[] => {
  const rules = state.game?.leagueRules;
  if (!rules) return EMPTY_RULE_HISTORY;
  return Object.values(LEAGUE_RULE_DEFINITIONS)
    .map((definition) => ({
      key: definition.key,
      label: definition.label,
      changes: rules.history
        .filter((entry) => entry.key === definition.key)
        .sort((a, b) => b.effectiveYear - a.effectiveYear || b.rationale.localeCompare(a.rationale)),
    }))
    .filter((group) => group.changes.length > 0);
});

export const selectCBAState = (state: GameStoreState): CBAState | null =>
  state.game?.cbaState ?? EMPTY_CBA_STATE;

export const selectCBAProposal = (state: GameStoreState) =>
  state.game?.cbaState?.negotiationState?.currentProposal ?? null;

export const selectCommissionerState = (state: GameStoreState): CommissionerState | null =>
  state.game?.commissionerState ?? EMPTY_COMMISSIONER_STATE;

export const selectCommissionerAgenda = (state: GameStoreState): RuleProposal[] =>
  state.game?.commissionerState?.activeProposals ?? EMPTY_RULE_PROPOSALS;

export const selectCommissionerVoteHistory = (state: GameStoreState) =>
  state.game?.commissionerState?.history ?? [];

export const selectCommissionerRulings = (state: GameStoreState): CommissionerRuling[] =>
  state.game?.commissionerState?.rulings ?? [];

export const selectLaborState = (state: GameStoreState): LaborState | null =>
  state.game?.laborState ?? EMPTY_LABOR_STATE;

export const selectUnionLeader = (state: GameStoreState): Player | null =>
  state.game ? getUnionLeader(state.game) : null;

export function selectCurrentMatchup(state: GameStoreState) {
  if (!state.game) return null;
  const team = selectUserTeam(state);
  if (!team) return null;
  const weekSchedule = state.game.schedule.find((entry) => entry.week === state.game!.week);
  return weekSchedule?.games.find((entry) => entry.homeTeamId === team.id || entry.awayTeamId === team.id) ?? null;
}

export const selectUserTeamId = (state: GameStoreState): string | null => selectUserTeam(state)?.id ?? null;
export const selectUndoLabel = (state: GameStoreState): string | null => state.undoLabel;
export const selectCanUndo = (state: GameStoreState): boolean => state.undoSnapshot != null;
export const selectRoster = (state: GameStoreState): Player[] => selectUserTeam(state)?.roster ?? EMPTY_ROSTER;
export const selectPracticeSquad = (state: GameStoreState): PracticeSquadPlayer[] => selectUserTeam(state)?.practiceSquad ?? EMPTY_PRACTICE_SQUAD;
export const selectPlayerById = (id: string) => (state: GameStoreState): Player | null => state.game?.players[id] ?? null;
export const selectTeamById = (id: string) => (state: GameStoreState): Team | null => state.game?.teams[id] ?? null;
export const selectWeek = (state: GameStoreState): number => state.game?.week ?? 0;
export const selectYear = (state: GameStoreState): number => state.game?.year ?? 2026;
export const selectPhase = (state: GameStoreState): SeasonPhase => state.game?.phase ?? 'preseason';
export const selectOwnerState = (state: GameStoreState) => selectUserTeam(state)?.owner ?? null;
export const selectCoachingStaff = (state: GameStoreState) => selectUserTeam(state)?.staff ?? null;
export const selectClinic = (state: GameStoreState) => selectUserTeam(state)?.clinic ?? null;
let _prevCapInfo = EMPTY_CAP;
export const selectCapInfo = (state: GameStoreState) => {
  const team = selectUserTeam(state);
  if (!team) return EMPTY_CAP;
  if (team.capSpace === _prevCapInfo.capSpace && team.capUsed === _prevCapInfo.capUsed && team.deadCap === _prevCapInfo.deadCap) {
    return _prevCapInfo;
  }
  _prevCapInfo = { capSpace: team.capSpace, capUsed: team.capUsed, deadCap: team.deadCap };
  return _prevCapInfo;
};
export const selectSchedule = (state: GameStoreState) => state.game?.schedule ?? EMPTY_SCHEDULE;
export const selectNarrative = (state: GameStoreState) => state.game?.narrativeState ?? null;
export const selectNarrativeIntensity = memoByGame((state: GameStoreState) => {
  if (!state.game) {
    return {
      ...EMPTY_NARRATIVE_INTENSITY,
      status: 'warm' as const,
    };
  }

  return {
    ...state.game.narrativeIntensity,
    status: getCooldownStatus(state.game),
  };
});
export const selectActiveStoryArcs = (state: GameStoreState): StoryArc[] => state.game?.narrativeState.activeArcs ?? EMPTY_ARCS;
export const selectLatestSummary = (state: GameStoreState): WeeklySummary | null => state.game?.weekSummaries.at(-1) ?? null;
export const selectPlayoffBracket = (state: GameStoreState) => state.game?.playoffBracket ?? null;
export const selectOffseasonState = (state: GameStoreState): OffseasonState | null => state.game?.offseasonState ?? null;
export const selectTutorial = (state: GameStoreState): TutorialState => state.game?.tutorialState ?? EMPTY_TUTORIAL_STATE;
export const selectAgents = (state: GameStoreState): AgentProfile[] => state.game?.agents ?? EMPTY_AGENTS;
export const selectPlayerAgent = (playerId: string) => (state: GameStoreState): AgentProfile | null =>
  state.game ? getPlayerAgent(state.game, playerId) : null;
export const selectDraftClass = (state: GameStoreState): DraftProspect[] => state.game?.draftClass ?? EMPTY_PROSPECTS;
export const selectScoutingDepartment = (state: GameStoreState): ScoutingDepartment => state.game?.scoutingDepartment ?? EMPTY_SCOUTING_DEPARTMENT;
export const selectTradeOffers = (state: GameStoreState): TradeOffer[] => state.game?.offseasonState?.tradeOffers ?? EMPTY_TRADES;
export const selectActiveProposals = (state: GameStoreState): TradeProposal[] => state.game?.activeProposals ?? EMPTY_PROPOSALS;
export const selectCeremonies: (state: GameStoreState) => Ceremony[] = memoByGame((state) =>
  state.game
    ? [...state.game.ceremonies].sort((a, b) => b.year - a.year || b.id.localeCompare(a.id))
    : EMPTY_CEREMONIES);
export const selectTeams = (state: GameStoreState) => state.game?.teams ?? null;
export const selectOwners = (state: GameStoreState) => state.game?.owners ?? null;
export const selectAwardsHistory = (state: GameStoreState): AwardsHistoryEntry[] => state.game?.awardsHistory ?? EMPTY_AWARDS;
export const selectHallOfFame = (state: GameStoreState): HallOfFameEntry[] => state.game?.hallOfFame ?? EMPTY_HALL_OF_FAME;
export const selectRecords = (state: GameStoreState): RecordBook => state.game?.records ?? EMPTY_RECORD_BOOK;
export const selectPowerRankings = (state: GameStoreState): PowerRanking[] => state.game?.powerRankings ?? EMPTY_POWER_RANKINGS;
export const selectOffFieldEvents = (state: GameStoreState): OffFieldEvent[] => state.game?.offFieldEvents ?? EMPTY_OFF_FIELD_EVENTS;
export const selectRecentPressConferences = (state: GameStoreState): PressConference[] => state.game?.recentPressConferences ?? EMPTY_PRESS_CONFERENCES;
export const selectLeagueRivalries = (state: GameStoreState): LeagueRivalry[] => state.game?.leagueRivalries ?? EMPTY_LEAGUE_RIVALRIES;
export const selectGameDayState = (state: GameStoreState): GameDayState | null => state.game?.gameDayState ?? null;
export const selectApologyTourThreads = (state: GameStoreState): ApologyTourThread[] =>
  state.game?.apologyTourThreads ?? EMPTY_APOLOGY_TOUR_THREADS;
export const selectSocialFeed = (state: GameStoreState): SocialPost[] => state.game?.socialFeed ?? EMPTY_SOCIAL_FEED;
export const selectTradeDeadlineState = (state: GameStoreState): TradeDeadlineState | null => state.game?.tradeDeadlineState ?? EMPTY_TRADE_DEADLINE_STATE;
export const selectScenarioState = (state: GameStoreState): ScenarioState | null => state.game?.scenarioState ?? EMPTY_SCENARIO_STATE;
export const selectAvailableScenarios = (_state: GameStoreState): ScenarioDefinition[] => EMPTY_AVAILABLE_SCENARIOS;
export const selectConditionalPicks = (state: GameStoreState): ConditionalPick[] => state.game?.conditionalPicks ?? EMPTY_CONDITIONAL_PICKS;
export const selectWaiverOrder = (state: GameStoreState): string[] => state.game?.waiverOrder ?? EMPTY_IDS;
export const selectWaiverWire = (state: GameStoreState): WaiverWireEntry[] => state.game?.waiverWire ?? EMPTY_WAIVER_WIRE;
export const selectWaiverClaims = (state: GameStoreState): WaiverClaim[] => state.game?.waiverClaims ?? EMPTY_WAIVER_CLAIMS;
export const selectWaiverPriority = memoByGame((state: GameStoreState) => {
  if (!state.game) return [];
  return (state.game.waiverOrder ?? EMPTY_IDS).map((teamId, index) => {
    const team = state.game!.teams[teamId];
    return {
      teamId,
      teamName: team ? `${team.city} ${team.name}` : teamId,
      priority: index + 1,
      isUser: Boolean(team?.isUser),
    };
  });
});
export const selectTransactionLog: (state: GameStoreState) => TransactionLogEntry[] = memoByGame((state) =>
  [...(selectUserTeam(state)?.txLog ?? EMPTY_TRANSACTION_LOG)]
    .sort((a, b) => b.year - a.year || b.week - a.week || (b.playerId ?? '').localeCompare(a.playerId ?? '')));
export const selectClaimResults = memoByGame((state: GameStoreState) => {
  if (!state.game) return [];
  const teamId = selectUserTeamId(state);
  if (!teamId) return [];

  return [...(state.game.waiverResults ?? EMPTY_WAIVER_RESULTS)]
    .slice()
    .reverse()
    .map((result) => ({
      id: result.id,
      year: result.year,
      week: result.week,
      successfulClaims: result.entries
        .filter((entry) => entry.winningTeamId === teamId)
        .map((entry) => ({
          playerId: entry.playerId,
          playerName: state.game!.players[entry.playerId]?.name ?? entry.playerId,
          winningTeamName: `${state.game!.teams[teamId]?.city ?? ''} ${state.game!.teams[teamId]?.name ?? ''}`.trim(),
        })),
      lostClaims: result.entries
        .filter((entry) => entry.losingTeamIds.includes(teamId))
        .map((entry) => ({
          playerId: entry.playerId,
          playerName: state.game!.players[entry.playerId]?.name ?? entry.playerId,
          winningTeamName: entry.winningTeamId ? `${state.game!.teams[entry.winningTeamId]?.city ?? ''} ${state.game!.teams[entry.winningTeamId]?.name ?? ''}`.trim() : 'Cleared',
        })),
      clearedPlayers: result.entries
        .filter((entry) => entry.clearedToFreeAgency)
        .map((entry) => ({
          playerId: entry.playerId,
          playerName: state.game!.players[entry.playerId]?.name ?? entry.playerId,
        })),
    }))
    .filter((result) => result.successfulClaims.length > 0 || result.lostClaims.length > 0 || result.clearedPlayers.length > 0);
});
export const selectHandshakes = (state: GameStoreState): Handshake[] => state.game?.handshakes ?? EMPTY_HANDSHAKES;
export const selectLeagueNews: (state: GameStoreState) => NewsItem[] = memoByGame((state) =>
  state.game ? getRecentNews(state.game, state.game.leagueNews.length) : EMPTY_NEWS);
export const selectTeamNews: (state: GameStoreState) => NewsItem[] = memoByGame((state) => {
  if (!state.game) return EMPTY_NEWS;
  const teamId = selectUserTeamId(state);
  return teamId ? getTeamNews(state.game, teamId, 24) : EMPTY_NEWS;
});
export const selectTrainingAssignments = (state: GameStoreState): Record<string, TrainingAssignment> =>
  selectUserTeam(state)?.trainingAssignments ?? EMPTY_TRAINING_ASSIGNMENTS;
export const selectMedicalStaff = memoByGame((state: GameStoreState) => ({
  current: selectUserTeam(state)?.medicalStaff ?? null,
  available: state.game?.availableMedicalStaff ?? EMPTY_MEDICAL_STAFF,
}));
export const selectFatigueReport = memoByGame((state: GameStoreState) => {
  if (!state.game) return [];
  const teamId = selectUserTeamId(state);
  return teamId ? getWorkloadReport(state.game, teamId) : [];
});
export const selectFacilities = (state: GameStoreState): FacilityState =>
  selectUserTeam(state)?.facilityState ?? EMPTY_FACILITY_STATE;
export const selectInjuryReport = memoByGame((state: GameStoreState) =>
  selectRoster(state)
    .filter((player) => player.injury)
    .map((player) => ({ playerId: player.id, name: player.name, pos: player.pos, injury: player.injury! })));
export const selectDifficultyState = (state: GameStoreState): DifficultyState =>
  state.game?.difficultyState ?? EMPTY_DIFFICULTY_STATE;
export const selectAchievements = (state: GameStoreState): Achievement[] => state.game?.achievements ?? EMPTY_ACHIEVEMENTS;
export const selectNewlyUnlocked: (state: GameStoreState) => Achievement[] = memoByGame((state) => {
  if (!state.game) return EMPTY_ACHIEVEMENTS;
  return (state.game.achievements ?? EMPTY_ACHIEVEMENTS)
    .filter((achievement) => achievement.unlockedYear === state.game!.year && achievement.unlockedWeek === state.game!.week)
    .sort((a, b) => a.title.localeCompare(b.title));
});
export const selectAchievementProgress = memoParamByGame((achievementId: string, state: GameStoreState): AchievementProgress => {
  if (!state.game) {
    return {
      ...EMPTY_ACHIEVEMENT_PROGRESS,
      achievementId,
    };
  }
  return getAchievementProgress(state.game, achievementId);
});
export const selectDashboardState = (state: GameStoreState): DashboardState => state.game?.dashboardState ?? EMPTY_DASHBOARD_STATE;
export const selectSpecialTeams = (state: GameStoreState): SpecialTeamsState => selectUserTeam(state)?.specialTeams ?? EMPTY_SPECIAL_TEAMS;
export const selectCurrentGamePlan = (state: GameStoreState): GamePlan | null => state.game?.gamePlan ?? null;
export const selectCurrentOpponentReport: (state: GameStoreState) => OpponentReport | null = memoByGame((state) => {
  if (!state.game) return null;
  const team = selectUserTeam(state);
  const matchup = selectCurrentMatchup(state);
  if (!team || !matchup) return null;
  const opponentId = matchup.homeTeamId === team.id ? matchup.awayTeamId : matchup.homeTeamId;
  return getStoredOpponentReport(state.game, team.id, opponentId)
    ?? generateOpponentScouting(state.game, team.id, opponentId);
});
export const selectSeasonReports: (state: GameStoreState) => SeasonReport[] = memoByGame((state) => {
  if (!state.game) return EMPTY_SEASON_REPORTS;
  const teamId = selectUserTeamId(state);
  if (!teamId) return EMPTY_SEASON_REPORTS;
  return [...(state.game.seasonReports ?? EMPTY_SEASON_REPORTS)]
    .filter((report) => report.teamId === teamId)
    .sort((a, b) => b.year - a.year);
});
export const selectTeamSchedule = memoByGame((state: GameStoreState) => {
  if (!state.game) return EMPTY_TEAM_SCHEDULE;
  const teamId = selectUserTeamId(state);
  return teamId ? getFullSchedule(state.game, teamId) : EMPTY_TEAM_SCHEDULE;
});
export const selectFranchiseDashboard: (state: GameStoreState) => FranchiseDashboard | null = memoByGame((state) => {
  if (!state.game) return EMPTY_FRANCHISE_DASHBOARD;
  const teamId = selectUserTeamId(state);
  return teamId ? buildFranchiseDashboard(state.game, teamId) : EMPTY_FRANCHISE_DASHBOARD;
});
export const selectFranchiseLegends: (state: GameStoreState) => FranchiseLegend[] = memoByGame((state) => {
  if (!state.game) return EMPTY_FRANCHISE_LEGENDS;
  const teamId = selectUserTeamId(state);
  return teamId ? getFranchiseLegends(state.game, teamId, 25) : EMPTY_FRANCHISE_LEGENDS;
});
export const selectAllDecadeTeams: (state: GameStoreState) => AllDecadeTeam[] = memoByGame((state) => {
  if (!state.game) return EMPTY_ALL_DECADE_TEAMS;
  const teamId = selectUserTeamId(state);
  if (!teamId) return EMPTY_ALL_DECADE_TEAMS;
  return state.game.allDecadeTeams
    .filter((entry) => entry.teamId === teamId)
    .sort((a, b) => b.startYear - a.startYear);
});
export const selectFranchiseEras: (state: GameStoreState) => FranchiseEra[] = memoByGame((state) => {
  if (!state.game) return EMPTY_FRANCHISE_ERAS;
  const teamId = selectUserTeamId(state);
  if (!teamId) return EMPTY_FRANCHISE_ERAS;
  return detectFranchiseEras(state.game.franchiseHistory.filter((entry) => entry.teamId === teamId));
});
export const selectCurrentAllDecadeNarrative = (state: GameStoreState): string | null => {
  if (!state.game) return null;
  const active = selectAllDecadeTeams(state)[0] ?? null;
  return active ? getDecadeNarrative(active, state.game.franchiseHistory.filter((entry) => entry.teamId === active.teamId)) : null;
};
export const selectStadiumDealOffers = (state: GameStoreState): StadiumDeal[] => state.game?.stadiumDealOffers ?? EMPTY_STADIUM_DEALS;
export const selectExpansionDraftState = (state: GameStoreState): ExpansionDraftState | null => state.game?.expansionDraftState ?? EMPTY_EXPANSION_DRAFT_STATE;
export const selectCanRelocate = (state: GameStoreState): boolean => {
  const team = selectUserTeam(state);
  const game = state.game;
  if (!team || !game) return false;
  return canRelocate(team.franchiseIdentity, team, game.year);
};
export const selectRelocationDestinations = memoByGame((state: GameStoreState) => {
  const team = selectUserTeam(state);
  if (!team) return EMPTY_RELOCATION_DESTINATIONS;
  return getRelocationDestinations(team.franchiseIdentity, team.city);
});
export const selectWeekSchedule = memoParamByGame((week: number | undefined, state: GameStoreState) => {
  if (!state.game) return EMPTY_WEEK_SCHEDULE;
  return getWeekScheduleEntries(state.game, week ?? state.game.week);
});
export const selectAdvancedStats = memoByGame((state: GameStoreState) => {
  if (!state.game) return EMPTY_ADVANCED_STATS;
  const team = selectUserTeam(state);
  if (!team) return EMPTY_ADVANCED_STATS;

  const teamRankings = getTeamRankings(state.game);
  return {
    stats: calculateAdvancedStats(team, team.seasonStats),
    ranks: {
      offense: teamRankings.offense.findIndex((entry) => entry.teamId === team.id) + 1 || null,
      defense: teamRankings.defense.findIndex((entry) => entry.teamId === team.id) + 1 || null,
      specialTeams: teamRankings.specialTeams.findIndex((entry) => entry.teamId === team.id) + 1 || null,
    },
    teamRankings,
  };
});
export const selectPlayoffMomentum = (state: GameStoreState) => {
  const teamId = selectUserTeamId(state);
  return teamId ? state.game?.playoffMomentum?.[teamId] ?? null : null;
};
export const selectDynastyTimeline: (state: GameStoreState) => DynastyEvent[] = memoByGame((state) => {
  if (!state.game) return EMPTY_DYNASTY_EVENTS;
  const teamId = selectUserTeamId(state);
  if (!teamId) return EMPTY_DYNASTY_EVENTS;

  const weighted = (importance: DynastyEvent['importance']) =>
    (importance === 'landmark' ? 3 : importance === 'major' ? 2 : 1);

  return state.game.dynastyTimeline
    .filter((event) => event.teamIds.includes(teamId))
    .slice()
    .sort((a, b) =>
      b.year - a.year ||
      (b.week ?? 99) - (a.week ?? 99) ||
      weighted(b.importance) - weighted(a.importance) ||
      a.id.localeCompare(b.id));
});
export const selectDynastyScore = (state: GameStoreState): number => {
  const team = selectUserTeam(state);
  if (!state.game || !team) return 0;

  const championships = state.game.franchiseHistory.filter((entry) =>
    entry.teamId === team.id && entry.playoffFinish === 'champion').length;
  const playoffAppearances = state.game.franchiseHistory.filter((entry) =>
    entry.teamId === team.id && entry.playoffFinish && entry.playoffFinish !== 'missed').length;
  const timeline = selectDynastyTimeline(state);
  const awards = timeline.filter((event) => event.type === 'award').length;
  const records = timeline.filter((event) => event.type === 'record').length;

  return championships * 10 + playoffAppearances * 3 + awards * 2 + records;
};
export const selectStandings = memoByGame((state: GameStoreState) => {
  if (!state.game) return [];
  return STANDINGS_DIVISIONS.map(([conference, division]) => ({
    conference,
    division,
    rows: getDivisionStandings(state.game!, conference, division),
  }));
});
export const selectPlayoffPicture = memoByGame((state: GameStoreState) =>
  state.game ? buildPlayoffPicture(state.game) : EMPTY_PLAYOFF_PICTURE);
export const selectStatLeaders = memoByGame((state: GameStoreState) =>
  state.game ? getStatLeaders(state.game) : EMPTY_STAT_LEADERS);
export const selectAnalyticsLeaders = memoByGame((state: GameStoreState) => {
  if (!state.game) return EMPTY_STAT_LEADERS;
  return {
    passYds: getAnalyticsStatLeaders(state.game, 'passYds', 5),
    rushYds: getAnalyticsStatLeaders(state.game, 'rushYds', 5),
    recYds: getAnalyticsStatLeaders(state.game, 'recYds', 5),
    sacks: getAnalyticsStatLeaders(state.game, 'sacks', 5),
    defINT: getAnalyticsStatLeaders(state.game, 'defINT', 5),
  };
});
export const selectPlayerComparison = (() => {
  const cache = new Map<string, (state: GameStoreState) => ReturnType<typeof getPlayerComparison> | null>();
  return (playerIdA: string | null, playerIdB: string | null) => {
    const key = `${playerIdA}:${playerIdB}`;
    let selector = cache.get(key);
    if (!selector) {
      selector = memoByGame((state) => {
        if (!state.game || !playerIdA || !playerIdB) return null;
        return getPlayerComparison(state.game, playerIdA, playerIdB);
      });
      cache.set(key, selector);
      if (cache.size > 32) cache.delete(cache.keys().next().value!);
    }
    return selector;
  };
})();
export const selectWeeklyTrend = memoParamByGame((stat: 'pointsFor' | 'pointDifferential' | 'thirdDownConversions' | 'redZoneScores', state: GameStoreState) => {
  if (!state.game) return [];
  const teamId = selectUserTeamId(state);
  return teamId ? getWeeklyTrend(state.game, teamId, stat, 5) : [];
});
export const selectLatestGameDayPackage = (state: GameStoreState): GameDayPackage | null => {
  const gameDayState = state.game?.gameDayState;
  if (!gameDayState) return null;
  if (gameDayState.latestPackageId) {
    return gameDayState.recentPackages.find((entry) => entry.id === gameDayState.latestPackageId) ?? gameDayState.recentPackages.at(-1) ?? null;
  }
  return gameDayState.recentPackages.at(-1) ?? null;
};
let _prevFAIds: string[] | undefined;
let _prevFAPlayers: Player[] = EMPTY_PLAYERS;
export const selectFreeAgentPlayers = (state: GameStoreState): Player[] => {
  if (!state.game) return EMPTY_PLAYERS;
  // With Immer the freeAgents reference only changes when mutated
  if (state.game.freeAgents === _prevFAIds) return _prevFAPlayers;
  _prevFAIds = state.game.freeAgents;
  _prevFAPlayers = state.game.freeAgents.map((playerId) => state.game!.players[playerId]).filter(Boolean) as Player[];
  return _prevFAPlayers;
};
export const selectWaiverWirePlayers: (state: GameStoreState) => Player[] = memoByGame((state) => {
  if (!state.game) return EMPTY_PLAYERS;
  if (state.game.waiverWire.length === 0) return EMPTY_PLAYERS;
  return state.game.waiverWire
    .map((entry) => state.game!.players[entry.playerId])
    .filter(Boolean) as Player[];
});
export const selectWaiverWireBoard = memoByGame((state: GameStoreState) => {
  if (!state.game) return [];
  const teamId = selectUserTeamId(state);
  return state.game.waiverWire.map((entry) => {
    const player = state.game!.players[entry.playerId];
    const releasedBy = entry.releasedByTeamId ? state.game!.teams[entry.releasedByTeamId] : null;
    return {
      playerId: entry.playerId,
      name: player?.name ?? entry.playerId,
      pos: player?.pos ?? 'WR',
      ovr: player?.ovr ?? 0,
      age: player?.age ?? 0,
      salary: player?.contract?.baseSalary ?? 0,
      releasedByTeamId: entry.releasedByTeamId,
      releasedByName: releasedBy ? `${releasedBy.city} ${releasedBy.name}` : 'Free Agent Pool',
      countdown: `${Math.max(0, entry.expiresWeek - state.game!.week)} day${Math.max(0, entry.expiresWeek - state.game!.week) === 1 ? '' : 's'}`,
      claimPending: Boolean(teamId && state.game!.waiverClaims.some((claim) => claim.teamId === teamId && claim.playerId === entry.playerId)),
    };
  });
});
export const selectPracticeSquadCandidates: (state: GameStoreState) => Player[] = memoByGame((state) => {
  if (!state.game) return EMPTY_PLAYERS;
  const existing = new Set((selectPracticeSquad(state) ?? EMPTY_PRACTICE_SQUAD).map((entry) => entry.playerId));
  const waiverPlayers = selectWaiverWirePlayers(state);
  const freeAgents = selectFreeAgentPlayers(state);
  return [...freeAgents, ...waiverPlayers]
    .filter((player) => !existing.has(player.id))
    .sort((a, b) => b.ovr - a.ovr || a.name.localeCompare(b.name));
});
export const selectDraftRecaps: (state: GameStoreState) => DraftRecap[] = memoByGame((state) => {
  if (!state.game) return EMPTY_DRAFT_RECAPS;
  const teamId = selectUserTeamId(state);
  if (!teamId) return EMPTY_DRAFT_RECAPS;
  return [...(state.game.draftRecaps ?? EMPTY_DRAFT_RECAPS)]
    .filter((recap) => recap.teamId === teamId)
    .sort((a, b) => b.year - a.year);
});
export const selectTradeSuggestions = memoByGame((state: GameStoreState) => {
  if (!state.game) return EMPTY_TRADE_SUGGESTIONS;
  return (state.game.tradeSuggestions ?? EMPTY_TRADE_SUGGESTIONS).map((suggestion) => ({
    ...suggestion,
    partnerName: state.game!.teams[suggestion.partner]
      ? `${state.game!.teams[suggestion.partner]!.city} ${state.game!.teams[suggestion.partner]!.name}`
      : suggestion.partner,
  }));
});
export const selectLatestGameResult = (state: GameStoreState): GameResult | null => {
  if (!state.game) return null;
  const userTeam = selectUserTeam(state);
  if (!userTeam) return null;
  // Walk schedule backwards to find last played game for the user's team
  for (let w = state.game.schedule.length - 1; w >= 0; w--) {
    const week = state.game.schedule[w]!;
    for (const game of week.games) {
      if (game.result && (game.result.homeTeamId === userTeam.id || game.result.awayTeamId === userTeam.id)) {
        return game.result;
      }
    }
  }
  return null;
};
export const selectBroadcastByGameId = memoParamByGame((gameId: string | null, state: GameStoreState): BroadcastViewModel | null => {
  if (!state.game) return null;
  const gameResult = gameId ? findGameResultById(state.game, gameId) : selectLatestGameResult(state);
  return gameResult ? rebuildBroadcast(state.game, gameResult) : null;
});
export const selectLatestBroadcast = (state: GameStoreState): BroadcastViewModel | null =>
  selectBroadcastByGameId(null)(state);
export const selectCurrentOpponentIntel = (state: GameStoreState): OpponentIntel | null => {
  if (!state.game) return null;
  const team = selectUserTeam(state);
  const matchup = selectCurrentMatchup(state);
  if (!team || !matchup) return null;
  const opponentId = matchup.homeTeamId === team.id ? matchup.awayTeamId : matchup.homeTeamId;
  return buildOpponentIntel(state.game, team.id, opponentId);
};
export const selectCurrentDraftEntry = (state: GameStoreState): DraftOrderEntry | null => {
  const offseasonState = state.game?.offseasonState;
  return offseasonState ? offseasonState.draftOrder[offseasonState.currentDraftPickIndex] ?? null : null;
};
export const selectPlayerProfileBundle = memoParamByGame((playerId: string, state: GameStoreState): PlayerProfileBundle | null => {
  if (!state.game) return null;
  const player = state.game.players[playerId];
  if (!player) return null;

  return {
    profile: buildPlayerProfile(player, state.game),
    value: getPlayerValue(player, state.game),
    comparables: getPlayerComparables(player, Object.values(state.game.players)),
    projection: getPlayerProjection(player),
  };
});
export const selectUserTeamNeeds: (state: GameStoreState) => TeamNeedsReport = memoByGame((state) => {
  if (!state.game) return EMPTY_TEAM_NEEDS_REPORT;
  const team = selectUserTeam(state);
  return team ? teamNeedsReportFor(state.game, team) : EMPTY_TEAM_NEEDS_REPORT;
});
export const selectTeamNeedsById = memoParamByGame((teamId: string, state: GameStoreState): TeamNeedsReport => {
  if (!state.game) return EMPTY_TEAM_NEEDS_REPORT;
  const team = state.game.teams[teamId];
  return team ? teamNeedsReportFor(state.game, team) : EMPTY_TEAM_NEEDS_REPORT;
});
export const selectTeamNeedsComparison = memoParamByGame((otherTeamId: string | null, state: GameStoreState): TeamNeedsComparisonEntry[] => {
  if (!state.game || !otherTeamId) return [];
  const userTeam = selectUserTeam(state);
  const otherTeam = state.game.teams[otherTeamId];
  if (!userTeam || !otherTeam) return [];

  const userReport = teamNeedsReportFor(state.game, userTeam);
  const otherReport = teamNeedsReportFor(state.game, otherTeam);
  const groups = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'] as const satisfies PositionGroup[];

  return groups.map((group) => {
    const left = userReport.positionGrades.find((entry) => entry.group === group);
    const right = otherReport.positionGrades.find((entry) => entry.group === group);
    const differential = (left?.starterOvr ?? 0) - (right?.starterOvr ?? 0);
    return {
      group,
      teamAGrade: left?.grade ?? 'F',
      teamBGrade: right?.grade ?? 'F',
      edge: differential > 1 ? 'teamA' : differential < -1 ? 'teamB' : 'even',
      differential: Math.round(differential * 10) / 10,
    };
  });
});
export const selectCoachingMarket: (state: GameStoreState) => CoachingMarketState = memoByGame((state) => {
  if (!state.game) return EMPTY_COACHING_MARKET;
  const team = selectUserTeam(state);
  if (!team) return EMPTY_COACHING_MARKET;
  const cached = state.game.coachingMarket;
  if (cached
    && cached.teamId === team.id
    && cached.updatedYear === state.game.year
    && cached.updatedWeek === state.game.week) {
    return cached;
  }
  return buildCoachingMarket(state.game, team.id);
});
export const selectSchemeTransitionPreview = (() => {
  const cache = new Map<string, (state: GameStoreState) => SchemeInstallState | null>();
  return (offenseScheme: string, defenseScheme: string) => {
    const key = `${offenseScheme}:${defenseScheme}`;
    let selector = cache.get(key);
    if (!selector) {
      selector = memoByGame((state) => {
        const team = selectUserTeam(state);
        return team ? projectSchemeTransition(team, offenseScheme, defenseScheme) : null;
      });
      cache.set(key, selector);
      if (cache.size > 16) cache.delete(cache.keys().next().value!);
    }
    return selector;
  };
})();
export const selectCurrentWeeklyPrepPlan = (state: GameStoreState): WeeklyPrepPlan | null => {
  if (!state.game) return null;
  const team = selectUserTeam(state);
  const matchup = selectCurrentMatchup(state);
  if (!team || !matchup) return null;
  const plan = state.game.weeklyPrepPlans?.[team.id] ?? null;
  const opponentId = matchup.homeTeamId === team.id ? matchup.awayTeamId : matchup.homeTeamId;
  if (!plan) return null;
  return plan.year === state.game.year && plan.week === state.game.week && plan.opponentTeamId === opponentId ? plan : null;
};
export const selectFATargetBoard: (state: GameStoreState) => FATargetBoard = memoByGame((state) => {
  if (!state.game) return EMPTY_FA_TARGET_BOARD;
  const team = selectUserTeam(state);
  if (!team) return EMPTY_FA_TARGET_BOARD;

  if (faBoardSnapshotCurrent(state.game, team.id)) {
    return materializeStoredFATargetBoard(state.game);
  }

  return buildFATargetBoard(
    team,
    selectFreeAgentPlayers(state),
    Object.values(state.game.teams),
    intelRng(state.game, `fa-board:${team.id}`),
    state.game.faTargetBoard,
  );
});
export const selectWatchlistTargets = memoByGame((state: GameStoreState) => {
  const board = selectFATargetBoard(state);
  const watchlist = new Set(board.watchlist);
  return board.targets.filter((target) => watchlist.has(target.player.id));
});
export const selectWarRoomState: (state: GameStoreState) => WarRoomState | null = memoByGame((state) => {
  if (!state.game || state.game.phase !== 'draft') return EMPTY_WAR_ROOM_STATE;
  const currentPick = selectCurrentDraftEntry(state);
  if (!currentPick) return EMPTY_WAR_ROOM_STATE;
  const stored = state.game.warRoomState;
  if (stored && stored.currentPick === currentPick.overall && stored.onTheClock === currentPick.teamId) {
    return stored;
  }
  return buildDraftWarRoomState(state.game, intelRng(state.game, `war-room:${currentPick.overall}`));
});
export const selectCapProjection: (state: GameStoreState) => CapProjectionYear[] = memoByGame((state) => {
  if (!state.game) return EMPTY_CAP_PROJECTION;
  const team = selectUserTeam(state);
  return team ? capProjection(team, state.game.year, 3) : EMPTY_CAP_PROJECTION;
});
export const selectContractExtensions: (state: GameStoreState) => ContractExtensionRecord[] = memoByGame((state) => {
  if (!state.game) return EMPTY_CONTRACT_EXTENSIONS;
  const teamId = selectUserTeamId(state);
  if (!teamId) return EMPTY_CONTRACT_EXTENSIONS;
  return state.game.contractExtensions.filter((entry) => entry.teamId === teamId).slice().reverse();
});
export const selectFilmRoomHistory: (state: GameStoreState) => FilmRoomReport[] = memoByGame((state) => {
  if (!state.game) return EMPTY_FILM_ROOM_HISTORY;
  const teamId = selectUserTeamId(state);
  if (!teamId) return EMPTY_FILM_ROOM_HISTORY;
  return (state.game.filmRoomHistory ?? []).filter((entry) => entry.teamId === teamId).slice().reverse();
});
export const selectLatestFilmRoomReport = (state: GameStoreState): FilmRoomReport | null =>
  selectFilmRoomHistory(state)[0] ?? null;
export const selectLatestExtensionRecord = (playerId: string) => (state: GameStoreState): ContractExtensionRecord | null => {
  return selectContractExtensions(state).find((entry) => entry.playerId === playerId) ?? null;
};
export const selectIncentiveSummary = memoByGame((state: GameStoreState) => {
  const team = selectUserTeam(state);
  if (!team) {
    return {
      total: 0,
      likely: 0,
      unlikely: 0,
      entries: [],
    };
  }

  const entries = team.roster.flatMap((player) => {
    const result = checkIncentives(player, {
      madePlayoffs: team.wins >= 9,
      proBowl: player.ovr >= 85,
    });
    const allHits = [...result.hit, ...result.miss];
    return (player.contract?.incentives ?? []).map((incentive) => {
      const tracked = allHits.find((entry) => entry.id === incentive.type);
      const progress = tracked ? Math.min(100, Math.round((tracked.actual / Math.max(1, tracked.threshold)) * 100)) : 0;
      const likely = tracked ? tracked.actual >= tracked.threshold * 0.65 : false;
      return {
        id: `${player.id}-${incentive.type}`,
        playerId: player.id,
        playerName: player.name,
        label: incentive.type.replaceAll('_', ' '),
        bonus: incentive.bonus,
        progress,
        likely,
      };
    });
  });

  return {
    total: entries.length,
    likely: entries.filter((entry) => entry.likely).length,
    unlikely: entries.filter((entry) => !entry.likely).length,
    entries,
  };
});
export const selectUserPowerRanking: (state: GameStoreState) => PowerRanking | null = memoByGame((state) => {
  const userTeamId = selectUserTeamId(state);
  if (!userTeamId) return null;
  return selectPowerRankings(state).find((entry) => entry.teamId === userTeamId) ?? null;
});
export const selectUserMentoringPairs = (state: GameStoreState): MentoringPair[] => selectUserTeam(state)?.mentoringPairs ?? EMPTY_MENTORING;
export const selectUpcomingRivalry: (state: GameStoreState) => RivalryGameContext | null = memoByGame((state) => {
  if (!state.game) return null;
  const team = selectUserTeam(state);
  if (!team) return null;
  const matchup = selectCurrentMatchup(state);
  if (!matchup) return null;
  const opponentId = matchup.homeTeamId === team.id ? matchup.awayTeamId : matchup.homeTeamId;
  return getRivalryGameContext(state.game, team.id, opponentId);
});
export const selectWeather = (state: GameStoreState): WeatherCondition | null => {
  const currentMatchup = selectCurrentMatchup(state);
  if (currentMatchup?.result === null && currentMatchup.weather) {
    return currentMatchup.weather;
  }
  return selectLatestGameDayPackage(state)?.weather
    ?? selectLatestGameResult(state)?.weather
    ?? currentMatchup?.weather
    ?? null;
};
export const selectCoachingCarouselNews: (state: GameStoreState) => GameEvent[] = memoByGame((state) =>
  state.game?.eventLog
    .filter((event) => event.type === 'coach_fired' || event.type === 'coach_hired' || event.type === 'coach_promoted' || event.type === 'coach_departed')
    .slice(-6)
    .reverse() ?? EMPTY_GAME_EVENTS);
export const selectHistoricalMentoringChains: (state: GameStoreState) => MentoringHistoryNote[] = memoByGame((state) => {
  const team = selectUserTeam(state);
  if (!state.game || !team) return EMPTY_MENTORING_HISTORY;

  return [...state.game.franchiseHistory]
    .filter((entry) => entry.teamId === team.id)
    .sort((a, b) => b.year - a.year)
    .flatMap((entry, index) =>
      entry.majorEvents
        .filter((event) => event.startsWith('Mentoring: '))
        .map((event, eventIndex) => ({
          id: `${entry.year}-${index}-${eventIndex}`,
          year: entry.year,
          summary: event.replace(/^Mentoring:\s*/, ''),
        })));
});
export const selectUserRecordWatch: (state: GameStoreState) => RecordWatchItem[] = memoByGame((state) => {
  if (!state.game) return EMPTY_RECORD_WATCH;
  const team = selectUserTeam(state);
  if (!team) return EMPTY_RECORD_WATCH;

  const gamesPlayed = team.seasonStats.gamesPlayed || team.wins + team.losses + team.ties;
  if (gamesPlayed <= 0) return EMPTY_RECORD_WATCH;

  const recordBook = selectRecords(state);
  const recordWatch: RecordWatchItem[] = [];

  for (const player of team.roster) {
    for (const stat of RECORD_WATCH_STATS) {
      const currentValue = getSeasonStat(player, stat);
      if (currentValue <= 0) continue;

      const leader = recordBook.singleSeason[stat]?.[0];
      if (!leader) continue;

      const projectedValue = Math.round((currentValue / gamesPlayed) * SEASON_LENGTH);
      if (projectedValue <= leader.value) continue;

      recordWatch.push({
        id: `${player.id}-${stat}`,
        playerId: player.id,
        playerName: player.name,
        stat,
        label: recordLabel(stat),
        currentValue,
        projectedValue,
        recordValue: leader.value,
        recordHolder: leader.playerName ?? leader.teamName,
      });
    }
  }

  recordWatch.sort((a, b) =>
    (b.projectedValue - b.recordValue) - (a.projectedValue - a.recordValue) ||
    b.currentValue - a.currentValue ||
    a.playerName.localeCompare(b.playerName));

  return recordWatch.length > 0 ? recordWatch.slice(0, 3) : EMPTY_RECORD_WATCH;
});

function getSeasonStat(player: Player, stat: typeof RECORD_WATCH_STATS[number]): number {
  if (stat === 'passYds') return player.stats.passYds;
  if (stat === 'rushYds') return player.stats.rushYds;
  if (stat === 'recYds') return player.stats.recYds;
  if (stat === 'passTD') return player.stats.passTD;
  if (stat === 'rushTD') return player.stats.rushTD;
  if (stat === 'sacks') return player.stats.sacks;
  return player.stats.defINT;
}

function recordLabel(stat: RecordEntry['stat']): string {
  if (stat === 'passYds') return 'Passing Yards';
  if (stat === 'rushYds') return 'Rushing Yards';
  if (stat === 'recYds') return 'Receiving Yards';
  if (stat === 'passTD') return 'Passing TDs';
  if (stat === 'rushTD') return 'Rushing TDs';
  if (stat === 'defINT') return 'Interceptions';
  return 'Sacks';
}

function emptyCareerTimeline(playerId: string): CareerTimeline {
  return {
    playerId,
    playerName: '',
    pos: 'WR',
    seasons: [],
  };
}

export const selectRecordChases = (state: GameStoreState): RecordChase[] =>
  state.game?.activeRecordChases ?? EMPTY_RECORD_CHASES;
export const selectRecentBrokenRecords = (state: GameStoreState): BrokenRecord[] =>
  state.game?.recentBrokenRecords ?? EMPTY_BROKEN_RECORDS;
export const selectRecentMilestones = (state: GameStoreState): MilestoneReached[] =>
  state.game?.recentMilestones ?? EMPTY_MILESTONES;
export const selectCapHealth: (state: GameStoreState) => CapHealthReport = memoByGame((state) => {
  const game = state.game;
  const team = selectUserTeam(state);
  if (!game || !team) return EMPTY_CAP_HEALTH;
  return getCapHealth(team, game);
});
export const selectCapCandidates: (state: GameStoreState) => CapCandidate[] = memoByGame((state) => {
  const team = selectUserTeam(state);
  return team ? identifyCapCandidates(team) : EMPTY_CAP_CANDIDATES;
});
export const selectMultiYearProjection: (state: GameStoreState) => MultiYearProjection = memoByGame((state) => {
  const game = state.game;
  const team = selectUserTeam(state);
  if (!game || !team) return EMPTY_MULTI_YEAR_PROJECTION;
  return buildMultiYearProjection(team, game, 3);
});
export const selectLeagueLeaders = (() => {
  const cache = new Map<string, (state: GameStoreState) => StatLeaderEntry[]>();
  return (stat: string, pos?: Position, season?: number) => {
    const key = `${stat}:${pos ?? ''}:${season ?? ''}`;
    let selector = cache.get(key);
    if (!selector) {
      selector = memoByGame((state) =>
        state.game ? getStatLeaderboard(state.game, stat, season, pos) : EMPTY_STAT_LEADERBOARD);
      cache.set(key, selector);
      if (cache.size > 32) cache.delete(cache.keys().next().value!);
    }
    return selector;
  };
})();
export const selectCareerStatLeaders = (() => {
  const cache = new Map<string, (state: GameStoreState) => CareerLeader[]>();
  return (stat: string, limit = 20) => {
    const key = `${stat}:${limit}`;
    let selector = cache.get(key);
    if (!selector) {
      selector = memoByGame((state) =>
        state.game ? getCareerLeaders(state.game, stat, limit) : EMPTY_CAREER_LEADERS);
      cache.set(key, selector);
      if (cache.size > 32) cache.delete(cache.keys().next().value!);
    }
    return selector;
  };
})();
export const selectPlayerTimeline = memoParamByGame((playerId: string, state: GameStoreState): CareerTimeline =>
  state.game ? getPlayerCareerTimeline(state.game, playerId) : emptyCareerTimeline(playerId));
export const selectPlayerCareerComparison = (() => {
  const cache = new Map<string, (state: GameStoreState) => PlayerComparison>();
  return (playerIds: string[]) => {
    const key = playerIds.sort().join(':');
    let selector = cache.get(key);
    if (!selector) {
      selector = memoByGame((state) => {
        const validIds = playerIds.filter((id) => id.length > 0);
        if (!state.game || validIds.length === 0) return EMPTY_PLAYER_COMPARISON;
        return comparePlayerCareers(state.game, validIds);
      });
      cache.set(key, selector);
      if (cache.size > 16) cache.delete(cache.keys().next().value!);
    }
    return selector;
  };
})();
export const selectTeamSeasonHistory = memoParamByGame((teamId: string, state: GameStoreState): TeamSeasonSummary[] =>
  state.game ? getTeamSeasonHistory(state.game, teamId) : EMPTY_TEAM_SEASON_HISTORY);
export const selectLeagueAverages = memoParamByGame((stat: string, state: GameStoreState): LeagueAverageEntry[] =>
  state.game ? getLeagueAverages(state.game, stat) : EMPTY_LEAGUE_AVERAGES);
export const selectPositionRankings = memoParamByGame((pos: Position, state: GameStoreState): PositionRanking[] =>
  state.game ? getPositionRankings(state.game, pos) : EMPTY_POSITION_RANKINGS);

// ── Franchise Setup ──────────────────────────────────
const SETUP_PHASES: readonly SetupPhase[] = PHASE_ORDER;
export const selectSetupState = (state: GameStoreState): SetupState | null =>
  state.game?.setupState ?? null;
export const selectSetupPhase = (state: GameStoreState): SetupPhase | null =>
  state.game?.setupState?.currentPhase ?? null;
export const selectSetupPhaseIndex = (state: GameStoreState): number => {
  const phase = state.game?.setupState?.currentPhase;
  if (!phase) return 0;
  return SETUP_PHASES.indexOf(phase);
};
export const selectSetupDecisions = (state: GameStoreState): SetupDecisions | null =>
  state.game?.setupState?.decisions ?? null;
export const selectSetupIncomplete = (state: GameStoreState): boolean => {
  if (!state.game?.setupState) return false;
  return state.game.setupState.completedPhases.length < PHASE_ORDER.length;
};
