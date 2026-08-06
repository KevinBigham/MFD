/**
 * WP-02 — the one place the new shell asks "what shape is this window?".
 *
 * The audit's layout finding was not that MFD lacks media queries — it has
 * plenty — but that they are width-only and scattered, so short landscape
 * windows fall through every one of them. The WP-00 baseline measured the
 * consequence: the legacy Briefing at 844×390 is **19.02 viewports tall**,
 * worse than phone portrait's 14.15. Compact height is the worst case in this
 * application, so it is a first-class dimension here rather than an
 * afterthought bolted onto a width breakpoint.
 *
 * `resolveLayoutEnvironment` is pure and exported, which is what makes the
 * mode boundaries testable without a browser.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

export type LayoutMode = 'compact' | 'medium' | 'expanded' | 'wide';

/** Lower bound of each mode, in CSS pixels. Below `medium` is compact. */
export const LAYOUT_BREAKPOINTS = {
  medium: 600,
  expanded: 1024,
  wide: 1440,
} as const;

/** At or below this height the shell condenses regardless of width. */
export const COMPACT_HEIGHT_MAX = 599;

export interface LayoutEnvironment {
  mode: LayoutMode;
  /** True in short windows: phone landscape, split-screen laptop, small popups. */
  compactHeight: boolean;
  /** True for touch. Density may shrink visually; hit targets may not. */
  coarsePointer: boolean;
  width: number;
  height: number;
}

export interface ViewportMeasurement {
  width: number;
  height: number;
  coarsePointer: boolean;
}

/**
 * Server and first-paint default: the smallest, most constrained shape.
 *
 * Mobile-first is not a style preference here — guessing "expanded" on the
 * server and correcting on hydration produces a visible desktop-to-phone
 * collapse, and phone is the viewport the audit found broken.
 */
export const DEFAULT_MEASUREMENT: ViewportMeasurement = {
  width: 390,
  height: 844,
  coarsePointer: true,
};

export function resolveLayoutMode(width: number): LayoutMode {
  if (width >= LAYOUT_BREAKPOINTS.wide) return 'wide';
  if (width >= LAYOUT_BREAKPOINTS.expanded) return 'expanded';
  if (width >= LAYOUT_BREAKPOINTS.medium) return 'medium';
  return 'compact';
}

export function resolveLayoutEnvironment(measurement: ViewportMeasurement): LayoutEnvironment {
  return {
    mode: resolveLayoutMode(measurement.width),
    compactHeight: measurement.height <= COMPACT_HEIGHT_MAX,
    coarsePointer: measurement.coarsePointer,
    width: measurement.width,
    height: measurement.height,
  };
}

const LayoutContext = createContext<LayoutEnvironment>(
  resolveLayoutEnvironment(DEFAULT_MEASUREMENT),
);

function measure(): ViewportMeasurement {
  if (typeof window === 'undefined') return DEFAULT_MEASUREMENT;
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    coarsePointer: window.matchMedia?.('(pointer: coarse)').matches ?? false,
  };
}

/** Serialised so `useSyncExternalStore` can compare snapshots without a cache. */
function snapshot(): string {
  const { width, height, coarsePointer } = measure();
  return `${width}x${height}:${coarsePointer ? 'coarse' : 'fine'}`;
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const pointerQuery = window.matchMedia?.('(pointer: coarse)');
  window.addEventListener('resize', onChange);
  window.addEventListener('orientationchange', onChange);
  pointerQuery?.addEventListener('change', onChange);

  return () => {
    window.removeEventListener('resize', onChange);
    window.removeEventListener('orientationchange', onChange);
    pointerQuery?.removeEventListener('change', onChange);
  };
}

const SERVER_SNAPSHOT = `${DEFAULT_MEASUREMENT.width}x${DEFAULT_MEASUREMENT.height}:coarse`;

export function useLayoutMode(): LayoutEnvironment {
  return useContext(LayoutContext);
}

/**
 * Publishes the layout environment to context and to the DOM.
 *
 * The data attributes exist so CSS, Playwright, and the geometry harness can
 * all read the mode without importing React. Hashed CSS-module class names are
 * invisible to an e2e run; these are not.
 */
export function AdaptiveViewport({ children }: { children: ReactNode }) {
  const serialized = useSyncExternalStore(subscribe, snapshot, () => SERVER_SNAPSHOT);

  const environment = useMemo(() => {
    const [size = '', pointer = ''] = serialized.split(':');
    const [width, height] = size.split('x').map(Number);
    return resolveLayoutEnvironment({
      width: Number.isFinite(width) ? width! : DEFAULT_MEASUREMENT.width,
      height: Number.isFinite(height) ? height! : DEFAULT_MEASUREMENT.height,
      coarsePointer: pointer === 'coarse',
    });
  }, [serialized]);

  const applyRootAttributes = useCallback(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dataset.mfdV2Mode = environment.mode;
    root.dataset.mfdV2CompactHeight = String(environment.compactHeight);
    root.dataset.mfdV2Pointer = environment.coarsePointer ? 'coarse' : 'fine';
  }, [environment]);

  useEffect(applyRootAttributes, [applyRootAttributes]);

  return (
    <LayoutContext.Provider value={environment}>
      <div
        data-mfd-v2-viewport="true"
        data-mfd-v2-mode={environment.mode}
        data-mfd-v2-compact-height={String(environment.compactHeight)}
        data-mfd-v2-pointer={environment.coarsePointer ? 'coarse' : 'fine'}
      >
        {children}
      </div>
    </LayoutContext.Provider>
  );
}
