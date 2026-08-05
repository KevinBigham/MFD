import { useEffect } from 'react';
import { resolveCurrentAppRoute } from '../../app/currentAppRoute';
import { useGameStore } from '../../app/store/game-store';
import {
  CHIP_EVENT_CATEGORY_PRECEDENCE,
  buildSessionMuteNoticeEntry,
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
import { selectWeeklyDialogue, selectWeeklyReducedMotionPose, type WeeklyDialogueVariant } from './dialogue/weekly';
import { resolveResultOutcome } from './outcomeResolver';
import type { DialogueCatalogEntry } from './dialogue/types';
import { buildWeeklyGuidance, weeklyGuidanceToDialogueEntry } from './weeklyGuidance';
import { buildWeeklyConversation } from './conversation';
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
  teams?: Record<string, { id: string; city?: string; name?: string; isUser?: boolean; wins?: number; losses?: number; capSpace?: number; ownerId?: string }>;
  owners?: Record<string, { patience?: number }>;
  players?: Record<string, { teamId?: string | null; injury?: unknown; morale?: number }>;
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
  /** B7: queue a multi-beat conversation; falls back to showWeeklyDialogue
   * with the first beat when the store predates the queue machinery. */
  queueDialogue?: (entries: readonly DialogueCatalogEntry[]) => void;
  /** C13: append beats behind the active conversation. When absent, stacked
   * events keep the legacy replace behavior. */
  appendDialogueQueue?: (entries: readonly DialogueCatalogEntry[]) => void;
  /** C13: read the active-dialogue state for the append-vs-replace call. */
  getDialogueState?: () => {
    currentDialogueId: string | null;
    dismissed: boolean;
  };
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

/**
 * Counts trailing weeks whose derived outcome matches the current one, so Chip
 * can acknowledge repeats ("we talked about this"). Reuses deriveWeeklyOutcome
 * on week-slices so the streak logic (ugly/clean, blowout, three-loss) stays
 * defined in exactly one place. Returns undefined below two straight weeks.
 */
export function deriveConsecutiveOutcomeWeeks(game: AppGameLike | null): number | undefined {
  if (!game) return undefined;
  const summaries = game.weekSummaries ?? [];
  if (summaries.length < 2) return undefined;
  const current = deriveWeeklyOutcome(game);
  let count = 0;
  for (let end = summaries.length; end >= 1; end -= 1) {
    if (deriveWeeklyOutcome({ ...game, weekSummaries: summaries.slice(0, end) }) !== current) break;
    count += 1;
  }
  return count >= 2 ? count : undefined;
}

export function deriveWeeklyOutcome(game: AppGameLike | null): WeeklyDialogueVariant {  if (!game) return 'preseason';
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
  if (!summary || summary.result === 'pending') {
    // Pre-Week-1 (or an unplayed opener) has no results yet: serve the
    // preseason "lock depth before Week 1" guidance instead of midseason copy
    // that references standings and results that do not exist.
    if ((game.week ?? 0) <= 1) return 'preseason';
    return 'midseason';
  }
  // D8: ties are an explicit design decision, not a silent fallback. A tie
  // week serves the neutral 'midseason' variant — it is neither a win nor a
  // loss, so no margin or streak language applies. A tie also breaks loss
  // streaks: `isLossStreak` requires every trailing result to be a loss, so
  // L-L-T-L is a fresh single 'loss', not a continuing skid. The locked
  // outcome-variant list gains no tie entry; neutrality is deliberate.
  if (summary.result === 'tie') return 'midseason';

  // I2: the win/loss margin + streak core lives in outcomeResolver; only the
  // phase/championship/tie/no-result wrappers stay here.
  return resolveResultOutcome({
    result: summary.result,
    teamScore: summary.teamScore ?? 0,
    opponentScore: summary.opponentScore ?? 0,
    recentResults: (game.weekSummaries ?? []).map((entry) => entry?.result),
  }) ?? 'midseason';
}

function toGameSnapshot(state: AppGameStoreState): GameStoreSnapshot {
  const game = state.game;
  const userTeam = game?.teams ? Object.values(game.teams).find((team) => team.isUser) : null;
  const injuries = game?.players && userTeam
    ? Object.values(game.players).filter((player) => player.teamId === userTeam.id && player.injury).length
    : undefined;
  const userMorales = game?.players && userTeam
    ? Object.values(game.players)
      .filter((player) => player.teamId === userTeam.id && Number.isFinite(player.morale))
      .map((player) => Number(player.morale))
    : [];
  const averageMorale = userMorales.length > 0
    ? Math.round(userMorales.reduce((sum, morale) => sum + morale, 0) / userMorales.length)
    : undefined;
  const ownerPatience = userTeam?.ownerId ? game?.owners?.[userTeam.ownerId]?.patience : undefined;
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
    || averageMorale !== undefined
    || ownerPatience !== undefined
  )
    ? {
      record,
      opponentName: opponent ? `${opponent.city ?? ''} ${opponent.name ?? ''}`.trim() || undefined : undefined,
      injuryCount: injuries,
      pendingDecisionCount,
      capSpace: userTeam?.capSpace,
      dynastySeed: game?.seed,
      consecutiveOutcomeWeeks: deriveConsecutiveOutcomeWeeks(game),
      averageMorale,
      ownerPatience,
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
  // C13: the category of the most recently dispatched event, used for the
  // append-vs-replace precedence call on the next stacked event.
  let lastDispatchedCategory: ChipEvent['category'] | null = null;
  return {
    start: () => bridge.start(),
    stop: () => bridge.stop(),
    handleEvent: (event) => {
      const fallbackContext = {
        gameOutcome: event.gameOutcome,
        currentWeek: event.currentWeek,
        dynastySeed: event.dynastySeed,
      };
      const fallbackEntry = selectWeeklyDialogue(fallbackContext);
      const guidance = event.guidance ?? buildWeeklyGuidance({
        outcome: event.gameOutcome,
        currentWeek: event.currentWeek,
      });
      const entry = {
        ...fallbackEntry,
        ...weeklyGuidanceToDialogueEntry(guidance),
        id: fallbackEntry.id,
        // The guidance entry carries no reduced-motion pose; derive it from the
        // seeded canonical/alternate rotation instead of always serving the
        // canonical fallback's pose (B8).
        reducedMotionPose: selectWeeklyReducedMotionPose(fallbackContext),
      };
      // B7/H3: big moments queue a reaction beat + coaching beat; any beat
      // overflowing the bubble budget splits into sequential parts.
      const conversation = buildWeeklyConversation(guidance, entry, event.gameOutcome);
      // C13: stacked emotional moments queue instead of overwrite. When a
      // conversation is still active (not dismissed), a strictly
      // higher-precedence category preempts it; equal or lower precedence
      // appends behind the active beats so nothing the player has not read
      // is silently replaced. Stores without the C13 surface keep the
      // legacy replace behavior.
      const dialogueState = chipStore.getDialogueState?.();
      const hasActiveDialogue = Boolean(dialogueState?.currentDialogueId && !dialogueState.dismissed);
      const shouldAppend = Boolean(
        hasActiveDialogue
        && lastDispatchedCategory !== null
        && CHIP_EVENT_CATEGORY_PRECEDENCE[event.category] <= CHIP_EVENT_CATEGORY_PRECEDENCE[lastDispatchedCategory]
        && chipStore.appendDialogueQueue,
      );
      if (shouldAppend) {
        chipStore.appendDialogueQueue!(conversation);
      } else if (conversation.length > 1 && chipStore.queueDialogue) {
        chipStore.queueDialogue(conversation);
      } else {
        chipStore.showWeeklyDialogue(conversation[0] ?? entry);
      }
      lastDispatchedCategory = event.category;
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
      queueDialogue: (entries: readonly DialogueCatalogEntry[]) => {
        useChipStore.getState().queueDialogue(entries);
      },
      appendDialogueQueue: (entries: readonly DialogueCatalogEntry[]) => {
        useChipStore.getState().appendDialogueQueue(entries);
      },
      getDialogueState: () => {
        const state = useChipStore.getState();
        return {
          currentDialogueId: state.currentDialogueId,
          dismissed: state.dismissed,
        };
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
        onSessionMute: (category) => chipStore.showWeeklyDialogue(buildSessionMuteNoticeEntry(category)),
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
