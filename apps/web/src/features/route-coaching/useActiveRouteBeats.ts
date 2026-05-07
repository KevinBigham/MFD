import { useMemo } from 'react';
import { useChipStore } from '../companion/store';
import {
  ROUTE_BEAT_REGISTRY,
  ROUTE_KEYS,
  type RouteBeat,
  type RouteKey,
} from './routeBeatRegistry';

const EMPTY_ROUTE_BEATS: readonly RouteBeat[] = [];

// Cache is bounded at ROUTE_KEYS.length (currently 6). Each entry stores the
// route-specific seen-beat signature so cache hits are content-equality not
// identity. Earlier revisions keyed on the global seenBeatIds set, which grew
// unboundedly as the user explored across routes; switching to a per-route
// signature caps the cache at one entry per route.
interface CacheEntry {
  readonly signature: string;
  readonly beats: readonly RouteBeat[];
}
const activeRouteBeatCache = new Map<RouteKey, CacheEntry>();

/** @internal Test-only helper for cache instrumentation. */
export function __resetActiveRouteBeatCacheForTests(): void {
  activeRouteBeatCache.clear();
}

/** @internal Test-only helper for cache instrumentation. */
export function __getActiveRouteBeatCacheSize(): number {
  return activeRouteBeatCache.size;
}

export function resolveRouteKey(currentRoute: string): RouteKey | null {
  const normalized = currentRoute.replace(/^#/, '').split('?')[0] || '/';

  if (normalized === '/' || normalized === '/briefing' || normalized === '/monday-briefing') return 'briefing';
  if (normalized === 'roster' || normalized === '/roster') return 'roster';
  if (normalized === 'depth-chart' || normalized === '/depth-chart') return 'depth-chart';
  if (normalized === 'staff' || normalized === '/coaching' || normalized.startsWith('/coaching/')) return 'staff';
  if (normalized === 'game-plan' || normalized === '/game-plan') return 'game-plan';
  if (normalized === 'week-advance' || normalized === '/week-advance') return 'week-advance';
  if (normalized === 'inbox' || normalized === '/inbox') return 'inbox';
  if (normalized === 'contracts' || normalized === '/contracts') return 'contracts';
  if (normalized === 'cap-laboratory' || normalized === '/cap-lab') {
    return 'cap-laboratory';
  }
  if (normalized === 'trade-center' || normalized === '/trades') return 'trade-center';
  if (normalized === 'draft-board' || normalized === '/draft') return 'draft-board';
  if (normalized === 'scouting-board' || normalized === '/scouting') return 'scouting-board';
  if (normalized === 'league-pulse' || normalized === '/league-pulse') return 'league-pulse';
  if (normalized === 'standings' || normalized === '/standings') return 'standings';
  if (normalized === 'film-room' || normalized === '/film-room') return 'film-room';
  if (normalized === 'settings' || normalized === '/settings') return 'settings';

  return null;
}

function routeSignature(routeKey: RouteKey, seenBeatIds: ReadonlySet<string>): string {
  const routeBeats = ROUTE_BEAT_REGISTRY[routeKey];
  // Walk in registry order so signature is stable without an extra sort.
  let sig = '';
  for (const beat of routeBeats) {
    if (seenBeatIds.has(beat.id)) {
      sig += sig.length === 0 ? beat.id : `,${beat.id}`;
    }
  }
  return sig;
}

export function selectActiveRouteBeats(
  currentRoute: string,
  seenBeatIds: ReadonlySet<string>,
): readonly RouteBeat[] {
  const routeKey = resolveRouteKey(currentRoute);
  if (!routeKey) return EMPTY_ROUTE_BEATS;

  const routeBeats = ROUTE_BEAT_REGISTRY[routeKey];
  if (routeBeats.every((beat) => !seenBeatIds.has(beat.id))) return routeBeats;
  if (routeBeats.every((beat) => seenBeatIds.has(beat.id))) return EMPTY_ROUTE_BEATS;

  const signature = routeSignature(routeKey, seenBeatIds);
  const cached = activeRouteBeatCache.get(routeKey);
  if (cached && cached.signature === signature) return cached.beats;

  const activeBeats = routeBeats.filter((beat) => !seenBeatIds.has(beat.id));
  activeRouteBeatCache.set(routeKey, { signature, beats: activeBeats });
  // Defensive: theoretical max is ROUTE_KEYS.length, but if an unknown route
  // ever resolves into the cache via a future regression, evict the oldest.
  if (activeRouteBeatCache.size > ROUTE_KEYS.length) {
    const oldest = activeRouteBeatCache.keys().next().value;
    if (oldest) activeRouteBeatCache.delete(oldest);
  }
  return activeBeats;
}

export function useActiveRouteBeats(currentRoute: string): readonly RouteBeat[] {
  const seenBeats = useChipStore((state) => state.seenBeats);

  return useMemo(
    () => selectActiveRouteBeats(currentRoute, seenBeats),
    [currentRoute, seenBeats],
  );
}
