#!/usr/bin/env node
/**
 * UI overhaul route-coverage gate.
 *
 * Proves that every canonical destination in APP_ROUTE_REGISTRY has exactly one
 * future surface and one compatibility decision, so the shell migration cannot
 * silently drop a capability.
 *
 * Sources compared:
 *   1. packages/engine/src/config/route-registry.ts  — the canonical registry
 *   2. docs/ui-overhaul/ROUTE_SURFACE_MATRIX.csv     — the audited feature-loss ledger
 *   3. apps/web/src/ui/routes/route-surface-map.ts   — the runtime map (once WP-04 lands)
 *
 * Source 3 is optional until WP-04. Once the file exists it is required and is
 * held to the same exact-set-equality rule as the other two.
 *
 * Usage:
 *   node scripts/check-ui-route-coverage.mjs
 *   node scripts/check-ui-route-coverage.mjs --json    # machine-readable report
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const REGISTRY_PATH = join(repoRoot, 'packages/engine/src/config/route-registry.ts');
export const MATRIX_PATH = join(repoRoot, 'docs/ui-overhaul/ROUTE_SURFACE_MATRIX.csv');
export const SURFACE_MAP_PATH = join(repoRoot, 'apps/web/src/ui/routes/route-surface-map.ts');

export const REQUIRED_MATRIX_COLUMNS = [
  'recommended_parent_hub',
  'recommended_canonical_path',
  'recommended_surface_type',
  'route_compatibility',
  'feature_loss_risk',
  'required_acceptance_test',
];

export const VALID_HUBS = ['Today', 'Team', 'Game', 'Office', 'League', 'Dynasty', 'System'];

/** Minimal RFC4180 reader: handles quoted fields containing commas and newlines. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export function extractRegistryPaths(source) {
  const start = source.indexOf('export const APP_ROUTE_REGISTRY');
  if (start < 0) return [];

  const paths = [];
  for (const match of source.slice(start).matchAll(/^\s*route\(\s*'([^']+)'/gm)) {
    paths.push(match[1]);
  }
  return paths;
}

export function extractSurfaceMapKeys(source) {
  const keys = [];
  for (const match of source.matchAll(/^\s*'([^']+)'\s*:/gm)) {
    keys.push(match[1]);
  }
  return keys;
}

export function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function compareSets(label, expected, actual, fail) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);

  const missing = expected.filter((path) => !actualSet.has(path));
  const extra = actual.filter((path) => !expectedSet.has(path));

  if (missing.length > 0) {
    fail(`${label} is missing ${missing.length} canonical route(s): ${missing.join(', ')}`);
  }
  if (extra.length > 0) {
    fail(`${label} contains ${extra.length} route(s) not in the registry: ${extra.join(', ')}`);
  }
}

/**
 * Pure coverage check over raw file contents.
 *
 * @param {{ registrySource: string, matrixCsv: string, surfaceMapSource?: string | null }} input
 */
export function checkUiRouteCoverage({ registrySource, matrixCsv, surfaceMapSource = null }) {
  const failures = [];
  const warnings = [];
  const fail = (message) => failures.push(message);

  const registryPaths = extractRegistryPaths(registrySource);
  if (registryPaths.length === 0) {
    fail('Could not extract any routes from the registry. Has the APP_ROUTE_REGISTRY format changed?');
  }

  const rows = parseCsv(matrixCsv);
  const header = rows[0] ?? [];
  const index = Object.fromEntries(header.map((name, i) => [name.trim(), i]));

  for (const column of ['current_path', ...REQUIRED_MATRIX_COLUMNS]) {
    if (index[column] === undefined) {
      fail(`ROUTE_SURFACE_MATRIX.csv is missing required column "${column}".`);
    }
  }

  const matrixRows = rows
    .slice(1)
    .filter((row) => row.length > 1 && row[index.current_path]?.trim())
    .map((row) => {
      const record = { current_path: row[index.current_path].trim() };
      for (const column of REQUIRED_MATRIX_COLUMNS) {
        record[column] = (row[index[column]] ?? '').trim();
      }
      return record;
    });

  const matrixPaths = matrixRows.map((row) => row.current_path);

  const registryDuplicates = findDuplicates(registryPaths);
  if (registryDuplicates.length > 0) {
    fail(`APP_ROUTE_REGISTRY has duplicate paths: ${registryDuplicates.join(', ')}`);
  }

  const matrixDuplicates = findDuplicates(matrixPaths);
  if (matrixDuplicates.length > 0) {
    fail(`ROUTE_SURFACE_MATRIX.csv has duplicate current_path rows: ${matrixDuplicates.join(', ')}`);
  }

  compareSets('ROUTE_SURFACE_MATRIX.csv', registryPaths, matrixPaths, fail);

  const validHubs = new Set(VALID_HUBS);
  for (const row of matrixRows) {
    for (const column of REQUIRED_MATRIX_COLUMNS) {
      if (!row[column]) {
        fail(`Route ${row.current_path} has an empty "${column}" — every route needs a documented decision.`);
      }
    }
    if (row.recommended_parent_hub && !validHubs.has(row.recommended_parent_hub)) {
      fail(
        `Route ${row.current_path} targets unknown hub "${row.recommended_parent_hub}". ` +
          `Valid hubs: ${VALID_HUBS.join(', ')}.`,
      );
    }
  }

  let surfaceMapKeys = null;
  if (surfaceMapSource === null) {
    warnings.push(
      'ROUTE_SURFACE_MAP not present yet (expected until WP-04). Registry/matrix parity was still enforced.',
    );
  } else {
    surfaceMapKeys = extractSurfaceMapKeys(surfaceMapSource);
    const duplicates = findDuplicates(surfaceMapKeys);
    if (duplicates.length > 0) {
      fail(`ROUTE_SURFACE_MAP has duplicate keys: ${duplicates.join(', ')}`);
    }
    compareSets('ROUTE_SURFACE_MAP', registryPaths, surfaceMapKeys, fail);
  }

  return {
    ok: failures.length === 0,
    registryRouteCount: registryPaths.length,
    matrixRowCount: matrixPaths.length,
    surfaceMapKeyCount: surfaceMapKeys?.length ?? null,
    surfaceMapPresent: surfaceMapSource !== null,
    failures,
    warnings,
  };
}

export function runCli(argv = process.argv.slice(2)) {
  const report = checkUiRouteCoverage({
    registrySource: readFileSync(REGISTRY_PATH, 'utf8'),
    matrixCsv: readFileSync(MATRIX_PATH, 'utf8'),
    surfaceMapSource: existsSync(SURFACE_MAP_PATH) ? readFileSync(SURFACE_MAP_PATH, 'utf8') : null,
  });

  if (argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    for (const warning of report.warnings) console.log(`WARN: ${warning}`);
    for (const failure of report.failures) console.error(`FAIL: ${failure}`);
    if (report.ok) {
      const mapNote = report.surfaceMapPresent
        ? `${report.surfaceMapKeyCount} surface-map keys`
        : 'matrix only';
      console.log(
        `PASS: ${report.registryRouteCount}/${report.matrixRowCount} canonical routes covered (${mapNote}).`,
      );
    }
  }

  return report.ok ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(runCli());
}
