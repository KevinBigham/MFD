#!/usr/bin/env node
/**
 * Public-release gate runner.
 *
 * Default usage runs the full release contract:
 *   node scripts/release-gate.mjs
 *
 * Useful command-contract checks:
 *   node scripts/release-gate.mjs --dry-run
 *   node scripts/release-gate.mjs --list
 *   node scripts/release-gate.mjs --only browser,g6-mobile --dry-run
 */

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = join(repoRoot, 'apps/web');
const engineRoot = join(repoRoot, 'packages/engine');
const designRoot = join(repoRoot, 'packages/design-system');

function commandBin(packageRoot, name, platform = process.platform) {
  const suffix = platform === 'win32' ? '.cmd' : '';
  return join(packageRoot, 'node_modules/.bin', `${name}${suffix}`);
}

function scriptStep(id, group, label, args, options = {}) {
  return {
    id,
    group,
    label,
    command: process.execPath,
    args,
    cwd: repoRoot,
    env: options.env ?? {},
  };
}

function packageBinStep(id, group, label, packageRoot, bin, args, options = {}) {
  return {
    id,
    group,
    label,
    command: commandBin(packageRoot, bin, options.platform),
    args,
    cwd: packageRoot,
    env: options.env ?? {},
  };
}

function bashStep(id, group, label, args, options = {}) {
  return {
    id,
    group,
    label,
    command: 'bash',
    args,
    cwd: repoRoot,
    env: options.env ?? {},
  };
}

function postSetupStep(id, group, label, env) {
  return scriptStep(id, group, label, ['scripts/smoke-test-post-setup-route.mjs'], {
    env: {
      VITE_CHIP_ENABLED: 'true',
      SMOKE_TIMEOUT_MS: '90000',
      ...env,
    },
  });
}

export function buildReleaseGatePlan(options = {}) {
  const platform = options.platform ?? process.platform;
  const nodeTestArgs = [
    '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
    '--test',
    'scripts/__tests__/release-docs.test.mjs',
    'scripts/__tests__/release-gate.test.mjs',
    'scripts/__tests__/smoke-test-post-setup-route.test.mjs',
    'scripts/__tests__/smoke-test-g3-football-ops-matrix.test.mjs',
    'scripts/__tests__/smoke-test-g4-multi-year-trust.test.mjs',
    'scripts/__tests__/grade-season.test.ts',
  ];

  return [
    scriptStep('release-gate-syntax', 'static', 'release gate syntax check', ['--check', 'scripts/release-gate.mjs']),
    scriptStep('browser-smoke-syntax', 'static', 'browser smoke syntax check', ['--check', 'scripts/smoke-test-post-setup-route.mjs']),
    scriptStep('g3-matrix-syntax', 'static', 'G3 matrix syntax check', ['--check', 'scripts/smoke-test-g3-football-ops-matrix.mjs']),
    scriptStep('g4-soak-syntax', 'static', 'G4 soak runner syntax check', ['--check', 'scripts/smoke-test-g4-multi-year-trust.mjs']),
    scriptStep('script-tests', 'tests', 'script and release-tooling tests', nodeTestArgs),

    packageBinStep('engine-typecheck', 'typecheck', 'engine typecheck', engineRoot, 'tsc', ['--noEmit'], { platform }),
    packageBinStep('web-typecheck', 'typecheck', 'web typecheck', webRoot, 'tsc', ['--noEmit'], { platform }),
    packageBinStep('design-typecheck', 'typecheck', 'design-system typecheck', designRoot, 'tsc', ['--noEmit'], { platform }),

    packageBinStep('engine-tests', 'tests', 'engine test suite, including save compatibility', engineRoot, 'vitest', ['run'], { platform }),
    packageBinStep('web-tests', 'tests', 'web test suite excluding dedicated G4 soak', webRoot, 'vitest', [
      'run',
      '--exclude',
      'src/app/store/g4-multi-year-trust.test.ts',
    ], { platform }),
    packageBinStep('design-tests', 'tests', 'design-system test suite', designRoot, 'vitest', ['run'], { platform }),

    packageBinStep('web-production-build', 'build', 'Chip-enabled production web build', webRoot, 'vite', ['build'], {
      platform,
      env: { VITE_CHIP_ENABLED: 'true' },
    }),
    bashStep('bundle-size', 'build', 'engine bundle size gate', ['scripts/check-bundle-size.sh']),
    bashStep('built-page-smoke', 'browser', 'built-page deploy-root smoke', ['scripts/smoke-test-built-page.sh']),

    bashStep('math-random-ban', 'determinism', 'Math.random source audit', ['scripts/check-math-random.sh']),
    packageBinStep('engine-season-smoke', 'determinism', 'engine full-season and save round-trip smoke', engineRoot, 'vitest', [
      'run',
      'season-smoke',
      'full-season',
      'save-round-trip',
    ], { platform }),
    bashStep('playtest-all', 'determinism', '10-season deterministic playtest fast tier', ['scripts/playtest-report.sh', '--all', '--seed', '42', '--seasons', '10']),
    bashStep('goat-release-sentinel', 'determinism', 'GOAT release-sentinel quality benchmark', ['scripts/playtest-report.sh', '--benchmark', 'goat-release-sentinel']),
    bashStep('shadow-regression', 'determinism', 'shadow regression baseline compare', ['scripts/shadow-regression.sh']),
    scriptStep('g4-multi-year-soak', 'g4', 'G4 clean New Dynasty multi-year trust soak', ['scripts/smoke-test-g4-multi-year-trust.mjs'], {
      env: { VITE_CHIP_ENABLED: 'true' },
    }),

    postSetupStep('g1-full-setup-desktop', 'browser', 'G1/G2 Full Setup desktop golden path', {
      SMOKE_FULL_SETUP_COMPLETE: '1',
    }),
    postSetupStep('g1-full-setup-mobile', 'mobile', 'G1/G2 Full Setup 480px golden path', {
      SMOKE_FULL_SETUP_COMPLETE: '1',
      SMOKE_VIEWPORT_WIDTH: '480',
      SMOKE_VIEWPORT_HEIGHT: '900',
    }),
    postSetupStep('g5-cba-commissioner-browser', 'browser', 'G5 CBA and commissioner browser smoke', {
      SMOKE_POST_SETUP_ROUTES_JSON: JSON.stringify([
        { route: '/cba', text: 'CBA SOURCES' },
        { route: '/commissioner', text: 'CBA Status' },
      ]),
    }),

    scriptStep('g3-football-ops-matrix', 'g3', 'G3 full football-ops browser matrix', ['scripts/smoke-test-g3-football-ops-matrix.mjs'], {
      env: { VITE_CHIP_ENABLED: 'true', SMOKE_TIMEOUT_MS: '90000' },
    }),

    postSetupStep('g6-chip-mute-desktop', 'g6-chip', 'G6 Chip mute desktop persistence smoke', {
      SMOKE_POST_SETUP_ROUTE: '/roster',
      SMOKE_POST_SETUP_TEXT: 'Roster Sources',
      SMOKE_CHIP_MUTE: '1',
    }),
    postSetupStep('g6-chip-mute-mobile', 'g6-mobile', 'G6 Chip mute 480px persistence smoke', {
      SMOKE_POST_SETUP_ROUTE: '/roster',
      SMOKE_POST_SETUP_TEXT: 'Roster Sources',
      SMOKE_CHIP_MUTE: '1',
      SMOKE_VIEWPORT_WIDTH: '480',
      SMOKE_VIEWPORT_HEIGHT: '900',
    }),
    postSetupStep('g6-chip-receipts-desktop', 'g6-chip', 'G6 Chip receipt-respect desktop smoke', {
      SMOKE_CHIP_RECEIPT_RESPECT: '1',
    }),
    postSetupStep('g6-chip-receipts-mobile', 'g6-mobile', 'G6 Chip receipt-respect 480px smoke', {
      SMOKE_CHIP_RECEIPT_RESPECT: '1',
      SMOKE_VIEWPORT_WIDTH: '480',
      SMOKE_VIEWPORT_HEIGHT: '900',
    }),
    postSetupStep('g6-chip-reduced-motion-desktop', 'g6-chip', 'G6 Chip keyboard/reduced-motion desktop smoke', {
      SMOKE_POST_SETUP_ROUTE: '/roster',
      SMOKE_POST_SETUP_TEXT: 'Roster Sources',
      SMOKE_CHIP_FOCUS_REDUCED_MOTION: '1',
    }),
    postSetupStep('g6-chip-reduced-motion-mobile', 'g6-mobile', 'G6 Chip keyboard/reduced-motion 480px smoke', {
      SMOKE_POST_SETUP_ROUTE: '/roster',
      SMOKE_POST_SETUP_TEXT: 'Roster Sources',
      SMOKE_CHIP_FOCUS_REDUCED_MOTION: '1',
      SMOKE_VIEWPORT_WIDTH: '480',
      SMOKE_VIEWPORT_HEIGHT: '900',
    }),
    postSetupStep('g6-state-feedback-desktop', 'g6-ux', 'G6 loading/empty/error/success desktop smoke', {
      SMOKE_G6_STATE_FEEDBACK: '1',
    }),
    postSetupStep('g6-state-feedback-mobile', 'g6-mobile', 'G6 loading/empty/error/success 480px smoke', {
      SMOKE_G6_STATE_FEEDBACK: '1',
      SMOKE_VIEWPORT_WIDTH: '480',
      SMOKE_VIEWPORT_HEIGHT: '900',
    }),
    postSetupStep('g6-focus-sweep-desktop', 'g6-ux', 'G6 focus sweep desktop smoke', {
      SMOKE_G6_FOCUS_SWEEP: '1',
    }),
    postSetupStep('g6-focus-sweep-mobile', 'g6-mobile', 'G6 focus sweep 480px smoke', {
      SMOKE_G6_FOCUS_SWEEP: '1',
      SMOKE_VIEWPORT_WIDTH: '480',
      SMOKE_VIEWPORT_HEIGHT: '900',
    }),
    postSetupStep('g6-visual-sweep-desktop', 'g6-visual', 'G6 48-route visual/console desktop smoke', {
      SMOKE_G6_VISUAL_SWEEP: '1',
    }),
    postSetupStep('g6-visual-sweep-mobile', 'g6-mobile', 'G6 48-route visual/console 480px smoke', {
      SMOKE_G6_VISUAL_SWEEP: '1',
      SMOKE_VIEWPORT_WIDTH: '480',
      SMOKE_VIEWPORT_HEIGHT: '900',
    }),
  ];
}

function parseCsv(raw) {
  return String(raw ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function parseReleaseGateArgs(argv = process.argv.slice(2)) {
  const parsed = {
    dryRun: false,
    list: false,
    only: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--list') {
      parsed.list = true;
    } else if (arg === '--only') {
      parsed.only.push(...parseCsv(argv[index + 1]));
      index += 1;
    } else if (arg.startsWith('--only=')) {
      parsed.only.push(...parseCsv(arg.slice('--only='.length)));
    } else if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else {
      throw new Error(`Unknown argument "${arg}". Use --help for usage.`);
    }
  }

  return parsed;
}

export function selectReleaseGateSteps(plan, only = []) {
  if (!only || only.length === 0) return plan;

  const ids = new Set(plan.map((step) => step.id));
  const groups = new Set(plan.map((step) => step.group));
  const unknown = only.filter((entry) => !ids.has(entry) && !groups.has(entry));
  if (unknown.length > 0) {
    throw new Error(`Unknown --only id/group: ${unknown.join(', ')}. Known groups: ${[...groups].sort().join(', ')}`);
  }

  return plan.filter((step) => only.includes(step.id) || only.includes(step.group));
}

function mergedEnv(step) {
  return {
    ...process.env,
    ...step.env,
  };
}

function formatCommand(step) {
  return [
    ...Object.entries(step.env ?? {}).map(([key, value]) => `${key}=${JSON.stringify(value)}`),
    step.command,
    ...step.args,
  ].join(' ');
}

function formatSeconds(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

function printUsage() {
  console.log(`Usage:
  node scripts/release-gate.mjs
  node scripts/release-gate.mjs --dry-run
  node scripts/release-gate.mjs --list
  node scripts/release-gate.mjs --only <group-or-id>[,<group-or-id>] [--dry-run]

Default mode runs the full public-release gate. Any --only run is a focused
diagnostic and is not release-complete evidence.`);
}

function verifyStepCommand(step) {
  if (step.command.includes('/node_modules/.bin/') && !existsSync(step.command)) {
    throw new Error(`Missing required binary for ${step.id}: ${step.command}. Install workspace dependencies first.`);
  }
}

export function runReleaseGate(argv = process.argv.slice(2)) {
  const args = parseReleaseGateArgs(argv);
  if (args.help) {
    printUsage();
    return 0;
  }

  const plan = buildReleaseGatePlan();
  const selectedSteps = selectReleaseGateSteps(plan, args.only);
  const fullRun = selectedSteps.length === plan.length;

  if (args.list || args.dryRun) {
    console.log(`${fullRun ? 'Full' : 'Partial'} release gate plan (${selectedSteps.length}/${plan.length} steps):`);
    selectedSteps.forEach((step, index) => {
      console.log(`${String(index + 1).padStart(2, '0')}. [${step.group}] ${step.id}: ${formatCommand(step)}`);
    });
    if (!fullRun) {
      console.log('NOTE: --only selected a focused diagnostic. This is not release-complete evidence.');
    }
    return 0;
  }

  console.log(`${fullRun ? 'Running full' : 'Running partial'} public-release gate (${selectedSteps.length}/${plan.length} steps)...`);
  if (!fullRun) {
    console.log('NOTE: --only selected a focused diagnostic. This is not release-complete evidence.');
  }

  const startedAt = performance.now();
  const results = [];

  for (let index = 0; index < selectedSteps.length; index += 1) {
    const step = selectedSteps[index];
    verifyStepCommand(step);
    const stepStartedAt = performance.now();
    console.log(`\n[${index + 1}/${selectedSteps.length}] ${step.label}`);
    console.log(`$ ${formatCommand(step)}`);
    const result = spawnSync(step.command, step.args, {
      cwd: step.cwd,
      env: mergedEnv(step),
      stdio: 'inherit',
    });
    const durationMs = performance.now() - stepStartedAt;
    results.push({ step, status: result.status, signal: result.signal, durationMs });

    if (result.error) throw result.error;
    if (result.status !== 0) {
      console.error(`\nFAIL: ${step.id} exited with status ${result.status ?? 'n/a'}${result.signal ? ` signal ${result.signal}` : ''} after ${formatSeconds(durationMs)}.`);
      return result.status ?? 1;
    }
    console.log(`PASS: ${step.id} completed in ${formatSeconds(durationMs)}.`);
  }

  const totalMs = performance.now() - startedAt;
  console.log('\nRelease gate summary:');
  for (const result of results) {
    console.log(`- ${result.step.id}: PASS in ${formatSeconds(result.durationMs)}`);
  }
  console.log(`PASS: ${fullRun ? 'full public-release gate' : 'selected release diagnostics'} completed in ${formatSeconds(totalMs)}.`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = runReleaseGate();
  } catch (err) {
    console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  }
}
