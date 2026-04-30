import { useMemo } from 'react';
import { useChipStore } from '../companion/store';
import {
  ROUTE_BEAT_REGISTRY,
  type RouteBeat,
  type RouteKey,
} from './routeBeatRegistry';

const EMPTY_ROUTE_BEATS: readonly RouteBeat[] = [];
const activeRouteBeatCache = new Map<string, readonly RouteBeat[]>();

export function resolveRouteKey(currentRoute: string): RouteKey | null {
  const normalized = currentRoute.replace(/^#/, '').split('?')[0] || '/';

  if (normalized === 'roster' || normalized === '/roster') return 'roster';
  if (normalized === 'staff' || normalized === '/coaching' || normalized.startsWith('/coaching/')) return 'staff';
  if (normalized === 'cap-laboratory' || normalized === '/cap-lab' || normalized === '/contracts') {
    return 'cap-laboratory';
  }
  if (normalized === 'draft-board' || normalized === '/draft') return 'draft-board';
  if (normalized === 'trade-center' || normalized === '/trades') return 'trade-center';
  if (normalized === 'scouting-board' || normalized === '/scouting') return 'scouting-board';

  return null;
}

function cacheKey(routeKey: RouteKey, seenBeatIds: ReadonlySet<string>): string {
  return `${routeKey}|${[...seenBeatIds].sort().join(',')}`;
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

  const key = cacheKey(routeKey, seenBeatIds);
  const cached = activeRouteBeatCache.get(key);
  if (cached) return cached;

  const activeBeats = routeBeats.filter((beat) => !seenBeatIds.has(beat.id));
  activeRouteBeatCache.set(key, activeBeats);
  return activeBeats;
}

export function useActiveRouteBeats(currentRoute: string): readonly RouteBeat[] {
  const seenBeats = useChipStore((state) => state.seenBeats);

  return useMemo(
    () => selectActiveRouteBeats(currentRoute, seenBeats),
    [currentRoute, seenBeats],
  );
}
