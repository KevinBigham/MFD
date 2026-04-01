import type {
  DraftOrderEntry,
  DraftProspect,
  GameDayPackage,
  GameDayState,
  GameState,
  OffseasonState,
  Player,
  SeasonPhase,
  StoryArc,
  Team,
  TradeOffer,
  WeeklySummary,
} from '@mfd/engine';

export interface GameStoreState {
  game: GameState | null;
  initialized: boolean;
}

export const selectUserTeam = (state: GameStoreState): Team | null =>
  state.game ? Object.values(state.game.teams).find((team) => team.isUser) ?? null : null;

export const selectUserTeamId = (state: GameStoreState): string | null => selectUserTeam(state)?.id ?? null;
export const selectRoster = (state: GameStoreState): Player[] => selectUserTeam(state)?.roster ?? [];
export const selectPlayerById = (id: string) => (state: GameStoreState): Player | null => state.game?.players[id] ?? null;
export const selectTeamById = (id: string) => (state: GameStoreState): Team | null => state.game?.teams[id] ?? null;
export const selectWeek = (state: GameStoreState): number => state.game?.week ?? 0;
export const selectYear = (state: GameStoreState): number => state.game?.year ?? 2026;
export const selectPhase = (state: GameStoreState): SeasonPhase => state.game?.phase ?? 'preseason';
export const selectOwnerState = (state: GameStoreState) => selectUserTeam(state)?.owner ?? null;
export const selectCoachingStaff = (state: GameStoreState) => selectUserTeam(state)?.staff ?? null;
export const selectClinic = (state: GameStoreState) => selectUserTeam(state)?.clinic ?? null;
export const selectCapInfo = (state: GameStoreState) => {
  const team = selectUserTeam(state);
  return team ? { capSpace: team.capSpace, capUsed: team.capUsed, deadCap: team.deadCap } : { capSpace: 0, capUsed: 0, deadCap: 0 };
};
export const selectSchedule = (state: GameStoreState) => state.game?.schedule ?? [];
export const selectNarrative = (state: GameStoreState) => state.game?.narrativeState ?? null;
export const selectActiveStoryArcs = (state: GameStoreState): StoryArc[] => state.game?.narrativeState.activeArcs ?? [];
export const selectLatestSummary = (state: GameStoreState): WeeklySummary | null => state.game?.weekSummaries.at(-1) ?? null;
export const selectPlayoffBracket = (state: GameStoreState) => state.game?.playoffBracket ?? null;
export const selectOffseasonState = (state: GameStoreState): OffseasonState | null => state.game?.offseasonState ?? null;
export const selectDraftClass = (state: GameStoreState): DraftProspect[] => state.game?.draftClass ?? [];
export const selectTradeOffers = (state: GameStoreState): TradeOffer[] => state.game?.offseasonState?.tradeOffers ?? [];
export const selectGameDayState = (state: GameStoreState): GameDayState | null => state.game?.gameDayState ?? null;
export const selectLatestGameDayPackage = (state: GameStoreState): GameDayPackage | null => {
  const gameDayState = state.game?.gameDayState;
  if (!gameDayState) return null;
  if (gameDayState.latestPackageId) {
    return gameDayState.recentPackages.find((entry) => entry.id === gameDayState.latestPackageId) ?? gameDayState.recentPackages.at(-1) ?? null;
  }
  return gameDayState.recentPackages.at(-1) ?? null;
};
export const selectFreeAgentPlayers = (state: GameStoreState): Player[] =>
  state.game ? state.game.freeAgents.map((playerId) => state.game!.players[playerId]).filter(Boolean) as Player[] : [];
export const selectCurrentDraftEntry = (state: GameStoreState): DraftOrderEntry | null => {
  const offseasonState = state.game?.offseasonState;
  return offseasonState ? offseasonState.draftOrder[offseasonState.currentDraftPickIndex] ?? null : null;
};
