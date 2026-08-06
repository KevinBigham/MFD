/**
 * WP-04 — the UI's model of where each canonical route lives after the overhaul.
 *
 * This is an adapter *over* `APP_ROUTE_REGISTRY`, never a replacement for it.
 * The engine registry stays the single source of truth for which destinations
 * exist and when they unlock; this layer only answers "which hub, which surface,
 * which canonical URL, and what happens to the old link".
 *
 * Deliberately excluded from the runtime model:
 *   - `lifecycle_phase` — prose in the matrix, but authoritative in the registry
 *     as `unlockWeek` / `unlockPhase`. Duplicating it here would create a second
 *     mutable copy of an unlock rule, which is exactly the coupling WP-04 forbids.
 *   - `route_compatibility` / `feature_loss_risk` / `required_acceptance_test` —
 *     audit prose. They stay in `ROUTE_SURFACE_MATRIX.csv` and are enforced
 *     non-empty by `scripts/check-ui-route-coverage.mjs`. All 79 rows carry the
 *     same decision — keep the old path as an alias until H2 — so there is no
 *     per-route compatibility field here to get out of sync. Retirement is a
 *     WP-23 change, and it arrives with its own failing test.
 */

export type HubId = 'today' | 'team' | 'game' | 'office' | 'league' | 'dynasty' | 'system';

/**
 * The screen archetype the shell should build this surface from. One member per
 * distinct `recommended_surface_type` in the matrix — the mapping is lossless so
 * an audit decision can never be silently widened into a neighbouring archetype.
 */
export type SurfaceType =
  | 'phase-aware-hub'
  | 'hub-section'
  | 'drawer'
  | 'collection'
  | 'contextual-workflow'
  | 'comparison-workbench'
  | 'transaction-workbench'
  | 'decision-workflow'
  | 'event-presentation'
  | 'timeline'
  | 'dashboard'
  | 'archive-detail'
  | 'system-utility'
  | 'trust-critical-utility';

export type RouteFrequency =
  | 'every-session'
  | 'weekly'
  | 'very-frequent'
  | 'frequent'
  | 'frequent-in-phase'
  | 'phase-dominant'
  | 'periodic'
  | 'contextual'
  | 'occasional'
  | 'once-per-season'
  | 'rare';

export type RouteUrgency =
  | 'critical'
  | 'critical-when-active'
  | 'critical-when-blocked'
  | 'high'
  | 'high-when-active'
  | 'high-when-due'
  | 'high-when-triggered'
  | 'medium'
  | 'low';

export interface RouteSurfaceMeta {
  /** The path as it appears in `APP_ROUTE_REGISTRY`. */
  legacyPath: string;
  hub: HubId;
  /** New-IA destination. May carry a structural query string, e.g. `/today?panel=readiness`. */
  canonicalPath: string;
  surfaceType: SurfaceType;
  /** Human wayfinding label — the breadcrumb a return-to-task control shows. */
  placement: string;
  /** True when the route earns a slot in permanent navigation rather than a hub section. */
  permanentNav: boolean;
  frequency: RouteFrequency;
  urgency: RouteUrgency;
}

export const HUB_IDS: readonly HubId[] = [
  'today',
  'team',
  'game',
  'office',
  'league',
  'dynasty',
  'system',
];

export const HUB_LABELS: Record<HubId, string> = {
  today: 'Today',
  team: 'Team',
  game: 'Game',
  office: 'Office',
  league: 'League',
  dynasty: 'Dynasty',
  system: 'System',
};
