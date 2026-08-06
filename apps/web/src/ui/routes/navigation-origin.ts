/**
 * WP-04 — return-to-task.
 *
 * The audit's sharpest navigation finding is that MFD sends you somewhere and
 * then abandons you there: back goes to a route, not to what you were doing.
 * A `NavigationOrigin` is the breadcrumb that fixes it — it travels in the URL,
 * so it survives a reload, a deep link, and a restored session.
 *
 * Pure and self-limiting. Nothing here reads the store or the location; the
 * shell passes values in and gets a string back.
 */

import { resolveCompatibleRoute } from './route-compatibility';

/** The query parameter the origin rides in. Short, because it shares the URL. */
export const ORIGIN_PARAM = 'from';

/**
 * URLs are shared and stored. Past this many encoded characters the origin
 * sheds detail rather than producing a link nobody can paste.
 */
export const ORIGIN_BUDGET = 512;

/**
 * Longest label a decoded origin may carry into a return control.
 *
 * The budget above only constrains what *we* encode. The parameter is
 * user-editable, so a hand-written URL can arrive with a megabyte of label text
 * headed straight for a button.
 */
export const ORIGIN_LABEL_MAX = 120;

export interface NavigationOrigin {
  /** Canonical href of the surface the player left. */
  route: string;
  /** Wayfinding label for the return control, e.g. "Today" or "Team > Depth". */
  label: string;
  /** Task ledger item that sent them, when the trip started from a task. */
  taskId?: string;
  /** Entity the origin surface was focused on. */
  entityId?: string;
  /** Filter/sort state worth restoring. */
  query?: Record<string, string>;
  /** Element id to scroll back to. */
  scrollAnchor?: string;
  /** Element id to return focus to. */
  focusTarget?: string;
}

/**
 * Fields are dropped in this order when the encoded origin exceeds the budget:
 * the cheapest restoration wins, and route + label always survive.
 */
const SHEDDABLE_FIELDS = ['query', 'scrollAnchor', 'focusTarget', 'entityId', 'taskId'] as const;

export function createNavigationOrigin(origin: NavigationOrigin): NavigationOrigin {
  const resolved = resolveCompatibleRoute(origin.route);
  return {
    ...origin,
    route: resolved.status === 'unknown' ? origin.route : resolved.canonicalHref,
  };
}

function serialize(origin: NavigationOrigin): string {
  const compact: Record<string, unknown> = { route: origin.route, label: origin.label };
  for (const field of SHEDDABLE_FIELDS) {
    const value = origin[field];
    if (value !== undefined && !(typeof value === 'object' && Object.keys(value).length === 0)) {
      compact[field] = value;
    }
  }
  return encodeURIComponent(JSON.stringify(compact));
}

/**
 * Encode an origin for the URL, shedding optional detail until it fits.
 * Returns null when even `{route, label}` is over budget — a link that long is
 * not worth producing, and the caller falls back to plain hub navigation.
 */
export function encodeNavigationOrigin(origin: NavigationOrigin): string | null {
  let candidate: NavigationOrigin = { ...origin };
  let encoded = serialize(candidate);

  for (const field of SHEDDABLE_FIELDS) {
    if (encoded.length <= ORIGIN_BUDGET) return encoded;
    const { [field]: _dropped, ...rest } = candidate;
    candidate = rest;
    encoded = serialize(candidate);
  }

  return encoded.length <= ORIGIN_BUDGET ? encoded : null;
}

function asStringRecord(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string');
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Decode an origin from a URL. Hostile input is expected — the parameter is
 * user-editable — so anything that is not a well-formed origin pointing at a
 * resolvable route returns null rather than a half-populated breadcrumb.
 */
export function decodeNavigationOrigin(encoded: string | null | undefined): NavigationOrigin | null {
  if (!encoded) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeURIComponent(encoded));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;

  const route = asOptionalString(record.route);
  const label = asOptionalString(record.label);
  if (!route || !label || label.length > ORIGIN_LABEL_MAX) return null;
  if (resolveCompatibleRoute(route).status === 'unknown') return null;

  const origin: NavigationOrigin = { route, label };
  const taskId = asOptionalString(record.taskId);
  const entityId = asOptionalString(record.entityId);
  const scrollAnchor = asOptionalString(record.scrollAnchor);
  const focusTarget = asOptionalString(record.focusTarget);
  const query = asStringRecord(record.query);

  if (taskId) origin.taskId = taskId;
  if (entityId) origin.entityId = entityId;
  if (query) origin.query = query;
  if (scrollAnchor) origin.scrollAnchor = scrollAnchor;
  if (focusTarget) origin.focusTarget = focusTarget;

  return origin;
}

/** Attach an origin to a destination href. Returns the href unchanged if it will not fit. */
export function withNavigationOrigin(href: string, origin: NavigationOrigin): string {
  const encoded = encodeNavigationOrigin(createNavigationOrigin(origin));
  if (!encoded) return href;

  const { path, search, fragment } = splitDestination(href);
  const params = new URLSearchParams(search);
  params.set(ORIGIN_PARAM, encoded);
  return `${path}?${params.toString()}${fragment ? `#${fragment}` : ''}`;
}

function splitDestination(href: string): { path: string; search: string; fragment: string } {
  let rest = href;
  let fragment = '';
  const fragmentIndex = rest.indexOf('#');
  if (fragmentIndex >= 0) {
    fragment = rest.slice(fragmentIndex + 1);
    rest = rest.slice(0, fragmentIndex);
  }
  const searchIndex = rest.indexOf('?');
  if (searchIndex < 0) return { path: rest, search: '', fragment };
  return { path: rest.slice(0, searchIndex), search: rest.slice(searchIndex + 1), fragment };
}

/**
 * The href a return control should navigate to, restoring filter/sort state and
 * the scroll anchor. Focus restoration is the shell's job — it needs a live DOM
 * — so `focusTarget` is carried but not encoded into the URL here.
 */
export function returnToOriginHref(origin: NavigationOrigin): string {
  const { path, search, fragment } = splitDestination(origin.route);
  const params = new URLSearchParams(search);
  for (const [key, value] of Object.entries(origin.query ?? {})) {
    params.set(key, value);
  }
  if (origin.entityId) params.set('entity', origin.entityId);

  const query = params.toString();
  const anchor = origin.scrollAnchor || fragment;
  return `${path}${query ? `?${query}` : ''}${anchor ? `#${anchor}` : ''}`;
}

/** Read an origin back out of a resolved route's params. */
export function originFromParams(params: Record<string, string>): NavigationOrigin | null {
  return decodeNavigationOrigin(params[ORIGIN_PARAM]);
}
