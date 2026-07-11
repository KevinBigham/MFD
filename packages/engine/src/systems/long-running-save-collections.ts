import type { GameState } from '../types';

export const MEDIA_CYCLE_HISTORY_LIMIT = 34;

type MediaCycleLike = {
  weeklyDigests?: unknown[];
  powerRankingHistory?: unknown[];
};

type MediaCycleContainer = {
  mediaCycle?: MediaCycleLike;
};

function trimArray<T>(items: T[] | undefined, limit: number): T[] {
  if (!Array.isArray(items)) return [];
  return items.length > limit ? items.slice(-limit) : items;
}

export function trimMediaCycle(container: MediaCycleContainer): void {
  if (!container.mediaCycle) return;
  container.mediaCycle.weeklyDigests = trimArray(
    container.mediaCycle.weeklyDigests,
    MEDIA_CYCLE_HISTORY_LIMIT,
  );
  container.mediaCycle.powerRankingHistory = trimArray(
    container.mediaCycle.powerRankingHistory,
    MEDIA_CYCLE_HISTORY_LIMIT,
  );
}

export function trimLongRunningSaveCollections(game: GameState): GameState {
  trimMediaCycle(game);
  return game;
}

export function trimLongRunningSaveCollectionsRecord(
  state: Record<string, unknown>,
): Record<string, unknown> {
  const mediaCycle = state['mediaCycle'];
  if (!mediaCycle || typeof mediaCycle !== 'object') return state;

  trimMediaCycle({ mediaCycle: mediaCycle as MediaCycleLike });
  return state;
}
