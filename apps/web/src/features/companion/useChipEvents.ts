import { useEffect } from 'react';
import { useGameStore } from '../../app/store/game-store';
import {
  createChipEventBridge,
  type ChipEvent,
  type ChipEventBridge,
  type ChipStoreSnapshot,
  type GameStoreSnapshot,
  type SubscribableStore,
} from './eventBridge';
import { readDockPrefs, resolveDockStorage } from './dockPersistence';
import { isChipFeatureEnabled } from './ChipHost';
import { useChipStore } from './store';
import { selectWeeklyDialogue, type WeeklyDialogueVariant } from './dialogue/weekly';
import type { DialogueCatalogEntry } from './dialogue/types';

interface AppWeeklySummaryLike {
  result: 'win' | 'loss' | 'tie' | 'pending';
  teamScore: number | null;
  opponentScore: number | null;
}

interface AppGameLike {
  week: number;
  year: number;
  seed: number;
  phase: string;
  weekSummaries?: readonly AppWeeklySummaryLike[];
  franchiseHistory?: readonly { playoffFinish?: string | null }[];
}

interface AppGameStoreState {
  game: AppGameLike | null;
}

interface AppChipStoreState extends ChipStoreSnapshot {
  currentDialogueText?: string | null;
}

export interface UseChipEventsOptions {
  onEvent?: (event: ChipEvent) => void;
}

export interface ChipWeeklyDialogueStore {
  showWeeklyDialogue: (entry: DialogueCatalogEntry) => void;
}

export interface ChipEventsController {
  start: () => void;
  stop: () => void;
  handleEvent: (event: ChipEvent) => void;
}

export function isChipEventsEnabled(env: Record<string, string | boolean | undefined> = import.meta.env): boolean {
  return isChipFeatureEnabled(env);
}

function latestSummary(game: AppGameLike): AppWeeklySummaryLike | null {
  const summaries = game.weekSummaries ?? [];
  return summaries.length > 0 ? summaries[summaries.length - 1] ?? null : null;
}

export function deriveWeeklyOutcome(game: AppGameLike | null): WeeklyDialogueVariant {
  if (!game) return 'preseason';
  if (game.phase === 'preseason') return 'preseason';
  if (game.phase === 'playoffs') {
    const latestHistory = game.franchiseHistory?.[game.franchiseHistory.length - 1];
    if (latestHistory?.playoffFinish === 'champion') return 'championship';
    return 'playoffs';
  }

  const summary = latestSummary(game);
  if (!summary || summary.result === 'pending' || summary.result === 'tie') return 'midseason';

  const teamScore = summary.teamScore ?? 0;
  const opponentScore = summary.opponentScore ?? 0;
  const margin = teamScore - opponentScore;

  if (summary.result === 'win') {
    return margin <= 3 ? 'uglyWin' : 'cleanWin';
  }

  const summaries = game.weekSummaries ?? [];
  const lastThree = summaries.slice(-3);
  if (lastThree.length === 3 && lastThree.every((entry) => entry.result === 'loss')) {
    return 'threeLossStreak';
  }

  return margin <= -21 ? 'blowoutLoss' : 'loss';
}

function toGameSnapshot(state: AppGameStoreState): GameStoreSnapshot {
  const game = state.game;
  return {
    currentWeek: game?.week ?? 0,
    currentSeason: game?.year ?? 0,
    dynastySeed: game?.seed ?? 0,
    weeklyOutcome: deriveWeeklyOutcome(game),
  };
}

export function createGameStoreBridgeAdapter(
  store: SubscribableStore<AppGameStoreState>,
): SubscribableStore<GameStoreSnapshot> {
  return {
    getState: () => toGameSnapshot(store.getState()),
    subscribe: (listener) =>
      store.subscribe((state, previousState) => {
        listener(toGameSnapshot(state), toGameSnapshot(previousState));
      }),
  };
}

function toChipSnapshot(state: AppChipStoreState): ChipStoreSnapshot {
  return {
    dismissed: state.dismissed,
    currentDialogueId: state.currentDialogueId,
  };
}

export function createChipStoreBridgeAdapter(
  store: SubscribableStore<AppChipStoreState>,
): SubscribableStore<ChipStoreSnapshot> {
  return {
    getState: () => toChipSnapshot(store.getState()),
    subscribe: (listener) =>
      store.subscribe((state, previousState) => {
        listener(toChipSnapshot(state), toChipSnapshot(previousState));
      }),
  };
}

export function createChipEventsController({
  bridge,
  chipStore,
  onEvent,
}: {
  bridge: ChipEventBridge;
  chipStore: ChipWeeklyDialogueStore;
  onEvent?: (event: ChipEvent) => void;
}): ChipEventsController {
  return {
    start: () => bridge.start(),
    stop: () => bridge.stop(),
    handleEvent: (event) => {
      const entry = selectWeeklyDialogue({
        gameOutcome: event.gameOutcome,
        currentWeek: event.currentWeek,
        dynastySeed: event.dynastySeed,
      });
      chipStore.showWeeklyDialogue(entry);
      onEvent?.(event);
    },
  };
}

function currentRoute(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.hash.replace(/^#/, '') || window.location.pathname || '/';
}

export function useChipEvents(opts: UseChipEventsOptions = {}): void {
  useEffect(() => {
    if (!isChipEventsEnabled()) return undefined;

    const chipStore = {
      showWeeklyDialogue: (entry: DialogueCatalogEntry) => {
        useChipStore.getState().showWeeklyDialogue(entry);
      },
    };
    const gameStoreAdapter = createGameStoreBridgeAdapter({
      getState: () => ({ game: useGameStore.getState().game }),
      subscribe: (listener) =>
        useGameStore.subscribe((state, previousState) => {
          listener({ game: state.game }, { game: previousState.game });
        }),
    });
    const chipStoreAdapter = createChipStoreBridgeAdapter({
      getState: () => {
        const state = useChipStore.getState();
        return {
          dismissed: state.dismissed,
          currentDialogueId: state.currentDialogueId,
          currentDialogueText: state.currentDialogueText,
        };
      },
      subscribe: (listener) =>
        useChipStore.subscribe((state, previousState) => {
          listener(
            {
              dismissed: state.dismissed,
              currentDialogueId: state.currentDialogueId,
              currentDialogueText: state.currentDialogueText,
            },
            {
              dismissed: previousState.dismissed,
              currentDialogueId: previousState.currentDialogueId,
              currentDialogueText: previousState.currentDialogueText,
            },
          );
        }),
    });

    const controller = createChipEventsController({
      bridge: createChipEventBridge({
        gameStore: gameStoreAdapter,
        chipStore: chipStoreAdapter,
        dockPrefs: () => readDockPrefs(resolveDockStorage()),
        currentRoute,
        now: () => new Date(),
        setPose: (pose, options) => useChipStore.getState().setPose(pose, options),
        onEvent: (event) => controller.handleEvent(event),
      }),
      chipStore,
      onEvent: opts.onEvent,
    });

    controller.start();
    return () => {
      controller.stop();
    };
  }, [opts.onEvent]);
}
