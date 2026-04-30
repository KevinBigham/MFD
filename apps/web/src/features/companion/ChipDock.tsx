import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Calendar, CalendarOff, EyeOff, Lightbulb, VolumeX, X } from 'lucide-react';
import { Chip, PixelButton } from '@mfd/design-system/components';
import type { ChipPose } from '@mfd/design-system/components';
import { isChipFeatureEnabled } from './ChipHost';
import { useChipStore } from './store';
import {
  readDockPrefs,
  resolveDockStorage,
  updateDockPrefs,
  type DockPrefs,
} from './dockPersistence';
import './ChipDock.css';

export type ChipDockControl =
  | 'quietForScreen'
  | 'quietUntilNextWeek'
  | 'quietThisSeason'
  | 'reduceGuidance'
  | 'disableAnimations'
  | 'collapse'
  | 'expand';

export interface ChipDockControlStore {
  setPose?: (pose: ChipPose) => void;
  dismiss?: () => void;
  reset?: () => void;
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
}

interface DockControlButton {
  id: ChipDockControl;
  label: string;
  icon: typeof VolumeX;
  accent: 'default' | 'gold' | 'cyan' | 'green' | 'red';
}

const DOCK_CONTROL_BUTTONS: readonly DockControlButton[] = [
  { id: 'quietForScreen', label: 'Quiet for screen', icon: VolumeX, accent: 'cyan' },
  { id: 'quietUntilNextWeek', label: 'Quiet until next week', icon: Calendar, accent: 'gold' },
  { id: 'quietThisSeason', label: 'Quiet this season', icon: CalendarOff, accent: 'red' },
  { id: 'reduceGuidance', label: 'Reduce guidance', icon: Lightbulb, accent: 'green' },
  { id: 'disableAnimations', label: 'Disable animations', icon: EyeOff, accent: 'default' },
] as const;

export function applyDockControl(control: ChipDockControl, options: ApplyDockControlOptions): DockPrefs {
  const prefs = readDockPrefs(options.storage);
  const chipStore = options.chipStore;

  switch (control) {
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
}: ChipDockProps) {
  const backingStorage = storage === undefined ? resolveDockStorage() : storage;
  const initialPrefs = useMemo(() => readDockPrefs(backingStorage), [backingStorage]);
  const [localCollapsed, setLocalCollapsed] = useState(initialPrefs.collapsed);
  const effectiveCollapsed = collapsed ?? localCollapsed;
  const storeState = useChipStore();
  const motionMode = reducedMotion || initialPrefs.animationsDisabled ? 'reduced' : 'animated';

  const applyControl = useCallback(
    (control: ChipDockControl) => {
      const prefs = applyDockControl(control, {
        storage: backingStorage,
        chipStore: useChipStore.getState(),
        currentRoute: resolveCurrentRoute(currentRoute),
        currentWeek,
        currentSeason,
        now,
      });
      if (control === 'collapse') setLocalCollapsed(true);
      if (control === 'expand') setLocalCollapsed(false);
      if (control === 'disableAnimations') setLocalCollapsed(prefs.collapsed);
      onCollapseToggle?.();
    },
    [backingStorage, currentRoute, currentSeason, currentWeek, now, onCollapseToggle],
  );

  if (!isChipFeatureEnabled()) {
    return <>{children}</>;
  }

  if (effectiveCollapsed) {
    return (
      <aside
        className="mfd-chip-dock"
        data-chip-dock="true"
        data-chip-dock-state="collapsed"
        data-chip-dock-motion={motionMode}
        aria-label="Chip dock"
      >
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
      <section className="mfd-chip-dock__panel">
        <div className="mfd-chip-dock__portrait">
          <Chip pose={storeState.pose} size="lg" reducedMotion={motionMode === 'reduced'} />
        </div>
        <div className="mfd-chip-dock__content">
          {children && <div className="mfd-chip-dock__bubble">{children}</div>}
          <div className="mfd-chip-dock__controls" data-chip-dock-controls="true">
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
    </aside>
  );
}
