/**
 * One href parser for the whole UI layer.
 *
 * Route lookups, deep-link resolution, and "where am I now" all have to agree
 * about what `/roster/`, `#/roster`, and `roster?pos=QB` mean. When they each
 * parsed hrefs their own way they disagreed at the edges, so there is exactly
 * one implementation here and everything imports it.
 *
 * No dependencies — not on the surface map, not on the store — so any module in
 * `ui/` or `app/` can use it without dragging routing data along.
 */

export interface HrefParts {
  /** Leading slash, no trailing slash, no query, no fragment. */
  path: string;
  /** Query string without the `?`. Empty when absent. */
  search: string;
  /** Fragment without the `#`. Empty when absent. */
  fragment: string;
}

export function normalizePath(raw: string): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '/';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/+$/, '') || '/';
}

/** Accepts `/roster`, `#/roster`, `roster`, `/roster?pos=QB#top`, and the empty string. */
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
