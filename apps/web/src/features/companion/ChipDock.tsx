import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Bell, Calendar, CalendarOff, Check, EyeOff, Lightbulb, MapPin, MessageSquare, RotateCcw, VolumeX, X } from 'lucide-react';
import { Chip, ChipDialogueBubble, PixelButton, Spotlight } from '@mfd/design-system/components';
import type { ChipPose } from '@mfd/design-system/components';
import { isChipFeatureEnabled, readOnboardingSkipState } from './ChipHost';
import { useChipStore, useResolvedChipPose } from './store';
import type { DialogueCatalogEntry } from './dialogue/types';
import {
  readDockPrefs,
  resolveDockStorage,
  updateDockPrefs,
  createDefaultDockPrefs,
  type DockPrefs,
} from './dockPersistence';
import {
  clearChipReadReceipts,
  readChipReadReceipts,
  writeChipReadReceipts,
} from './readReceipts';
import { CHIP_ONBOARDING_STORAGE_KEY } from './ChipHost';
import {
  enableChipOnboarding,
  isFirstTenMinuteBeatId,
  recordChipOnboardingBeat,
  resetChipOnboardingState,
  snoozeChipOnboarding,
} from './onboardingMachine';
import { formatDynastyIndicatorLabel, type DynastyIndicator } from './dynastyIndicator';
import { createWhereAmIBeat, type WhereAmIState } from './whereAmI';
import type { ChipRoutePose, RouteBeat } from '../route-coaching/routeBeatRegistry';
import './ChipDock.css';

export type ChipDockControl =
  | 'quietForScreen'
  | 'quietUntilNextWeek'
  | 'quietThisSeason'
  | 'whatNow'
  | 'resetOnboarding'
  | 'snoozeOnboarding'
  | 'enableGuidance'
  | 'reduceGuidance'
  | 'disableAnimations'
  | 'collapse'
  | 'expand';

export interface ChipDockControlStore {
  setPose?: (pose: ChipPose) => void;
  dismiss?: () => void;
  reset?: () => void;
  showWeeklyDialogue?: (entry: DialogueCatalogEntry) => void;
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
  pendingDecisions?: { total?: number };
  whereAmI?: WhereAmIState;
  dynastyIndicator?: DynastyIndicator;
}

interface DockControlButton {
  id: ChipDockControl;
  label: string;
  icon: typeof VolumeX;
  accent: 'default' | 'gold' | 'cyan' | 'green' | 'red';
  weight: 'primary' | 'quiet' | 'utility';
}

const DOCK_CONTROL_BUTTONS: readonly DockControlButton[] = [
  { id: 'whatNow', label: 'Board check', icon: MessageSquare, accent: 'gold', weight: 'primary' },
  { id: 'resetOnboarding', label: 'Replay', icon: RotateCcw, accent: 'cyan', weight: 'utility' },
  { id: 'snoozeOnboarding', label: 'Snooze', icon: CalendarOff, accent: 'gold', weight: 'quiet' },
  { id: 'enableGuidance', label: 'Enable', icon: Bell, accent: 'green', weight: 'utility' },
  { id: 'quietForScreen', label: 'Quiet for screen', icon: VolumeX, accent: 'cyan', weight: 'quiet' },
  { id: 'quietUntilNextWeek', label: 'Quiet until next week', icon: Calendar, accent: 'gold', weight: 'quiet' },
  { id: 'quietThisSeason', label: 'Quiet this season', icon: CalendarOff, accent: 'red', weight: 'quiet' },
  { id: 'reduceGuidance', label: 'Reduce guidance', icon: Lightbulb, accent: 'green', weight: 'utility' },
  { id: 'disableAnimations', label: 'Disable animations', icon: EyeOff, accent: 'default', weight: 'utility' },
] as const;

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

interface DockLiveBeat {
  id: 'chip.dock.pending' | 'chip.dock.summary';
  pose: ChipRoutePose;
  text: string;
}

export interface EffectiveDockCollapsedOptions {
  activeRouteBeat: boolean;
  activeLiveBeat: boolean;
  controlledCollapsed?: boolean;
  localCollapsed: boolean;
  preferRouteBeatCollapsed?: boolean;
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

export function createPendingDecisionsBeat(count: number): DockLiveBeat {
  return {
    id: 'chip.dock.pending',
    pose: 'reviewing-tablet',
    text: count === 1 ? 'Decision waiting.' : `${count} decisions waiting.`,
  };
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
    recordChipOnboardingBeat(storage, id);
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

export function applyDockControl(control: ChipDockControl, options: ApplyDockControlOptions): DockPrefs {
  const prefs = readDockPrefs(options.storage);
  const chipStore = options.chipStore;

  switch (control) {
    case 'whatNow':
      if (chipStore?.lastWeeklyDialogue) {
        chipStore.showWeeklyDialogue?.(chipStore.lastWeeklyDialogue);
      }
      return prefs;
    case 'resetOnboarding':
      resetChipOnboardingState(options.storage);
      clearChipReadReceipts(options.storage, isFirstTenMinuteBeatId);
      options.storage?.removeItem(CHIP_ONBOARDING_STORAGE_KEY);
      chipStore?.reset?.();
      return prefs;
    case 'snoozeOnboarding':
      snoozeChipOnboarding(options.storage, options.currentWeek, options.now);
      chipStore?.dismiss?.();
      return prefs;
    case 'enableGuidance':
      enableChipOnboarding(options.storage, options.now);
      options.storage?.removeItem(CHIP_ONBOARDING_STORAGE_KEY);
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
          quietForScreen: options.currentRoute,
        },
        options.now,
      );
    case 'quietUntilNextWeek':
      chipStore?.dismiss?.();
      return updateDockPrefs(
        options.storage,
        {
          quietUntilWeek: options.currentWeek,
        },
        options.now,
      );
    case 'quietThisSeason':
      chipStore?.dismiss?.();
      return updateDockPrefs(
        options.storage,
        {
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
    case 'collapse':
      return updateDockPrefs(
        options.storage,
        {
          collapsed: true,
        },
        options.now,
      );
    case 'expand':
      return updateDockPrefs(
        options.storage,
        {
          collapsed: false,
        },
        options.now,
      );
  }
}

function resolveCurrentRoute(fallback: string): string {
  if (fallback) return fallback;
  if (typeof window === 'undefined') return 'screen';
  return window.location.hash.replace(/^#/, '') || window.location.pathname || 'screen';
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
}: ChipDockProps) {
  const backingStorage = storage === undefined ? resolveDockStorage() : storage;
  const [prefs, setPrefs] = useState<DockPrefs>(() =>
    backingStorage === null ? createDefaultDockPrefs() : readDockPrefs(backingStorage),
  );
  const [localCollapsed, setLocalCollapsed] = useState(prefs.collapsed);
  const motionMode = reducedMotion || prefs.animationsDisabled ? 'reduced' : 'animated';
  const storePose = useResolvedChipPose();
  const routeBeatSignature = routeBeats.map((beat) => beat.id).join('|');
  const globalRouteSkip = readOnboardingSkipState(backingStorage)?.skipped === true;
  const resolvedRoute = resolveCurrentRoute(currentRoute);
  const routeQuieted = isRouteCoachingQuieted({
    prefs,
    currentRoute: resolvedRoute,
    currentWeek,
    currentSeason,
  });
  const eligibleRouteBeats = useMemo(() => {
    if (globalRouteSkip) return [];
    if (routeQuieted) return [];
    const seenBeatIds = readChipReadReceipts(backingStorage);
    return routeBeats.filter((beat) => !seenBeatIds.has(beat.id));
    // Sprint 41 perf fix [12]: routeBeatSignature already captures the content
    // of routeBeats; including routeBeats here would re-trigger the memo on
    // every parent render even when the beat list is identical. We
    // intentionally read routeBeats by closure but key the memo on signature.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backingStorage, globalRouteSkip, routeBeatSignature, routeQuieted]);
  const [routeBeatIndex, setRouteBeatIndex] = useState(0);
  const [dismissedRouteBeatSignature, setDismissedRouteBeatSignature] = useState<string | null>(null);
  const [activeLiveBeat, setActiveLiveBeat] = useState<DockLiveBeat | null>(null);
  const [mobileRouteCoach, setMobileRouteCoach] = useState(false);
  const [routeCoachOpened, setRouteCoachOpened] = useState(false);
  const pendingDecisionTotal = Math.max(0, Math.trunc(Number(pendingDecisions?.total ?? 0)));
  const routeBeatActive =
    routeBeatSignature.length > 0
    && dismissedRouteBeatSignature !== routeBeatSignature
    && eligibleRouteBeats.length > 0;
  const activeRouteBeat = routeBeatActive
    ? eligibleRouteBeats[Math.min(routeBeatIndex, eligibleRouteBeats.length - 1)] ?? null
    : null;
  const preferRouteBeatCollapsed = activeRouteBeat !== null && mobileRouteCoach && !routeCoachOpened;
  const effectiveCollapsed = resolveEffectiveDockCollapsed({
    activeRouteBeat: activeRouteBeat !== null,
    activeLiveBeat: activeLiveBeat !== null,
    controlledCollapsed: collapsed,
    localCollapsed,
    preferRouteBeatCollapsed,
  });
  const portraitPose = activeRouteBeat
    ? routeBeatPoseToChipPose(activeRouteBeat.pose)
    : activeLiveBeat
      ? routeBeatPoseToChipPose(activeLiveBeat.pose)
      : storePose;
  const activeBeatMode = activeRouteBeat ? 'route' : activeLiveBeat ? 'live' : 'idle';

  useEffect(() => {
    setRouteBeatIndex(0);
    setDismissedRouteBeatSignature(null);
    setRouteCoachOpened(false);
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

  const dismissRouteBeatSequence = useCallback(() => {
    persistShownRouteBeats();
    setDismissedRouteBeatSignature(routeBeatSignature);
  }, [persistShownRouteBeats, routeBeatSignature]);

  const advanceRouteBeat = useCallback(() => {
    const result = resolveNextRouteBeatIndex(routeBeatIndex, eligibleRouteBeats);
    if (result.complete) {
      dismissRouteBeatSequence();
      return;
    }
    setRouteBeatIndex(result.nextIndex);
  }, [dismissRouteBeatSequence, eligibleRouteBeats, routeBeatIndex]);

  const showPendingDecisionsBeat = useCallback(() => {
    if (pendingDecisionTotal <= 0) return;
    setActiveLiveBeat(createPendingDecisionsBeat(pendingDecisionTotal));
    setLocalCollapsed(false);
  }, [pendingDecisionTotal]);

  const showWhereAmIBeat = useCallback(() => {
    if (!whereAmI) return;
    setActiveLiveBeat(createWhereAmIBeat(whereAmI));
    setLocalCollapsed(false);
  }, [whereAmI]);

  const dismissLiveBeat = useCallback(() => {
    setActiveLiveBeat(null);
  }, []);

  const applyControl = useCallback(
    (control: ChipDockControl) => {
      if (activeRouteBeat && ROUTE_BEAT_DISMISS_CONTROLS.has(control)) {
        dismissRouteBeatSequence();
      }
      if (activeLiveBeat && LIVE_BEAT_DISMISS_CONTROLS.has(control)) {
        setActiveLiveBeat(null);
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
      if (control === 'collapse') {
        setLocalCollapsed(true);
        setRouteCoachOpened(false);
      }
      if (control === 'expand') {
        setLocalCollapsed(false);
        setRouteCoachOpened(true);
      }
      if (control === 'disableAnimations') setLocalCollapsed(nextPrefs.collapsed);
      onCollapseToggle?.();
    },
    [
      activeLiveBeat,
      activeRouteBeat,
      backingStorage,
      currentSeason,
      currentWeek,
      dismissRouteBeatSequence,
      now,
      onCollapseToggle,
      resolvedRoute,
    ],
  );

  if (!isChipFeatureEnabled()) {
    return <>{children}</>;
  }

  const pendingBadge = pendingDecisionTotal > 0 ? (
    <button
      type="button"
      className="mfd-chip-dock__pending-badge"
      data-chip-pending-decisions="true"
      aria-label={`${pendingDecisionTotal} decisions pending`}
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
        aria-label={activeRouteBeat ? 'Chip route guidance' : 'Chip dock'}
      >
        {pendingBadge}
        {dynastyLabel ? <div className="mfd-chip-dock__dynasty-label">{dynastyLabel}</div> : null}
        <button
          type="button"
          className="mfd-chip-dock__collapsed"
          onClick={() => applyControl('expand')}
          aria-label={activeRouteBeat ? 'Open Chip route guidance' : 'Open Chip dock'}
        >
          <span className="mfd-chip-dock__collapsed-ring" aria-hidden="true" />
          <Chip pose={portraitPose} size="sm" reducedMotion={motionMode === 'reduced'} />
          <span className="mfd-chip-dock__collapsed-label" aria-hidden="true">{activeRouteBeat ? 'TIP' : 'CHIP'}</span>
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
      aria-label="Chip dock"
    >
      {pendingBadge}
      {dynastyLabel ? <div className="mfd-chip-dock__dynasty-label">{dynastyLabel}</div> : null}
      <section className="mfd-chip-dock__panel" data-chip-dock-layout="sideline-broadcast">
        <div className="mfd-chip-dock__portrait">
          <div className="mfd-chip-dock__portrait-stage">
            <div className="mfd-chip-dock__portrait-callout" aria-hidden="true">OPS</div>
            <Chip pose={portraitPose} size="lg" reducedMotion={motionMode === 'reduced'} />
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
              />
              <div className="mfd-chip-dock__beat-actions">
                <PixelButton
                  accent="gold"
                  className="mfd-chip-dock__control"
                  onClick={advanceRouteBeat}
                  aria-label="Logged"
                  title="Logged"
                >
                  <Check aria-hidden="true" />
                  <span className="mfd-chip-dock__control-label">Logged</span>
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
              />
              <div className="mfd-chip-dock__beat-actions">
                <PixelButton
                  accent="gold"
                  className="mfd-chip-dock__control"
                  onClick={dismissLiveBeat}
                  aria-label="Logged"
                  title="Logged"
                  data-chip-live-beat-dismiss="true"
                >
                  <Check aria-hidden="true" />
                  <span className="mfd-chip-dock__control-label">Logged</span>
                </PixelButton>
              </div>
            </div>
          ) : children && <div className="mfd-chip-dock__bubble">{children}</div>}
          <div className="mfd-chip-dock__controls" data-chip-dock-controls="true">
            {whereAmI ? (
              <PixelButton
                accent="gold"
                className="mfd-chip-dock__control"
                data-chip-control-id="whereAmI"
                data-chip-control-weight="primary"
                onClick={showWhereAmIBeat}
                aria-label="Current board"
                title="Current board"
              >
                <MapPin aria-hidden="true" />
                <span className="mfd-chip-dock__control-label">Current board</span>
              </PixelButton>
            ) : null}
            {DOCK_CONTROL_BUTTONS.map(({ id, label, icon: Icon, accent, weight }) => (
              <PixelButton
                key={id}
                accent={accent}
                className="mfd-chip-dock__control"
                data-chip-control-id={id}
                data-chip-control-weight={weight}
                aria-pressed={
                  id === 'reduceGuidance'
                    ? prefs.reducedGuidance
                    : id === 'disableAnimations'
                      ? prefs.animationsDisabled
                      : undefined
                }
                onClick={() => applyControl(id)}
                aria-label={label}
                title={label}
              >
                <Icon aria-hidden="true" />
                <span className="mfd-chip-dock__control-label">{label}</span>
              </PixelButton>
            ))}
            <PixelButton
              accent="default"
              className="mfd-chip-dock__control"
              data-chip-control-id="collapse"
              data-chip-control-weight="utility"
              onClick={() => applyControl('collapse')}
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
