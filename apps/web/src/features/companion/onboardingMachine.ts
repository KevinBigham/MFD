import type { ChipPose } from '@mfd/design-system/components';

export const CHIP_ONBOARDING_PROGRESS_KEY = 'mfd.chip.onboarding.v2';
export const CHIP_ONBOARDING_SCHEMA_VERSION = 1;

export type ChipOnboardingStatus =
  | 'not_started'
  | 'intro_seen'
  | 'briefing_explained'
  | 'roster_explained'
  | 'gameplan_explained'
  | 'advance_week_explained'
  | 'post_advance_debrief_seen'
  | 'decision_impact_explained'
  | 'weekly_loop_established'
  | 'complete'
  | 'snoozed'
  | 'replay_requested';

export type ChipTriggerType =
  | 'app_opened'
  | 'setup_stage_advanced'
  | 'route_entered'
  | 'week_advanced'
  | 'decision_previewed'
  | 'what_now_requested'
  | 'replay_requested'
  | 'reset_requested';

export interface ChipContext {
  route?: string;
  currentWeek?: number;
  currentSeason?: number;
  pendingDecisions?: number;
  hasGamePlan?: boolean;
  hasInjuries?: boolean;
  difficulty?: string;
  surface?: string;
}

export interface ChipTrigger {
  type: ChipTriggerType;
  id: string;
  context: ChipContext;
  occurredAt: string;
}

export interface ChipBeat {
  id: string;
  state: ChipOnboardingStatus;
  pose: ChipPose;
  triggerTypes: readonly ChipTriggerType[];
  routeMatchers?: readonly string[];
  surfaceMatchers?: readonly string[];
  headline: string;
  text: string;
  actionLabel: string;
  featureLink: string | null;
}

export interface ChipRecommendation extends ChipBeat {
  triggerId: string;
  context: ChipContext;
}

export interface ChipProgress {
  schemaVersion: typeof CHIP_ONBOARDING_SCHEMA_VERSION;
  status: ChipOnboardingStatus;
  shownBeatIds: string[];
  snoozedUntilWeek: number | null;
  statusBeforeSnooze: ChipOnboardingStatus | null;
  lastTriggerId: string | null;
  lastRoute: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChipTriggerResult {
  progress: ChipProgress;
  recommendation: ChipRecommendation | null;
}

export const CHIP_FIRST_TEN_BEATS: readonly ChipBeat[] = [
  {
    id: 'chip.first10.welcome',
    state: 'intro_seen',
    pose: 'wave',
    triggerTypes: ['app_opened', 'replay_requested'],
    headline: 'Welcome to the chair',
    text: 'Welcome to the chair. You do not need to master the whole building today. Read the week, make one or two smart calls, then live with the result.',
    actionLabel: 'Start with the briefing',
    featureLink: '/',
  },
  {
    id: 'chip.first10.weekly-loop',
    state: 'weekly_loop_established',
    pose: 'talk',
    triggerTypes: ['setup_stage_advanced'],
    headline: 'Information, decision, consequence',
    text: 'Every week has the same backbone: information, decision, consequence. Briefing first, roster and injuries second, plan third, then advance.',
    actionLabel: 'Follow the weekly loop',
    featureLink: '/',
  },
  {
    id: 'chip.first10.briefing',
    state: 'briefing_explained',
    pose: 'point-right',
    triggerTypes: ['route_entered'],
    routeMatchers: ['/', '/briefing', '/monday-briefing'],
    headline: 'Read the board',
    text: 'Start with the Monday Briefing. It tells you what changed, what can hurt you this week, and which decision is most urgent.',
    actionLabel: 'Read the briefing',
    featureLink: '/',
  },
  {
    id: 'chip.first10.roster',
    state: 'roster_explained',
    pose: 'think',
    triggerTypes: ['route_entered'],
    routeMatchers: ['/roster', '/depth-chart'],
    headline: 'Check the bodies',
    text: 'Depth turns ratings into Sundays. Look for injured starters, thin positions, and the first backup who would decide the game if the plan breaks.',
    actionLabel: 'Check roster and depth',
    featureLink: '/roster',
  },
  {
    id: 'chip.first10.gameplan',
    state: 'gameplan_explained',
    pose: 'point-left',
    triggerTypes: ['route_entered'],
    routeMatchers: ['/game-plan', '/coaching'],
    headline: 'Match the plan to the roster',
    text: 'A game plan is a bet. Attack the opponent, but do not ask your own roster to survive a tradeoff it cannot handle.',
    actionLabel: 'Review game plan',
    featureLink: '/game-plan',
  },
  {
    id: 'chip.first10.advance-week',
    state: 'advance_week_explained',
    pose: 'warning',
    triggerTypes: ['route_entered'],
    routeMatchers: ['/week-advance'],
    headline: 'Check three doors',
    text: 'Before you advance, check three doors: depth chart, game plan, and urgent inbox. If those are clean, let the week breathe.',
    actionLabel: 'Use the checklist',
    featureLink: '/week-advance',
  },
  {
    id: 'chip.first10.post-advance',
    state: 'post_advance_debrief_seen',
    pose: 'mic-check',
    triggerTypes: ['week_advanced'],
    headline: 'The board changed',
    text: 'That result changed the board. Look first at injuries and standings, then decide whether this is a roster problem, a game-plan problem, or football variance.',
    actionLabel: 'Review the new week',
    featureLink: '/',
  },
  {
    id: 'chip.first10.decision-impact',
    state: 'decision_impact_explained',
    pose: 'concern',
    triggerTypes: ['decision_previewed', 'route_entered'],
    routeMatchers: ['/trades', '/contracts', '/cap-lab', '/cap-laboratory'],
    surfaceMatchers: ['trade', 'contract', 'cap', 'depth', 'gameplan'],
    headline: 'Decisions leave a trail',
    text: 'The right move should explain its bill. Look for immediate help, this-season cost, future pressure, and the risk if the room turns against it.',
    actionLabel: 'Read the impact',
    featureLink: '/trades',
  },
  {
    id: 'chip.first10.advanced-systems',
    state: 'complete',
    pose: 'idle',
    triggerTypes: ['what_now_requested'],
    headline: 'Depth opens when it matters',
    text: 'You do not need every wing today. Scouting, trades, cap lab, film room, standings, league pulse, and legacy systems matter most when the week points at them.',
    actionLabel: 'Keep playing the loop',
    featureLink: '/franchise',
  },
] as const;

const TERMINAL_STATUSES = new Set<ChipOnboardingStatus>(['complete']);

function normalizeRoute(route: string | undefined): string {
  const normalized = (route ?? '/').replace(/^#/, '').split('?')[0] || '/';
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function routeMatches(beat: ChipBeat, route: string | undefined): boolean {
  if (!beat.routeMatchers) return true;
  const normalized = normalizeRoute(route);
  return beat.routeMatchers.some((matcher) => normalized === matcher || normalized.startsWith(`${matcher}/`));
}

function surfaceMatches(beat: ChipBeat, surface: string | undefined): boolean {
  if (!beat.surfaceMatchers) return true;
  return typeof surface === 'string' && beat.surfaceMatchers.includes(surface);
}

function isProgress(value: unknown): value is ChipProgress {
  if (!value || typeof value !== 'object') return false;
  const progress = value as Partial<ChipProgress>;
  return (
    progress.schemaVersion === CHIP_ONBOARDING_SCHEMA_VERSION
    && typeof progress.status === 'string'
    && Array.isArray(progress.shownBeatIds)
    && progress.shownBeatIds.every((id) => typeof id === 'string')
    && (progress.snoozedUntilWeek === null || typeof progress.snoozedUntilWeek === 'number')
    && (progress.statusBeforeSnooze === null || typeof progress.statusBeforeSnooze === 'string')
    && (progress.lastTriggerId === null || typeof progress.lastTriggerId === 'string')
    && (progress.lastRoute === null || typeof progress.lastRoute === 'string')
    && (progress.completedAt === null || typeof progress.completedAt === 'string')
    && typeof progress.createdAt === 'string'
    && typeof progress.updatedAt === 'string'
  );
}

function unsnoozeIfExpired(progress: ChipProgress, trigger: ChipTrigger): ChipProgress {
  if (progress.status !== 'snoozed') return progress;
  const currentWeek = trigger.context.currentWeek;
  if (typeof currentWeek === 'number' && progress.snoozedUntilWeek !== null && currentWeek <= progress.snoozedUntilWeek) {
    return progress;
  }
  return {
    ...progress,
    status: progress.statusBeforeSnooze ?? 'not_started',
    snoozedUntilWeek: null,
    statusBeforeSnooze: null,
    updatedAt: trigger.occurredAt,
  };
}

function findNextBeat(progress: ChipProgress, trigger: ChipTrigger): ChipBeat | null {
  const shown = new Set(progress.shownBeatIds);
  for (const beat of CHIP_FIRST_TEN_BEATS) {
    if (!beat.triggerTypes.includes(trigger.type)) continue;
    if (shown.has(beat.id)) continue;
    if (!routeMatches(beat, trigger.context.route)) continue;
    if (!surfaceMatches(beat, trigger.context.surface)) continue;
    return beat;
  }
  return null;
}

export function createInitialChipProgress(createdAt = ''): ChipProgress {
  return {
    schemaVersion: CHIP_ONBOARDING_SCHEMA_VERSION,
    status: 'not_started',
    shownBeatIds: [],
    snoozedUntilWeek: null,
    statusBeforeSnooze: null,
    lastTriggerId: null,
    lastRoute: null,
    completedAt: null,
    createdAt,
    updatedAt: createdAt,
  };
}

export function readChipOnboardingProgress(storage: Storage | null): ChipProgress {
  if (!storage) return createInitialChipProgress();
  const raw = storage.getItem(CHIP_ONBOARDING_PROGRESS_KEY);
  if (!raw) return createInitialChipProgress();

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isProgress(parsed) ? parsed : createInitialChipProgress();
  } catch {
    return createInitialChipProgress();
  }
}

export function writeChipOnboardingProgress(storage: Storage | null, progress: ChipProgress): void {
  if (!storage) return;
  storage.setItem(CHIP_ONBOARDING_PROGRESS_KEY, JSON.stringify(progress));
}

export function resetChipOnboardingProgress(storage: Storage | null): ChipProgress {
  storage?.removeItem(CHIP_ONBOARDING_PROGRESS_KEY);
  return createInitialChipProgress();
}

export function snoozeChipOnboarding(
  progress: ChipProgress,
  options: { currentWeek: number; untilWeek: number; updatedAt: string },
): ChipProgress {
  return {
    ...progress,
    status: 'snoozed',
    snoozedUntilWeek: Math.max(options.currentWeek, options.untilWeek),
    statusBeforeSnooze: progress.status === 'snoozed' ? progress.statusBeforeSnooze : progress.status,
    updatedAt: options.updatedAt,
  };
}

export function requestChipOnboardingReplay(progress: ChipProgress, updatedAt: string): ChipProgress {
  return {
    ...progress,
    status: 'replay_requested',
    shownBeatIds: [],
    snoozedUntilWeek: null,
    statusBeforeSnooze: null,
    lastTriggerId: null,
    completedAt: null,
    updatedAt,
  };
}

export function applyChipOnboardingTrigger(progress: ChipProgress, trigger: ChipTrigger): ChipTriggerResult {
  if (trigger.type === 'reset_requested') {
    return {
      progress: createInitialChipProgress(trigger.occurredAt),
      recommendation: null,
    };
  }

  if (progress.lastTriggerId === trigger.id) {
    return { progress, recommendation: null };
  }

  const activeProgress = unsnoozeIfExpired(progress, trigger);
  if (activeProgress.status === 'snoozed') {
    return { progress: activeProgress, recommendation: null };
  }

  if (TERMINAL_STATUSES.has(activeProgress.status) && trigger.type !== 'replay_requested') {
    return { progress: activeProgress, recommendation: null };
  }

  const beat = findNextBeat(activeProgress, trigger);
  if (!beat) {
    return { progress: activeProgress, recommendation: null };
  }

  const shownBeatIds = [...activeProgress.shownBeatIds, beat.id];
  const nextProgress: ChipProgress = {
    ...activeProgress,
    status: beat.state,
    shownBeatIds,
    lastTriggerId: trigger.id,
    lastRoute: normalizeRoute(trigger.context.route),
    completedAt: beat.state === 'complete' ? trigger.occurredAt : activeProgress.completedAt,
    updatedAt: trigger.occurredAt,
  };

  return {
    progress: nextProgress,
    recommendation: {
      ...beat,
      triggerId: trigger.id,
      context: trigger.context,
    },
  };
}
