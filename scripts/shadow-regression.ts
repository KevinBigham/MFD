#!/usr/bin/env node
/**
 * Shadow regression CLI.
 *
 * Default behavior:
 *   pnpm test:shadow                 # run all scenarios, compare to baselines, exit 1 on diff
 *
 * Update mode (governed by §5.5 baseline_update_protocol — never run blindly):
 *   pnpm test:shadow -- --update             # regenerate every baseline + metadata
 *   pnpm test:shadow -- --update <id>        # regenerate one scenario only
 *   pnpm test:shadow -- --only <id>          # run only one scenario in compare mode
 *
 * Output:
 *   - Compare mode: human-readable PASS / FAIL per scenario, diff body on FAIL.
 *     Exit 0 if every scenario matches its baseline; exit 1 otherwise.
 *   - Update mode: writes <id>.json (canonical PlaytestReport) and <id>.meta.json
 *     under mfd/_canon/seeds/mfd/. Always exit 0 unless an exception is thrown.
 */

import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SAVE_VERSION } from '../packages/engine/src/config/difficulty.ts';
import {
  SHADOW_SCENARIOS,
  diffShadowReports,
  formatShadowDiff,
  runShadowScenario,
} from '../packages/engine/src/playtesting/shadow/index.ts';
import type { PlaytestReport } from '../packages/engine/src/playtesting/types.ts';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const baselineDir = resolve(repoRoot, '_canon/seeds/mfd');
const shadowCorpusVersion = '5';
const shadowCorpusClassification = 'intended';
const shadowCorpusSpecCitation = 'MFD_GOAT_MASTER_PLAN.md:110';
const shadowCorpusReason = [
  'Master-plan item 5.5 intentionally replaces mutable global RNG channel consumption with an explicit SimulationContext and isolated week RNG passed through the canonical game, injury, off-field, waiver, and offseason chain.',
  'The regenerated corpus records the resulting deterministic sequence after the full engine suite, five-persona 10-season certification, GOAT release sentinel, save round-trip, and explicit-context isolation checks passed with zero high-severity anomalies, zero healthy-starter shortage game-weeks, and complete CPU transaction receipt coverage.',
].join(' ');

const argv = process.argv.slice(2);
const updateFlag = argv.indexOf('--update');
const onlyFlag = argv.indexOf('--only');
const isUpdate = updateFlag !== -1;
const targetId = (() => {
  if (isUpdate) return argv[updateFlag + 1] ?? null;
  if (onlyFlag !== -1) return argv[onlyFlag + 1] ?? null;
  return null;
})();

const scenarios = targetId
  ? SHADOW_SCENARIOS.filter((scenario) => scenario.id === targetId)
  : SHADOW_SCENARIOS;

if (targetId && scenarios.length === 0) {
  process.stderr.write(`Unknown shadow scenario: ${targetId}\n`);
  process.stderr.write(`Known: ${SHADOW_SCENARIOS.map((s) => s.id).join(', ')}\n`);
  process.exit(2);
}

function readEngineSha(): string {
  try {
    return execSync('git rev-parse HEAD', { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

function generationCommandFor(scenarioId: string, all: boolean): string {
  return all
    ? 'pnpm test:shadow -- --update'
    : `pnpm test:shadow -- --update ${scenarioId}`;
}

function baselinePath(scenarioId: string): string {
  return resolve(baselineDir, `${scenarioId}.json`);
}

function metadataPath(scenarioId: string): string {
  return resolve(baselineDir, `${scenarioId}.meta.json`);
}

function loadBaseline(scenarioId: string): PlaytestReport | null {
  const path = baselinePath(scenarioId);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as PlaytestReport;
}

function writeBaseline(
  scenarioId: string,
  report: PlaytestReport,
  canonicalJson: string,
  all: boolean,
): void {
  mkdirSync(baselineDir, { recursive: true });
  writeFileSync(baselinePath(scenarioId), canonicalJson + '\n', 'utf8');
  const metadata = {
    scenarioId,
    corpusVersion: shadowCorpusVersion,
    classification: shadowCorpusClassification,
    specCitation: shadowCorpusSpecCitation,
    updateReason: shadowCorpusReason,
    schemaVersion: SAVE_VERSION,
    engineCommit: readEngineSha(),
    generatedAt: new Date().toISOString(),
    generationCommand: generationCommandFor(scenarioId, all),
    persona: report.personaId,
    seed: report.seed,
    seasonsRequested: report.seasonsRequested,
    seasonsCompleted: report.seasonsCompleted,
    weeksAdvanced: report.weeksAdvanced,
    anomalyCount: report.anomalyCount,
    highSeverityCount: report.highSeverityCount,
  };
  writeFileSync(metadataPath(scenarioId), JSON.stringify(metadata, null, 2) + '\n', 'utf8');
}

async function main(): Promise<void> {
  if (isUpdate) {
    const all = targetId === null;
    for (const scenario of scenarios) {
      process.stdout.write(`Generating baseline ${scenario.id} (persona=${scenario.personaId} seed=${scenario.seed} seasons=${scenario.seasons})...\n`);
      const result = runShadowScenario(scenario.id);
      writeBaseline(scenario.id, result.report, result.canonicalJson, all);
      process.stdout.write(`  wrote ${baselinePath(scenario.id)}\n`);
    }
    process.stdout.write('Baseline regeneration complete. Review the diffs and metadata before committing.\n');
    return;
  }

  let anyFail = false;
  for (const scenario of scenarios) {
    process.stdout.write(`Shadow scenario ${scenario.id}...\n`);
    const baseline = loadBaseline(scenario.id);
    if (!baseline) {
      process.stderr.write(`  no baseline at ${baselinePath(scenario.id)}\n`);
      process.stderr.write(`  run: ${generationCommandFor(scenario.id, false)}\n`);
      anyFail = true;
      continue;
    }
    const result = runShadowScenario(scenario.id);
    const diff = diffShadowReports(scenario.id, baseline, result.report);
    if (diff.matches) {
      process.stdout.write(`  PASS\n`);
    } else {
      anyFail = true;
      process.stdout.write(`${formatShadowDiff(diff)}\n`);
      process.stdout.write(`  reproduce: pnpm test:shadow -- --only ${scenario.id}\n`);
      process.stdout.write(`  see §5.5 baseline_update_protocol before regenerating\n`);
    }
  }

  if (anyFail) {
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`shadow-regression failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
