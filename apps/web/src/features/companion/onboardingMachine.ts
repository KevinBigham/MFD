import type { RouteBeat } from '../route-coaching/routeBeatRegistry';

export const CHIP_ONBOARDING_STATE_STORAGE_KEY = 'mfd.chip.onboarding.v2';

export interface ChipOnboardingBeat extends RouteBeat {
  route: string;
}

export interface ChipOnboardingState {
  version: 1;
  completedBeatIds: string[];
  snoozedUntilWeek: number | null;
  disabled: boolean;
  lastUpdated: string;
}

export interface ChipOnboardingContext {
  currentWeek: number;
}

export const FIRST_TEN_MINUTE_ONBOARDING_BEATS: readonly ChipOnboardingBeat[] = [
  {
    id: 'chip.first10.monday-briefing',
    route: '/',
    pose: 'point-side',
    text: 'Must Do: open Monday Briefing. Where: Action Center. Consequence: Advance Week locks injuries, promises, deadlines, and opponent prep.',
    spotlightTarget: 'chip.route.monday-briefing.beat-1',
  },
  {
    id: 'chip.first10.roster',
    route: '/roster',
    pose: 'thinking',
    text: 'Recommended: open Roster before Game Plan. Where: injuries and first backups. Consequence: uncovered backups force emergency signings.',
    spotlightTarget: 'chip.route.roster.beat-1',
  },
  {
    id: 'chip.first10.depth-chart',
    route: '/depth-chart',
    pose: 'point-side',
    text: 'Must Do: save Depth Chart before kickoff. Where: starters and first backups. Consequence: missing role puts unassigned player on field.',
    spotlightTarget: 'chip.route.depth-chart.beat-1',
  },
  {
    id: 'chip.first10.game-plan',
    route: '/game-plan',
    pose: 'thinking',
    text: 'Recommended: set Game Plan after injuries. Where: offense, protection, coverage. Consequence: hurt starters need safer calls.',
    spotlightTarget: 'chip.route.game-plan.beat-1',
  },
  {
    id: 'chip.first10.week-advance',
    route: '/week-advance',
    pose: 'thinking',
    text: 'Must Do: start Advance Week last. Where: advance screen. Consequence: results, injuries, morale, deadlines, and opponent prep become final.',
    spotlightTarget: 'chip.route.week-advance.beat-1',
  },
] as const;

const FIRST_TEN_IDS = new Set(FIRST_TEN_MINUTE_ONBOARDING_BEATS.map((beat) => beat.id));

function nowIso(now: () => Date): string {
  return now().toISOString();
}

export function isFirstTenMinuteBeatId(beatId: string): boolean {
  return FIRST_TEN_IDS.has(beatId);
}

export function createInitialChipOnboardingState(now: () => Date = () => new Date()): ChipOnboardingState {
  return {
    version: 1,
    completedBeatIds: [],
    snoozedUntilWeek: null,
    disabled: false,
    lastUpdated: nowIso(now),
  };
}

function normalizeState(value: unknown): ChipOnboardingState | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<ChipOnboardingState>;
  if (candidate.version !== 1) return null;
  if (!Array.isArray(candidate.completedBeatIds)) return null;
  if (!candidate.completedBeatIds.every((id) => typeof id === 'string')) return null;
  if (candidate.snoozedUntilWeek !== null && typeof candidate.snoozedUntilWeek !== 'number') return null;
  if (typeof candidate.disabled !== 'boolean') return null;
  if (typeof candidate.lastUpdated !== 'string') return null;
  return {
    version: 1,
    completedBeatIds: [...new Set(candidate.completedBeatIds)].filter(isFirstTenMinuteBeatId),
    snoozedUntilWeek: candidate.snoozedUntilWeek,
    disabled: candidate.disabled,
    lastUpdated: candidate.lastUpdated,
  };
}

export function readChipOnboardingState(storage: Storage | null = null): ChipOnboardingState {
  if (!storage) return createInitialChipOnboardingState();
  let raw: string | null;
  try {
    raw = storage.getItem(CHIP_ONBOARDING_STATE_STORAGE_KEY);
  } catch {
    return createInitialChipOnboardingState();
  }
  if (!raw) return createInitialChipOnboardingState();

  try {
    return normalizeState(JSON.parse(raw) as unknown) ?? createInitialChipOnboardingState();
  } catch {
    return createInitialChipOnboardingState();
  }
}

export function writeChipOnboardingState(storage: Storage | null, state: ChipOnboardingState): ChipOnboardingState {
  const normalized = normalizeState(state) ?? createInitialChipOnboardingState();
  if (storage) {
    try {
      storage.setItem(CHIP_ONBOARDING_STATE_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // Session guidance must continue even if browser storage is blocked.
    }
  }
  return normalized;
}

export function recordChipOnboardingBeat(
  storage: Storage | null,
  beatId: string,
  now: () => Date = () => new Date(),
): ChipOnboardingState {
  const state = readChipOnboardingState(storage);
  if (!isFirstTenMinuteBeatId(beatId)) return state;
  const completedBeatIds = [...new Set([...state.completedBeatIds, beatId])];
  return writeChipOnboardingState(storage, {
    ...state,
    completedBeatIds,
    lastUpdated: nowIso(now),
  });
}

export function snoozeChipOnboarding(
  storage: Storage | null,
  currentWeek: number,
  now: () => Date = () => new Date(),
): ChipOnboardingState {
  return writeChipOnboardingState(storage, {
    ...readChipOnboardingState(storage),
    snoozedUntilWeek: Math.max(0, Math.trunc(currentWeek)),
    lastUpdated: nowIso(now),
  });
}

export function enableChipOnboarding(
  storage: Storage | null,
  now: () => Date = () => new Date(),
): ChipOnboardingState {
  return writeChipOnboardingState(storage, {
    ...readChipOnboardingState(storage),
    disabled: false,
    snoozedUntilWeek: null,
    lastUpdated: nowIso(now),
  });
}

export function resetChipOnboardingState(storage: Storage | null): void {
  try {
    storage?.removeItem(CHIP_ONBOARDING_STATE_STORAGE_KEY);
  } catch {
    // Resetting guidance must not break the settings controls.
  }
}

function normalizeRoute(route: string): string {
  const normalized = route.replace(/^#/, '').split('?')[0] || '/';
  return normalized === '' ? '/' : normalized;
}

function routeMatches(beatRoute: string, route: string): boolean {
  const normalized = normalizeRoute(route);
  if (beatRoute === '/') return normalized === '/';
  return normalized === beatRoute;
}

export function selectChipOnboardingRouteBeats(
  currentRoute: string,
  state: ChipOnboardingState,
  context: ChipOnboardingContext,
): readonly RouteBeat[] {
  if (state.disabled) return [];
  if (state.snoozedUntilWeek !== null && context.currentWeek <= state.snoozedUntilWeek) return [];
  const completed = new Set(state.completedBeatIds);
  const beat = FIRST_TEN_MINUTE_ONBOARDING_BEATS.find((entry) =>
    routeMatches(entry.route, currentRoute) && !completed.has(entry.id),
  );
  return beat ? [beat] : [];
}
