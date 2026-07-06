#!/usr/bin/env node

/**
 * Runs the G3 football-ops browser smoke matrix as one repeatable command.
 *
 *   VITE_CHIP_ENABLED=true node scripts/smoke-test-g3-football-ops-matrix.mjs
 *   SMOKE_G3_MATRIX_GROUPS=persistence node scripts/smoke-test-g3-football-ops-matrix.mjs
 *   SMOKE_G3_MATRIX_INCLUDE=contract-cuts,staff-facility-medical node scripts/smoke-test-g3-football-ops-matrix.mjs
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(scriptDir);
const postSetupSmokeScript = join(scriptDir, 'smoke-test-post-setup-route.mjs');

export const G3_FOOTBALL_OPS_MATRIX_WORKFLOWS = [
  {
    id: 'contract-restructure',
    group: 'operations',
    label: 'Contracts: restructure',
    env: { SMOKE_CONTRACT_RESTRUCTURE: '1' },
  },
  {
    id: 'contract-backload',
    group: 'operations',
    label: 'Contracts: backload and void years',
    env: { SMOKE_CONTRACT_BACKLOAD: '1' },
  },
  {
    id: 'contract-cuts',
    group: 'operations',
    label: 'Contracts: standard and Post-June-1 cuts',
    env: { SMOKE_CONTRACT_CUTS: '1' },
  },
  {
    id: 'contract-negotiations',
    group: 'operations',
    label: 'Contracts: accepted extension and franchise tag',
    env: { SMOKE_CONTRACT_NEGOTIATIONS: '1' },
  },
  {
    id: 'cap-lab-batch',
    group: 'operations',
    label: 'Cap Lab: two-move batch',
    env: { SMOKE_CAP_LAB_BATCH: '1' },
  },
  {
    id: 'trade-counter-block',
    group: 'operations',
    label: 'Trades: trade block and rejected counter',
    env: { SMOKE_TRADE_COUNTER_BLOCK: '1' },
  },
  {
    id: 'waiver-practice-squad',
    group: 'operations',
    label: 'Waiver and practice squad movement',
    env: { SMOKE_WAIVER_PRACTICE_SQUAD: '1' },
  },
  {
    id: 'free-agency-signings',
    group: 'operations',
    label: 'Free agency: re-sign, market bid, street signing',
    env: { SMOKE_FREE_AGENCY_SIGNINGS: '1' },
  },
  {
    id: 'roster-depth-training',
    group: 'operations',
    label: 'Roster, IR, depth chart, returner, training',
    env: { SMOKE_ROSTER_DEPTH_TRAINING: '1' },
  },
  {
    id: 'weekly-prep',
    group: 'operations',
    label: 'Weekly prep save and sim',
    env: { SMOKE_WEEKLY_PREP: '1' },
  },
  {
    id: 'draft-scouting',
    group: 'operations',
    label: 'Draft and scouting actions',
    env: { SMOKE_DRAFT_SCOUTING: '1' },
  },
  {
    id: 'staff-facility-medical',
    group: 'operations',
    label: 'Settings: facility upgrade and medical hire',
    env: { SMOKE_STAFF_FACILITY_MEDICAL: '1' },
  },
  {
    id: 'local-save-slot-round-trip',
    group: 'persistence',
    label: 'Dynasty: local save-slot restore',
    env: { SMOKE_LOCAL_SAVE_SLOT_ROUND_TRIP: '1' },
  },
  {
    id: 'cartridge-round-trip',
    group: 'persistence',
    label: 'Dynasty: copied cartridge import plus hard reload',
    env: {
      SMOKE_CARTRIDGE_ROUND_TRIP: '1',
      SMOKE_POST_IMPORT_HARD_RELOAD: '1',
    },
  },
  {
    id: 'cartridge-file-round-trip',
    group: 'persistence',
    label: 'Dynasty: .mfd file import plus hard reload',
    env: {
      SMOKE_CARTRIDGE_FILE_ROUND_TRIP: '1',
      SMOKE_POST_IMPORT_HARD_RELOAD: '1',
    },
  },
];

function parseCsv(raw) {
  return String(raw ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function selectG3FootballOpsMatrixWorkflows(env = process.env) {
  const ids = parseCsv(env.SMOKE_G3_MATRIX_INCLUDE);
  const groups = parseCsv(env.SMOKE_G3_MATRIX_GROUPS);
  const knownIds = new Set(G3_FOOTBALL_OPS_MATRIX_WORKFLOWS.map((workflow) => workflow.id));
  const knownGroups = new Set(G3_FOOTBALL_OPS_MATRIX_WORKFLOWS.map((workflow) => workflow.group));

  if (ids.length > 0) {
    const unknown = ids.filter((id) => !knownIds.has(id));
    if (unknown.length > 0) {
      throw new Error(`Unknown SMOKE_G3_MATRIX_INCLUDE id(s): ${unknown.join(', ')}. Known ids: ${[...knownIds].join(', ')}`);
    }
    return G3_FOOTBALL_OPS_MATRIX_WORKFLOWS.filter((workflow) => ids.includes(workflow.id));
  }

  if (groups.length > 0) {
    const unknown = groups.filter((group) => !knownGroups.has(group));
    if (unknown.length > 0) {
      throw new Error(`Unknown SMOKE_G3_MATRIX_GROUPS value(s): ${unknown.join(', ')}. Known groups: ${[...knownGroups].join(', ')}`);
    }
    return G3_FOOTBALL_OPS_MATRIX_WORKFLOWS.filter((workflow) => groups.includes(workflow.group));
  }

  return G3_FOOTBALL_OPS_MATRIX_WORKFLOWS;
}

function formatSeconds(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function buildMatrixStepEnv(baseEnv, workflow) {
  return {
    ...baseEnv,
    VITE_CHIP_ENABLED: baseEnv.VITE_CHIP_ENABLED ?? 'true',
    ...workflow.env,
  };
}

function run() {
  if (!existsSync(join(repoRoot, 'apps/web/dist/index.html'))) {
    throw new Error('apps/web/dist/index.html is missing. Run `VITE_CHIP_ENABLED=true ./node_modules/.bin/vite build` from apps/web before this matrix smoke.');
  }

  const workflows = selectG3FootballOpsMatrixWorkflows(process.env);
  if (workflows.length === 0) {
    throw new Error('No G3 football-ops matrix workflows selected.');
  }

  const startedAt = performance.now();
  const results = [];
  console.log(`Running ${workflows.length} G3 football-ops browser smoke workflow(s)...`);

  for (let index = 0; index < workflows.length; index += 1) {
    const workflow = workflows[index];
    const stepStartedAt = performance.now();
    console.log(`\n[${index + 1}/${workflows.length}] ${workflow.label} (${workflow.id})`);
    const result = spawnSync(process.execPath, [postSetupSmokeScript], {
      cwd: repoRoot,
      env: buildMatrixStepEnv(process.env, workflow),
      stdio: 'inherit',
    });
    const durationMs = performance.now() - stepStartedAt;
    results.push({
      id: workflow.id,
      label: workflow.label,
      status: result.status,
      signal: result.signal,
      durationMs,
    });

    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      console.error(`\nFAIL: ${workflow.id} exited with status ${result.status ?? 'n/a'}${result.signal ? ` signal ${result.signal}` : ''} after ${formatSeconds(durationMs)}.`);
      process.exit(result.status ?? 1);
    }
    console.log(`PASS: ${workflow.id} completed in ${formatSeconds(durationMs)}.`);
  }

  const totalMs = performance.now() - startedAt;
  console.log('\nG3 football-ops matrix summary:');
  for (const result of results) {
    console.log(`- ${result.id}: PASS in ${formatSeconds(result.durationMs)}`);
  }
  console.log(`PASS: ${results.length} G3 football-ops browser smoke workflow(s) completed in ${formatSeconds(totalMs)}.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    run();
  } catch (err) {
    console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
