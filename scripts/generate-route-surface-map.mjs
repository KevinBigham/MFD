#!/usr/bin/env node
/**
 * Regenerate `apps/web/src/ui/routes/route-surface-map.ts` from the audited
 * `ROUTE_SURFACE_MATRIX.csv`.
 *
 * The map is generated, then committed and owned by hand — it is deliberately
 * NOT a build step, because a build that rewrites runtime routing would turn an
 * edit to a docs CSV into a production change. This script exists so the 79
 * rows are reproducible instead of transcribed, and so the provenance of the
 * committed file is checkable rather than asserted.
 *
 * `route-surface-map.test.ts` compares the committed file against the CSV field
 * by field, so running this is never required to stay honest — only to make a
 * bulk matrix change tractable.
 *
 * Usage:
 *   node scripts/generate-route-surface-map.mjs           # print to stdout
 *   node scripts/generate-route-surface-map.mjs --write   # overwrite the map
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MATRIX_PATH, parseCsv } from './check-ui-route-coverage.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_PATH = join(repoRoot, 'apps/web/src/ui/routes/route-surface-map.ts');

/** Matrix surface type -> `SurfaceType`. One member each; the mapping is lossless. */
export const SURFACE_TYPES = {
  'phase-aware hub': 'phase-aware-hub',
  'hub tab or section': 'hub-section',
  'drawer or bottom sheet': 'drawer',
  'collection/list with filters': 'collection',
  'contextual workflow': 'contextual-workflow',
  'comparison workbench': 'comparison-workbench',
  'comparison/transaction workbench': 'transaction-workbench',
  'decision workflow or wizard': 'decision-workflow',
  'event-driven presentation': 'event-presentation',
  'timeline/news/history view': 'timeline',
  'data dashboard and analytics view': 'dashboard',
  'archive/history detail': 'archive-detail',
  'system/settings utility': 'system-utility',
  'settings and trust-critical utility': 'trust-critical-utility',
};

export const FREQUENCIES = {
  'every session': 'every-session',
  weekly: 'weekly',
  'very frequent': 'very-frequent',
  frequent: 'frequent',
  'frequent in phase': 'frequent-in-phase',
  'phase-dominant': 'phase-dominant',
  periodic: 'periodic',
  contextual: 'contextual',
  occasional: 'occasional',
  'once per season': 'once-per-season',
  rare: 'rare',
};

export const URGENCIES = {
  critical: 'critical',
  'critical when active': 'critical-when-active',
  'critical when blocked': 'critical-when-blocked',
  high: 'high',
  'high when active': 'high-when-active',
  'high when due': 'high-when-due',
  'high when triggered': 'high-when-triggered',
  medium: 'medium',
  low: 'low',
};

const HEADER = `/**
 * WP-04 — \`ROUTE_SURFACE_MAP\`: one future surface per canonical route, 79/79.
 *
 * Generated from \`docs/ui-overhaul/ROUTE_SURFACE_MATRIX.csv\` by
 * \`scripts/generate-route-surface-map.mjs\`, then committed and owned by hand.
 * It is not regenerated at build time on purpose: the matrix is an audit
 * artifact, and a build step that silently rewrote runtime routing would make an
 * edit to a docs CSV a production change.
 *
 * Two independent gates keep the copy honest:
 *   - \`scripts/check-ui-route-coverage.mjs\` — exact set equality against
 *     \`APP_ROUTE_REGISTRY\` and the matrix. Fails on a missing route, a ghost
 *     route, or a duplicate key.
 *   - \`route-surface-map.test.ts\` — field-level equality against the matrix for
 *     hub, canonical path, surface type, placement, and permanent-nav status.
 *
 * Unlock rules are deliberately absent. \`routeUnlock()\` reads them from the
 * engine registry so there is exactly one copy of when a destination opens.
 */

import { appRoute, type AppRouteDefinition } from '@mfd/engine/config';
import { normalizePath } from './href';
import type { HubId, RouteSurfaceMeta } from './route-surface-types';

export const ROUTE_SURFACE_MAP: Record<string, RouteSurfaceMeta> = {
`;

const FOOTER = `};

export const ROUTE_SURFACE_ENTRIES: readonly RouteSurfaceMeta[] = Object.values(ROUTE_SURFACE_MAP);

/** Normalises first, so \`/roster/\` and \`roster\` find the same surface a link would. */
export function routeSurface(legacyPath: string): RouteSurfaceMeta | undefined {
  return ROUTE_SURFACE_MAP[normalizePath(legacyPath)];
}

export function hubForLegacyPath(legacyPath: string): HubId | undefined {
  return routeSurface(legacyPath)?.hub;
}

export function routesInHub(hub: HubId): readonly RouteSurfaceMeta[] {
  return ROUTE_SURFACE_ENTRIES.filter((entry) => entry.hub === hub);
}

/**
 * Unlock metadata, read straight from the canonical registry rather than copied.
 * Returns undefined for a path the registry does not know, which is the same
 * signal \`resolveCompatibleRoute\` uses to report an unknown destination.
 */
export function routeUnlock(
  legacyPath: string,
): Pick<AppRouteDefinition, 'unlockWeek' | 'unlockPhase'> | undefined {
  const definition = appRoute(normalizePath(legacyPath));
  if (!definition) return undefined;
  return { unlockWeek: definition.unlockWeek, unlockPhase: definition.unlockPhase };
}
`;

const quote = (value) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

export function readMatrixRows(csv) {
  const rows = parseCsv(csv);
  const header = (rows[0] ?? []).map((column) => column.trim());
  return rows
    .slice(1)
    .filter((row) => row.length > 1 && (row[header.indexOf('current_path')] ?? '').trim())
    .map((row) =>
      Object.fromEntries(header.map((column, i) => [column, (row[i] ?? '').trim()])),
    );
}

export function generateSurfaceMap(csv) {
  const entries = readMatrixRows(csv).map((row) => {
    const surfaceType = SURFACE_TYPES[row.recommended_surface_type];
    const frequency = FREQUENCIES[row.frequency];
    const urgency = URGENCIES[row.urgency];

    if (!surfaceType) throw new Error(`${row.current_path}: unmapped surface type "${row.recommended_surface_type}"`);
    if (!frequency) throw new Error(`${row.current_path}: unmapped frequency "${row.frequency}"`);
    if (!urgency) throw new Error(`${row.current_path}: unmapped urgency "${row.urgency}"`);

    return [
      `  ${quote(row.current_path)}: {`,
      `    legacyPath: ${quote(row.current_path)},`,
      `    hub: ${quote(row.recommended_parent_hub.toLowerCase())},`,
      `    canonicalPath: ${quote(row.recommended_canonical_path)},`,
      `    surfaceType: ${quote(surfaceType)},`,
      `    placement: ${quote(row.recommended_placement)},`,
      `    permanentNav: ${row.belongs_in_permanent_nav.startsWith('yes')},`,
      `    frequency: ${quote(frequency)},`,
      `    urgency: ${quote(urgency)},`,
      '  },',
    ].join('\n');
  });

  return `${HEADER}${entries.join('\n')}\n${FOOTER}`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const output = generateSurfaceMap(readFileSync(MATRIX_PATH, 'utf8'));

  if (process.argv.includes('--write')) {
    writeFileSync(OUTPUT_PATH, output, 'utf8');
    console.log(`Wrote ${OUTPUT_PATH}`);
  } else {
    process.stdout.write(output);
  }
}
