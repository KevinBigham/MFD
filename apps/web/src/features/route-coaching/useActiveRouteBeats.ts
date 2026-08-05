import { useMemo } from 'react';
import { useChipStore } from '../companion/store';
import {
  FIRST_TEN_MINUTE_ONBOARDING_BEATS,
  firstTenBeatText,
  readChipOnboardingState,
  selectChipOnboardingRouteBeats,
} from '../companion/onboardingMachine';
import { resolveBrowserStorage } from '../companion/storageBoundary';
import {
  EARLY_SEASON_MAX_WEEK,
  EARLY_SEASON_ROUTE_BEAT_TEXT,
  LATE_SEASON_MIN_WEEK,
  LATE_SEASON_ROUTE_BEAT_TEXT,
  PLAYOFF_ROUTE_BEAT_TEXT,
  ROUTE_BEAT_REGISTRY,
  ROUTE_KEYS,
  type RouteBeat,
  type RouteKey,
} from './routeBeatRegistry';

const EMPTY_ROUTE_BEATS: readonly RouteBeat[] = [];

/**
 * G7: every route-coaching beat id (first-ten tour + every registry beat).
 * When all of these are read, route coaching graduates to advisor-only mode.
 */
export const ALL_ROUTE_COACHING_BEAT_IDS: readonly string[] = [
  ...FIRST_TEN_MINUTE_ONBOARDING_BEATS.map((beat) => beat.id),
  ...ROUTE_KEYS.flatMap((key) => ROUTE_BEAT_REGISTRY[key].map((beat) => beat.id)),
];

// Cache is bounded at ROUTE_KEYS.length. Each entry stores the
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

  if (normalized === '/' || normalized === '/briefing') return 'monday-briefing';
  if (normalized === 'roster' || normalized === '/roster') return 'roster';
  if (normalized === 'depth-chart' || normalized === '/depth-chart') return 'depth-chart';
  if (normalized === 'locker-room' || normalized === '/locker-room') return 'locker-room';
  if (normalized === 'game-plan' || normalized === '/game-plan') return 'game-plan';
  if (normalized === 'game-day-recap' || normalized === '/game-day') return 'game-day-recap';
  if (
    normalized === 'broadcast-suite'
    || normalized === '/broadcast'
    || normalized === '/presentation'
    || normalized === '/play-by-play'
    || normalized === '/game-flow'
  ) {
    return 'broadcast-suite';
  }
  if (normalized === 'film-room' || normalized === '/film-room') return 'film-room';
  if (normalized === 'super-bowl' || normalized === '/super-bowl') return 'super-bowl';
  if (normalized === 'week-advance' || normalized === '/week-advance') return 'week-advance';
  if (normalized === 'schedule' || normalized === '/schedule') return 'schedule';
  if (normalized === 'watch-list' || normalized === '/watch-list') return 'watch-list';
  if (normalized === 'inbox' || normalized === '/inbox') return 'inbox';
  if (
    normalized === 'owner-promises'
    || normalized === '/owner'
    || normalized === '/handshakes'
  ) {
    return 'owner-promises';
  }
  if (normalized === 'staff' || normalized === '/coaching' || normalized.startsWith('/coaching/')) return 'staff';
  if (normalized === 'cap-laboratory' || normalized === '/cap-lab' || normalized === '/contracts') {
    return 'cap-laboratory';
  }
  if (normalized === 'front-office' || normalized === '/front-office') return 'front-office';
  if (normalized === 'endorsements' || normalized === '/endorsements') return 'endorsements';
  if (normalized === 'draft-board' || normalized === '/draft') return 'draft-board';
  if (normalized === 'draft-recap' || normalized === '/draft-recap') return 'draft-recap';
  if (normalized === 'trade-center' || normalized === '/trades') return 'trade-center';
  if (normalized === 'trade-market-radar' || normalized === '/trade-block') return 'trade-market-radar';
  if (
    normalized === 'market-planning'
    || normalized === '/team-needs'
    || normalized === '/free-agency'
    || normalized === '/fa-targets'
  ) {
    return 'market-planning';
  }
  if (
    normalized === 'roster-churn'
    || normalized === '/waivers'
    || normalized === '/practice-squad'
  ) {
    return 'roster-churn';
  }
  if (normalized === 'training-camp' || normalized === '/training-camp') return 'training-camp';
  if (normalized === 'mentors' || normalized === '/mentors') return 'mentors';
  if (normalized === 'trade-deadline' || normalized === '/trade-deadline') return 'trade-deadline';
  if (normalized === 'relocation' || normalized === '/relocate') return 'relocation';
  if (normalized === 'expansion-draft' || normalized === '/expansion-draft') return 'expansion-draft';
  if (normalized === 'scouting-board' || normalized === '/scouting') return 'scouting-board';
  if (normalized === 'standings' || normalized === '/standings') return 'standings';
  if (
    normalized === 'analytics-evidence'
    || normalized === '/analytics'
    || normalized === '/stat-central'
  ) {
    return 'analytics-evidence';
  }
  if (normalized === 'player-profile' || /^\/player\/[^/]+$/.test(normalized)) return 'player-profile';
  if (normalized === 'player-timeline' || /^\/player\/[^/]+\/timeline$/.test(normalized)) return 'player-timeline';
  if (normalized === 'player-development' || normalized === '/player-development') return 'player-development';
  if (normalized === 'player-comparison' || normalized === '/compare') return 'player-comparison';
  if (normalized === 'player-rivalries' || normalized === '/rivalries') return 'player-rivalries';
  if (normalized === 'power-rankings' || normalized === '/power-rankings') return 'power-rankings';
  if (normalized === 'league-pulse' || normalized === '/league-pulse') return 'league-pulse';
  if (normalized === 'league-weather' || normalized === '/league/weather') return 'league-weather';
  if (normalized === 'league-news' || normalized === '/news') return 'league-news';
  if (normalized === 'newsroom' || normalized === '/newsroom') return 'newsroom';
  if (normalized === 'social-feed' || normalized === '/social') return 'social-feed';
  if (normalized === 'commissioner-governance' || normalized === '/commissioner') return 'commissioner-governance';
  if (normalized === 'cba' || normalized === '/cba') return 'cba';
  if (normalized === 'league-rules' || normalized === '/league-rules') return 'league-rules';
  if (normalized === 'scenario-constraints' || normalized === '/scenarios') return 'scenario-constraints';
  if (normalized === 'season-recap' || normalized === '/season/recap') return 'season-recap';
  if (
    normalized === 'record-book'
    || normalized === '/records'
    || normalized === '/legacy'
    || normalized.startsWith('/legacy/')
    || normalized === '/franchise'
    || normalized.startsWith('/franchise/')
  ) {
    return 'record-book';
  }
  if (normalized === 'awards-hub' || normalized === '/awards') return 'awards-hub';
  if (normalized === 'franchise-legends' || normalized === '/legends') return 'franchise-legends';
  if (normalized === 'dynasty-save-load' || normalized === '/dynasty') return 'dynasty-save-load';
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

export function useActiveRouteBeats(
  currentRoute: string,
  context: { currentWeek?: number; dynastySeed?: number; phase?: string } = {},
): readonly RouteBeat[] {
  const seenBeats = useChipStore((state) => state.seenBeats);

  return useMemo(
    () => {
      const storage = resolveBrowserStorage();
      const onboardingContext = {
        currentWeek: context.currentWeek ?? 0,
        dynastySeed: context.dynastySeed,
      };
      const onboardingBeats = selectChipOnboardingRouteBeats(
        currentRoute,
        readChipOnboardingState(storage),
        onboardingContext,
      )
        .filter((beat) => !seenBeats.has(beat.id))
        // G9: seeded dynasties get a rotating flavor closer on first-ten
        // beats; unseeded callers receive the canonical text byte-for-byte.
        .map((beat) => ({ ...beat, text: firstTenBeatText(beat, onboardingContext) }));
      const registryBeats = selectActiveRouteBeats(currentRoute, seenBeats)
        // G2/G3: playoff phase serves the high-stakes tier-1 variants; late
        // and early regular-season weeks serve the season-toned variants
        // (precedence: playoffs > late > early). Every other context keeps
        // the canonical registry text byte-for-byte.
        .map((beat) => {
          const week = context.currentWeek ?? 0;
          const variantText = context.phase === 'playoffs'
            ? PLAYOFF_ROUTE_BEAT_TEXT[beat.id]
            : week >= LATE_SEASON_MIN_WEEK
              ? LATE_SEASON_ROUTE_BEAT_TEXT[beat.id]
              : week >= 1 && week <= EARLY_SEASON_MAX_WEEK
                ? EARLY_SEASON_ROUTE_BEAT_TEXT[beat.id]
                : undefined;
          return variantText ? { ...beat, text: variantText } : beat;
        });
      return [...onboardingBeats, ...registryBeats];
    },
    [context.currentWeek, context.dynastySeed, context.phase, currentRoute, seenBeats],
  );
}
