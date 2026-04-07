import { describe, expect, it } from 'vitest';

import {
  BOOT_MODES,
  detectForcedMode,
  parseBootMode,
  parseModeFromHash,
  parseModeFromQuery,
  resolveBootMode,
} from '../src/app/boot-mode.js';

describe('boot-mode helpers', () => {
  it('parseBootMode accepts play/status only', () => {
    expect(parseBootMode('play')).toBe(BOOT_MODES.PLAY);
    expect(parseBootMode('STATUS')).toBe(BOOT_MODES.STATUS);
    expect(parseBootMode('unknown')).toBe('');
  });

  it('parses query/hash mode variants', () => {
    expect(parseModeFromQuery('?mode=play')).toBe('play');
    expect(parseModeFromQuery('mode=status')).toBe('status');
    expect(parseModeFromHash('#play')).toBe('play');
    expect(parseModeFromHash('#mode=status')).toBe('status');
  });

  it('resolveBootMode uses query > hash > storage > default precedence', () => {
    expect(resolveBootMode({ query: '?mode=play', hash: '#status', storageValue: 'status', defaultMode: 'status' })).toBe('play');
    expect(resolveBootMode({ query: '', hash: '#status', storageValue: 'play', defaultMode: 'play' })).toBe('status');
    expect(resolveBootMode({ query: '', hash: '', storageValue: 'play', defaultMode: 'status' })).toBe('play');
    expect(resolveBootMode({ query: '', hash: '', storageValue: '', defaultMode: 'status' })).toBe('status');
  });

  it('detectForcedMode returns only query/hash-derived mode', () => {
    expect(detectForcedMode({ query: '?mode=play', hash: '#status' })).toBe('play');
    expect(detectForcedMode({ query: '', hash: '#status' })).toBe('status');
    expect(detectForcedMode({ query: '', hash: '' })).toBe('');
  });
});
