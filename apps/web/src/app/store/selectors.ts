import type {
  AgentProfile,
  AwardsHistoryEntry,
  Ceremony,
  ConditionalPick,
  DifficultyState,
  DraftOrderEntry,
  DraftProspect,
  DynastyEvent,
  FacilityState,
  GameEvent,
  GameDayPackage,
  GameDayState,
  GameResult,
  GameState,
  HallOfFameEntry,
  LeagueRivalry,
  MentoringPair,
  MedicalStaff,
  NewsItem,
  OffseasonState,
  OffFieldEvent,
  NarrativeIntensity,
  PracticeSquadPlayer,
  Player,
  PowerRanking,
  PressConference,
  RecordBook,
  RecordEntry,
  RivalryGameContext,
  ScoutingDepartment,
  SeasonPhase,
  StoryArc,
  Team,
  TradeProposal,
  TutorialState,
  TradeOffer,
  TrainingAssignment,
  WaiverClaim,
  WaiverWireEntry,
  WeatherCondition,
  WeeklySummary,
  Handshake,
} from '@mfd/engine';
import {
  buildPlayoffPicture,
  calculateAdvancedStats,
  getAnalyticsStatLeaders,
  getPlayerComparison,
  getCooldownStatus,
  getPlayerAgent,
  getTeamRankings,
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
} from '@mfd/engine';

export interface GameStoreState {
  game: GameState | null;
  initialized: boolean;
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
const EMPTY_WAIVER_WIRE: WaiverWireEntry[] = [];
const EMPTY_WAIVER_CLAIMS: WaiverClaim[] = [];
const EMPTY_HANDSHAKES: Handshake[] = [];
const EMPTY_CONDITIONAL_PICKS: ConditionalPick[] = [];
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
const EMPTY_PLAYOFF_PICTURE = { afc: [], nfc: [] };
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

export const selectUserTeam = (state: GameStoreState): Team | null =>
  state.game ? Object.values(state.game.teams).find((team) => team.isUser) ?? null : null;

function selectCurrentMatchup(state: GameStoreState) {
  if (!state.game) return null;
  const team = selectUserTeam(state);
  if (!team) return null;
  const weekSchedule = state.game.schedule.find((entry) => entry.week === state.game!.week);
  return weekSchedule?.games.find((entry) => entry.homeTeamId === team.id || entry.awayTeamId === team.id) ?? null;
}

export const selectUserTeamId = (state: GameStoreState): string | null => selectUserTeam(state)?.id ?? null;
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
export const selectNarrativeIntensity = (state: GameStoreState) => {
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
};
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
export const selectCeremonies = (state: GameStoreState): Ceremony[] =>
  state.game
    ? [...state.game.ceremonies].sort((a, b) => b.year - a.year || b.id.localeCompare(a.id))
    : EMPTY_CEREMONIES;
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
export const selectConditionalPicks = (state: GameStoreState): ConditionalPick[] => state.game?.conditionalPicks ?? EMPTY_CONDITIONAL_PICKS;
export const selectWaiverOrder = (state: GameStoreState): string[] => state.game?.waiverOrder ?? EMPTY_IDS;
export const selectWaiverWire = (state: GameStoreState): WaiverWireEntry[] => state.game?.waiverWire ?? EMPTY_WAIVER_WIRE;
export const selectWaiverClaims = (state: GameStoreState): WaiverClaim[] => state.game?.waiverClaims ?? EMPTY_WAIVER_CLAIMS;
export const selectHandshakes = (state: GameStoreState): Handshake[] => state.game?.handshakes ?? EMPTY_HANDSHAKES;
export const selectLeagueNews = (state: GameStoreState): NewsItem[] =>
  state.game ? getRecentNews(state.game, state.game.leagueNews.length) : EMPTY_NEWS;
export const selectTeamNews = (state: GameStoreState): NewsItem[] => {
  if (!state.game) return EMPTY_NEWS;
  const teamId = selectUserTeamId(state);
  return teamId ? getTeamNews(state.game, teamId, 24) : EMPTY_NEWS;
};
export const selectTrainingAssignments = (state: GameStoreState): Record<string, TrainingAssignment> =>
  selectUserTeam(state)?.trainingAssignments ?? EMPTY_TRAINING_ASSIGNMENTS;
export const selectMedicalStaff = (state: GameStoreState) => ({
  current: selectUserTeam(state)?.medicalStaff ?? null,
  available: state.game?.availableMedicalStaff ?? EMPTY_MEDICAL_STAFF,
});
export const selectFatigueReport = (state: GameStoreState) => {
  if (!state.game) return [];
  const teamId = selectUserTeamId(state);
  return teamId ? getWorkloadReport(state.game, teamId) : [];
};
export const selectFacilities = (state: GameStoreState): FacilityState =>
  selectUserTeam(state)?.facilityState ?? EMPTY_FACILITY_STATE;
export const selectInjuryReport = (state: GameStoreState) =>
  selectRoster(state)
    .filter((player) => player.injury)
    .map((player) => ({ playerId: player.id, name: player.name, pos: player.pos, injury: player.injury! }));
export const selectDifficultyState = (state: GameStoreState): DifficultyState =>
  state.game?.difficultyState ?? EMPTY_DIFFICULTY_STATE;
export const selectAdvancedStats = (state: GameStoreState) => {
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
};
export const selectPlayoffMomentum = (state: GameStoreState) => {
  const teamId = selectUserTeamId(state);
  return teamId ? state.game?.playoffMomentum?.[teamId] ?? null : null;
};
export const selectDynastyTimeline = (state: GameStoreState): DynastyEvent[] => {
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
};
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
export const selectStandings = (state: GameStoreState) => {
  if (!state.game) return [];
  return STANDINGS_DIVISIONS.map(([conference, division]) => ({
    conference,
    division,
    rows: getDivisionStandings(state.game!, conference, division),
  }));
};
export const selectPlayoffPicture = (state: GameStoreState) =>
  state.game ? buildPlayoffPicture(state.game) : EMPTY_PLAYOFF_PICTURE;
export const selectStatLeaders = (state: GameStoreState) =>
  state.game ? getStatLeaders(state.game) : EMPTY_STAT_LEADERS;
export const selectAnalyticsLeaders = (state: GameStoreState) => {
  if (!state.game) return EMPTY_STAT_LEADERS;
  return {
    passYds: getAnalyticsStatLeaders(state.game, 'passYds', 5),
    rushYds: getAnalyticsStatLeaders(state.game, 'rushYds', 5),
    recYds: getAnalyticsStatLeaders(state.game, 'recYds', 5),
    sacks: getAnalyticsStatLeaders(state.game, 'sacks', 5),
    defINT: getAnalyticsStatLeaders(state.game, 'defINT', 5),
  };
};
export const selectPlayerComparison = (playerIdA: string | null, playerIdB: string | null) => (state: GameStoreState) => {
  if (!state.game || !playerIdA || !playerIdB) return null;
  return getPlayerComparison(state.game, playerIdA, playerIdB);
};
export const selectWeeklyTrend = (stat: 'pointsFor' | 'pointDifferential' | 'thirdDownConversions' | 'redZoneScores') => (state: GameStoreState) => {
  if (!state.game) return [];
  const teamId = selectUserTeamId(state);
  return teamId ? getWeeklyTrend(state.game, teamId, stat, 5) : [];
};
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
export const selectWaiverWirePlayers = (state: GameStoreState): Player[] => {
  if (!state.game) return EMPTY_PLAYERS;
  return state.game.waiverWire
    .map((entry) => state.game!.players[entry.playerId])
    .filter(Boolean) as Player[];
};
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
export const selectCurrentDraftEntry = (state: GameStoreState): DraftOrderEntry | null => {
  const offseasonState = state.game?.offseasonState;
  return offseasonState ? offseasonState.draftOrder[offseasonState.currentDraftPickIndex] ?? null : null;
};
export const selectUserPowerRanking = (state: GameStoreState): PowerRanking | null => {
  const userTeamId = selectUserTeamId(state);
  if (!userTeamId) return null;
  return selectPowerRankings(state).find((entry) => entry.teamId === userTeamId) ?? null;
};
export const selectUserMentoringPairs = (state: GameStoreState): MentoringPair[] => selectUserTeam(state)?.mentoringPairs ?? EMPTY_MENTORING;
export const selectUpcomingRivalry = (state: GameStoreState): RivalryGameContext | null => {
  if (!state.game) return null;
  const team = selectUserTeam(state);
  if (!team) return null;
  const matchup = selectCurrentMatchup(state);
  if (!matchup) return null;
  const opponentId = matchup.homeTeamId === team.id ? matchup.awayTeamId : matchup.homeTeamId;
  return getRivalryGameContext(state.game, team.id, opponentId);
};
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
export const selectCoachingCarouselNews = (state: GameStoreState): GameEvent[] =>
  state.game?.eventLog
    .filter((event) => event.type === 'coach_fired' || event.type === 'coach_hired')
    .slice(-6)
    .reverse() ?? EMPTY_GAME_EVENTS;
export const selectHistoricalMentoringChains = (state: GameStoreState): MentoringHistoryNote[] => {
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
};
export const selectUserRecordWatch = (state: GameStoreState): RecordWatchItem[] => {
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
};

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
