import { describe, expect, it } from 'vitest';

import {
  buildImportFailureState,
  buildLoadingState,
  buildSuccessState,
  buildValidationFailureState,
  joinValidationErrors,
} from '../src/dev/main-status-model.js';

describe('main-status-model', () => {
  var EMPTY_SUMMARY = {
    extractedModulesText: '',
    systemsText: '',
    narrativeText: '',
    buildSystemText: '',
    originalGameText: '',
    footerText: '',
  };

  it('creates loading state with cleared runtime fields', () => {
    var out = buildLoadingState(EMPTY_SUMMARY);
    expect(out.loading).toBe(true);
    expect(out.error).toBe('');
    expect(out.systems).toEqual([]);
    expect(out.validation).toBe(null);
    expect(out.summary).toBe(EMPTY_SUMMARY);
  });

  it('joins validation errors from payload in priority order', () => {
    expect(joinValidationErrors({ errors: ['a', 'b'] }, 'fallback')).toEqual(['a', 'b']);
    expect(joinValidationErrors({ errors: [] }, 'fallback')).toEqual(['fallback']);
    expect(joinValidationErrors(null, '')).toEqual(['Unknown validation failure']);
  });

  it('builds validation failure state and preserves systems/summary', () => {
    var out = buildValidationFailureState(null, 'bad', [{ name: 'x', status: true }], EMPTY_SUMMARY);
    expect(out.loading).toBe(false);
    expect(out.error).toContain('bad');
    expect(out.validation.ok).toBe(false);
    expect(out.systems.length).toBe(1);
    expect(out.summary).toBe(EMPTY_SUMMARY);
  });

  it('builds success state', () => {
    var out = buildSuccessState({ ok: true, errors: [], checkCount: 1 }, [{ name: 'x', status: true }], EMPTY_SUMMARY);
    expect(out.loading).toBe(false);
    expect(out.error).toBe('');
    expect(out.validation.ok).toBe(true);
    expect(out.systems.length).toBe(1);
  });

  it('builds import failure state using error mapping function', () => {
    var out = buildImportFailureState(new Error('boom'), function () { return 'mapped'; }, EMPTY_SUMMARY);
    expect(out.loading).toBe(false);
    expect(out.error).toBe('mapped');
    expect(out.systems).toEqual([]);
    expect(out.validation).toBe(null);
  });
});
