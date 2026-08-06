import { describe, expect, it } from 'vitest';
import { APP_ROUTE_REGISTRY } from '@mfd/engine/config';
import { splitHref } from '../ui/routes/route-compatibility';
import { resolveCurrentAppLocationParts, resolveCurrentAppRoute } from './currentAppRoute';

describe('resolveCurrentAppRoute', () => {
  it('prefers the hash route used by createHashHistory', () => {
    expect(resolveCurrentAppRoute({ hash: '#/league/weather', pathname: '/MFD/' }, '/MFD/')).toBe('/league/weather');
  });

  it('normalizes the deploy base to the home route when no hash is present', () => {
    expect(resolveCurrentAppRoute({ hash: '', pathname: '/MFD/' }, '/MFD/')).toBe('/');
    expect(resolveCurrentAppRoute({ hash: '', pathname: '/MFD' }, '/MFD/')).toBe('/');
  });

  it('strips the deploy base from browser-history-style paths', () => {
    expect(resolveCurrentAppRoute({ hash: '', pathname: '/MFD/roster' }, '/MFD/')).toBe('/roster');
  });

  it('keeps browser-history-style paths when they are outside the deploy base', () => {
    expect(resolveCurrentAppRoute({ hash: '', pathname: '/roster' }, '/MFD/')).toBe('/roster');
  });

  it('falls back to home route without a browser location', () => {
    expect(resolveCurrentAppRoute(null, '/MFD/')).toBe('/');
  });
});

describe('resolveCurrentAppLocationParts', () => {
  it('separates query and fragment from the route', () => {
    expect(resolveCurrentAppLocationParts({ hash: '#/roster?pos=QB#row-3', pathname: '/MFD/' }, '/MFD/'))
      .toEqual({ path: '/roster', search: 'pos=QB', fragment: 'row-3' });
  });

  it('reports a bare route with empty query and fragment', () => {
    expect(resolveCurrentAppLocationParts({ hash: '#/standings', pathname: '/MFD/' }, '/MFD/'))
      .toEqual({ path: '/standings', search: '', fragment: '' });
    expect(resolveCurrentAppLocationParts(null, '/MFD/'))
      .toEqual({ path: '/', search: '', fragment: '' });
  });

  it('carries hash and base-path handling into the shared splitter for every route', () => {
    // Both sides now call `splitHref`, so this no longer pins two
    // implementations together — what it still covers is that
    // `resolveCurrentAppRoute`'s hash extraction and deploy-base stripping
    // survive the split intact.
    const decorations = ['', '?pos=QB&sort=ovr', '#row-3', '?pos=QB#row-3', '/'];

    for (const definition of APP_ROUTE_REGISTRY) {
      for (const decoration of decorations) {
        const href = `${definition.path}${decoration}`;
        const parts = resolveCurrentAppLocationParts({ hash: `#${href}`, pathname: '/MFD/' }, '/MFD/');

        expect(parts, `disagreement on ${href}`).toEqual(splitHref(href));
      }
    }
  });
});
