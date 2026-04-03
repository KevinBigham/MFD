import type { DynastyEvent, GameState } from '../types';

const IMPORTANCE_WEIGHT: Record<DynastyEvent['importance'], number> = {
  landmark: 3,
  major: 2,
  minor: 1,
};

function compareEvents(a: DynastyEvent, b: DynastyEvent): number {
  return (
    IMPORTANCE_WEIGHT[b.importance] - IMPORTANCE_WEIGHT[a.importance] ||
    b.year - a.year ||
    (b.week ?? 99) - (a.week ?? 99) ||
    a.id.localeCompare(b.id)
  );
}

export function recordDynastyEvent(game: GameState, event: DynastyEvent): DynastyEvent {
  game.dynastyTimeline ??= [];
  game.dynastyTimeline.push(event);
  return event;
}

export function getDynastyHighlights(game: GameState, count: number): DynastyEvent[] {
  game.dynastyTimeline ??= [];
  return [...game.dynastyTimeline].sort(compareEvents).slice(0, count);
}

export function getDynastyByYear(game: GameState, year: number): DynastyEvent[] {
  game.dynastyTimeline ??= [];
  return game.dynastyTimeline
    .filter((event) => event.year === year)
    .sort((a, b) => (a.week ?? 99) - (b.week ?? 99) || a.id.localeCompare(b.id));
}
