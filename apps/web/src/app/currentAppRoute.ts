import { splitHref, type HrefParts } from '../ui/routes/href';

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

/**
 * The current route split into the parts the WP-04 compatibility layer needs.
 *
 * `resolveCurrentAppRoute` already returns query and fragment inside its string;
 * this separates them with the same parser deep links use, so "where am I" and
 * "where does this link go" can never disagree. `ui/routes/href` carries no
 * routing data, so this import costs nothing at any chunk boundary.
 */
export function resolveCurrentAppLocationParts(
  location: CurrentAppLocation | null | undefined,
  basePath = import.meta.env.BASE_URL,
): HrefParts {
  return splitHref(resolveCurrentAppRoute(location, basePath));
}
