import { describe, expect, it } from 'vitest';

import {
  coerceValidationErrors,
  resolveRuntimePayload,
} from '../src/dev/runtime-loader.js';

describe('runtime-loader', () => {
  var EMPTY_SUMMARY = {
    extractedModulesText: '',
    systemsText: '',
    narrativeText: '',
    buildSystemText: '',
    originalGameText: '',
    footerText: '',
  };

  it('prefers buildModuleValidationSnapshot when available', () => {
    var runtime = {
      buildModuleValidationSnapshot: function () {
        return {
          validation: { ok: true, errors: [], checkCount: 999 },
          statusRows: [{ name: 'A', status: true }],
          summary: { extractedModulesText: 'x' },
        };
      },
      runModuleValidation: function () {
        return { ok: false, errors: ['should not be called'], checkCount: 1 };
      },
    };

    var out = resolveRuntimePayload(runtime, EMPTY_SUMMARY);
    expect(out.error).toBe('');
    expect(out.validation.ok).toBe(true);
    expect(out.validation.checkCount).toBe(999);
    expect(out.systems.length).toBe(1);
    expect(out.summary.extractedModulesText).toBe('x');
  });

  it('falls back to legacy function exports when snapshot helper is absent', () => {
    var runtime = {
      runModuleValidation: function () {
        return { ok: true, errors: [], checkCount: 500 };
      },
      buildModuleStatusRows: function () {
        return [{ name: 'B', status: true }];
      },
      PHASE1_SUMMARY: { systemsText: 'legacy' },
    };

    var out = resolveRuntimePayload(runtime, EMPTY_SUMMARY);
    expect(out.error).toBe('');
    expect(out.validation.ok).toBe(true);
    expect(out.validation.checkCount).toBe(500);
    expect(out.systems).toEqual([{ name: 'B', status: true }]);
    expect(out.summary.systemsText).toBe('legacy');
  });

  it('returns explicit error when runtime payload is missing validation', () => {
    var out = resolveRuntimePayload({}, EMPTY_SUMMARY);
    expect(out.error).toContain('missing validation');
    expect(out.validation.ok).toBe(false);
    expect(out.systems).toEqual([]);
    expect(out.summary).toBe(EMPTY_SUMMARY);
  });

  it('falls back to empty summary when PHASE1_SUMMARY is absent', () => {
    var runtime = {
      runModuleValidation: function () {
        return { ok: true, errors: [], checkCount: 123 };
      },
      buildModuleStatusRows: function () {
        return [{ name: 'x', status: true }];
      },
    };
    var out = resolveRuntimePayload(runtime, EMPTY_SUMMARY);
    expect(out.error).toBe('');
    expect(out.summary).toBe(EMPTY_SUMMARY);
  });
});

describe('coerceValidationErrors', () => {
  it('prefers validation error array when present', () => {
    expect(coerceValidationErrors({ errors: ['a'] }, 'fallback')).toEqual(['a']);
  });

  it('uses fallback when errors array is empty', () => {
    expect(coerceValidationErrors({ errors: [] }, 'fallback')).toEqual(['fallback']);
  });

  it('uses unknown fallback when both are missing', () => {
    expect(coerceValidationErrors(null, '')).toEqual(['Unknown validation failure']);
  });
});
