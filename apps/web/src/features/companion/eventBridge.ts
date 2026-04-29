import type { DockPrefs } from './dockPersistence';
import type { WeeklyDialogueVariant } from './dialogue/weekly';

export type ChipEventTrigger = 'weekRollover' | 'gameComplete' | 'seasonEnd';
export type ChipEventCategory = ChipEventTrigger;

export interface ChipEvent {
  id: string;
  trigger: ChipEventTrigger;
  category: ChipEventCategory;
  currentWeek: number;
  currentSeason: number;
  dynastySeed: number;
  gameOutcome: WeeklyDialogueVariant;
  dialogueId: string;
  occurredAt: string;
}

export interface GameStoreSnapshot {
  currentWeek: number;
  currentSeason: number;
  dynastySeed: number;
  weeklyOutcome?: WeeklyDialogueVariant;
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
  onEvent: (event: ChipEvent) => void;
}

export interface ChipEventBridge {
  start: () => void;
  stop: () => void;
}

const DISMISSALS_TO_SESSION_MUTE = 2;

export function createChipEventBridge(deps: CreateChipEventBridgeDeps): ChipEventBridge {
  let stopGameSubscription: (() => void) | null = null;
  let stopChipSubscription: (() => void) | null = null;
  const lastFiredByCategory = new Map<ChipEventCategory, number>();
  const consecutiveDismissalsByCategory = new Map<ChipEventCategory, number>();
  const sessionMutedCategories = new Set<ChipEventCategory>();
  const categoryByDialogueId = new Map<string, ChipEventCategory>();
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
    const event: ChipEvent = {
      id: `chip.event.weekRollover.${game.currentSeason}.${game.currentWeek}`,
      trigger: 'weekRollover',
      category,
      currentWeek: game.currentWeek,
      currentSeason: game.currentSeason,
      dynastySeed: game.dynastySeed,
      gameOutcome,
      dialogueId,
      occurredAt: deps.now().toISOString(),
    };

    lastFiredByCategory.set(category, game.currentWeek);
    lastEmittedCategory = category;
    categoryByDialogueId.set(dialogueId, category);
    deps.onEvent(event);
  }

  function handleGameTransition(state: GameStoreSnapshot, previousState: GameStoreSnapshot): void {
    if (state.currentWeek > previousState.currentWeek || state.currentSeason > previousState.currentSeason) {
      emitWeekRollover(state);
    }

    // Slice C will wire `gameComplete` once the broader event catalog exists.
    // Slice C will wire `seasonEnd` after season-summary dialogue variants exist.
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
