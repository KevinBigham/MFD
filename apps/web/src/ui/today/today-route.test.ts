/**
 * The `/today` mount, asserted from `App.tsx` source.
 *
 * This is a source-scraping test for the same reason the existing route tests
 * are: `App.tsx` builds its route tree at module scope and throws on drift, so
 * importing it in a node test suite is not a cheap operation, and the facts
 * that matter here are structural.
 *
 * What it protects is the migration boundary. `/today` must be reachable, must
 * be lazy, must not enter the canonical registry, and must not appear in legacy
 * navigation. Any one of those slipping turns a preview into a shipped change.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APP_ROUTE_REGISTRY } from '@mfd/engine/config';
import { ROUTE_SURFACE_ENTRIES } from '../routes/route-surface-map';
import { TODAY_ROUTE, isTodayRoute } from '../migration/ui-overhaul-mode';

const APP_SOURCE = readFileSync(new URL('../../app/App.tsx', import.meta.url), 'utf8');
const MOBILE_TABS_SOURCE = readFileSync(new URL('../../app/MobileBottomTabBar.tsx', import.meta.url), 'utf8');

describe('/today mount', () => {
  it('is registered as a route implementation', () => {
    expect(TODAY_ROUTE).toBe('/today');
    expect(APP_SOURCE).toContain("path: '/today'");
    expect(APP_SOURCE).toMatch(/^ {2}todayRoute,$/m);
  });

  it('is reachable only through the contextual escape hatch, never the registry', () => {
    const contextual = APP_SOURCE.match(/const CONTEXTUAL_ROUTE_PATHS = new Set\(\[([^\]]+)]\);/);
    expect(contextual?.[1]).toContain("'/today'");
    expect(APP_ROUTE_REGISTRY.some((definition) => definition.path === '/today')).toBe(false);
  });

  it('leaves the canonical surface at exactly 79', () => {
    expect(APP_ROUTE_REGISTRY).toHaveLength(79);
    expect(ROUTE_SURFACE_ENTRIES).toHaveLength(79);
    expect(ROUTE_SURFACE_ENTRIES.some((entry) => entry.legacyPath === '/today')).toBe(false);
  });

  it('loads lazily, so the legacy default pays nothing for it', () => {
    expect(APP_SOURCE).toMatch(
      /const LazyTodayRoute = lazy\(async \(\) => \(\{ default: \(await import\('\.\.\/ui\/today\/TodayRoute'\)\)\.TodayRoute \}\)\);/,
    );
    expect(APP_SOURCE).toContain('<LazyTodayRoute />');
    // A static import would defeat the lazy boundary entirely.
    expect(APP_SOURCE).not.toMatch(/^import .*ui\/today\/TodayRoute/m);
    expect(APP_SOURCE).not.toMatch(/^import .*ui\/today\/TodayScreen/m);
  });

  it('escapes the legacy shell, and can only do so on a path no legacy route owns', () => {
    expect(APP_SOURCE).toMatch(/if \(isTodayRoute\(activePath\)\) \{\s*return <Outlet \/>;/);

    // The branch is unreachable from every canonical destination, which is
    // what makes it safe under amendment A1.
    for (const definition of APP_ROUTE_REGISTRY) {
      expect(definition.path, definition.path).not.toBe('/today');
    }
  });

  it('suppresses the legacy Chip dock, and only there', () => {
    expect(APP_SOURCE).toMatch(/\{chipDockEnabled && !isTodayRoute\(chipDockRoute\) \? \(/);
    // A mutation to any canonical path would delete the Chip dock from a
    // legacy route, which is a direct A1 violation. Nothing else in App.tsx may
    // gate the dock on a path.
    expect(APP_SOURCE).not.toMatch(/chipDockEnabled && chipDockRoute (===|!==)/);
  });

  it('resolves both branches through the same predicate, from different sources', () => {
    // `RootLayout` reads TanStack's pathname; `PostSetupApp` reads
    // `resolveCurrentAppRoute`, which returns the raw hash including any query
    // string. Comparing each against a bare string made `#/today?panel=x`
    // match one and not the other — the new shell would render with the legacy
    // Chip dock, and its 193px of clearance, on top of it.
    for (const path of ['/today', '#/today', '/today/', '/today?panel=readiness', '#/today?panel=readiness#focus']) {
      expect(isTodayRoute(path), path).toBe(true);
    }
    for (const path of ['/', '/roster', '/todays', '/today-recap', '', null, undefined]) {
      expect(isTodayRoute(path), String(path)).toBe(false);
    }
  });

  it('does not appear in legacy navigation', () => {
    // Legacy nav is generated from APP_ROUTE_REGISTRY, which `/today` is not
    // in; the phone tab bar is the one place that hardcodes paths.
    expect(MOBILE_TABS_SOURCE).not.toContain("'/today'");
  });
});

describe('migration gate', () => {
  const ROUTE_SOURCE = readFileSync(new URL('./TodayRoute.tsx', import.meta.url), 'utf8');

  it('renders the screen only when the overhaul mode is on', () => {
    expect(ROUTE_SOURCE).toContain('isUiOverhaulEnabled');
    expect(ROUTE_SOURCE).toMatch(/if \(!enabled\) \{/);
  });

  it('explains the locked state and offers a way back, rather than a blank route', () => {
    expect(ROUTE_SOURCE).toContain("status=\"locked\"");
    expect(ROUTE_SOURCE).toContain('timing=');
    expect(ROUTE_SOURCE).toContain('wayBack=');
  });

  it('keeps the screen itself free of the store, so it stays renderable in tests', () => {
    const SCREEN_SOURCE = readFileSync(new URL('./TodayScreen.tsx', import.meta.url), 'utf8');
    expect(SCREEN_SOURCE).not.toContain('useGameStore');
    expect(SCREEN_SOURCE).not.toContain('useUiStore');
    expect(SCREEN_SOURCE).not.toContain('@mfd/engine');
  });
});
