import type { ChipPose } from '@mfd/design-system/components';
import type { DockPrefs } from './dockPersistence';
import type { SetChipPoseOptions } from './store';
import type { WeeklyDialogueVariant } from './dialogue/weekly';
import { buildWeeklyGuidance, type WeeklyGuidance, type WeeklyGuidanceInput } from './weeklyGuidance';

export type ChipEventTrigger = 'weekRollover' | 'gameComplete' | 'seasonEnd';
export type ChipEventCategory = ChipEventTrigger;
export type ChipPoseEventTrigger =
  | 'USER_TEAM_TOUCHDOWN'
  | 'USER_TEAM_FIRST_LAUNCH'
  | 'CAP_PROJECTION_OVER_LIMIT'
  | 'USER_TEAM_LOSS_BIG'
  | 'PLAYOFF_UPSET_WIN'
  | 'TRADE_RUMOR_FOR_USER_PLAYER'
  | 'PLAYER_RETIREMENT_USER_HOF'
  | 'USER_DECISION_LOCKED_IN';
export type ChipPosePriority = NonNullable<SetChipPoseOptions['priority']>;

export interface ChipPoseEvent {
  id: string;
  trigger: ChipPoseEventTrigger;
}

export interface ChipPoseReaction {
  pose: ChipPose;
  durationMs: number;
  priority: ChipPosePriority;
}

export interface ChipEvent {
  id: string;
  trigger: ChipEventTrigger;
  category: ChipEventCategory;
  currentWeek: number;
  currentSeason: number;
  dynastySeed: number;
  gameOutcome: WeeklyDialogueVariant;
  dialogueId: string;
  guidance?: WeeklyGuidance;
  occurredAt: string;
}

export interface GameStoreSnapshot {
  currentWeek: number;
  currentSeason: number;
  dynastySeed: number;
  weeklyOutcome?: WeeklyDialogueVariant;
  weeklyGuidance?: Omit<WeeklyGuidanceInput, 'outcome' | 'currentWeek'>;
  poseEvents?: readonly ChipPoseEvent[];
}

export interface ChipStoreSnapshot {
  dismissed: boolean;
  currentDialogueId: string | null;
}

export interface SubscribableStore<TState> {
  getState: () => TState;
  subscribe: (listener: (state: TState, previousState: TState) => void) => () => void;
}

export interface CreateChipEventBridgeDeps {
  gameStore: SubscribableStore<GameStoreSnapshot>;
  chipStore: SubscribableStore<ChipStoreSnapshot>;
  dockPrefs: () => DockPrefs;
  currentRoute: () => string;
  now: () => Date;
  setPose?: (pose: ChipPose, options?: number | SetChipPoseOptions) => void;
  onEvent: (event: ChipEvent) => void;
}

export interface ChipEventBridge {
  start: () => void;
  stop: () => void;
}

const DISMISSALS_TO_SESSION_MUTE = 2;
const POSE_REACTIONS: Record<ChipPoseEventTrigger, ChipPoseReaction> = {
  USER_TEAM_TOUCHDOWN: { pose: 'rallying', durationMs: 4000, priority: 'celebrate' },
  USER_TEAM_FIRST_LAUNCH: { pose: 'greeting', durationMs: 5000, priority: 'routine' },
  CAP_PROJECTION_OVER_LIMIT: { pose: 'head-in-hands', durationMs: 3500, priority: 'warning' },
  USER_TEAM_LOSS_BIG: { pose: 'facepalm', durationMs: 6000, priority: 'sad' },
  PLAYOFF_UPSET_WIN: { pose: 'laughing', durationMs: 4000, priority: 'routine' },
  TRADE_RUMOR_FOR_USER_PLAYER: { pose: 'on-phone', durationMs: 3500, priority: 'routine' },
  PLAYER_RETIREMENT_USER_HOF: { pose: 'head-in-hands', durationMs: 4000, priority: 'sad' },
  USER_DECISION_LOCKED_IN: { pose: 'fist-bump', durationMs: 1500, priority: 'routine' },
};

export function resolveChipPoseReaction(trigger: ChipPoseEventTrigger): ChipPoseReaction {
  return POSE_REACTIONS[trigger];
}

export function createChipEventBridge(deps: CreateChipEventBridgeDeps): ChipEventBridge {
  let stopGameSubscription: (() => void) | null = null;
  let stopChipSubscription: (() => void) | null = null;
  const lastFiredByCategory = new Map<ChipEventCategory, number>();
  const consecutiveDismissalsByCategory = new Map<ChipEventCategory, number>();
  const sessionMutedCategories = new Set<ChipEventCategory>();
  const categoryByDialogueId = new Map<string, ChipEventCategory>();
  const emittedPoseEventIds = new Set<string>();
  let lastEmittedCategory: ChipEventCategory | null = null;

  function canEmit(category: ChipEventCategory, game: GameStoreSnapshot): boolean {
    if (sessionMutedCategories.has(category)) return false;
    if (deps.currentRoute().startsWith('/setup/')) return false;

    const prefs = deps.dockPrefs();
    if (prefs.quietUntilWeek !== null && game.currentWeek <= prefs.quietUntilWeek) return false;
    if (prefs.quietForSeason !== null && game.currentSeason <= prefs.quietForSeason) return false;

    const lastFiredWeek = lastFiredByCategory.get(category);
    return lastFiredWeek === undefined || game.currentWeek > lastFiredWeek;
  }

  function emitWeekRollover(game: GameStoreSnapshot): void {
    const category: ChipEventCategory = 'weekRollover';
    if (!canEmit(category, game)) return;

    const gameOutcome = game.weeklyOutcome ?? 'midseason';
    const dialogueId = `chip.weekly.${gameOutcome}`;
    const guidance = buildWeeklyGuidance({
      outcome: gameOutcome,
      currentWeek: game.currentWeek,
      ...game.weeklyGuidance,
    });
    const event: ChipEvent = {
      id: `chip.event.weekRollover.${game.currentSeason}.${game.currentWeek}`,
      trigger: 'weekRollover',
      category,
      currentWeek: game.currentWeek,
      currentSeason: game.currentSeason,
      dynastySeed: game.dynastySeed,
      gameOutcome,
      dialogueId,
      guidance,
      occurredAt: deps.now().toISOString(),
    };

    lastFiredByCategory.set(category, game.currentWeek);
    lastEmittedCategory = category;
    categoryByDialogueId.set(dialogueId, category);
    deps.onEvent(event);
  }

  function emitPoseReaction(event: ChipPoseEvent): void {
    if (emittedPoseEventIds.has(event.id)) return;

    const reaction = resolveChipPoseReaction(event.trigger);
    emittedPoseEventIds.add(event.id);
    deps.setPose?.(reaction.pose, {
      durationMs: reaction.durationMs,
      nowMs: deps.now().getTime(),
      priority: reaction.priority,
    });
  }

  function emitNewPoseEvents(state: GameStoreSnapshot, previousState: GameStoreSnapshot): void {
    const previousIds = new Set((previousState.poseEvents ?? []).map((event) => event.id));
    for (const event of state.poseEvents ?? []) {
      if (previousIds.has(event.id)) continue;
      emitPoseReaction(event);
    }
  }

  function handleGameTransition(state: GameStoreSnapshot, previousState: GameStoreSnapshot): void {
    if (state.currentWeek > previousState.currentWeek || state.currentSeason > previousState.currentSeason) {
      emitWeekRollover(state);
    }
    emitNewPoseEvents(state, previousState);

    // Slice C will wire `gameComplete` once the broader event catalog exists.
    // Slice C will wire `seasonEnd` after season-summary dialogue variants exist.
    // The high-stakes pose reactions above are intentionally fed by explicit
    // web-side poseEvents until the engine event spine exposes those signals.
  }

  function handleChipTransition(state: ChipStoreSnapshot, previousState: ChipStoreSnapshot): void {
    if (!state.dismissed || previousState.dismissed) return;

    const category =
      (previousState.currentDialogueId ? categoryByDialogueId.get(previousState.currentDialogueId) : undefined) ??
      (state.currentDialogueId ? categoryByDialogueId.get(state.currentDialogueId) : undefined) ??
      lastEmittedCategory;

    if (!category) return;

    const nextDismissals = (consecutiveDismissalsByCategory.get(category) ?? 0) + 1;
    consecutiveDismissalsByCategory.set(category, nextDismissals);

    if (nextDismissals >= DISMISSALS_TO_SESSION_MUTE) {
      sessionMutedCategories.add(category);
    }
  }

  return {
    start() {
      if (stopGameSubscription || stopChipSubscription) return;
      stopGameSubscription = deps.gameStore.subscribe(handleGameTransition);
      stopChipSubscription = deps.chipStore.subscribe(handleChipTransition);
    },
    stop() {
      stopGameSubscription?.();
      stopChipSubscription?.();
      stopGameSubscription = null;
      stopChipSubscription = null;
    },
  };
}
