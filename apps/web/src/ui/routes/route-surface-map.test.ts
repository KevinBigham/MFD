import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { APP_ROUTE_REGISTRY } from '@mfd/engine/config';
import { parseCsv } from '../../../../../scripts/check-ui-route-coverage.mjs';
// Same table the generator uses. Importing it rather than restating it means the
// test cannot quietly agree with a generator that has drifted.
import { SURFACE_TYPES } from '../../../../../scripts/generate-route-surface-map.mjs';
import {
  ROUTE_SURFACE_ENTRIES,
  ROUTE_SURFACE_MAP,
  hubForLegacyPath,
  routeSurface,
  routeUnlock,
  routesInHub,
} from './route-surface-map';
import { HUB_IDS, HUB_LABELS } from './route-surface-types';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const matrixPath = path.join(repoRoot, 'docs/ui-overhaul/ROUTE_SURFACE_MATRIX.csv');


interface MatrixRow {
  currentPath: string;
  hub: string;
  canonicalPath: string;
  surfaceType: string;
  placement: string;
  permanentNav: string;
}

function readMatrix(): MatrixRow[] {
  const rows = parseCsv(readFileSync(matrixPath, 'utf8'));
  const header = (rows[0] ?? []).map((column) => column.trim());
  const cell = (row: string[], name: string): string => (row[header.indexOf(name)] ?? '').trim();

  return rows
    .slice(1)
    .filter((row) => row.length > 1 && cell(row, 'current_path'))
    .map((row) => ({
      currentPath: cell(row, 'current_path'),
      hub: cell(row, 'recommended_parent_hub'),
      canonicalPath: cell(row, 'recommended_canonical_path'),
      surfaceType: cell(row, 'recommended_surface_type'),
      placement: cell(row, 'recommended_placement'),
      permanentNav: cell(row, 'belongs_in_permanent_nav'),
    }));
}

const matrixRows = readMatrix();

describe('ROUTE_SURFACE_MAP', () => {
  it('covers the canonical registry exactly, 79/79', () => {
    const registryPaths = APP_ROUTE_REGISTRY.map((definition) => definition.path);

    expect(registryPaths).toHaveLength(79);
    expect(Object.keys(ROUTE_SURFACE_MAP).sort()).toEqual([...registryPaths].sort());
  });

  it('keys every entry by its own legacyPath', () => {
    for (const [key, entry] of Object.entries(ROUTE_SURFACE_MAP)) {
      expect(entry.legacyPath).toBe(key);
    }
  });

  it('matches the audited matrix field for field', () => {
    expect(matrixRows).toHaveLength(79);

    for (const row of matrixRows) {
      const entry = routeSurface(row.currentPath);
      expect(entry, `no surface entry for ${row.currentPath}`).toBeDefined();

      expect({
        hub: entry?.hub,
        canonicalPath: entry?.canonicalPath,
        surfaceType: entry?.surfaceType,
        placement: entry?.placement,
        permanentNav: entry?.permanentNav,
      }).toEqual({
        hub: row.hub.toLowerCase(),
        canonicalPath: row.canonicalPath,
        surfaceType: SURFACE_TYPES[row.surfaceType],
        placement: row.placement,
        permanentNav: row.permanentNav.startsWith('yes'),
      });
    }
  });

  it('assigns every route to a known hub, and leaves no hub empty', () => {
    for (const entry of ROUTE_SURFACE_ENTRIES) {
      expect(HUB_IDS).toContain(entry.hub);
    }
    for (const hub of HUB_IDS) {
      expect(routesInHub(hub).length, `hub ${hub} has no routes`).toBeGreaterThan(0);
      expect(HUB_LABELS[hub]).toBeTruthy();
    }
  });

  it('never gives two routes the same canonical destination unless one is a panel', () => {
    const byCanonical = new Map<string, string[]>();
    for (const entry of ROUTE_SURFACE_ENTRIES) {
      const pathOnly = entry.canonicalPath.split('?')[0] ?? entry.canonicalPath;
      byCanonical.set(pathOnly, [...(byCanonical.get(pathOnly) ?? []), entry.canonicalPath]);
    }

    for (const [pathOnly, variants] of byCanonical) {
      const roots = variants.filter((variant) => !variant.includes('?'));
      expect(roots.length, `${pathOnly} is claimed as a root by ${roots.length} routes`)
        .toBeLessThanOrEqual(1);
    }
  });

  it('reads unlock rules from the engine registry rather than copying them', () => {
    expect(routeUnlock('/contracts')).toEqual({ unlockWeek: 4, unlockPhase: undefined });
    expect(routeUnlock('/draft')).toEqual({ unlockWeek: 'always', unlockPhase: 'draft' });
    expect(routeUnlock('/scouting')).toEqual({ unlockWeek: 'midseason', unlockPhase: undefined });
    expect(routeUnlock('/')).toEqual({ unlockWeek: 'always', unlockPhase: undefined });
    expect(routeUnlock('/not-a-route')).toBeUndefined();
  });

  it('resolves lookups and reports unknown paths as undefined', () => {
    expect(routeSurface('/roster')?.hub).toBe('team');
    expect(hubForLegacyPath('/cba')).toBe('league');
    expect(routeSurface('/nope')).toBeUndefined();
    expect(hubForLegacyPath('/nope')).toBeUndefined();
  });

  it('treats an empty path as the root, the same way a URL does', () => {
    // Normalising lookups made this reachable. It is the correct reading of an
    // empty path, but it means "" is a hit rather than the unknown-destination
    // signal, so it is pinned rather than left to surprise someone.
    expect(routeSurface('')?.legacyPath).toBe('/');
    expect(routeSurface('   ')?.legacyPath).toBe('/');
    expect(hubForLegacyPath('')).toBe('today');
  });

  it('keeps Save/Load in System even though its path looks like the Dynasty hub', () => {
    expect(routeSurface('/dynasty')?.hub).toBe('system');
    expect(routeSurface('/dynasty')?.canonicalPath).toBe('/system/saves');
    expect(routeSurface('/franchise')?.hub).toBe('dynasty');
  });
});
