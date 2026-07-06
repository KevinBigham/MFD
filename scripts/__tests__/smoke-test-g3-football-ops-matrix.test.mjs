import assert from 'node:assert/strict';
import test from 'node:test';

import {
  G3_FOOTBALL_OPS_MATRIX_WORKFLOWS,
  buildMatrixStepEnv,
  selectG3FootballOpsMatrixWorkflows,
} from '../smoke-test-g3-football-ops-matrix.mjs';

test('selects the full G3 football-ops matrix by default', () => {
  const workflows = selectG3FootballOpsMatrixWorkflows({});

  assert.equal(workflows.length, G3_FOOTBALL_OPS_MATRIX_WORKFLOWS.length);
  assert.deepEqual(workflows.map((workflow) => workflow.id), G3_FOOTBALL_OPS_MATRIX_WORKFLOWS.map((workflow) => workflow.id));
});

test('selects workflows by explicit id list', () => {
  const workflows = selectG3FootballOpsMatrixWorkflows({
    SMOKE_G3_MATRIX_INCLUDE: 'contract-cuts, staff-facility-medical',
  });

  assert.deepEqual(workflows.map((workflow) => workflow.id), [
    'contract-cuts',
    'staff-facility-medical',
  ]);
});

test('rejects unknown workflow ids before browser work starts', () => {
  assert.throws(
    () => selectG3FootballOpsMatrixWorkflows({ SMOKE_G3_MATRIX_INCLUDE: 'missing-workflow' }),
    /Unknown SMOKE_G3_MATRIX_INCLUDE/,
  );
});

test('selects workflows by group', () => {
  const workflows = selectG3FootballOpsMatrixWorkflows({
    SMOKE_G3_MATRIX_GROUPS: 'persistence',
  });

  assert.deepEqual(workflows.map((workflow) => workflow.id), [
    'local-save-slot-round-trip',
    'cartridge-round-trip',
    'cartridge-file-round-trip',
  ]);
});

test('rejects unknown workflow groups before browser work starts', () => {
  assert.throws(
    () => selectG3FootballOpsMatrixWorkflows({ SMOKE_G3_MATRIX_GROUPS: 'other' }),
    /Unknown SMOKE_G3_MATRIX_GROUPS/,
  );
});

test('enables Chip by default for spawned smoke steps', () => {
  const workflow = G3_FOOTBALL_OPS_MATRIX_WORKFLOWS.find((entry) => entry.id === 'staff-facility-medical');
  const env = buildMatrixStepEnv({}, workflow);

  assert.equal(env.VITE_CHIP_ENABLED, 'true');
  assert.equal(env.SMOKE_STAFF_FACILITY_MEDICAL, '1');
});

test('preserves explicit Chip flag for spawned smoke steps', () => {
  const workflow = G3_FOOTBALL_OPS_MATRIX_WORKFLOWS.find((entry) => entry.id === 'contract-cuts');
  const env = buildMatrixStepEnv({ VITE_CHIP_ENABLED: 'false' }, workflow);

  assert.equal(env.VITE_CHIP_ENABLED, 'false');
  assert.equal(env.SMOKE_CONTRACT_CUTS, '1');
});
