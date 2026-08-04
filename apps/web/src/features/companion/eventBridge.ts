import type { ChipPose } from '@mfd/design-system/components';
import type { DialogueCatalogEntry } from './dialogue/types';
import type { DockPrefs } from './dockPersistence';
import type { SetChipPoseOptions } from './store';
import type { WeeklyDialogueVariant } from './dialogue/weekly';
import { createChipMemoryStore, withChipMemoryEntry, type ChipMemoryStore } from './chipMemory';
import { buildWeeklyGuidance, type WeeklyGuidance, type WeeklyGuidanceInput } from './weeklyGuidance';

export type ChipEventTrigger = 'weekRollover' | 'gameComplete' | 'seasonEnd';
export type ChipEventCategory = ChipEventTrigger;
export type ChipPoseEventTrigger =
  | 'USER_TEAM_TOUCHDOWN'
  | 'USER_TEAM_FIRST_LAUNCH'
  | 'CAP_PROJECTION_OVER_LIMIT'
  | 'OWNER_PATIENCE_CRITICAL'
  | 'USER_TEAM_LOSS_BIG'
  | 'USER_TEAM_BLOWOUT_WIN'
  | 'USER_TEAM_SHUTOUT_WIN'
  | 'USER_TEAM_WIN_STREAK'
  | 'PLAYOFF_UPSET_WIN'
  | 'TRADE_RUMOR_FOR_USER_PLAYER'
  | 'PLAYER_RETIREMENT_USER_HOF'
  | 'USER_TRADE_COMPLETED'
  | 'USER_TEAM_RECORD_BROKEN'
  | 'USER_DRAFT_PICK_MADE'
  | 'USER_FREE_AGENT_SIGNING'
  | 'USER_TEAM_COMEBACK_WIN'
  | 'USER_TEAM_CLINCH'
  | 'USER_TEAM_ELIMINATED'
  | 'USER_TEAM_RIVALRY_WEEK'
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
  latestGameCompleteId?: string;
  latestSeasonEndId?: string;
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
  onSessionMute?: (category: ChipEventCategory) => void;
  /**
   * B5/B13: session memory sidecar. Read before weekly guidance is composed
   * (durable flavor anti-repeat) and written after it emits (outcome, flavor
   * line, Must Do advice). Recording happens only past the quiet-pref gate,
   * so quieted weeks form no memories. Defaults to the localStorage-backed
   * store; tests inject an in-memory one.
   */
  memory?: ChipMemoryStore;
}

export interface ChipEventBridge {
  start: () => void;
  stop: () => void;
}

const DISMISSALS_TO_SESSION_MUTE = 2;
/**
 * C13: dialogue-event precedence. When a new event lands while a conversation
 * is still active, a strictly higher-precedence category preempts (replaces)
 * the active one; equal or lower precedence appends behind the active queue
 * so stacked moments read in order instead of overwriting.
 */
export const CHIP_EVENT_CATEGORY_PRECEDENCE: Record<ChipEventCategory, number> = {
  weekRollover: 1,
  gameComplete: 2,
  seasonEnd: 3,
};
/**
 * C13: pose-trigger precedence — season-defining moments outrank single-game
 * emotional beats, which outrank transactional and ambient nudges. Within one
 * game-store transition, same-priority pose events resolve by this table
 * (highest wins) instead of by whichever order the emitter happened to push
 * them. Values are a total order over all triggers.
 */
export const POSE_EVENT_PRECEDENCE: Record<ChipPoseEventTrigger, number> = {
  USER_TEAM_ELIMINATED: 100,
  USER_TEAM_CLINCH: 95,
  PLAYER_RETIREMENT_USER_HOF: 90,
  USER_TEAM_RECORD_BROKEN: 85,
  PLAYOFF_UPSET_WIN: 80,
  USER_TEAM_COMEBACK_WIN: 75,
  USER_TEAM_SHUTOUT_WIN: 70,
  USER_TEAM_BLOWOUT_WIN: 65,
  USER_TEAM_LOSS_BIG: 60,
  USER_TEAM_WIN_STREAK: 55,
  OWNER_PATIENCE_CRITICAL: 50,
  CAP_PROJECTION_OVER_LIMIT: 45,
  USER_TRADE_COMPLETED: 40,
  USER_FREE_AGENT_SIGNING: 35,
  USER_DRAFT_PICK_MADE: 30,
  TRADE_RUMOR_FOR_USER_PLAYER: 25,
  USER_TEAM_RIVALRY_WEEK: 20,
  USER_TEAM_TOUCHDOWN: 15,
  USER_TEAM_FIRST_LAUNCH: 10,
  USER_DECISION_LOCKED_IN: 5,
};

/**
 * C13: order pose events for emission — ascending precedence with a stable id
 * tiebreak. Because the chip store resolves equal-priority conflicts
 * last-call-wins inside an active pose window, ascending order means the
 * highest-precedence trigger of the stack is the one that survives.
 */
export function sortPoseEventsByPrecedence(events: readonly ChipPoseEvent[]): ChipPoseEvent[] {
  return [...events].sort((a, b) =>
    POSE_EVENT_PRECEDENCE[a.trigger] - POSE_EVENT_PRECEDENCE[b.trigger]
    || a.id.localeCompare(b.id),
  );
}
/**
 * Session auto-mute transparency (E3): when the dismissal threshold mutes a
 * category for the session, Chip acknowledges it once instead of vanishing.
 */
export const SESSION_MUTE_NOTICE_TEXT =
  'Noted — I will not pop in on these again this session. Open Ask Chip in the dock whenever you want a word; a fresh session brings me back.';

export function buildSessionMuteNoticeEntry(category: ChipEventCategory): DialogueCatalogEntry {
  return {
    id: `chip.weekly.sessionMute.${category}`,
    beat: 0,
    pose: 'idle',
    text: SESSION_MUTE_NOTICE_TEXT,
    archetype: 'weekly',
    priority: 2,
  };
}
/**
 * categoryByDialogueId maps the *shown* dialogue entry id (`chip.weekly.guidance.<week>`)
 * to its event category so dismissal-mute attributes to the right category.
 * Entry ids grow one per week, so the map is FIFO-bounded.
 */
const MAX_DIALOGUE_CATEGORY_ENTRIES = 64;
const POSE_REACTIONS: Record<ChipPoseEventTrigger, ChipPoseReaction> = {
  USER_TEAM_TOUCHDOWN: { pose: 'rallying', durationMs: 4000, priority: 'celebrate' },
  USER_TEAM_FIRST_LAUNCH: { pose: 'greeting', durationMs: 5000, priority: 'routine' },
  CAP_PROJECTION_OVER_LIMIT: { pose: 'head-in-hands', durationMs: 3500, priority: 'warning' },
  OWNER_PATIENCE_CRITICAL: { pose: 'warning', durationMs: 5000, priority: 'warning' },
  USER_TEAM_LOSS_BIG: { pose: 'facepalm', durationMs: 6000, priority: 'sad' },
  USER_TEAM_BLOWOUT_WIN: { pose: 'celebrate', durationMs: 4500, priority: 'celebrate' },
  USER_TEAM_SHUTOUT_WIN: { pose: 'celebrate', durationMs: 4500, priority: 'celebrate' },
  USER_TEAM_WIN_STREAK: { pose: 'excited', durationMs: 4500, priority: 'celebrate' },
  PLAYOFF_UPSET_WIN: { pose: 'laughing', durationMs: 4000, priority: 'routine' },
  TRADE_RUMOR_FOR_USER_PLAYER: { pose: 'on-phone', durationMs: 3500, priority: 'routine' },
  PLAYER_RETIREMENT_USER_HOF: { pose: 'head-in-hands', durationMs: 4000, priority: 'sad' },
  USER_TRADE_COMPLETED: { pose: 'thumbs-up', durationMs: 4000, priority: 'celebrate' },
  USER_TEAM_RECORD_BROKEN: { pose: 'proud', durationMs: 4500, priority: 'celebrate' },
  USER_DRAFT_PICK_MADE: { pose: 'football-in-hand', durationMs: 4000, priority: 'celebrate' },
  USER_FREE_AGENT_SIGNING: { pose: 'wave', durationMs: 4000, priority: 'celebrate' },
  USER_TEAM_COMEBACK_WIN: { pose: 'rallying', durationMs: 4500, priority: 'celebrate' },
  USER_TEAM_CLINCH: { pose: 'proud', durationMs: 5000, priority: 'celebrate' },
  USER_TEAM_ELIMINATED: { pose: 'disappointed', durationMs: 5000, priority: 'sad' },
  USER_TEAM_RIVALRY_WEEK: { pose: 'rallying', durationMs: 4000, priority: 'routine' },
  USER_DECISION_LOCKED_IN: { pose: 'fist-bump', durationMs: 1500, priority: 'routine' },
};

export function resolveChipPoseReaction(trigger: ChipPoseEventTrigger): ChipPoseReaction {
  return POSE_REACTIONS[trigger];
}

export function createChipEventBridge(deps: CreateChipEventBridgeDeps): ChipEventBridge {
  let stopGameSubscription: (() => void) | null = null;
  let stopChipSubscription: (() => void) | null = null;
  const memory = deps.memory ?? createChipMemoryStore();
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

  function rememberDialogueCategory(dialogueId: string, category: ChipEventCategory): void {
    if (categoryByDialogueId.has(dialogueId)) categoryByDialogueId.delete(dialogueId);
    categoryByDialogueId.set(dialogueId, category);
    while (categoryByDialogueId.size > MAX_DIALOGUE_CATEGORY_ENTRIES) {
      const oldest = categoryByDialogueId.keys().next().value;
      if (oldest === undefined) break;
      categoryByDialogueId.delete(oldest);
    }
  }

  function emitDialogueEvent(category: ChipEventCategory, game: GameStoreSnapshot): void {
    if (!canEmit(category, game)) return;

    const gameOutcome = game.weeklyOutcome ?? 'midseason';
    const dialogueId = `chip.weekly.${gameOutcome}`;
    // B5: read memory before composing so the flavor pick can dodge the line
    // Chip served last time; record the actual served lines after.
    const priorMemory = memory.read();
    const guidance = buildWeeklyGuidance({
      outcome: gameOutcome,
      currentWeek: game.currentWeek,
      dynastySeed: game.dynastySeed,
      ...game.weeklyGuidance,
      eventTrigger: category,
      avoidFlavorLine: priorMemory.lastFlavor?.line,
    });
    const event: ChipEvent = {
      id: `chip.event.${category}.${game.currentSeason}.${game.currentWeek}`,
      trigger: category,
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
    rememberDialogueCategory(guidance.id, category);
    memory.write(withChipMemoryEntry(priorMemory, {
      outcome: { year: game.currentSeason, week: game.currentWeek, variant: gameOutcome },
      flavor: { variant: gameOutcome, line: guidance.sidelineNote },
      advice: { year: game.currentSeason, week: game.currentWeek, advice: guidance.mustDo },
    }));
    deps.onEvent(event);
  }

  function emitWeekRollover(game: GameStoreSnapshot): void {
    emitDialogueEvent('weekRollover', game);
  }

  function emitGameComplete(game: GameStoreSnapshot, previousState: GameStoreSnapshot): boolean {
    if (!game.latestGameCompleteId || game.latestGameCompleteId === previousState.latestGameCompleteId) return false;
    emitDialogueEvent('gameComplete', game);
    return true;
  }

  function emitSeasonEnd(game: GameStoreSnapshot, previousState: GameStoreSnapshot): boolean {
    if (!game.latestSeasonEndId || game.latestSeasonEndId === previousState.latestSeasonEndId) return false;
    emitDialogueEvent('seasonEnd', game);
    return true;
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
    const newEvents = (state.poseEvents ?? []).filter((event) => !previousIds.has(event.id));
    // C13: deliberate precedence order, not emitter push order — inside one
    // transition the highest-precedence trigger wins equal-priority ties.
    for (const event of sortPoseEventsByPrecedence(newEvents)) {
      emitPoseReaction(event);
    }
  }

  function handleGameTransition(state: GameStoreSnapshot, previousState: GameStoreSnapshot): void {
    const emittedSeasonEnd = emitSeasonEnd(state, previousState);
    const emittedGameComplete = emittedSeasonEnd ? false : emitGameComplete(state, previousState);

    if (
      !emittedSeasonEnd
      && !emittedGameComplete
      && (state.currentWeek > previousState.currentWeek || state.currentSeason > previousState.currentSeason)
    ) {
      emitWeekRollover(state);
    }
    emitNewPoseEvents(state, previousState);
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
      const alreadyMuted = sessionMutedCategories.has(category);
      sessionMutedCategories.add(category);
      if (!alreadyMuted) deps.onSessionMute?.(category);
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
