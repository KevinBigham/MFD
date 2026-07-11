import type { GameEvent, GameState } from '../types';

const SEMANTIC_PRIOR_YEAR_TYPES = new Set([
  'gm_strategy_shift',
  'coach_hired',
  'coach_fired',
  'coach_departed',
  'coach_promoted',
  'player_retired',
  'milestone',
  'off_field_event',
]);

const DISPOSABLE_PRIOR_YEAR_TYPES = new Set([
  'weekly_result',
  'playoff_result',
  'press_conference',
]);

const FOREVER_TYPES = new Set([
  'coach_retirement',
  'trade_deadline_resolved',
]);

const ID_PATTERNS: RegExp[] = [
  /^(?:weekly_result|playoff_result|coach_retirement|coach_hired|coach_fired|coach_departed|coach_promoted|off_field_event)-(\d{4})-(\d{1,2})-\d+$/,
  /^gm-strategy-.+-(\d{4})-\d+$/,
  /^trade-deadline-resolved-(\d{4})-(\d{1,2})$/,
];

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : null;
}

export function logicalEventTimestamp(year: number, week: number, index: number): number {
  return year * 1000 + week * 10 + index;
}

export function withEventDate(
  data: Record<string, unknown>,
  year: number | null | undefined,
  week: number | null | undefined,
): Record<string, unknown> {
  return {
    ...data,
    ...(typeof year === 'number' && Number.isFinite(year) ? { year: Math.trunc(year) } : {}),
    ...(typeof week === 'number' && Number.isFinite(week) ? { week: Math.trunc(week) } : {}),
  };
}

export function inferEventYearFromKnownIdPattern(event: Pick<GameEvent, 'id'>): number | null {
  const playerRetired = /^player-retired-.+-(\d{4})$/.exec(event.id);
  if (playerRetired) return Number(playerRetired[1]);

  for (const pattern of ID_PATTERNS) {
    const match = pattern.exec(event.id);
    if (match) return Number(match[1]);
  }
  return null;
}

export function inferEventWeekFromKnownIdPattern(event: Pick<GameEvent, 'id'>): number | null {
  const match = /^(?:weekly_result|playoff_result|coach_retirement|coach_hired|coach_fired|coach_departed|coach_promoted|off_field_event)-\d{4}-(\d{1,2})-\d+$/.exec(event.id)
    ?? /^trade-deadline-resolved-\d{4}-(\d{1,2})$/.exec(event.id);
  return match ? Number(match[1]) : null;
}

export function readGameEventYear(event: GameEvent, currentYear: number): number {
  const dataYear = finiteNumber(event.data?.['year']);
  if (dataYear !== null) return dataYear;

  const idYear = inferEventYearFromKnownIdPattern(event);
  if (idYear !== null) return idYear;

  return Math.min(Math.floor(event.timestamp / 1000), currentYear);
}

function readGameEventWeek(event: GameEvent): number | null {
  const dataWeek = finiteNumber(event.data?.['week']);
  if (dataWeek !== null) return dataWeek;
  return inferEventWeekFromKnownIdPattern(event);
}

export function backfillEventLogDates(game: Pick<GameState, 'eventLog' | 'year'>): void {
  game.eventLog = game.eventLog.map((event) => ({
    ...event,
    data: withEventDate(
      event.data ?? {},
      readGameEventYear(event, game.year),
      readGameEventWeek(event),
    ),
  }));
}

export function trimEventLogForRetention(game: Pick<GameState, 'eventLog' | 'year'>): void {
  const semantic: number[] = [];
  const disposable: number[] = [];
  const keep = new Set<number>();

  game.eventLog.forEach((event, index) => {
    const eventYear = readGameEventYear(event, game.year);
    if (eventYear === game.year || FOREVER_TYPES.has(event.type)) {
      keep.add(index);
      return;
    }
    if (SEMANTIC_PRIOR_YEAR_TYPES.has(event.type)) {
      semantic.push(index);
      return;
    }
    if (DISPOSABLE_PRIOR_YEAR_TYPES.has(event.type)) {
      disposable.push(index);
      return;
    }
    disposable.push(index);
  });

  for (const index of semantic.slice(-500)) keep.add(index);
  for (const index of disposable.slice(-100)) keep.add(index);
  game.eventLog = game.eventLog.filter((_event, index) => keep.has(index));
}

export function repairAndTrimEventLog(game: Pick<GameState, 'eventLog' | 'year'>): void {
  backfillEventLogDates(game);
  trimEventLogForRetention(game);
}

export function repairAndTrimEventLogRecord(state: Record<string, unknown>): Record<string, unknown> {
  if (!Array.isArray(state['eventLog'])) return state;
  const year = finiteNumber(state['year']) ?? Number.MAX_SAFE_INTEGER;
  const game = {
    year,
    eventLog: state['eventLog'] as GameEvent[],
  };
  repairAndTrimEventLog(game);
  return {
    ...state,
    eventLog: game.eventLog,
  };
}
