import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { MATRIX_PATH } from '../check-ui-route-coverage.mjs';
import {
  FREQUENCIES,
  SURFACE_TYPES,
  URGENCIES,
  generateSurfaceMap,
  readMatrixRows,
} from '../generate-route-surface-map.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const mapPath = join(repoRoot, 'apps/web/src/ui/routes/route-surface-map.ts');
const matrixCsv = readFileSync(MATRIX_PATH, 'utf8');

test('the committed surface map is byte-identical to generator output', () => {
  // Without this, "generated from the matrix" is a claim in a comment. The map
  // is committed and hand-owned on purpose, so nothing else would notice a hand
  // edit that the generator would never produce.
  assert.equal(generateSurfaceMap(matrixCsv), readFileSync(mapPath, 'utf8'));
});

test('every matrix value maps to a runtime enum member', () => {
  for (const row of readMatrixRows(matrixCsv)) {
    assert.ok(SURFACE_TYPES[row.recommended_surface_type], `${row.current_path}: ${row.recommended_surface_type}`);
    assert.ok(FREQUENCIES[row.frequency], `${row.current_path}: ${row.frequency}`);
    assert.ok(URGENCIES[row.urgency], `${row.current_path}: ${row.urgency}`);
  }
});

test('the surface-type mapping is lossless — no two matrix values collapse', () => {
  const targets = Object.values(SURFACE_TYPES);
  assert.equal(new Set(targets).size, targets.length);
});

test('generation refuses an unmapped matrix value rather than emitting undefined', () => {
  const broken = matrixCsv.replace('phase-aware hub', 'brand new surface kind');

  assert.throws(() => generateSurfaceMap(broken), /unmapped surface type/);
});

test('generation is deterministic', () => {
  assert.equal(generateSurfaceMap(matrixCsv), generateSurfaceMap(matrixCsv));
});
