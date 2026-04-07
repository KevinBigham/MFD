import { describe, expect, it } from 'vitest';

import {
  MIN_EXPECTED_CHECK_COUNT,
  PHASE1_SUMMARY,
  buildModuleValidationSnapshot,
  buildModuleStatusRows,
  runModuleValidation,
} from '../src/dev/module-validation-runtime.js';
import { VALIDATION_RESULT_KEYS } from '../src/dev/module-validation/contracts.js';

describe('module-validation-runtime', () => {
  it('runModuleValidation returns passing result with high check count', () => {
    const rows = buildModuleStatusRows();
    const result = runModuleValidation();
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.checkCount).toBeGreaterThanOrEqual(MIN_EXPECTED_CHECK_COUNT);
    expect(result.checkCount).toBeGreaterThan(rows.length);
  });

  it('buildModuleValidationSnapshot returns coherent runtime payload', () => {
    const snapshot = buildModuleValidationSnapshot();
    expect(snapshot && typeof snapshot).toBe('object');
    expect(Array.isArray(snapshot.statusRows)).toBe(true);
    expect(snapshot.statusRows.length).toBeGreaterThan(0);
    expect(snapshot.validation.ok).toBe(true);
    expect(snapshot.validation.errors).toEqual([]);
    expect(snapshot.validation.checkCount).toBeGreaterThan(snapshot.statusRows.length);
    expect(snapshot.summary).toBe(PHASE1_SUMMARY);
  });

  it('buildModuleStatusRows returns unique named status rows', () => {
    const rows = buildModuleStatusRows();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((row) => {
      expect(typeof row.name).toBe('string');
      expect(typeof row.status).toBe('boolean');
    });
    expect(new Set(rows.map((row) => row.name)).size).toBe(rows.length);
    expect(rows.every((row) => row.status)).toBe(true);
  });

  it('PHASE1_SUMMARY exposes required summary fields', () => {
    expect(typeof PHASE1_SUMMARY.extractedModulesText).toBe('string');
    expect(typeof PHASE1_SUMMARY.systemsText).toBe('string');
    expect(typeof PHASE1_SUMMARY.narrativeText).toBe('string');
    expect(typeof PHASE1_SUMMARY.buildSystemText).toBe('string');
    expect(typeof PHASE1_SUMMARY.originalGameText).toBe('string');
    expect(typeof PHASE1_SUMMARY.footerText).toBe('string');
    expect(PHASE1_SUMMARY.extractedModulesText.length).toBeGreaterThan(0);
    expect(PHASE1_SUMMARY.systemsText.length).toBeGreaterThan(0);
    expect(PHASE1_SUMMARY.narrativeText.length).toBeGreaterThan(0);
    expect(PHASE1_SUMMARY.buildSystemText.length).toBeGreaterThan(0);
    expect(PHASE1_SUMMARY.originalGameText.length).toBeGreaterThan(0);
    expect(PHASE1_SUMMARY.footerText.length).toBeGreaterThan(0);
    expect(Object.isFrozen(PHASE1_SUMMARY)).toBe(true);
  });

  it('runtime result keys are exactly ok/errors/checkCount', () => {
    const result = runModuleValidation();
    expect(Object.keys(result).sort()).toEqual(VALIDATION_RESULT_KEYS.slice().sort());
  });

  it('fails when duplicate status row names are supplied', () => {
    const result = runModuleValidation([
      { name: 'dup', status: true },
      { name: 'dup', status: true },
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors.some((msg) => msg.includes('duplicate status row'))).toBe(true);
  });

  it('fails when non-boolean status values are supplied', () => {
    const result = runModuleValidation([
      { name: 'bad-status', status: 'yes' },
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors.some((msg) => msg.includes('invalid shape'))).toBe(true);
  });
});
