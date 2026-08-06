import { describe, expect, it } from 'vitest';
import {
  ORIGIN_BUDGET,
  ORIGIN_PARAM,
  createNavigationOrigin,
  decodeNavigationOrigin,
  encodeNavigationOrigin,
  originFromParams,
  returnToOriginHref,
  withNavigationOrigin,
  type NavigationOrigin,
} from './navigation-origin';
import { resolveCompatibleRoute } from './route-compatibility';

const todayOrigin: NavigationOrigin = { route: '/', label: 'Today', taskId: 'set-lineup' };

describe('createNavigationOrigin', () => {
  it('canonicalises the route it points at', () => {
    expect(createNavigationOrigin(todayOrigin).route).toBe('/today');
    expect(createNavigationOrigin({ route: '#/roster?pos=QB', label: 'Roster' }).route)
      .toBe('/team/roster?pos=QB');
  });

  it('leaves an unresolvable route untouched rather than inventing a destination', () => {
    expect(createNavigationOrigin({ route: '/nowhere', label: 'Nowhere' }).route).toBe('/nowhere');
  });
});

describe('encode / decode', () => {
  it('round-trips every field', () => {
    const origin: NavigationOrigin = {
      route: '/team/roster',
      label: 'Team > Roster',
      taskId: 'fill-depth-chart',
      entityId: 'PLR_0001',
      query: { pos: 'QB', sort: 'ovr' },
      scrollAnchor: 'row-12',
      focusTarget: 'depth-qb1',
    };

    const decoded = decodeNavigationOrigin(encodeNavigationOrigin(origin));

    expect(decoded).toEqual(origin);
  });

  it('survives a URL round trip without needing extra escaping', () => {
    const encoded = encodeNavigationOrigin({ route: '/today', label: 'Today & Tomorrow' });
    const params = new URLSearchParams({ [ORIGIN_PARAM]: encoded! });

    expect(decodeNavigationOrigin(new URLSearchParams(params.toString()).get(ORIGIN_PARAM))?.label)
      .toBe('Today & Tomorrow');
  });

  it('sheds optional detail before it produces an unpasteable link', () => {
    const origin: NavigationOrigin = {
      route: '/team/roster',
      label: 'Team > Roster',
      taskId: 'fill-depth-chart',
      entityId: 'PLR_0001',
      query: Object.fromEntries(
        Array.from({ length: 40 }, (_, i) => [`filter${i}`, 'a'.repeat(20)]),
      ),
      scrollAnchor: 'row-12',
      focusTarget: 'depth-qb1',
    };

    const encoded = encodeNavigationOrigin(origin)!;
    expect(encoded.length).toBeLessThanOrEqual(ORIGIN_BUDGET);

    const decoded = decodeNavigationOrigin(encoded)!;
    expect(decoded.route).toBe('/team/roster');
    expect(decoded.label).toBe('Team > Roster');
    expect(decoded.query).toBeUndefined();
    expect(decoded.taskId).toBe('fill-depth-chart');
  });

  it('gives up rather than emit a link that cannot be shortened', () => {
    expect(encodeNavigationOrigin({ route: '/today', label: 'x'.repeat(ORIGIN_BUDGET) })).toBeNull();
  });

  it('rejects hostile or malformed origin parameters', () => {
    expect(decodeNavigationOrigin(null)).toBeNull();
    expect(decodeNavigationOrigin('')).toBeNull();
    expect(decodeNavigationOrigin('not-json')).toBeNull();
    expect(decodeNavigationOrigin(encodeURIComponent('[1,2,3]'))).toBeNull();
    expect(decodeNavigationOrigin(encodeURIComponent('"a string"'))).toBeNull();
    expect(decodeNavigationOrigin(encodeURIComponent(JSON.stringify({ label: 'no route' })))).toBeNull();
    expect(decodeNavigationOrigin(encodeURIComponent(JSON.stringify({ route: '/today' })))).toBeNull();
  });

  it('refuses an origin pointing at a route that does not exist', () => {
    const forged = encodeURIComponent(JSON.stringify({ route: '/evil', label: 'Trust me' }));

    expect(decodeNavigationOrigin(forged)).toBeNull();
  });

  it('drops non-string query values instead of trusting them', () => {
    const mixed = encodeURIComponent(
      JSON.stringify({ route: '/today', label: 'Today', query: { ok: 'yes', bad: { nested: 1 } } }),
    );

    expect(decodeNavigationOrigin(mixed)?.query).toEqual({ ok: 'yes' });
  });
});

describe('withNavigationOrigin', () => {
  it('attaches the origin to a destination and keeps its existing query', () => {
    const href = withNavigationOrigin('/team/depth?view=offense', todayOrigin);
    const { params } = resolveCompatibleRoute(href);

    expect(params.view).toBe('offense');
    expect(originFromParams(params)).toEqual({ route: '/today', label: 'Today', taskId: 'set-lineup' });
  });

  it('preserves the destination fragment', () => {
    expect(withNavigationOrigin('/team/roster#row-3', todayOrigin)).toContain('#row-3');
  });

  it('returns the href untouched when the origin will not fit', () => {
    const href = '/team/roster';
    const oversized: NavigationOrigin = { route: '/today', label: 'x'.repeat(ORIGIN_BUDGET) };

    expect(withNavigationOrigin(href, oversized)).toBe(href);
  });
});

describe('returnToOriginHref', () => {
  it('restores filter state, entity, and scroll anchor', () => {
    const href = returnToOriginHref({
      route: '/team/roster',
      label: 'Team > Roster',
      entityId: 'PLR_0001',
      query: { pos: 'QB', sort: 'ovr' },
      scrollAnchor: 'row-12',
    });

    expect(href).toBe('/team/roster?pos=QB&sort=ovr&entity=PLR_0001#row-12');
  });

  it('returns to the bare surface when there is nothing to restore', () => {
    expect(returnToOriginHref({ route: '/today', label: 'Today' })).toBe('/today');
  });

  it('keeps a structural param already on the origin route', () => {
    expect(returnToOriginHref({ route: '/today?panel=readiness', label: 'Readiness' }))
      .toBe('/today?panel=readiness');
  });

  it('lets the stored query override the origin route query, not the other way round', () => {
    expect(returnToOriginHref({ route: '/team/roster?pos=QB', label: 'Roster', query: { pos: 'WR' } }))
      .toBe('/team/roster?pos=WR');
  });

  it('produces an href that resolves back to the same surface', () => {
    const href = returnToOriginHref({
      route: '/team/roster',
      label: 'Team > Roster',
      query: { pos: 'QB' },
    });

    expect(resolveCompatibleRoute(href).canonicalPath).toBe('/team/roster');
  });
});
