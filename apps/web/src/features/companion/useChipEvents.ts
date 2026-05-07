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
import { weeklyGuidanceToDialogueEntry } from './weeklyGuidance';
import { countPendingDecisions } from './decisionsPending';

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
  teams?: Record<string, { id: string; city?: string; name?: string; isUser?: boolean; wins?: number; losses?: number; capSpace?: number }>;
  players?: Record<string, { teamId?: string | null; injury?: unknown }>;
  schedule?: readonly { week: number; games: readonly { homeTeamId: string; awayTeamId: string }[] }[];
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
  const userTeam = game?.teams ? Object.values(game.teams).find((team) => team.isUser) : null;
  const injuries = game?.players && userTeam
    ? Object.values(game.players).filter((player) => player.teamId === userTeam.id && player.injury).length
    : undefined;
  const matchup = game?.schedule?.find((week) => week.week === game.week)?.games.find((scheduledGame) =>
    scheduledGame.homeTeamId === userTeam?.id || scheduledGame.awayTeamId === userTeam?.id,
  );
  const opponentId = matchup && userTeam
    ? matchup.homeTeamId === userTeam.id ? matchup.awayTeamId : matchup.homeTeamId
    : null;
  const opponent = opponentId && game?.teams ? game.teams[opponentId] : null;
  const record = userTeam && typeof userTeam.wins === 'number' && typeof userTeam.losses === 'number'
    ? `${userTeam.wins}-${userTeam.losses}`
    : undefined;
  const pendingDecisionCount = game ? countPendingDecisions({ game }).total : undefined;
  const weeklyGuidance = game && (
    record !== undefined
    || opponent !== null
    || injuries !== undefined
    || (pendingDecisionCount ?? 0) > 0
    || userTeam?.capSpace !== undefined
  )
    ? {
      record,
      opponentName: opponent ? `${opponent.city ?? ''} ${opponent.name ?? ''}`.trim() || undefined : undefined,
      injuryCount: injuries,
      pendingDecisionCount,
      capSpace: userTeam?.capSpace,
    }
    : undefined;
  return {
    currentWeek: game?.week ?? 0,
    currentSeason: game?.year ?? 0,
    dynastySeed: game?.seed ?? 0,
    weeklyOutcome: deriveWeeklyOutcome(game),
    weeklyGuidance,
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
      const fallbackEntry = selectWeeklyDialogue({
        gameOutcome: event.gameOutcome,
        currentWeek: event.currentWeek,
        dynastySeed: event.dynastySeed,
      });
      const guidance = event.guidance ?? {
        id: `chip.weekly.guidance.${event.currentWeek}`,
        pose: fallbackEntry.pose,
        whatChanged: `Week ${event.currentWeek}: ${event.gameOutcome}.`,
        whyItMatters: fallbackEntry.text,
        topAction: 'Start with the Monday Briefing.',
        urgent: 'No single fire is louder than the weekly briefing yet.',
        canWait: 'Deep legacy screens can wait until the weekly loop is clear.',
        risk: 'Uncertainty is normal; make one football decision at a time.',
      };
      const entry = {
        ...fallbackEntry,
        ...weeklyGuidanceToDialogueEntry(guidance),
        id: fallbackEntry.id,
      };
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
