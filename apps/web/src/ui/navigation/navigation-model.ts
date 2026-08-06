/**
 * WP-06 — what the new navigation offers, derived rather than declared.
 *
 * The audit's finding was that four phone feature links plus an overloaded
 * "More" drawer do not represent a job-centred IA. The fix is five stable
 * destinations — Today, Team, Game, Office, League — with Dynasty and System
 * exposed deliberately instead of dumped into a sitemap.
 *
 * Almost nothing here is authored. `permanentNav` in the WP-04 surface map
 * already records which route earns a slot in permanent navigation, and it
 * marks exactly one route per phone hub. Reading it means the nav and the route
 * matrix cannot drift: moving a screen between hubs in the map moves it in the
 * navigation, with no second list to remember.
 *
 * Two things *are* authored, and both are flagged: the Dynasty and System
 * landings. Neither hub has a `permanentNav` route, because neither belongs in
 * the phone bar. Picking one by ranking frequency and urgency would be a rule
 * invented to avoid writing two strings, and it produces the wrong answer for
 * System — the most urgent route there is save recovery, which is a destination
 * you arrive at from a task, not a place you browse to.
 */

import { hubForLegacyPath, ROUTE_SURFACE_ENTRIES } from '../routes/route-surface-map';
import { HUB_LABELS, type HubId, type RouteSurfaceMeta } from '../routes/route-surface-types';
import { isV2ShellRoute, normalizeRoutePath, TODAY_ROUTE } from '../migration/ui-overhaul-mode';
import type { MergedTask } from '../tasks/task-ledger';

/** The phone bar. Five, in weekly-loop order: what you owe, then where you work. */
export const PRIMARY_HUBS = ['today', 'team', 'game', 'office', 'league'] as const satisfies readonly HubId[];

/**
 * Present from `medium` up, where there is room for them without displacing a
 * primary destination. On phone they are reached from Today, from a task, or
 * from an event — which is what the audit asks for.
 */
export const SECONDARY_HUBS = ['dynasty', 'system'] as const satisfies readonly HubId[];

/**
 * Landings for the two hubs the surface map does not nominate.
 *
 * - Dynasty → `/franchise`, the hub's own overview (`/dynasty/overview`).
 * - System → `/settings`, not `/dynasty` (save recovery). Saves are reached
 *   from the standing save task on Today; Settings is the browsable entry, and
 *   it is where the interface-preview toggle lives — the one control a preview
 *   user has to be able to find without being told a path.
 *
 * Pinned by test against the surface map, so a route that changes hub cannot
 * leave a nav entry pointing into a hub it no longer belongs to.
 */
export const SECONDARY_HUB_LANDINGS: Readonly<Record<(typeof SECONDARY_HUBS)[number], string>> = {
  dynasty: '/franchise',
  system: '/settings',
};

/**
 * Which hub each new-shell route belongs to.
 *
 * `/today` is deliberately absent from `APP_ROUTE_REGISTRY` and from the
 * surface map's legacy paths, so `hubForLegacyPath` cannot answer for it. The
 * map does still describe it — as the `canonicalPath` of `/` — and
 * `resolveActiveHub` reads it from there rather than from this table. This
 * exists only to prove the shell's route set and the navigation agree, and a
 * test fails if a route joins one without the other.
 */
export const V2_ROUTE_HUBS: Record<string, HubId> = {
  [TODAY_ROUTE]: 'today',
};

/** Above this a count stops being informative and becomes decoration. */
export const MAX_BADGE = 9;

export interface NavDestination {
  hub: HubId;
  label: string;
  /** Where the link points. A v2 canonical path when the hub has migrated. */
  route: string;
  /**
   * True when following this link stays in the new shell.
   *
   * During the migration most destinations cross back into the legacy shell,
   * and that is the strangler pattern working, not a defect. It is surfaced
   * because a nav that hides the boundary makes the chrome appear to flicker
   * for no reason a player can name.
   */
  migrated: boolean;
  /** Wayfinding text — the placement line from the surface map. */
  placement: string;
  /** Open jobs the ledger routed into this hub. Zero means no badge. */
  badge: number;
  /** Bounded rendering of `badge`; empty when there is nothing to show. */
  badgeLabel: string;
}

function normalizedCanonical(entry: RouteSurfaceMeta): string {
  return normalizeRoutePath(entry.canonicalPath) ?? entry.canonicalPath;
}

/**
 * The route a destination links to.
 *
 * A hub whose canonical path the new shell already owns links to the new path;
 * every other hub keeps its legacy path. That is the whole migration switch:
 * when a hub's screen lands and its canonical path enters `V2_SHELL_ROUTES`,
 * this starts returning the new path with no edit here.
 */
export function destinationRoute(entry: RouteSurfaceMeta): { route: string; migrated: boolean } {
  // Ownership is decided on the normalised path; the *link* keeps the full
  // canonical path. Several canonical paths carry structural query state
  // (`/today?panel=readiness`), and linking to the normalised form would drop
  // it — a destination that lands on the right screen with the wrong panel.
  return isV2ShellRoute(normalizedCanonical(entry))
    ? { route: entry.canonicalPath, migrated: true }
    : { route: entry.legacyPath, migrated: false };
}

function badgeLabel(count: number): string {
  if (count <= 0) return '';
  return count > MAX_BADGE ? `${MAX_BADGE}+` : String(count);
}

/**
 * Open jobs per hub, taken from the same ledger Today renders.
 *
 * The audit's requirement is one derivation: the number on a tab and the rows
 * Today holds must not be able to disagree. Merged duplicates are not counted
 * twice — `mergeTaskLedger` has already collapsed them — and the always-
 * available standing lane is excluded, because a badge that never reaches zero
 * teaches players to ignore badges.
 *
 * Rows behind the recommended lane's overflow disclosure still count. The badge
 * is a count of open work, and a summary the player has not opened does not
 * close any of it.
 */
export function hubBadges(tasks: readonly MergedTask[]): Partial<Record<HubId, number>> {
  const counts: Partial<Record<HubId, number>> = {};

  for (const task of tasks) {
    if (task.category === 'optional') continue;
    const hub = task.destination.hub;
    if (!hub) continue;
    counts[hub] = (counts[hub] ?? 0) + 1;
  }

  return counts;
}

function navEntryForHub(hub: HubId): RouteSurfaceMeta | undefined {
  const nominated = ROUTE_SURFACE_ENTRIES.find((entry) => entry.hub === hub && entry.permanentNav);
  if (nominated) return nominated;

  const landing = SECONDARY_HUB_LANDINGS[hub as (typeof SECONDARY_HUBS)[number]];
  return landing ? ROUTE_SURFACE_ENTRIES.find((entry) => entry.legacyPath === landing) : undefined;
}

export function navDestination(
  hub: HubId,
  badges: Partial<Record<HubId, number>> = {},
): NavDestination | undefined {
  const entry = navEntryForHub(hub);
  if (!entry) return undefined;

  const badge = badges[hub] ?? 0;

  return {
    hub,
    label: HUB_LABELS[hub],
    ...destinationRoute(entry),
    placement: entry.placement,
    badge,
    badgeLabel: badgeLabel(badge),
  };
}

export interface NavigationModel {
  primary: readonly NavDestination[];
  secondary: readonly NavDestination[];
  activeHub: HubId | undefined;
}

/**
 * Which hub the current path belongs to.
 *
 * Legacy paths answer from the surface map directly. New-shell paths are not
 * legacy paths, so they are found through the `canonicalPath` the map already
 * records for them — which is why `/today` needs no special case: the map says
 * `/` is the today hub and its canonical path is `/today`.
 */
export function resolveActiveHub(path: string | null | undefined): HubId | undefined {
  const normalized = normalizeRoutePath(path);
  if (!normalized) return undefined;

  const fromLegacy = hubForLegacyPath(normalized);
  if (fromLegacy) return fromLegacy;

  return ROUTE_SURFACE_ENTRIES.find((entry) => normalizedCanonical(entry) === normalized)?.hub;
}

export function buildNavigationModel(
  path: string | null | undefined,
  tasks: readonly MergedTask[] = [],
): NavigationModel {
  const badges = hubBadges(tasks);

  return {
    primary: PRIMARY_HUBS.map((hub) => navDestination(hub, badges)).filter(
      (destination): destination is NavDestination => destination !== undefined,
    ),
    secondary: SECONDARY_HUBS.map((hub) => navDestination(hub, badges)).filter(
      (destination): destination is NavDestination => destination !== undefined,
    ),
    activeHub: resolveActiveHub(path),
  };
}
