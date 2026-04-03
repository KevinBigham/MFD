import type {
  AwardsHistoryEntry,
  ConditionalPick,
  DifficultyState,
  DraftOrderEntry,
  DraftProspect,
  GameEvent,
  GameDayPackage,
  GameDayState,
  GameResult,
  GameState,
  HallOfFameEntry,
  LeagueRivalry,
  MentoringPair,
  NewsItem,
  OffseasonState,
  OffFieldEvent,
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
  createDefaultDifficultyState,
  createEmptyRecordBook,
  getDivisionStandings,
  getRecentNews,
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
const EMPTY_ARCS: StoryArc[] = [];
const EMPTY_PROSPECTS: DraftProspect[] = [];
const EMPTY_TRADES: TradeOffer[] = [];
const EMPTY_PROPOSALS: TradeProposal[] = [];
const EMPTY_NEWS: NewsItem[] = [];
const EMPTY_AWARDS: AwardsHistoryEntry[] = [];
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
const EMPTY_DIFFICULTY_STATE: DifficultyState = createDefaultDifficultyState();
const EMPTY_PLAYOFF_PICTURE = { afc: [], nfc: [] };
const EMPTY_STAT_LEADERS = { passYds: [], rushYds: [], recYds: [], sacks: [], defINT: [] };
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
export const selectActiveStoryArcs = (state: GameStoreState): StoryArc[] => state.game?.narrativeState.activeArcs ?? EMPTY_ARCS;
export const selectLatestSummary = (state: GameStoreState): WeeklySummary | null => state.game?.weekSummaries.at(-1) ?? null;
export const selectPlayoffBracket = (state: GameStoreState) => state.game?.playoffBracket ?? null;
export const selectOffseasonState = (state: GameStoreState): OffseasonState | null => state.game?.offseasonState ?? null;
export const selectDraftClass = (state: GameStoreState): DraftProspect[] => state.game?.draftClass ?? EMPTY_PROSPECTS;
export const selectScoutingDepartment = (state: GameStoreState): ScoutingDepartment => state.game?.scoutingDepartment ?? EMPTY_SCOUTING_DEPARTMENT;
export const selectTradeOffers = (state: GameStoreState): TradeOffer[] => state.game?.offseasonState?.tradeOffers ?? EMPTY_TRADES;
export const selectActiveProposals = (state: GameStoreState): TradeProposal[] => state.game?.activeProposals ?? EMPTY_PROPOSALS;
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
export const selectDifficultyState = (state: GameStoreState): DifficultyState =>
  state.game?.difficultyState ?? EMPTY_DIFFICULTY_STATE;
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
