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
