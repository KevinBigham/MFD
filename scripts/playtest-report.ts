#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LONG_HORIZON_QUALITY_BENCHMARKS,
  PLAYTEST_PERSONAS,
  getLongHorizonQualityBenchmark,
  runLongHorizonQualityBenchmark,
  runPlaytest,
} from '../packages/engine/src/index.ts';
import type { LongHorizonQualityBenchmarkResult } from '../packages/engine/src/index.ts';

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function parseStringFlag(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function parseOptionalStringFlag(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function parseNumberFlag(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const raw = process.argv[index + 1];
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Flag ${name} requires a numeric value; got "${raw}"`);
  }
  return value;
}

function pad(value: string | number, width: number): string {
  return String(value).padEnd(width, ' ');
}

const DEFAULT_PERSONA_ID = 'SPEEDRUNNER';
const all = hasFlag('--all');
const dryRun = hasFlag('--dry-run');
const benchmarkId = parseOptionalStringFlag('--benchmark');
const personaId = parseStringFlag('--persona', DEFAULT_PERSONA_ID).toUpperCase();
const seed = parseNumberFlag('--seed', 42);
const seasons = parseNumberFlag('--seasons', all ? 10 : 3);

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const outDir = resolve(repoRoot, 'tmp');

function formatBenchmarkBudgetRows(result: LongHorizonQualityBenchmarkResult): string[] {
  const rows = [
    `${pad('area', 18)} ${pad('anomalies', 10)} ${pad('high', 6)} ${pad('budget', 12)} ${pad('status', 8)}`,
    `${pad('----', 18)} ${pad('---------', 10)} ${pad('----', 6)} ${pad('------', 12)} ${pad('------', 8)}`,
  ];
  for (const check of result.checks) {
    rows.push(
      `${pad(check.area, 18)} ${pad(check.anomalyCount, 10)} ${pad(check.highSeverityCount, 6)} ${pad(`${check.maxAnomalies}/${check.maxHighSeverity}`, 12)} ${pad(check.passed ? 'PASS' : 'FAIL', 8)}`,
    );
  }
  return rows;
}

async function runBenchmark(id: string): Promise<void> {
  const benchmark = getLongHorizonQualityBenchmark(id);
  if (!benchmark) {
    throw new Error(`Unknown benchmark "${id}". Available: ${LONG_HORIZON_QUALITY_BENCHMARKS.map((entry) => entry.id).join(', ')}`);
  }

  process.stdout.write([
    `Benchmark ${benchmark.id}: ${benchmark.label}`,
    `persona=${benchmark.personaId} seed=${benchmark.seed} seasons=${benchmark.seasons} maxSteps=${benchmark.maxSteps} saveRoundTripEvery=${benchmark.saveRoundTripEvery}`,
    `budgets=${benchmark.budgets.map((budget) => `${budget.area}:${budget.maxAnomalies}/${budget.maxHighSeverity}`).join(', ')}`,
  ].join('\n') + '\n');

  if (dryRun) {
    process.stdout.write('Dry run only; no seasons advanced.\n');
    return;
  }

  process.stdout.write(`Running long-horizon benchmark ${benchmark.id}...\n`);
  const result = runLongHorizonQualityBenchmark(benchmark, {
    onProgress: (event) => {
      process.stdout.write(
        `  progress ${benchmark.id}: season ${event.seasonsCompleted}/${event.seasonsRequested} `
        + `weeks=${event.weeksAdvanced} step=${event.step} `
        + `frame=Y${event.currentFrame.year} W${event.currentFrame.week} ${event.currentFrame.phase}\n`,
      );
    },
  });
  const outPath = resolve(outDir, `long-horizon-quality-${benchmark.id}-${benchmark.seed}.json`);
  await writeFile(outPath, JSON.stringify(result, null, 2) + '\n', 'utf8');

  process.stdout.write(`Wrote ${outPath}\n`);
  process.stdout.write(`completed=${result.report.seasonsCompleted}/${result.benchmark.seasons} weeks=${result.report.weeksAdvanced} anomalies=${result.report.anomalyCount} high=${result.report.highSeverityCount}\n`);
  process.stdout.write(`${formatBenchmarkBudgetRows(result).join('\n')}\n`);

  if (!result.passed) {
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  await mkdir(outDir, { recursive: true });

  if (benchmarkId) {
    await runBenchmark(benchmarkId);
    return;
  }

  const personas = all
    ? PLAYTEST_PERSONAS
    : [PLAYTEST_PERSONAS.find((persona) => persona.id === personaId)]
      .filter((persona): persona is (typeof PLAYTEST_PERSONAS)[number] => Boolean(persona));

  if (personas.length === 0) {
    throw new Error(`Unknown playtest persona "${personaId}". Available: ${PLAYTEST_PERSONAS.map((persona) => persona.id).join(', ')}`);
  }

  const rows = [
    `${pad('persona', 14)} ${pad('seasons', 8)} ${pad('weeks', 8)} ${pad('anomalies', 10)} ${pad('high', 6)}`,
    `${pad('------', 14)} ${pad('-------', 8)} ${pad('-----', 8)} ${pad('---------', 10)} ${pad('----', 6)}`,
  ];

  for (const persona of personas) {
    process.stdout.write(`Running playtest persona ${persona.id} (seed=${seed}, seasons=${seasons})...\n`);
    const report = runPlaytest(persona, seed, seasons);
    const outPath = resolve(outDir, `playtest-report-${persona.id}-${seed}.json`);

    await writeFile(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
    rows.push(
      `${pad(report.personaId, 14)} ${pad(report.seasonsCompleted, 8)} ${pad(report.weeksAdvanced, 8)} ${pad(report.anomalyCount, 10)} ${pad(report.highSeverityCount, 6)}`,
    );
    process.stdout.write(`Wrote ${outPath}\n`);

    if (report.highSeverityCount > 0) {
      process.exitCode = 1;
    }
  }

  process.stdout.write(`${rows.join('\n')}\n`);
}

main().catch((error) => {
  process.stderr.write(`playtest-report failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
