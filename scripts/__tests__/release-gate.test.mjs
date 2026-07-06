import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildReleaseGatePlan,
  parseReleaseGateArgs,
  selectReleaseGateSteps,
} from '../release-gate.mjs';

test('builds a full G7 release gate plan covering required gate groups', () => {
  const plan = buildReleaseGatePlan({ platform: 'darwin' });
  const ids = new Set(plan.map((step) => step.id));
  const groups = new Set(plan.map((step) => step.group));

  for (const id of [
    'script-tests',
    'grade-season-tests',
    'engine-typecheck',
    'web-typecheck',
    'design-typecheck',
    'engine-tests',
    'web-tests',
    'design-tests',
    'web-production-build',
    'bundle-size',
    'built-page-smoke',
    'math-random-ban',
    'engine-season-smoke',
    'playtest-all',
    'goat-release-sentinel',
    'shadow-regression',
    'g4-multi-year-soak',
    'g1-full-setup-desktop',
    'g1-full-setup-mobile',
    'g5-cba-commissioner-browser',
    'g3-football-ops-matrix',
    'g6-visual-sweep-desktop',
    'g6-visual-sweep-mobile',
  ]) {
    assert.equal(ids.has(id), true, `${id} is in the release plan`);
  }

  for (const group of [
    'static',
    'tests',
    'typecheck',
    'build',
    'browser',
    'determinism',
    'g4',
    'g3',
    'g6-chip',
    'g6-ux',
    'g6-visual',
    'g6-mobile',
    'mobile',
  ]) {
    assert.equal(groups.has(group), true, `${group} group is in the release plan`);
  }
});

test('runs TypeScript grade-season tests through Vitest instead of plain Node', () => {
  const plan = buildReleaseGatePlan({ platform: 'darwin' });
  const scriptTests = plan.find((step) => step.id === 'script-tests');
  const gradeSeasonTests = plan.find((step) => step.id === 'grade-season-tests');

  assert.ok(scriptTests);
  assert.equal(scriptTests.args.includes('scripts/__tests__/grade-season.test.ts'), false);

  assert.ok(gradeSeasonTests);
  assert.match(gradeSeasonTests.command, /apps\/web\/node_modules\/\.bin\/vitest$/);
  assert.deepEqual(gradeSeasonTests.args.slice(0, 2), ['run', '--root']);
  assert.ok(gradeSeasonTests.args.includes('--globals'));
  assert.ok(gradeSeasonTests.args.includes('grade-season.test.ts'));
});

test('defaults production and browser smoke steps to Chip enabled', () => {
  const plan = buildReleaseGatePlan({ platform: 'darwin' });

  assert.equal(plan.find((step) => step.id === 'web-production-build').env.VITE_CHIP_ENABLED, 'true');
  assert.equal(plan.find((step) => step.id === 'g3-football-ops-matrix').env.VITE_CHIP_ENABLED, 'true');
  assert.equal(plan.find((step) => step.id === 'g6-visual-sweep-mobile').env.VITE_CHIP_ENABLED, 'true');
});

test('keeps the dedicated G4 soak out of the generic web test step', () => {
  const plan = buildReleaseGatePlan({ platform: 'darwin' });
  const webTests = plan.find((step) => step.id === 'web-tests');
  const g4Soak = plan.find((step) => step.id === 'g4-multi-year-soak');

  assert.ok(webTests);
  assert.deepEqual(webTests.args, [
    'run',
    '--exclude',
    'src/app/store/g4-multi-year-trust.test.ts',
  ]);
  assert.ok(g4Soak?.args.includes('scripts/smoke-test-g4-multi-year-trust.mjs'));
});

test('wires the GOAT release sentinel to the long-horizon benchmark command', () => {
  const plan = buildReleaseGatePlan({ platform: 'darwin' });
  const sentinel = plan.find((step) => step.id === 'goat-release-sentinel');

  assert.equal(sentinel?.group, 'determinism');
  assert.equal(sentinel?.command, 'bash');
  assert.deepEqual(sentinel?.args, [
    'scripts/playtest-report.sh',
    '--benchmark',
    'goat-release-sentinel',
  ]);
});

test('includes mobile viewport env for mobile release smokes', () => {
  const plan = buildReleaseGatePlan({ platform: 'darwin' });
  const mobileSteps = plan.filter((step) => step.id.includes('mobile') || step.group === 'g6-mobile');

  assert.ok(mobileSteps.length >= 2);
  for (const step of mobileSteps) {
    assert.equal(step.env.SMOKE_VIEWPORT_WIDTH, '480', `${step.id} has mobile width`);
    assert.equal(step.env.SMOKE_VIEWPORT_HEIGHT, '900', `${step.id} has mobile height`);
  }
});

test('parses dry-run, list, and only release-gate options', () => {
  assert.deepEqual(parseReleaseGateArgs(['--dry-run', '--only', 'browser,g6-mobile']), {
    dryRun: true,
    list: false,
    only: ['browser', 'g6-mobile'],
  });
  assert.deepEqual(parseReleaseGateArgs(['--list', '--only=g3']), {
    dryRun: false,
    list: true,
    only: ['g3'],
  });
});

test('selects release-gate diagnostics by group or id and rejects unknown entries', () => {
  const plan = buildReleaseGatePlan({ platform: 'darwin' });
  const selected = selectReleaseGateSteps(plan, ['g3', 'g6-visual-sweep-mobile']);

  assert.deepEqual(selected.map((step) => step.id), [
    'g3-football-ops-matrix',
    'g6-visual-sweep-mobile',
  ]);

  assert.throws(
    () => selectReleaseGateSteps(plan, ['missing-group']),
    /Unknown --only id\/group/,
  );
});
