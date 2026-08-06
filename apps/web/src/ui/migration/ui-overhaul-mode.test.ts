import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_UI_OVERHAUL_MODE,
  isUiOverhaulEnabled,
  normalizeUiOverhaulMode,
  selectUiOverhaulMode,
} from './ui-overhaul-mode';

const storage = {
  store: {} as Record<string, string>,
  getItem(key: string) {
    return this.store[key] ?? null;
  },
  setItem(key: string, value: string) {
    this.store[key] = value;
  },
  removeItem(key: string) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  },
};

describe('ui overhaul mode contract', () => {
  it('defaults to legacy so the migration flag is never the risky default', () => {
    expect(DEFAULT_UI_OVERHAUL_MODE).toBe('legacy');
  });

  it('normalizes both known modes', () => {
    expect(normalizeUiOverhaulMode('legacy')).toBe('legacy');
    expect(normalizeUiOverhaulMode('v2')).toBe('v2');
  });

  it('falls back to legacy for corrupt or unknown persisted values', () => {
    for (const value of [undefined, null, '', 'V2', 'new', 0, 1, true, {}, []]) {
      expect(normalizeUiOverhaulMode(value)).toBe('legacy');
    }
  });

  it('reads the mode without importing the store', () => {
    expect(selectUiOverhaulMode({ uiOverhaulMode: 'v2' })).toBe('v2');
    expect(isUiOverhaulEnabled({ uiOverhaulMode: 'v2' })).toBe(true);
    expect(isUiOverhaulEnabled({ uiOverhaulMode: 'legacy' })).toBe(false);
  });
});

describe('ui overhaul mode persistence', () => {
  beforeEach(() => {
    storage.clear();
    vi.resetModules();
    vi.stubGlobal('window', { localStorage: storage });
    vi.stubGlobal('localStorage', storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts in legacy mode on a fresh install', async () => {
    const { useUiStore } = await import('../../app/store/ui-store');

    expect(useUiStore.getState().uiOverhaulMode).toBe('legacy');
  });

  it('persists the mode into the UI preference channel, not a save', async () => {
    const { useUiStore } = await import('../../app/store/ui-store');

    useUiStore.getState().setUiOverhaulMode('v2');

    const persisted = JSON.parse(storage.getItem('mfd-ui-preferences') ?? '{}');
    expect(persisted.state.uiOverhaulMode).toBe('v2');
    expect(Object.keys(storage.store)).toEqual(['mfd-ui-preferences']);
  });

  it('rehydrates a corrupt persisted mode as legacy instead of throwing', async () => {
    storage.setItem(
      'mfd-ui-preferences',
      JSON.stringify({ state: { uiOverhaulMode: 'not-a-mode' }, version: 0 }),
    );

    const { useUiStore } = await import('../../app/store/ui-store');

    expect(useUiStore.getState().uiOverhaulMode).toBe('legacy');
  });
});
