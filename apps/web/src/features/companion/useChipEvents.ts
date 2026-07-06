import { useEffect } from 'react';
import { resolveCurrentAppRoute } from '../../app/currentAppRoute';
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
import { buildWeeklyGuidance, weeklyGuidanceToDialogueEntry } from './weeklyGuidance';
import { countPendingDecisions } from './decisionsPending';

interface AppWeeklySummaryLike {
  id?: string;
  year?: number;
  week?: number;
  phase?: string;
  teamId?: string;
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
  franchiseHistory?: readonly { teamId?: string; year?: number; playoffFinish?: string | null }[];
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

function latestCompletedSummary(game: AppGameLike): AppWeeklySummaryLike | null {
  const summaries = game.weekSummaries ?? [];
  for (let index = summaries.length - 1; index >= 0; index -= 1) {
    const summary = summaries[index];
    if (summary && summary.result !== 'pending') return summary;
  }
  return null;
}

function gameCompleteId(game: AppGameLike): string | undefined {
  const summary = latestCompletedSummary(game);
  if (!summary) return undefined;
  return summary.id ?? [
    'summary',
    summary.year ?? game.year,
    summary.week ?? game.week,
    summary.teamId ?? 'user',
    summary.result,
    summary.teamScore ?? 'na',
    summary.opponentScore ?? 'na',
  ].join(':');
}

function seasonEndId(game: AppGameLike, userTeamId?: string): string | undefined {
  if (game.phase !== 'offseason') return undefined;
  const histories = game.franchiseHistory ?? [];
  const userHistory = userTeamId
    ? histories.find((entry) => entry.teamId === userTeamId && entry.year === game.year)
    : undefined;
  const latestHistory = userHistory ?? histories.find((entry) => entry.year === game.year) ?? histories.at(-1);
  if (!latestHistory) return undefined;
  return [
    'season-end',
    latestHistory.year ?? game.year,
    latestHistory.teamId ?? userTeamId ?? 'league',
    latestHistory.playoffFinish ?? 'unknown',
  ].join(':');
}

export function deriveWeeklyOutcome(game: AppGameLike | null): WeeklyDialogueVariant {
  if (!game) return 'preseason';
  if (game.phase === 'preseason') return 'preseason';
  const userTeam = game.teams ? Object.values(game.teams).find((team) => team.isUser) : null;
  const latestUserHistory = game.franchiseHistory
    ?.filter((entry) => !userTeam || entry.teamId === userTeam.id)
    .at(-1);
  if (game.phase === 'offseason' && latestUserHistory?.playoffFinish === 'champion') return 'championship';
  if (game.phase === 'playoffs') {
    const latestHistory = latestUserHistory ?? game.franchiseHistory?.[game.franchiseHistory.length - 1];
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
    latestGameCompleteId: game ? gameCompleteId(game) : undefined,
    latestSeasonEndId: game ? seasonEndId(game, userTeam?.id) : undefined,
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
      const guidance = event.guidance ?? buildWeeklyGuidance({
        outcome: event.gameOutcome,
        currentWeek: event.currentWeek,
      });
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

interface ChipRouteLocation {
  hash?: string;
  pathname?: string;
}

export function resolveChipEventRoute(
  location: ChipRouteLocation | null | undefined = typeof window === 'undefined' ? null : window.location,
  basePath?: string,
): string {
  return resolveCurrentAppRoute(location, basePath);
}

function currentRoute(): string {
  return resolveChipEventRoute();
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
