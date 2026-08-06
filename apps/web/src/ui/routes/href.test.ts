import { describe, expect, it } from 'vitest';
import { APP_ROUTE_REGISTRY } from '@mfd/engine/config';
import { normalizePath, splitHref } from './href';
import { resolveCompatibleRoute } from './route-compatibility';
import { hubForLegacyPath, routeSurface } from './route-surface-map';
import { resolveCurrentAppLocationParts } from '../../app/currentAppRoute';

describe('normalizePath', () => {
  it('always produces a rooted path with no trailing slash', () => {
    expect(normalizePath('/roster')).toBe('/roster');
    expect(normalizePath('roster')).toBe('/roster');
    expect(normalizePath('/roster/')).toBe('/roster');
    expect(normalizePath('/roster///')).toBe('/roster');
    expect(normalizePath('  /roster  ')).toBe('/roster');
  });

  it('collapses every spelling of the root', () => {
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('//')).toBe('/');
    expect(normalizePath('')).toBe('/');
    expect(normalizePath('   ')).toBe('/');
  });
});

describe('one parser, one answer', () => {
  const decorations = ['', '/', '?pos=QB&sort=ovr', '#row-3', '?pos=QB#row-3'];

  it('makes lookup and link resolution agree for every route and decoration', () => {
    for (const definition of APP_ROUTE_REGISTRY) {
      for (const decoration of decorations) {
        const href = `${definition.path}${decoration}`;
        const resolved = resolveCompatibleRoute(href);
        const surface = routeSurface(splitHref(href).path);

        expect(surface?.legacyPath, href).toBe(definition.path);
        expect(hubForLegacyPath(splitHref(href).path), href).toBe(resolved.hub);
      }
    }
  });

  it('makes "where am I" agree with "where does this link go"', () => {
    for (const definition of APP_ROUTE_REGISTRY) {
      for (const decoration of decorations) {
        const href = `${definition.path}${decoration}`;
        const parts = resolveCurrentAppLocationParts({ hash: `#${href}`, pathname: '/MFD/' }, '/MFD/');

        expect(parts, href).toEqual(splitHref(href));
      }
    }
  });

  it('tolerates a trailing slash on lookups, which exact keying used to drop', () => {
    expect(routeSurface('/roster/')?.hub).toBe('team');
    expect(hubForLegacyPath('/coaching/tree/')).toBe('team');
    expect(resolveCompatibleRoute('/roster/').canonicalPath).toBe('/team/roster');
  });
});
