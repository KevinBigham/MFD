import { describe, expect, it } from 'vitest';
import { APP_ROUTE_REGISTRY } from '@mfd/engine/config';
import {
  UNKNOWN_ROUTE_FALLBACK,
  isResolvable,
  resolveCompatibleRoute,
  splitHref,
} from './route-compatibility';
import { ROUTE_SURFACE_ENTRIES } from './route-surface-map';

describe('splitHref', () => {
  it('accepts bare, hash-prefixed, and decorated hrefs', () => {
    expect(splitHref('/roster')).toEqual({ path: '/roster', search: '', fragment: '' });
    expect(splitHref('#/roster')).toEqual({ path: '/roster', search: '', fragment: '' });
    expect(splitHref('roster')).toEqual({ path: '/roster', search: '', fragment: '' });
    expect(splitHref('/roster?pos=QB&sort=ovr#top')).toEqual({
      path: '/roster',
      search: 'pos=QB&sort=ovr',
      fragment: 'top',
    });
  });

  it('normalises trailing slashes and empty input to the root', () => {
    expect(splitHref('/roster/').path).toBe('/roster');
    expect(splitHref('/').path).toBe('/');
    expect(splitHref('').path).toBe('/');
    expect(splitHref('#').path).toBe('/');
  });
});

describe('resolveCompatibleRoute', () => {
  it('resolves every registry path to a known hub — 79/79, no gaps', () => {
    for (const definition of APP_ROUTE_REGISTRY) {
      const resolved = resolveCompatibleRoute(definition.path);
      expect(resolved.status, `${definition.path} did not resolve`).toBe('alias');
      expect(resolved.hub).toBeTruthy();
      expect(resolved.canonicalPath.startsWith('/')).toBe(true);
    }
  });

  it('rewrites an old link into its new destination', () => {
    const resolved = resolveCompatibleRoute('#/contracts');

    expect(resolved.status).toBe('alias');
    expect(resolved.hub).toBe('office');
    expect(resolved.canonicalPath).toBe('/office/finance/contracts');
    expect(resolved.canonicalHref).toBe('/office/finance/contracts');
    expect(resolved.recovery).toBeNull();
  });

  it('preserves query and fragment through the rewrite', () => {
    const resolved = resolveCompatibleRoute('/roster?pos=QB&sort=ovr#player-42');

    expect(resolved.canonicalHref).toBe('/team/roster?pos=QB&sort=ovr#player-42');
    expect(resolved.params).toEqual({ pos: 'QB', sort: 'ovr' });
    expect(resolved.fragment).toBe('player-42');
  });

  it('preserves entity ids exactly, including ones that need encoding', () => {
    const resolved = resolveCompatibleRoute('/compare?a=PLR_0001&b=PLR%2F0002');

    expect(resolved.params).toEqual({ a: 'PLR_0001', b: 'PLR/0002' });
    expect(resolved.canonicalPath).toBe('/team/compare');
  });

  it('merges the destination structural param without dropping the caller query', () => {
    const resolved = resolveCompatibleRoute('/week-advance?highlight=cap');

    expect(resolved.canonicalPath).toBe('/today');
    expect(resolved.params).toEqual({ highlight: 'cap', panel: 'readiness' });
    expect(resolved.canonicalHref).toBe('/today?highlight=cap&panel=readiness');
  });

  it('lets the destination win when the caller collides with a structural param', () => {
    const resolved = resolveCompatibleRoute('/week-advance?panel=spoofed');

    expect(resolved.params.panel).toBe('readiness');
  });

  it('treats an already-canonical link as canonical and leaves it alone', () => {
    const resolved = resolveCompatibleRoute('/team/roster?pos=QB');

    expect(resolved.status).toBe('canonical');
    expect(resolved.hub).toBe('team');
    expect(resolved.canonicalHref).toBe('/team/roster?pos=QB');
  });

  it('keeps a hub panel on the panel rather than collapsing it to the hub root', () => {
    const resolved = resolveCompatibleRoute('/today?panel=readiness');

    expect(resolved.status).toBe('canonical');
    expect(resolved.canonicalHref).toBe('/today?panel=readiness');
  });

  it('matches exactly, so /dynasty stays Save/Load and is not eaten by the Dynasty hub', () => {
    const saves = resolveCompatibleRoute('/dynasty');
    expect(saves.hub).toBe('system');
    expect(saves.canonicalPath).toBe('/system/saves');

    const hub = resolveCompatibleRoute('/dynasty/overview');
    expect(hub.status).toBe('canonical');
    expect(hub.hub).toBe('dynasty');
  });

  it('is a fixed point: resolving a resolved href changes nothing', () => {
    for (const definition of APP_ROUTE_REGISTRY) {
      const once = resolveCompatibleRoute(definition.path);
      const twice = resolveCompatibleRoute(once.canonicalHref);

      expect(twice.canonicalHref, `${definition.path} does not settle`).toBe(once.canonicalHref);
      expect(twice.hub).toBe(once.hub);
    }
  });

  it('has no circular mappings — no canonical destination redirects somewhere else', () => {
    for (const entry of ROUTE_SURFACE_ENTRIES) {
      const resolved = resolveCompatibleRoute(entry.canonicalPath);
      expect(resolved.canonicalPath, `${entry.canonicalPath} redirects away from itself`)
        .toBe(entry.canonicalPath.split('?')[0]);
    }
  });

  it('reports an unknown link with a recovery destination instead of throwing', () => {
    const resolved = resolveCompatibleRoute('/not-a-real-route?keep=me');

    expect(resolved.status).toBe('unknown');
    expect(resolved.hub).toBeNull();
    expect(resolved.surface).toBeNull();
    expect(resolved.recovery).toBe(UNKNOWN_ROUTE_FALLBACK);
    expect(resolved.params).toEqual({ keep: 'me' });
    expect(isResolvable('/not-a-real-route')).toBe(false);
  });

  it('keeps no route deleted — every legacy path still resolves without recovery', () => {
    for (const definition of APP_ROUTE_REGISTRY) {
      expect(resolveCompatibleRoute(definition.path).recovery).toBeNull();
    }
  });
});
