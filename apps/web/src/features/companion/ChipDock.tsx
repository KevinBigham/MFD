import { cloneElement, isValidElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';
import { Check, MapPin, VolumeX, X } from 'lucide-react';
import { Chip, ChipDialogueBubble, PixelButton, Spotlight } from '@mfd/design-system/components';
import type { ChipPose } from '@mfd/design-system/components';
import { resolveCurrentAppRoute } from '../../app/currentAppRoute';
import {
  CHIP_INTRO_STORAGE_KEY,
  CHIP_ONBOARDING_STORAGE_KEY,
  isChipFeatureEnabled,
  readOnboardingSkipState,
  splitChipContextDetail,
} from './ChipHost';
import { useChipStore, useResolvedChipPose } from './store';
import type { DialogueCatalogEntry } from './dialogue/types';
import {
  CHIP_TYPEWRITER_SPEED_CHARS_PER_SECOND,
  CHIP_TYPEWRITER_SPEEDS,
  readDockPrefs,
  resolveDockStorage,
  updateDockPrefs,
  writeDockPrefs,
  createDefaultDockPrefs,
  type ChipTypewriterSpeed,
  type DockPosition,
  type DockPrefs,
} from './dockPersistence';
import {
  DOCK_CONTROL_BUTTONS,
  hasActiveQuietPrefs,
  isDockControlDisabled,
  resolveDockControlLabel,
  resolveDockControlPressed,
  resolveDockEscapeAction,
  type ChipDockControl,
  type DockControlStateInput,
} from './dockControlConfig';
import {
  clearChipReadReceipts,
  readChipReadReceipts,
  writeChipReadReceipts,
} from './readReceipts';
import { clearChipMemory } from './chipMemory';
import {
  enableChipOnboarding,
  isFirstTenMinuteBeatId,
  recordChipOnboardingBeat,
  resetChipOnboardingState,
  snoozeChipOnboarding,
} from './onboardingMachine';
import { formatDynastyIndicatorLabel, type DynastyIndicator } from './dynastyIndicator';
import { createWhereAmIBeat, type WhereAmIState } from './whereAmI';
import {
  ROUTE_DECISION_CATEGORY,
  type PendingDecisionCategoryKey,
  type PendingDecisionCounts,
} from './decisionsPending';
import { ALL_ROUTE_COACHING_BEAT_IDS, resolveRouteKey } from '../route-coaching/useActiveRouteBeats';
import { isTierOneRouteBeatId, type ChipRoutePose, type RouteBeat } from '../route-coaching/routeBeatRegistry';
import './ChipDock.css';

export type { ChipDockControl } from './dockControlConfig';

export interface ChipDockControlStore {
  setPose?: (pose: ChipPose) => void;
  dismiss?: () => void;
  reset?: () => void;
  showWeeklyDialogue?: (entry: DialogueCatalogEntry) => void;
  /** B7: conversation queue machinery for multi-beat weekly dialogue. */
  queueDialogue?: (entries: readonly DialogueCatalogEntry[]) => void;
  lastConversation?: DialogueCatalogEntry[] | null;
  lastWeeklyDialogue?: DialogueCatalogEntry | null;
}

export interface ApplyDockControlOptions {
  storage: Storage | null;
  chipStore?: ChipDockControlStore;
  currentRoute: string;
  currentWeek: number;
  currentSeason: number;
  now: () => Date;
}

export interface ChipDockProps {
  collapsed?: boolean;
  onCollapseToggle?: () => void;
  reducedMotion?: boolean;
  storage?: Storage | null;
  now?: () => Date;
  children?: ReactNode;
  currentRoute?: string;
  currentWeek?: number;
  currentSeason?: number;
  routeBeats?: readonly RouteBeat[];
  pendingDecisions?: Partial<PendingDecisionCounts>;
  whereAmI?: WhereAmIState;
  dynastyIndicator?: DynastyIndicator;
  /** E4: open the quiet menu on first render (test/demo affordance). */
  quietMenuDefaultOpen?: boolean;
  /** Render route beats already opened rather than as the compact bubble (test/demo affordance). */
  routeBeatDefaultOpen?: boolean;
}

const ROUTE_BEAT_DISMISS_CONTROLS = new Set<ChipDockControl>([
  'quietForScreen',
  'quietUntilNextWeek',
  'quietThisSeason',
  'collapse',
]);

const LIVE_BEAT_DISMISS_CONTROLS = new Set<ChipDockControl>([
  'quietForScreen',
  'quietUntilNextWeek',
  'quietThisSeason',
  'collapse',
]);

export interface RouteBeatQuietGateOptions {
  prefs: Pick<DockPrefs, 'quietForScreen' | 'quietUntilWeek' | 'quietForSeason'>;
  currentRoute: string;
  currentWeek: number;
  currentSeason: number;
}

export function isRouteCoachingQuieted({
  prefs,
  currentRoute,
  currentWeek,
  currentSeason,
}: RouteBeatQuietGateOptions): boolean {
  if (prefs.quietForScreen && prefs.quietForScreen === currentRoute) return true;
  if (prefs.quietForSeason !== null && prefs.quietForSeason === currentSeason) return true;
  if (prefs.quietUntilWeek !== null && currentWeek <= prefs.quietUntilWeek) return true;
  return false;
}

export interface RouteBeatProgressOptions {
  storage: Storage | null;
  beatIds: Iterable<string>;
  markBeatSeen?: (id: string) => void;
}

export interface DockLiveBeat {
  id: 'chip.dock.pending' | 'chip.dock.summary' | 'chip.dock.graduation';
  pose: ChipRoutePose;
  text: string;
}

export interface AskChipLiveBeatOptions {
  pendingDecisionTotal?: number | null;
  pendingDecisions?: Partial<PendingDecisionCounts> | null;
  whereAmI?: WhereAmIState | null;
  /** Current app route; lets Ask Chip lead with this screen's category (F6). */
  route?: string | null;
}

export interface EffectiveDockCollapsedOptions {
  activeRouteBeat: boolean;
  activeLiveBeat: boolean;
  controlledCollapsed?: boolean;
  localCollapsed: boolean;
  preferRouteBeatCollapsed?: boolean;
}

/** A Must Do the player has not read yet: the one route beat that opens the dock on its own. */
export function isMustDoRouteBeat(beat: Pick<RouteBeat, 'text'> | null): boolean {
  return beat !== null && /^must do\b/i.test(beat.text.trim());
}

/** Identifies one weekly message: ids repeat across weeks (same outcome and variant), the text does not always. */
export function weeklyDialogueKey(id: string | null, text: string | null): string | null {
  return id === null ? null : `${id}\u0000${text ?? ''}`;
}

/**
 * Chip has a weekly message the player has not opened yet: dialogue is showing in the store, a
 * dock child carries it, and this exact message has not been shown in the open dock.
 */
export function hasUnreadWeeklyDialogue({
  dialogueKey,
  hasDialogueChild,
  viewedKey,
}: {
  dialogueKey: string | null;
  hasDialogueChild: boolean;
  viewedKey: string | null;
}): boolean {
  return hasDialogueChild && dialogueKey !== null && dialogueKey !== viewedKey;
}

/**
 * What tapping the bubble opens when no route beat is waiting: an unread weekly message first (it
 * has no other way in once the dock is compact), otherwise the Ask Chip decision summary.
 */
export function resolveBubbleTapView(hasUnreadMessage: boolean): 'dialogue' | 'askChip' {
  return hasUnreadMessage ? 'dialogue' : 'askChip';
}

/**
 * Compact first: a waiting route beat keeps the dock as the small "Ask Chip" bubble, except
 * when an unread Must Do is waiting anywhere in this screen's beats on a desktop-width screen.
 * Phones always keep the bubble until it is tapped.
 */
export function shouldCollapseForRouteBeat({
  activeRouteBeat,
  waitingRouteBeats,
  phoneWidth,
  opened,
  closedByPlayer = false,
}: {
  activeRouteBeat: Pick<RouteBeat, 'text'> | null;
  /** Unread beats from the current one onward; defaults to just the active beat. */
  waitingRouteBeats?: ReadonlyArray<Pick<RouteBeat, 'text'>>;
  phoneWidth: boolean;
  opened: boolean;
  /** The player collapsed or quieted Chip on this screen: stay a bubble even if a Must Do is queued. */
  closedByPlayer?: boolean;
}): boolean {
  if (activeRouteBeat === null || opened) return false;
  if (closedByPlayer) return true;
  const waiting = waitingRouteBeats ?? [activeRouteBeat];
  return phoneWidth || !waiting.some(isMustDoRouteBeat);
}

export function resolveEffectiveDockCollapsed({
  activeRouteBeat,
  activeLiveBeat,
  controlledCollapsed,
  localCollapsed,
  preferRouteBeatCollapsed = false,
}: EffectiveDockCollapsedOptions): boolean {
  if (activeRouteBeat && preferRouteBeatCollapsed && !activeLiveBeat) return true;
  if (activeRouteBeat || activeLiveBeat) return false;
  return controlledCollapsed ?? localCollapsed;
}

export const PENDING_DECISION_COPY = [
  {
    key: 'tradeOffers',
    screen: 'Trades',
    consequence: 'offers expire',
  },
  {
    key: 'expiringContracts',
    screen: 'Contracts',
    consequence: 'players hit free agency',
  },
  {
    key: 'emptyDepthSlots',
    screen: 'Depth Chart',
    consequence: 'empty slots force unassigned backups',
  },
  {
    key: 'unspentPicks',
    screen: 'Draft',
    consequence: 'draft window closes',
  },
  {
    key: 'openStaffSlots',
    screen: 'Coaching',
    consequence: 'staff gaps slow practice',
  },
  {
    // D4: injury-only weeks surface injury copy ("Where: Roster (n)") instead
    // of the generic pending-decision text.
    key: 'injuries',
    screen: 'Roster',
    consequence: 'uncovered injuries force unassigned backups',
  },
] as const satisfies readonly {
  key: keyof Omit<PendingDecisionCounts, 'total'>;
  screen: string;
  consequence: string;
}[];

type PendingDecisionBeatInput = number | Partial<PendingDecisionCounts> | null | undefined;

function countFromPendingInput(input: PendingDecisionBeatInput, key: keyof PendingDecisionCounts): number {
  if (typeof input === 'number') return key === 'total' ? Math.max(0, Math.trunc(input)) : 0;
  return Math.max(0, Math.trunc(Number(input?.[key] ?? 0)));
}

function formatPlainList(values: readonly string[]): string {
  if (values.length === 0) return '';
  if (values.length === 1) return values[0]!;
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

export function createPendingDecisionsBeat(
  input: PendingDecisionBeatInput,
  leadCategory: PendingDecisionCategoryKey | null = null,
): DockLiveBeat {
  const total = Math.max(1, countFromPendingInput(input, 'total'));
  const categories = typeof input === 'number'
    ? []
    : PENDING_DECISION_COPY
      .map((entry) => ({ ...entry, count: countFromPendingInput(input, entry.key) }))
      .filter((entry) => entry.count > 0)
      // F6: the category that owns the current screen leads; stable sort keeps
      // the canonical order for everything else.
      .sort((a, b) => (a.key === leadCategory ? -1 : b.key === leadCategory ? 1 : 0));
  const categoryCopy = categories.length > 0
    ? {
        screenList: formatPlainList(categories.map((entry) => `${entry.screen} (${entry.count})`)),
        consequenceList: formatPlainList(categories.map((entry) => entry.consequence)),
      }
    : null;

  return {
    id: 'chip.dock.pending',
    pose: 'reviewing-tablet',
    text: categoryCopy
      ? `Must Do: choose or defer before Advance Week. Where: ${categoryCopy.screenList}. Consequence: ${categoryCopy.consequenceList}.`
      : total === 1
        ? 'Must Do: choose or defer 1 decision before Advance Week. Where: Inbox, Action Center, or highlighted screen badge. Consequence: the offer, promise, vote, cap, lineup, or morale choice expires or locks at Advance Week.'
        : `Must Do: choose or defer ${total} decisions before Advance Week. Where: Inbox, Action Center, or highlighted screen badges. Consequence: offers, promises, votes, cap, lineup, and morale expire or lock at Advance Week.`,
  };
}

/**
 * Pending-badge tooltip (E6): the count alone does not say what is pending, so
 * focus/hover names the categories with their counts.
 */
export function formatPendingBadgeTitle(input: PendingDecisionBeatInput): string {
  const total = Math.max(0, countFromPendingInput(input, 'total'));
  const categories = typeof input === 'number'
    ? []
    : PENDING_DECISION_COPY
      .map((entry) => ({ ...entry, count: countFromPendingInput(input, entry.key) }))
      .filter((entry) => entry.count > 0);
  const base = `${total} decision${total === 1 ? '' : 's'} pending`;
  if (categories.length === 0) return base;
  return `${base}: ${categories.map((entry) => `${entry.screen} (${entry.count})`).join(', ')}`;
}

export const ASK_CHIP_FALLBACK_BEAT: DockLiveBeat = {
  id: 'chip.dock.summary',
  pose: 'thinking',
  text: 'Must Do: open Monday Briefing. Where: Action Center. Consequence: Advance Week locks saved lineups, cap moves, morale, and matchup calls.',
};

/**
 * H5: cross-fade between poses in the dock. When the portrait pose changes,
 * the previous pose renders once more as an outgoing layer that fades out on
 * top of the arriving pose (which plays the design system's art-arrive
 * animation). Reduced-motion renders skip the outgoing layer — a hard cut.
 * First render (and SSR) has no previous pose, so markup stays deterministic.
 * Implemented web-side rather than inside the design-system Chip so the
 * hook-free element-tree harness for Chip keeps working unchanged.
 */
export function DockPoseCrossfade({ pose, reducedMotion }: { pose: ChipPose; reducedMotion: boolean }) {
  const previousPoseRef = useRef<ChipPose | null>(null);
  const [outgoingPose, setOutgoingPose] = useState<ChipPose | null>(null);
  useEffect(() => {
    const previous = previousPoseRef.current;
    if (previous !== null && previous !== pose && !reducedMotion) {
      setOutgoingPose(previous);
    }
    previousPoseRef.current = pose;
  }, [pose, reducedMotion]);

  return (
    <span className="mfd-chip-dock__crossfade" data-chip-pose-crossfade={outgoingPose ? 'fading' : 'idle'}>
      <Chip pose={pose} size="lg" reducedMotion={reducedMotion} />
      {outgoingPose ? (
        <span
          className="mfd-chip-dock__crossfade-outgoing"
          data-chip-pose-crossfade-outgoing={outgoingPose}
          aria-hidden="true"
          onAnimationEnd={() => setOutgoingPose(null)}
        >
          <Chip pose={outgoingPose} size="lg" reducedMotion={false} />
        </span>
      ) : null}
    </span>
  );
}

export function createAskChipLiveBeat({
  pendingDecisionTotal = 0,
  pendingDecisions = null,
  whereAmI = null,
  route = null,
}: AskChipLiveBeatOptions): DockLiveBeat | null {
  const total = Math.max(0, Math.trunc(Number(pendingDecisions?.total ?? pendingDecisionTotal ?? 0)));
  if (total > 0) {
    const routeKey = route ? resolveRouteKey(route) : null;
    const leadCategory: PendingDecisionCategoryKey | null = routeKey
      ? ROUTE_DECISION_CATEGORY[routeKey] ?? null
      : null;
    return createPendingDecisionsBeat(pendingDecisions ?? total, leadCategory);
  }
  if (whereAmI) return createWhereAmIBeat(whereAmI);
  // Ask Chip must never be a dead button: with no pending decisions and no
  // game context yet, still answer with the weekly orientation beat.
  return { ...ASK_CHIP_FALLBACK_BEAT };
}

/**
 * G7: one-time graduation notice, shown when every route-coaching beat (the
 * first-ten tour plus all registry beats) has been read. After it, Chip is
 * advisor-only: no more unsolicited route coaching, Ask Chip stays.
 */
export const CHIP_GRADUATION_BEAT: DockLiveBeat = {
  id: 'chip.dock.graduation',
  pose: 'proud',
  text: "Every screen toured, coach. I'm on call from here — Ask Chip when you need me.",
};

/** G7: true when every route-coaching beat id has been read or session-seen. */
export function isRouteCoachingGraduated(
  durableReadReceipts: ReadonlySet<string>,
  sessionSeenBeats: ReadonlySet<string>,
): boolean {
  return ALL_ROUTE_COACHING_BEAT_IDS.every(
    (id) => durableReadReceipts.has(id) || sessionSeenBeats.has(id),
  );
}

export function persistRouteBeatProgress({
  storage,
  beatIds,
  markBeatSeen,
}: RouteBeatProgressOptions): Set<string> {
  const ids = [...beatIds].filter((id) => id.length > 0);
  const persisted = writeChipReadReceipts(storage, ids);
  for (const id of ids) {
    markBeatSeen?.(id);
    try {
      recordChipOnboardingBeat(storage, id);
    } catch {
      // Session acknowledgement must still advance Chip when storage is blocked.
    }
  }
  return persisted;
}

export function resolveNextRouteBeatIndex(
  currentIndex: number,
  routeBeats: readonly RouteBeat[],
): { nextIndex: number; complete: boolean } {
  const nextIndex = Math.min(currentIndex + 1, Math.max(routeBeats.length - 1, 0));
  return {
    nextIndex,
    complete: currentIndex >= routeBeats.length - 1,
  };
}

export function routeBeatActionLabel(
  currentIndex: number,
  routeBeats: readonly RouteBeat[],
): 'Next' | 'Got it' {
  return currentIndex >= routeBeats.length - 1 ? 'Got it' : 'Next';
}

export function filterUnseenRouteBeats(
  routeBeats: readonly RouteBeat[],
  durableReadReceipts: ReadonlySet<string>,
  sessionSeenBeats: ReadonlySet<string>,
): readonly RouteBeat[] {
  return routeBeats.filter((beat) =>
    !durableReadReceipts.has(beat.id) && !sessionSeenBeats.has(beat.id));
}

export function routeBeatPoseToChipPose(pose: ChipRoutePose): ChipPose {
  switch (pose) {
    case 'idle':
      return 'idle';
    case 'point-down':
    case 'point-side':
      return 'point-right';
    case 'cheer':
      return 'celebrate';
    case 'thinking':
      return 'think';
    case 'reviewing-tablet':
    case 'calling-play':
    case 'note-taking':
    case 'skeptical':
    case 'on-phone':
    case 'pointing-at-tape':
    case 'proud':
    case 'coffee-sip':
    case 'whistle-blow':
    case 'coaching-crouch':
    case 'time-out':
    case 'football-in-hand':
      return pose;
  }
}

function removeStorageItem(storage: Storage | null, key: string): void {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // Chip controls must remain usable when browser storage is blocked.
  }
}

export function applyDockControl(control: ChipDockControl, options: ApplyDockControlOptions): DockPrefs {
  const prefs = readDockPrefs(options.storage);
  const chipStore = options.chipStore;

  switch (control) {
    case 'whatNow':
      // B7: replay the full conversation when one was queued, so the
      // reaction beat lands before the coaching beat again.
      if (chipStore?.lastConversation?.length && chipStore.queueDialogue) {
        chipStore.queueDialogue(chipStore.lastConversation);
      } else if (chipStore?.lastWeeklyDialogue) {
        chipStore.showWeeklyDialogue?.(chipStore.lastWeeklyDialogue);
      }
      return prefs;
    case 'resetOnboarding':
      resetChipOnboardingState(options.storage);
      clearChipReadReceipts(options.storage, isFirstTenMinuteBeatId);
      clearChipMemory(options.storage);
      removeStorageItem(options.storage, CHIP_ONBOARDING_STORAGE_KEY);
      removeStorageItem(options.storage, CHIP_INTRO_STORAGE_KEY);
      chipStore?.reset?.();
      return prefs;
    case 'snoozeOnboarding':
      snoozeChipOnboarding(options.storage, options.currentWeek, options.now);
      chipStore?.dismiss?.();
      return prefs;
    case 'enableGuidance':
      enableChipOnboarding(options.storage, options.now);
      removeStorageItem(options.storage, CHIP_ONBOARDING_STORAGE_KEY);
      return updateDockPrefs(
        options.storage,
        {
          quietForScreen: null,
          quietUntilWeek: null,
          quietForSeason: null,
        },
        options.now,
      );
    case 'quietForScreen':
      chipStore?.setPose?.('idle');
      chipStore?.dismiss?.();
      return updateDockPrefs(
        options.storage,
        {
          collapsed: true,
          quietForScreen: options.currentRoute,
        },
        options.now,
      );
    case 'quietUntilNextWeek':
      chipStore?.dismiss?.();
      return updateDockPrefs(
        options.storage,
        {
          collapsed: true,
          quietUntilWeek: options.currentWeek,
        },
        options.now,
      );
    case 'quietThisSeason':
      chipStore?.dismiss?.();
      return updateDockPrefs(
        options.storage,
        {
          collapsed: true,
          quietForSeason: options.currentSeason,
        },
        options.now,
      );
    case 'reduceGuidance':
      return updateDockPrefs(
        options.storage,
        {
          reducedGuidance: !prefs.reducedGuidance,
        },
        options.now,
      );
    case 'disableAnimations':
      chipStore?.setPose?.('idle');
      return updateDockPrefs(
        options.storage,
        {
          animationsDisabled: !prefs.animationsDisabled,
        },
        options.now,
      );
    case 'typewriterSpeed': {
      const current = prefs.typewriterSpeed ?? 'normal';
      const next = CHIP_TYPEWRITER_SPEEDS[
        (CHIP_TYPEWRITER_SPEEDS.indexOf(current) + 1) % CHIP_TYPEWRITER_SPEEDS.length
      ]!;
      return updateDockPrefs(
        options.storage,
        {
          typewriterSpeed: next,
        },
        options.now,
      );
    }
    case 'dockPosition':
      return updateDockPrefs(
        options.storage,
        {
          dockPosition: (prefs.dockPosition ?? 'right') === 'right' ? 'left' : 'right',
        },
        options.now,
      );
    case 'collapse':
      return updateDockPrefs(
        options.storage,
        {
          collapsed: true,
        },
        options.now,
      );
    case 'expand':
      enableChipOnboarding(options.storage, options.now);
      removeStorageItem(options.storage, CHIP_ONBOARDING_STORAGE_KEY);
      return updateDockPrefs(
        options.storage,
        {
          quietForScreen: null,
          quietUntilWeek: null,
          quietForSeason: null,
        },
        options.now,
      );
  }
}

interface ChipDockRouteLocation {
  hash?: string;
  pathname?: string;
}

export function resolveChipDockRoute(
  fallback: string,
  location: ChipDockRouteLocation | null | undefined = typeof window === 'undefined' ? null : window.location,
  basePath?: string,
): string {
  if (fallback) return fallback;
  if (!location) return 'screen';
  return resolveCurrentAppRoute(location, basePath);
}

export function ChipDock({
  collapsed,
  onCollapseToggle,
  reducedMotion = false,
  storage,
  now = () => new Date(),
  children,
  currentRoute = '',
  currentWeek = 0,
  currentSeason = 0,
  routeBeats = [],
  pendingDecisions,
  whereAmI,
  dynastyIndicator,
  quietMenuDefaultOpen = false,
  routeBeatDefaultOpen = false,
}: ChipDockProps) {
  const backingStorage = storage === undefined ? resolveDockStorage() : storage;
  const [prefs, setPrefs] = useState<DockPrefs>(() =>
    backingStorage === null ? createDefaultDockPrefs() : readDockPrefs(backingStorage),
  );
  const seenBeatIds = useChipStore((state) => state.seenBeats);
  // Subscribe for live updates, then render from getState(): zustand serves
  // getInitialState during SSR snapshots, so the subscribed value alone would
  // hide the weekly details in server-rendered output (same pattern as
  // useResolvedChipPose).
  useChipStore((state) => state.currentDialogueId);
  useChipStore((state) => state.currentDialogueText);
  const currentDialogueKey = weeklyDialogueKey(
    useChipStore.getState().currentDialogueId,
    useChipStore.getState().currentDialogueText,
  );
  useChipStore((state) => state.lastWeeklyDialogue);
  const lastWeeklyDialogue = useChipStore.getState().lastWeeklyDialogue;
  useChipStore((state) => state.dialogueQueue);
  const dialogueQueueRemaining = useChipStore.getState().dialogueQueue.length;
  const dialogueQueueTotal = useChipStore.getState().dialogueQueueTotal;
  // Chip is a bubble that opens for one screen at a time: the route it was opened on is
  // remembered, so moving on or finishing the conversation returns it to the bubble. The old
  // stored "collapsed" preference (which older versions wrote as false after any dock tap) is
  // not consulted, so returning players get the same compact dock as new ones.
  const [openedRoute, setOpenedRoute] = useState<string | null>(null);
  const [closedByPlayerRoute, setClosedByPlayerRoute] = useState<string | null>(null);
  const [viewedDialogueKey, setViewedDialogueKey] = useState<string | null>(null);
  // E4: the three quiet controls (screen/week/season) live inside one quiet
  // menu; the trigger toggles this state and picking an option closes it.
  const [quietMenuOpen, setQuietMenuOpen] = useState(quietMenuDefaultOpen);
  const motionMode = reducedMotion || prefs.animationsDisabled ? 'reduced' : 'animated';
  const typewriterSpeed: ChipTypewriterSpeed = prefs.typewriterSpeed ?? 'normal';
  const typewriterCharsPerSecond = CHIP_TYPEWRITER_SPEED_CHARS_PER_SECOND[typewriterSpeed];
  const dockPosition: DockPosition = prefs.dockPosition ?? 'right';
  const storePose = useResolvedChipPose();
  const routeBeatSignature = routeBeats.map((beat) => beat.id).join('|');
  const globalRouteSkip = readOnboardingSkipState(backingStorage)?.skipped === true;
  const resolvedRoute = resolveChipDockRoute(currentRoute);
  const routeQuieted = isRouteCoachingQuieted({
    prefs,
    currentRoute: resolvedRoute,
    currentWeek,
    currentSeason,
  });
  const dockControlState: DockControlStateInput = {
    prefs,
    resolvedRoute,
    currentWeek,
    currentSeason,
    onboardingSkipped: globalRouteSkip,
    typewriterSpeed,
    dockPosition,
  };
  // E4: the quiet menu trigger announces active quiet state on one button.
  const quietMenuLabel = hasActiveQuietPrefs(prefs) ? 'Quiet Chip (quieted)' : 'Quiet Chip';
  const eligibleRouteBeats = useMemo(() => {
    if (globalRouteSkip) return [];
    if (routeQuieted) return [];
    const durableReadReceipts = readChipReadReceipts(backingStorage);
    const unseen = filterUnseenRouteBeats(routeBeats, durableReadReceipts, seenBeatIds);
    // E11/B9 compact mode ("Just the Must Do"): reduced guidance serves only
    // tier-1 orientation beats; advanced beat-2 follow-ups wait for full mode.
    return prefs.reducedGuidance ? unseen.filter((beat) => isTierOneRouteBeatId(beat.id)) : unseen;
    // Sprint 41 perf fix [12]: routeBeatSignature already captures the content
    // of routeBeats; including routeBeats here would re-trigger the memo on
    // every parent render even when the beat list is identical. We
    // intentionally read routeBeats by closure but key the memo on signature.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backingStorage, globalRouteSkip, prefs.reducedGuidance, routeBeatSignature, routeQuieted, seenBeatIds]);
  const [routeBeatIndex, setRouteBeatIndex] = useState(0);
  const [dismissedRouteBeatSignature, setDismissedRouteBeatSignature] = useState<string | null>(null);
  const [storedLiveBeat, setStoredLiveBeat] = useState<DockLiveBeat | null>(null);
  const [liveBeatRoute, setLiveBeatRoute] = useState<string | null>(null);
  // Compact-first: a live beat belongs to the screen it was opened on, so it never keeps the next
  // screen's dock expanded.
  const activeLiveBeat = liveBeatRoute !== resolvedRoute ? null : storedLiveBeat;
  const [mobileRouteCoach, setMobileRouteCoach] = useState(false);
  const [routeCoachOpenedFor, setRouteCoachOpenedFor] = useState<string | null>(
    routeBeatDefaultOpen ? resolvedRoute : null,
  );
  // Tied to the screen, not to the beat list: reading a beat shrinks the list but must not close
  // the dock, and a different screen is derived closed with no stale "opened" frame.
  const routeCoachOpened = routeCoachOpenedFor === resolvedRoute;
  const setRouteCoachOpened = useCallback(
    (open: boolean) => setRouteCoachOpenedFor(open ? resolvedRoute : null),
    [resolvedRoute],
  );
  const openDock = useCallback(() => {
    setOpenedRoute(resolvedRoute);
    setClosedByPlayerRoute(null);
  }, [resolvedRoute]);
  const returnToBubble = useCallback(() => setOpenedRoute(null), []);
  // Leaving a screen forgets that it was opened, so coming back later starts as the bubble again.
  useEffect(() => {
    setOpenedRoute((current) => (current === resolvedRoute ? current : null));
    setRouteCoachOpenedFor((current) => (current === resolvedRoute ? current : null));
    setClosedByPlayerRoute((current) => (current === resolvedRoute ? current : null));
    setQuietMenuOpen(false);
    if (liveBeatRoute !== resolvedRoute) setStoredLiveBeat(null);
  }, [liveBeatRoute, resolvedRoute]);
  const showLiveBeat = useCallback((beat: DockLiveBeat) => {
    setStoredLiveBeat(beat);
    setLiveBeatRoute(resolvedRoute);
    openDock();
  }, [openDock, resolvedRoute]);
  const pendingDecisionTotal = Math.max(0, Math.trunc(Number(pendingDecisions?.total ?? 0)));
  const routeBeatActive =
    routeBeatSignature.length > 0
    && dismissedRouteBeatSignature !== routeBeatSignature
    && eligibleRouteBeats.length > 0;
  const activeRouteBeat = routeBeatActive
    ? eligibleRouteBeats[Math.min(routeBeatIndex, eligibleRouteBeats.length - 1)] ?? null
    : null;
  const activeRouteBeatActionLabel = routeBeatActionLabel(routeBeatIndex, eligibleRouteBeats);
  const waitingRouteBeats = activeRouteBeat
    ? eligibleRouteBeats.slice(Math.min(routeBeatIndex, eligibleRouteBeats.length - 1))
    : [];
  const mustDoWaiting = waitingRouteBeats.some(isMustDoRouteBeat);
  const preferRouteBeatCollapsed = shouldCollapseForRouteBeat({
    activeRouteBeat,
    waitingRouteBeats,
    phoneWidth: mobileRouteCoach,
    opened: routeCoachOpened,
    closedByPlayer: closedByPlayerRoute === resolvedRoute,
  });
  const effectiveCollapsed = resolveEffectiveDockCollapsed({
    activeRouteBeat: activeRouteBeat !== null,
    activeLiveBeat: activeLiveBeat !== null,
    controlledCollapsed: collapsed,
    localCollapsed: openedRoute !== resolvedRoute,
    preferRouteBeatCollapsed,
  });
  const dialogueShowing = !effectiveCollapsed && !activeRouteBeat && !activeLiveBeat && Boolean(children);
  const unreadDialogue = hasUnreadWeeklyDialogue({
    dialogueKey: currentDialogueKey,
    hasDialogueChild: Boolean(children),
    viewedKey: viewedDialogueKey,
  });
  // Once the weekly message is on screen in the open dock it counts as read.
  useEffect(() => {
    if (dialogueShowing && currentDialogueKey !== null) setViewedDialogueKey(currentDialogueKey);
  }, [currentDialogueKey, dialogueShowing]);
  // The app shell reserves runway for the dock only while it is expanded; set before paint so a
  // new screen never flashes the old layout.
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const root = document.documentElement;
    root.dataset.mfdChipDock = effectiveCollapsed ? 'collapsed' : 'expanded';
    return () => {
      delete root.dataset.mfdChipDock;
    };
  }, [effectiveCollapsed]);
  const portraitPose = activeRouteBeat
    ? routeBeatPoseToChipPose(activeRouteBeat.pose)
    : activeLiveBeat
      ? routeBeatPoseToChipPose(activeLiveBeat.pose)
      : storePose;
  const activeBeatMode = activeRouteBeat ? 'route' : activeLiveBeat ? 'live' : 'idle';

  // G7: route coaching graduates to advisor-only mode once every beat (the
  // first-ten tour plus all registry beats) has been read.
  const routeCoachingGraduated = useMemo(
    () => isRouteCoachingGraduated(readChipReadReceipts(backingStorage), seenBeatIds),
    [backingStorage, seenBeatIds],
  );

  // G7: fire the one-time graduation notice only when nothing else is
  // demanding the dock; dismissing it acks via graduationAcked.
  useEffect(() => {
    if (!routeCoachingGraduated) return;
    if (prefs.graduationAcked) return;
    if (activeRouteBeat || activeLiveBeat) return;
    showLiveBeat(CHIP_GRADUATION_BEAT);
  }, [activeLiveBeat, activeRouteBeat, prefs.graduationAcked, routeCoachingGraduated, showLiveBeat]);

  useEffect(() => {
    setRouteBeatIndex(0);
    setDismissedRouteBeatSignature(null);
  }, [routeBeatSignature]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia('(max-width: 720px)');
    const sync = () => setMobileRouteCoach(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => {
      media.removeEventListener?.('change', sync);
    };
  }, []);

  const persistShownRouteBeats = useCallback(() => {
    if (!activeRouteBeat) return;
    persistRouteBeatProgress({
      storage: backingStorage,
      beatIds: eligibleRouteBeats.slice(0, routeBeatIndex + 1).map((beat) => beat.id),
      markBeatSeen: useChipStore.getState().markBeatSeen,
    });
  }, [activeRouteBeat, backingStorage, eligibleRouteBeats, routeBeatIndex]);

  const persistCurrentRouteBeat = useCallback(() => {
    if (!activeRouteBeat) return;
    persistRouteBeatProgress({
      storage: backingStorage,
      beatIds: [activeRouteBeat.id],
      markBeatSeen: useChipStore.getState().markBeatSeen,
    });
  }, [activeRouteBeat, backingStorage]);

  const dismissRouteBeatSequence = useCallback(() => {
    persistShownRouteBeats();
    setDismissedRouteBeatSignature(routeBeatSignature);
    returnToBubble();
  }, [persistShownRouteBeats, returnToBubble, routeBeatSignature]);

  const completeRouteBeatSequence = useCallback(() => {
    persistRouteBeatProgress({
      storage: backingStorage,
      beatIds: eligibleRouteBeats.map((beat) => beat.id),
      markBeatSeen: useChipStore.getState().markBeatSeen,
    });
    setDismissedRouteBeatSignature(routeBeatSignature);
    returnToBubble();
  }, [backingStorage, eligibleRouteBeats, returnToBubble, routeBeatSignature]);

  const advanceRouteBeat = useCallback(() => {
    persistCurrentRouteBeat();
    const result = resolveNextRouteBeatIndex(routeBeatIndex, eligibleRouteBeats);
    if (result.complete) {
      completeRouteBeatSequence();
      return;
    }
    // The player is reading: keep the dock open for the rest of this screen's beats.
    setRouteCoachOpened(true);
    setRouteBeatIndex(result.nextIndex);
  }, [completeRouteBeatSequence, eligibleRouteBeats, persistCurrentRouteBeat, routeBeatIndex, setRouteCoachOpened]);

  const showPendingDecisionsBeat = useCallback(() => {
    if (pendingDecisionTotal <= 0) return;
    showLiveBeat(createPendingDecisionsBeat(pendingDecisions ?? pendingDecisionTotal));
  }, [pendingDecisionTotal, pendingDecisions, showLiveBeat]);

  const showWhereAmIBeat = useCallback(() => {
    if (!whereAmI) return;
    showLiveBeat(createWhereAmIBeat(whereAmI));
  }, [showLiveBeat, whereAmI]);

  const showAskChipBeat = useCallback(() => {
    const beat = createAskChipLiveBeat({ pendingDecisionTotal, pendingDecisions, whereAmI, route: resolvedRoute });
    if (!beat) return false;
    showLiveBeat(beat);
    return true;
  }, [pendingDecisionTotal, pendingDecisions, showLiveBeat, whereAmI, resolvedRoute]);

  // G7: dismissing the graduation notice acks it so it never returns.
  const dismissLiveBeat = useCallback(() => {
    if (activeLiveBeat?.id === 'chip.dock.graduation') {
      const nextPrefs = { ...readDockPrefs(backingStorage), graduationAcked: true };
      writeDockPrefs(backingStorage, nextPrefs);
      setPrefs(nextPrefs);
    }
    setStoredLiveBeat(null);
    returnToBubble();
  }, [activeLiveBeat, backingStorage, returnToBubble]);

  const advanceConversation = useCallback(() => {
    useChipStore.getState().advanceDialogueQueue();
  }, []);

  const applyControl = useCallback(
    (control: ChipDockControl) => {
      if (control === 'whatNow') {
        if (activeRouteBeat) return;
        if (showAskChipBeat()) return;
      }
      if (activeRouteBeat && ROUTE_BEAT_DISMISS_CONTROLS.has(control)) {
        dismissRouteBeatSequence();
      }
      if (activeLiveBeat && LIVE_BEAT_DISMISS_CONTROLS.has(control)) {
        dismissLiveBeat();
      }
      const nextPrefs = applyDockControl(control, {
        storage: backingStorage,
        chipStore: useChipStore.getState(),
        currentRoute: resolvedRoute,
        currentWeek,
        currentSeason,
        now,
      });
      setPrefs(nextPrefs);
      if (ROUTE_BEAT_DISMISS_CONTROLS.has(control)) {
        returnToBubble();
        setRouteCoachOpened(false);
        setClosedByPlayerRoute(resolvedRoute);
      }
      if (control === 'expand') {
        openDock();
        setRouteCoachOpened(true);
        if (!activeRouteBeat && resolveBubbleTapView(unreadDialogue) === 'askChip') showAskChipBeat();
      }
      onCollapseToggle?.();
    },
    [
      activeLiveBeat,
      activeRouteBeat,
      backingStorage,
      currentSeason,
      currentWeek,
      dismissLiveBeat,
      dismissRouteBeatSequence,
      now,
      onCollapseToggle,
      openDock,
      resolvedRoute,
      returnToBubble,
      setRouteCoachOpened,
      showAskChipBeat,
      unreadDialogue,
    ],
  );
  const activateControlFromKeyboard = useCallback(
    (event: KeyboardEvent<HTMLElement>, control: ChipDockControl) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      applyControl(control);
    },
    [applyControl],
  );

  if (!isChipFeatureEnabled()) {
    return <>{children}</>;
  }

  // H2: the main weekly bubble arrives as children from the app shell; inject
  // the player's typewriter speed unless the caller set one explicitly.
  const childrenWithTypeSpeed = isValidElement(children) && (children.props as { speed?: number }).speed === undefined
    ? cloneElement(children as ReactElement<{ speed?: number }>, { speed: typewriterCharsPerSecond })
    : children;

  const pendingBadge = pendingDecisionTotal > 0 ? (
    <button
      type="button"
      className="mfd-chip-dock__pending-badge"
      data-chip-pending-decisions="true"
      aria-label={`${pendingDecisionTotal} decisions pending`}
      title={formatPendingBadgeTitle(pendingDecisions ?? pendingDecisionTotal)}
      onClick={showPendingDecisionsBeat}
    >
      {pendingDecisionTotal}
    </button>
  ) : null;
  const dynastyLabel = dynastyIndicator
    ? formatDynastyIndicatorLabel(dynastyIndicator.seasonYear, dynastyIndicator.coachName)
    : null;

  if (effectiveCollapsed) {
    return (
      <aside
        className="mfd-chip-dock"
        data-chip-dock="true"
        data-chip-dock-state="collapsed"
        data-chip-dock-motion={motionMode}
        data-chip-dock-beat={activeBeatMode}
        data-chip-dock-position={dockPosition}
        aria-label={activeRouteBeat ? 'Chip route guidance' : 'Chip dock'}
      >
        {pendingBadge}
        {dynastyLabel ? <div className="mfd-chip-dock__dynasty-label">{dynastyLabel}</div> : null}
        <button
          type="button"
          className="mfd-chip-dock__collapsed"
          data-chip-ask-dock-button="true"
          onClick={() => applyControl('expand')}
          onKeyDown={(event) => activateControlFromKeyboard(event, 'expand')}
          aria-label={[
            activeRouteBeat ? 'Ask Chip about this screen' : 'Ask Chip',
            mustDoWaiting ? 'Must Do waiting' : activeRouteBeat ? 'tip waiting' : unreadDialogue ? 'new message' : null,
            pendingDecisionTotal > 0
              ? `${pendingDecisionTotal} decision${pendingDecisionTotal === 1 ? '' : 's'} pending`
              : null,
          ].filter(Boolean).join(', ')}
        >
          <span className="mfd-chip-dock__collapsed-portrait" aria-hidden="true">
            <Chip pose={portraitPose} size="sm" reducedMotion={motionMode === 'reduced'} />
          </span>
          <span className="mfd-chip-dock__collapsed-label">Ask Chip</span>
          {activeRouteBeat || unreadDialogue ? (
            <span
              className="mfd-chip-dock__collapsed-tip"
              data-chip-collapsed-tip={mustDoWaiting ? 'must-do' : 'tip'}
              aria-hidden="true"
            />
          ) : null}
          {pendingDecisionTotal > 0 ? (
            <span className="mfd-chip-dock__collapsed-count" data-chip-collapsed-count="true">
              {pendingDecisionTotal}
            </span>
          ) : null}
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="mfd-chip-dock"
      data-chip-dock="true"
      data-chip-dock-state="expanded"
      data-chip-dock-motion={motionMode}
      data-chip-dock-beat={activeBeatMode}
      data-chip-typewriter-speed={typewriterSpeed}
      data-chip-dock-position={dockPosition}
      aria-label="Chip dock"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        // E7: Escape dismisses the most transient thing first (a live Ask Chip
        // beat), then an open quiet menu (E4), otherwise it collapses the dock.
        const escapeAction = resolveDockEscapeAction({
          activeLiveBeat: activeLiveBeat !== null,
          activeRouteBeat: activeRouteBeat !== null,
          quietMenuOpen,
        });
        if (escapeAction === 'dismissLiveBeat') {
          dismissLiveBeat();
          return;
        }
        if (escapeAction === 'closeQuietMenu') {
          setQuietMenuOpen(false);
          return;
        }
        applyControl('collapse');
      }}
    >
      {pendingBadge}
      {dynastyLabel ? <div className="mfd-chip-dock__dynasty-label">{dynastyLabel}</div> : null}
      <section className="mfd-chip-dock__panel" data-chip-dock-layout="sideline-broadcast">
        <div className="mfd-chip-dock__portrait">
          <div className="mfd-chip-dock__portrait-stage">
            <div className="mfd-chip-dock__portrait-callout" aria-hidden="true">OPS</div>
            <DockPoseCrossfade pose={portraitPose} reducedMotion={motionMode === 'reduced'} />
            <div className="mfd-chip-dock__nameplate" aria-hidden="true">
              <span>CHIP</span>
              <span>OPS CHIEF</span>
            </div>
          </div>
        </div>
        <div className="mfd-chip-dock__content">
          {activeRouteBeat ? (
            <div
              className="mfd-chip-dock__bubble"
              data-chip-route-beat={activeRouteBeat.id}
            >
              <ChipDialogueBubble
                text={activeRouteBeat.text}
                pose={routeBeatPoseToChipPose(activeRouteBeat.pose)}
                pointer="left"
                skippable={false}
                reducedMotion={motionMode === 'reduced'}
                speed={typewriterCharsPerSecond}
              />
              <div className="mfd-chip-dock__beat-actions">
                <PixelButton
                  accent="gold"
                  className="mfd-chip-dock__control"
                  onClick={advanceRouteBeat}
                  aria-label={activeRouteBeatActionLabel}
                  title={activeRouteBeatActionLabel}
                >
                  <Check aria-hidden="true" />
                  <span className="mfd-chip-dock__control-label">{activeRouteBeatActionLabel}</span>
                </PixelButton>
              </div>
            </div>
          ) : activeLiveBeat ? (
            <div
              className="mfd-chip-dock__bubble"
              data-chip-live-beat={activeLiveBeat.id}
            >
              <ChipDialogueBubble
                text={activeLiveBeat.text}
                pose={routeBeatPoseToChipPose(activeLiveBeat.pose)}
                pointer="left"
                skippable={false}
                reducedMotion={motionMode === 'reduced'}
                speed={typewriterCharsPerSecond}
              />
              <div className="mfd-chip-dock__beat-actions">
                <PixelButton
                  accent="gold"
                  className="mfd-chip-dock__control"
                  onClick={dismissLiveBeat}
                  aria-label="Got it"
                  title="Got it"
                  data-chip-live-beat-dismiss="true"
                >
                  <Check aria-hidden="true" />
                  <span className="mfd-chip-dock__control-label">Got it</span>
                </PixelButton>
              </div>
            </div>
          ) : childrenWithTypeSpeed && (
            <div
              className="mfd-chip-dock__bubble"
              data-chip-conversation={dialogueQueueRemaining > 0 ? 'true' : undefined}
            >
              {childrenWithTypeSpeed}
              {dialogueQueueRemaining > 0 ? (
                <div className="mfd-chip-dock__beat-actions">
                  <PixelButton
                    accent="gold"
                    className="mfd-chip-dock__control"
                    onClick={advanceConversation}
                    aria-label={`Next part (${dialogueQueueTotal - dialogueQueueRemaining + 1} of ${dialogueQueueTotal})`}
                    title="Next"
                    data-chip-conversation-next="true"
                  >
                    <Check aria-hidden="true" />
                    <span className="mfd-chip-dock__control-label">
                      Next ({dialogueQueueTotal - dialogueQueueRemaining + 1}/{dialogueQueueTotal})
                    </span>
                  </PixelButton>
                </div>
              ) : null}
            </div>
          )}
          {!activeRouteBeat && !activeLiveBeat && children && lastWeeklyDialogue?.contextDetails?.length ? (
            <section
              className="mfd-chip-dock__details"
              data-chip-dock-details="true"
              aria-label="Chip weekly guidance details"
            >
              {lastWeeklyDialogue.contextDetails
                .filter((detail) => !prefs.reducedGuidance || !/^optional/i.test(splitChipContextDetail(detail).label))
                .map((detail) => {
                const parts = splitChipContextDetail(detail);
                return (
                  <div
                    key={detail}
                    className="mfd-chip-dock__detail"
                    data-chip-dock-detail-kind={parts.kind}
                  >
                    <span className="mfd-chip-dock__detail-label">{parts.label}</span>
                    <span className="mfd-chip-dock__detail-body">{parts.body}</span>
                  </div>
                );
              })}
            </section>
          ) : null}
          <div className="mfd-chip-dock__controls" data-chip-dock-controls="true">
            {whereAmI ? (
              <PixelButton
                accent="gold"
                className="mfd-chip-dock__control"
                data-chip-control-id="whereAmI"
                data-chip-control-weight="primary"
                onClick={showWhereAmIBeat}
                aria-label="Where am I?"
                title="Where am I?"
              >
                <MapPin aria-hidden="true" />
                <span className="mfd-chip-dock__control-label">Where am I?</span>
              </PixelButton>
            ) : null}
            {DOCK_CONTROL_BUTTONS.filter((button) => button.group !== 'quietMenu').map(({ id, label, icon: Icon, accent, weight }) => {
              const pressed = resolveDockControlPressed(id, dockControlState);
              const activeLabel = resolveDockControlLabel(id, label, dockControlState);
              const disabled = isDockControlDisabled(id, dockControlState);
              return (
                <PixelButton
                  key={id}
                  accent={accent}
                  className="mfd-chip-dock__control"
                  data-chip-control-id={id}
                  data-chip-control-weight={weight}
                  aria-pressed={pressed}
                  disabled={disabled}
                  onClick={() => applyControl(id)}
                  onKeyDown={(event) => activateControlFromKeyboard(event, id)}
                  aria-label={activeLabel}
                  title={activeLabel}
                >
                  <Icon aria-hidden="true" />
                  <span className="mfd-chip-dock__control-label">{activeLabel}</span>
                </PixelButton>
              );
            })}
            <div className="mfd-chip-dock__quiet-menu" data-chip-quiet-menu-root="true">
              <PixelButton
                accent="cyan"
                className="mfd-chip-dock__control"
                data-chip-control-id="quietMenu"
                data-chip-control-weight="quiet"
                aria-expanded={quietMenuOpen}
                aria-haspopup="menu"
                aria-pressed={hasActiveQuietPrefs(prefs) ? true : undefined}
                onClick={() => setQuietMenuOpen((open) => !open)}
                aria-label={quietMenuLabel}
                title={quietMenuLabel}
              >
                <VolumeX aria-hidden="true" />
                <span className="mfd-chip-dock__control-label">{quietMenuLabel}</span>
              </PixelButton>
              {quietMenuOpen ? (
                <div
                  className="mfd-chip-dock__quiet-menu-options"
                  data-chip-quiet-menu="true"
                  role="menu"
                  aria-label="Quiet Chip options"
                >
                  {DOCK_CONTROL_BUTTONS.filter((button) => button.group === 'quietMenu').map(({ id, label, icon: Icon, accent, weight }) => {
                    const pressed = resolveDockControlPressed(id, dockControlState);
                    const activeLabel = resolveDockControlLabel(id, label, dockControlState);
                    const disabled = isDockControlDisabled(id, dockControlState);
                    return (
                      <PixelButton
                        key={id}
                        accent={accent}
                        className="mfd-chip-dock__control"
                        data-chip-control-id={id}
                        data-chip-control-weight={weight}
                        role="menuitem"
                        aria-pressed={pressed}
                        disabled={disabled}
                        onClick={() => {
                          applyControl(id);
                          setQuietMenuOpen(false);
                        }}
                        onKeyDown={(event) => activateControlFromKeyboard(event, id)}
                        aria-label={activeLabel}
                        title={activeLabel}
                      >
                        <Icon aria-hidden="true" />
                        <span className="mfd-chip-dock__control-label">{activeLabel}</span>
                      </PixelButton>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <PixelButton
              accent="default"
              className="mfd-chip-dock__control"
              data-chip-control-id="collapse"
              data-chip-control-weight="utility"
              onClick={() => applyControl('collapse')}
              onKeyDown={(event) => activateControlFromKeyboard(event, 'collapse')}
              aria-label="Collapse Chip dock"
              title="Collapse Chip dock"
            >
              <X aria-hidden="true" />
              <span className="mfd-chip-dock__control-label">Collapse</span>
            </PixelButton>
          </div>
        </div>
      </section>
      {activeRouteBeat?.spotlightTarget ? (
        <Spotlight targetId={activeRouteBeat.spotlightTarget} reducedMotion={motionMode === 'reduced'} />
      ) : null}
    </aside>
  );
}
