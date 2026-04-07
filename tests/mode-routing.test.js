import { describe, expect, it } from 'vitest';

import {
  buildModeRoutingMatrix,
  canonicalizeMode,
  hydrateModeFromLocation,
  parseCanonicalHashMode,
  parseCanonicalQueryMode,
  resolveModeRouting,
} from '../src/app/mode-routing.js';

describe('mode-routing', () => {
  it('canonicalizes invalid mode inputs safely', () => {
    expect(canonicalizeMode('play', 'status')).toBe('play');
    expect(canonicalizeMode('bad', 'status')).toBe('status');
    expect(canonicalizeMode('', '')).toBe('status');
  });

  it('parses canonical query/hash modes', () => {
    expect(parseCanonicalQueryMode('?mode=play')).toBe('play');
    expect(parseCanonicalQueryMode('?mode=bad')).toBe('');
    expect(parseCanonicalHashMode('#status')).toBe('status');
    expect(parseCanonicalHashMode('#mode=play')).toBe('play');
  });

  it('resolves deterministic precedence and source markers', () => {
    expect(resolveModeRouting({
      query: '?mode=play',
      hash: '#status',
      storageValue: 'status',
      defaultMode: 'status',
    })).toEqual({ mode: 'play', forcedMode: 'play', source: 'forced' });

    expect(resolveModeRouting({
      query: '',
      hash: '',
      storageValue: 'status',
      defaultMode: 'play',
      forceLock: false,
    })).toEqual({ mode: 'status', forcedMode: '', source: 'storage' });
  });

  it('hydrates from window-like location object with SSR-safe fallback', () => {
    expect(hydrateModeFromLocation({
      windowLike: { location: { search: '?mode=status', hash: '#play' } },
      storageValue: 'play',
      defaultMode: 'play',
    }).mode).toBe('status');

    expect(hydrateModeFromLocation({
      windowLike: null,
      storageValue: 'play',
      defaultMode: 'status',
    }).mode).toBe('play');
  });

  it('produces matrix with stable output shape', () => {
    var matrix = buildModeRoutingMatrix();
    expect(Array.isArray(matrix)).toBe(true);
    expect(matrix.length).toBeGreaterThan(0);
    expect(matrix.every(function (row) {
      return row && row.input && row.output && typeof row.output.mode === 'string';
    })).toBe(true);
  });
});
