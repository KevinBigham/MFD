#!/usr/bin/env node
/**
 * Sprint 48 — Age-curve report generator.
 *
 * Runs the deterministic age-curve harness and writes the result to
 * `.codex/MFD/age-curve-report.json` (plus a side-by-side `.csv`)
 * for design review. Telemetry only — touches no game state.
 *
 * Usage (from monorepo root):
 *
 *   node mfd/scripts/age-curve-report.ts
 *   node mfd/scripts/age-curve-report.ts --careers 500 --seed 7
 *
 * Node 24+ strips TS types natively — no build step required.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  reportToCsv,
  runAgeCurveHarness,
} from '../packages/engine/src/systems/dev/age-curve-harness.ts';

// ── CLI arg parsing ─────────────────────────────────────

function parseFlag(name: string, fallback: number): number {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return fallback;
  const raw = process.argv[idx + 1];
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error(`Flag ${name} requires a numeric value; got "${raw}"`);
  }
  return n;
}

const careers = parseFlag('--careers', 1000);
const seed = parseFlag('--seed', 42);

// ── Resolve output paths ────────────────────────────────

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const outDir = resolve(repoRoot, '.codex', 'MFD');
const jsonPath = resolve(outDir, 'age-curve-report.json');
const csvPath = resolve(outDir, 'age-curve-report.csv');

// ── Run + write ─────────────────────────────────────────

async function main(): Promise<void> {
  process.stdout.write(`Running age-curve harness: ${careers} careers/pos, seed=${seed}...\n`);
  const report = runAgeCurveHarness({ careersPerPosition: careers, seed });

  await mkdir(outDir, { recursive: true });
  await writeFile(jsonPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  await writeFile(csvPath, reportToCsv(report) + '\n', 'utf8');

  process.stdout.write(`Wrote ${jsonPath}\n`);
  process.stdout.write(`Wrote ${csvPath}\n`);

  // Quick summary to console — one row per position.
  const rows: string[] = [
    'pos | n    | peakMed | peakP10-P90 | retireMed | declineSlopeMed | primeYrsMed | design_prime',
  ];
  for (const [pos, s] of Object.entries(report.positions)) {
    rows.push(
      `${pos.padEnd(3)} | ${String(s.n).padEnd(4)} | ${String(s.peakAgeMedian).padEnd(7)} | ` +
      `${String(s.peakAgeP10).padEnd(4)}-${String(s.peakAgeP90).padEnd(5)} | ` +
      `${String(s.retireAgeMedian).padEnd(9)} | ${String(s.declineSlopeMedian).padEnd(15)} | ` +
      `${String(s.primeYearsMedian).padEnd(11)} | ${s.designPrimeWindow[0]}-${s.designPrimeWindow[1]}`,
    );
  }
  process.stdout.write(rows.join('\n') + '\n');
}

main().catch((err) => {
  process.stderr.write(`age-curve-report failed: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
