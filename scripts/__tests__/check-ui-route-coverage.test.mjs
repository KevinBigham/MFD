import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  MATRIX_PATH,
  REGISTRY_PATH,
  checkUiRouteCoverage,
  extractRegistryPaths,
  extractSurfaceMapKeys,
  findDuplicates,
  parseCsv,
} from '../check-ui-route-coverage.mjs';

const registrySource = readFileSync(REGISTRY_PATH, 'utf8');
const matrixCsv = readFileSync(MATRIX_PATH, 'utf8');

test('the real repository passes 79/79 route coverage', () => {
  const report = checkUiRouteCoverage({ registrySource, matrixCsv });

  assert.equal(report.ok, true, report.failures.join('\n'));
  assert.equal(report.registryRouteCount, 79);
  assert.equal(report.matrixRowCount, 79);
});

test('warns but does not fail while ROUTE_SURFACE_MAP is absent', () => {
  const report = checkUiRouteCoverage({ registrySource, matrixCsv });

  assert.equal(report.surfaceMapPresent, false);
  assert.match(report.warnings.join('\n'), /ROUTE_SURFACE_MAP not present yet/);
});

test('fails when a canonical route has no matrix row', () => {
  const withExtraRoute = registrySource.replace(
    "  route('/roster',",
    "  route('/brand-new-surface', 'New', 'New', 'briefing', 'core'),\n  route('/roster',",
  );

  const report = checkUiRouteCoverage({ registrySource: withExtraRoute, matrixCsv });

  assert.equal(report.ok, false);
  assert.match(report.failures.join('\n'), /missing 1 canonical route\(s\): \/brand-new-surface/);
});

test('fails when the matrix documents a route the registry does not have', () => {
  const report = checkUiRouteCoverage({
    registrySource,
    matrixCsv: `${matrixCsv.trimEnd()}\n/ghost-route,Ghost,Ghost,briefing,core,always,,job,all,rare,low,hub,entry,back,low,low,low,none,no,Today,/today/ghost,hub tab or section,Today > Ghost,alias,low,test\n`,
  });

  assert.equal(report.ok, false);
  assert.match(report.failures.join('\n'), /not in the registry: \/ghost-route/);
});

test('fails when a route has no compatibility decision', () => {
  const rows = matrixCsv.split('\n');
  const rosterIndex = rows.findIndex((row) => row.startsWith('/roster,'));
  assert.ok(rosterIndex > 0, 'expected a /roster row in the matrix');

  const columns = parseCsv(rows[rosterIndex])[0];
  const header = parseCsv(rows[0])[0];
  columns[header.indexOf('route_compatibility')] = '';
  rows[rosterIndex] = columns.map((value) => `"${value.replaceAll('"', '""')}"`).join(',');

  const report = checkUiRouteCoverage({ registrySource, matrixCsv: rows.join('\n') });

  assert.equal(report.ok, false);
  assert.match(report.failures.join('\n'), /\/roster has an empty "route_compatibility"/);
});

test('fails when a route targets a hub outside the five-hub IA', () => {
  const rows = matrixCsv.split('\n');
  const rosterIndex = rows.findIndex((row) => row.startsWith('/roster,'));
  const columns = parseCsv(rows[rosterIndex])[0];
  const header = parseCsv(rows[0])[0];
  columns[header.indexOf('recommended_parent_hub')] = 'Nerd';
  rows[rosterIndex] = columns.map((value) => `"${value.replaceAll('"', '""')}"`).join(',');

  const report = checkUiRouteCoverage({ registrySource, matrixCsv: rows.join('\n') });

  assert.equal(report.ok, false);
  assert.match(report.failures.join('\n'), /unknown hub "Nerd"/);
});

test('enforces the surface map against the registry once it exists', () => {
  const surfaceMapSource = [
    'export const ROUTE_SURFACE_MAP = {',
    "  '/': { hub: 'Today' },",
    '};',
  ].join('\n');

  const report = checkUiRouteCoverage({ registrySource, matrixCsv, surfaceMapSource });

  assert.equal(report.ok, false);
  assert.equal(report.surfaceMapPresent, true);
  assert.equal(report.surfaceMapKeyCount, 1);
  assert.match(report.failures.join('\n'), /ROUTE_SURFACE_MAP is missing 78 canonical route\(s\)/);
});

test('detects duplicate registry paths', () => {
  const duplicated = registrySource.replace(
    "  route('/roster',",
    "  route('/roster', 'Roster', 'Roster', 'football_ops', 'team'),\n  route('/roster',",
  );

  const report = checkUiRouteCoverage({ registrySource: duplicated, matrixCsv });

  assert.equal(report.ok, false);
  assert.match(report.failures.join('\n'), /duplicate paths: \/roster/);
});

test('parses quoted CSV fields containing commas', () => {
  const rows = parseCsv('a,b\n"one, two",three\n');

  assert.deepEqual(rows[1], ['one, two', 'three']);
});

test('extracts registry paths only from the registry array', () => {
  const paths = extractRegistryPaths(registrySource);

  assert.equal(paths.length, 79);
  assert.ok(paths.includes('/'));
  assert.ok(paths.includes('/week-advance'));
});

test('extracts surface map keys and duplicates', () => {
  assert.deepEqual(extractSurfaceMapKeys("  '/a': 1,\n  '/b': 2,\n"), ['/a', '/b']);
  assert.deepEqual(findDuplicates(['a', 'b', 'a']), ['a']);
});
