/**
 * WP-04 — deep-link compatibility.
 *
 * Every URL a player has ever bookmarked, shared, or been linked to must keep
 * working. `resolveCompatibleRoute` is the one function that decides what an
 * incoming path means in the new IA, and it never deletes information: query
 * params and fragments ride through untouched unless the destination itself
 * defines a structural param.
 *
 * Pure. No routing library, no store, no browser globals — so the smoke
 * harness, the shell, and tests all resolve links identically.
 */

import {
  ROUTE_SURFACE_ENTRIES,
  ROUTE_SURFACE_MAP,
} from './route-surface-map';
import type { HubId, RouteSurfaceMeta } from './route-surface-types';

export type RouteResolutionStatus = 'canonical' | 'alias' | 'unknown';

/** Where an unrecognised link lands. Today is the only surface that is always safe. */
export const UNKNOWN_ROUTE_FALLBACK = '/today';

export interface ResolvedRoute {
  status: RouteResolutionStatus;
  /** Normalised path the caller asked for, without query or fragment. */
  requestedPath: string;
  surface: RouteSurfaceMeta | null;
  hub: HubId | null;
  /** Destination path only. Equals `requestedPath` when the link is already canonical. */
  canonicalPath: string;
  /** Full destination including merged query and preserved fragment. */
  canonicalHref: string;
  /** Merged query, destination params last. */
  params: Record<string, string>;
  /** Fragment without its leading `#`. Empty when absent. */
  fragment: string;
  /** Where to send the player when the link resolves to nothing. Null on success. */
  recovery: string | null;
}

function normalizePath(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '/';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const withoutTrailing = withSlash.replace(/\/+$/, '');
  return withoutTrailing || '/';
}

interface HrefParts {
  path: string;
  search: string;
  fragment: string;
}

/** Accepts `/roster`, `#/roster`, `/roster?pos=QB#top`, and the empty string. */
export function splitHref(href: string): HrefParts {
  let rest = (href ?? '').trim();
  if (rest.startsWith('#')) rest = rest.slice(1);

  let fragment = '';
  const fragmentIndex = rest.indexOf('#');
  if (fragmentIndex >= 0) {
    fragment = rest.slice(fragmentIndex + 1);
    rest = rest.slice(0, fragmentIndex);
  }

  let search = '';
  const searchIndex = rest.indexOf('?');
  if (searchIndex >= 0) {
    search = rest.slice(searchIndex + 1);
    rest = rest.slice(0, searchIndex);
  }

  return { path: normalizePath(rest), search, fragment };
}

/**
 * Canonical paths are looked up by their path portion. Two legacy routes can
 * share one canonical path when a workflow becomes a panel on a hub — `/` and
 * `/week-advance` both land on `/today` — so the entry without a structural
 * query wins, since that is the hub itself rather than one of its panels.
 */
function buildCanonicalIndex(): Map<string, RouteSurfaceMeta> {
  const index = new Map<string, RouteSurfaceMeta>();
  for (const entry of ROUTE_SURFACE_ENTRIES) {
    const { path, search } = splitHref(entry.canonicalPath);
    const existing = index.get(path);
    if (!existing || (search === '' && splitHref(existing.canonicalPath).search !== '')) {
      index.set(path, entry);
    }
  }
  return index;
}

const CANONICAL_INDEX = buildCanonicalIndex();

function buildHref(path: string, params: URLSearchParams, fragment: string): string {
  const query = params.toString();
  return `${path}${query ? `?${query}` : ''}${fragment ? `#${fragment}` : ''}`;
}

/**
 * Resolve any incoming link into the new IA.
 *
 * Matching is exact, never by prefix. `/dynasty` is the legacy Save/Load screen
 * and resolves to `/system/saves`; it must not be swallowed by the new Dynasty
 * hub that owns `/dynasty/*`.
 */
export function resolveCompatibleRoute(href: string): ResolvedRoute {
  const { path, search, fragment } = splitHref(href);
  const params = new URLSearchParams(search);

  const legacy = ROUTE_SURFACE_MAP[path];
  const canonical = legacy ? null : CANONICAL_INDEX.get(path);
  const surface = legacy ?? canonical ?? null;

  if (!surface) {
    return {
      status: 'unknown',
      requestedPath: path,
      surface: null,
      hub: null,
      canonicalPath: path,
      canonicalHref: buildHref(path, params, fragment),
      params: Object.fromEntries(params),
      fragment,
      recovery: UNKNOWN_ROUTE_FALLBACK,
    };
  }

  // An already-canonical link keeps the exact path it arrived on, so a hub
  // panel like /today?panel=readiness is not rewritten back to its hub root.
  const destination = legacy ? splitHref(surface.canonicalPath) : { path, search: '', fragment: '' };
  for (const [key, value] of new URLSearchParams(destination.search)) {
    params.set(key, value);
  }

  return {
    status: legacy ? 'alias' : 'canonical',
    requestedPath: path,
    surface,
    hub: surface.hub,
    canonicalPath: destination.path,
    canonicalHref: buildHref(destination.path, params, fragment),
    params: Object.fromEntries(params),
    fragment,
    recovery: null,
  };
}

/** True when the link still points at a destination the player can reach. */
export function isResolvable(href: string): boolean {
  return resolveCompatibleRoute(href).status !== 'unknown';
}
