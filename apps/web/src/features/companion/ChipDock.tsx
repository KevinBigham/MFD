import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Calendar, CalendarOff, Check, EyeOff, Lightbulb, MapPin, MessageSquare, VolumeX, X } from 'lucide-react';
import { Chip, ChipDialogueBubble, PixelButton, Spotlight } from '@mfd/design-system/components';
import type { ChipPose } from '@mfd/design-system/components';
import { isChipFeatureEnabled, readOnboardingSkipState } from './ChipHost';
import { useChipStore } from './store';
import type { DialogueCatalogEntry } from './dialogue/types';
import {
  readDockPrefs,
  resolveDockStorage,
  updateDockPrefs,
  createDefaultDockPrefs,
  type DockPrefs,
} from './dockPersistence';
import {
  readChipReadReceipts,
  writeChipReadReceipts,
} from './readReceipts';
import { formatDynastyIndicatorLabel, type DynastyIndicator } from './dynastyIndicator';
import { createWhereAmIBeat, type WhereAmIState } from './whereAmI';
import type { ChipRoutePose, RouteBeat } from '../route-coaching/routeBeatRegistry';
import './ChipDock.css';

export type ChipDockControl =
  | 'quietForScreen'
  | 'quietUntilNextWeek'
  | 'quietThisSeason'
  | 'whatNow'
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
}

const DOCK_CONTROL_BUTTONS: readonly DockControlButton[] = [
  { id: 'whatNow', label: 'What now?', icon: MessageSquare, accent: 'gold' },
  { id: 'quietForScreen', label: 'Quiet for screen', icon: VolumeX, accent: 'cyan' },
  { id: 'quietUntilNextWeek', label: 'Quiet until next week', icon: Calendar, accent: 'gold' },
  { id: 'quietThisSeason', label: 'Quiet this season', icon: CalendarOff, accent: 'red' },
  { id: 'reduceGuidance', label: 'Reduce guidance', icon: Lightbulb, accent: 'green' },
  { id: 'disableAnimations', label: 'Disable animations', icon: EyeOff, accent: 'default' },
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
}

export function resolveEffectiveDockCollapsed({
  activeRouteBeat,
  activeLiveBeat,
  controlledCollapsed,
  localCollapsed,
}: EffectiveDockCollapsedOptions): boolean {
  if (activeRouteBeat || activeLiveBeat) return false;
  return controlledCollapsed ?? localCollapsed;
}

export function createPendingDecisionsBeat(count: number): DockLiveBeat {
  return {
    id: 'chip.dock.pending',
    pose: 'thinking',
    text: `${count} decisions waiting.`,
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
  const storePose = useChipStore((state) => state.pose);
  const motionMode = reducedMotion || prefs.animationsDisabled ? 'reduced' : 'animated';
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
  }, [backingStorage, globalRouteSkip, routeBeatSignature, routeBeats, routeQuieted]);
  const [routeBeatIndex, setRouteBeatIndex] = useState(0);
  const [dismissedRouteBeatSignature, setDismissedRouteBeatSignature] = useState<string | null>(null);
  const [activeLiveBeat, setActiveLiveBeat] = useState<DockLiveBeat | null>(null);
  const pendingDecisionTotal = Math.max(0, Math.trunc(Number(pendingDecisions?.total ?? 0)));
  const routeBeatActive =
    routeBeatSignature.length > 0
    && dismissedRouteBeatSignature !== routeBeatSignature
    && eligibleRouteBeats.length > 0;
  const activeRouteBeat = routeBeatActive
    ? eligibleRouteBeats[Math.min(routeBeatIndex, eligibleRouteBeats.length - 1)] ?? null
    : null;
  const effectiveCollapsed = resolveEffectiveDockCollapsed({
    activeRouteBeat: activeRouteBeat !== null,
    activeLiveBeat: activeLiveBeat !== null,
    controlledCollapsed: collapsed,
    localCollapsed,
  });
  const portraitPose = activeRouteBeat
    ? routeBeatPoseToChipPose(activeRouteBeat.pose)
    : activeLiveBeat
      ? routeBeatPoseToChipPose(activeLiveBeat.pose)
      : storePose;

  useEffect(() => {
    setRouteBeatIndex(0);
    setDismissedRouteBeatSignature(null);
  }, [routeBeatSignature]);

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
      if (control === 'collapse') setLocalCollapsed(true);
      if (control === 'expand') setLocalCollapsed(false);
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
        aria-label="Chip dock"
      >
        {pendingBadge}
        {dynastyLabel ? <div className="mfd-chip-dock__dynasty-label">{dynastyLabel}</div> : null}
        <button
          type="button"
          className="mfd-chip-dock__collapsed"
          onClick={() => applyControl('expand')}
          aria-label="Open Chip dock"
      >
          <Chip pose="idle" size="sm" reducedMotion={motionMode === 'reduced'} />
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
      aria-label="Chip dock"
    >
      {pendingBadge}
      {dynastyLabel ? <div className="mfd-chip-dock__dynasty-label">{dynastyLabel}</div> : null}
      <section className="mfd-chip-dock__panel">
        <div className="mfd-chip-dock__portrait">
          <Chip pose={portraitPose} size="lg" reducedMotion={motionMode === 'reduced'} />
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
                pointer="right"
                skippable={false}
                reducedMotion={motionMode === 'reduced'}
              />
              <div className="mfd-chip-dock__beat-actions">
                <PixelButton
                  accent="gold"
                  className="mfd-chip-dock__control"
                  onClick={advanceRouteBeat}
                  aria-label="Got it"
                  title="Got it"
                >
                  <Check aria-hidden="true" />
                  <span className="mfd-chip-dock__control-label">Got it</span>
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
                pointer="right"
                skippable={false}
                reducedMotion={motionMode === 'reduced'}
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
          ) : children && <div className="mfd-chip-dock__bubble">{children}</div>}
          <div className="mfd-chip-dock__controls" data-chip-dock-controls="true">
            {whereAmI ? (
              <PixelButton
                accent="gold"
                className="mfd-chip-dock__control"
                onClick={showWhereAmIBeat}
                aria-label="Where am I?"
                title="Where am I?"
              >
                <MapPin aria-hidden="true" />
                <span className="mfd-chip-dock__control-label">Where am I?</span>
              </PixelButton>
            ) : null}
            {DOCK_CONTROL_BUTTONS.map(({ id, label, icon: Icon, accent }) => (
              <PixelButton
                key={id}
                accent={accent}
                className="mfd-chip-dock__control"
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
