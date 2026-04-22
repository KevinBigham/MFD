import type { ChronicleEvent, ChronicleEventType } from './dynasty-chronicle';

const ALL_EVENT_TYPES: readonly ChronicleEventType[] = [
  'championship_win',
  'hof_induction',
  'playoff_round',
  'season_end',
  'coach_championship',
  'coach_hire',
  'coach_retire',
  'scrapbook_note',
];

export function listChronicleEventTypes(): readonly ChronicleEventType[] {
  return ALL_EVENT_TYPES;
}

export function countEventsByType(
  events: readonly ChronicleEvent[],
): Record<ChronicleEventType, number> {
  const counts: Record<ChronicleEventType, number> = {
    championship_win: 0,
    hof_induction: 0,
    playoff_round: 0,
    season_end: 0,
    coach_championship: 0,
    coach_hire: 0,
    coach_retire: 0,
    scrapbook_note: 0,
  };
  for (const event of events) {
    counts[event.type] += 1;
  }
  return counts;
}

export function filterChronicleEvents(
  events: readonly ChronicleEvent[],
  activeTypes: ReadonlySet<ChronicleEventType>,
): ChronicleEvent[] {
  return events.filter((event) => activeTypes.has(event.type));
}

export function createDefaultActiveTypes(): Set<ChronicleEventType> {
  return new Set(ALL_EVENT_TYPES);
}

export function toggleActiveType(
  active: ReadonlySet<ChronicleEventType>,
  type: ChronicleEventType,
): Set<ChronicleEventType> {
  const next = new Set(active);
  if (next.has(type)) {
    next.delete(type);
  } else {
    next.add(type);
  }
  return next;
}

export function isAllTypesActive(active: ReadonlySet<ChronicleEventType>): boolean {
  if (active.size !== ALL_EVENT_TYPES.length) return false;
  for (const type of ALL_EVENT_TYPES) {
    if (!active.has(type)) return false;
  }
  return true;
}
