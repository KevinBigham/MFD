interface CurrentAppLocation {
  hash?: string;
  pathname?: string;
}

function ensureAppRoute(path: string): string {
  if (!path || path === '/') return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

function normalizeBasePath(basePath: string): string {
  const normalized = basePath.replace(/\/+$/, '');
  return normalized === '/' ? '' : normalized;
}

export function resolveCurrentAppRoute(
  location: CurrentAppLocation | null | undefined,
  basePath = import.meta.env.BASE_URL,
): string {
  if (!location) return '/';

  const hashRoute = (location.hash ?? '').replace(/^#/, '');
  if (hashRoute) return ensureAppRoute(hashRoute);

  const pathname = location.pathname ?? '/';
  const normalizedBase = normalizeBasePath(basePath);
  if (normalizedBase && (pathname === normalizedBase || pathname.startsWith(`${normalizedBase}/`))) {
    return ensureAppRoute(pathname.slice(normalizedBase.length));
  }

  return ensureAppRoute(pathname);
}

export interface CurrentAppLocationParts {
  path: string;
  search: string;
  fragment: string;
}

/**
 * The current route split into the parts the WP-04 compatibility layer needs.
 *
 * `resolveCurrentAppRoute` already returns query and fragment inside its string;
 * this only separates them, so both functions always agree about where the
 * player is. The split is duplicated rather than imported from
 * `ui/routes/route-compatibility` on purpose: importing it would pull the
 * 79-entry surface map into every consumer of this module — the error boundary
 * and the Chip dock among them — for no legacy benefit. `currentAppRoute.test.ts`
 * pins the two implementations together so they cannot drift.
 */
export function resolveCurrentAppLocationParts(
  location: CurrentAppLocation | null | undefined,
  basePath = import.meta.env.BASE_URL,
): CurrentAppLocationParts {
  let rest = resolveCurrentAppRoute(location, basePath);

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

  const withoutTrailing = rest.replace(/\/+$/, '');
  return { path: withoutTrailing || '/', search, fragment };
}
