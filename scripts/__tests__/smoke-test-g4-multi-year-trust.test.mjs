import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildG4MultiYearTrustCommand } from '../smoke-test-g4-multi-year-trust.mjs';

test('builds the app-local G4 Vitest command', () => {
  const command = buildG4MultiYearTrustCommand({}, 'darwin');

  assert.equal(command.args[0], 'run');
  assert.equal(command.args[1], 'src/app/store/g4-multi-year-trust.test.ts');
  assert.match(command.command, /apps\/web\/node_modules\/\.bin\/vitest$/);
  assert.match(command.cwd, /apps\/web$/);
});

test('defaults Chip to enabled for the G4 smoke command', () => {
  const command = buildG4MultiYearTrustCommand({}, 'darwin');

  assert.equal(command.env.VITE_CHIP_ENABLED, 'true');
});

test('preserves an explicit Chip env override', () => {
  const command = buildG4MultiYearTrustCommand({ VITE_CHIP_ENABLED: 'false' }, 'darwin');

  assert.equal(command.env.VITE_CHIP_ENABLED, 'false');
});

test('uses the Windows vitest command name on win32', () => {
  const command = buildG4MultiYearTrustCommand({}, 'win32');

  assert.match(command.command, /vitest\.cmd$/);
});
