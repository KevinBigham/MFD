import { describe, expect, it } from 'vitest';
import {
  CHIP_DOCK_STORAGE_KEY,
  createDefaultDockPrefs,
  readDockPrefs,
  updateDockPrefs,
  writeDockPrefs,
} from './dockPersistence';

class MemoryStorage implements Storage {
  private readonly backing = new Map<string, string>();

  get length() {
    return this.backing.size;
  }

  clear(): void {
    this.backing.clear();
  }

  getItem(key: string): string | null {
    return this.backing.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.backing.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.backing.delete(key);
  }

  setItem(key: string, value: string): void {
    this.backing.set(key, value);
  }
}

describe('dockPersistence', () => {
  it('returns default dock prefs when storage is unavailable', () => {
    expect(readDockPrefs(null)).toEqual(createDefaultDockPrefs());
  });

  it('returns default dock prefs when the storage key is missing', () => {
    const storage = new MemoryStorage();

    expect(readDockPrefs(storage)).toEqual(createDefaultDockPrefs());
  });

  it('writes and reads the full local dock preference payload', () => {
    const storage = new MemoryStorage();
    const prefs = {
      collapsed: true,
      quietForScreen: '/roster',
      quietUntilWeek: 8,
      quietForSeason: 2031,
      reducedGuidance: true,
      animationsDisabled: true,
      lastUpdated: '2026-04-29T18:00:00.000Z',
    };

    writeDockPrefs(storage, prefs);

    expect(storage.getItem(CHIP_DOCK_STORAGE_KEY)).toBe(JSON.stringify(prefs));
    expect(readDockPrefs(storage)).toEqual(prefs);
  });

  it('falls back to defaults for malformed JSON without throwing', () => {
    const storage = new MemoryStorage();
    storage.setItem(CHIP_DOCK_STORAGE_KEY, '{not-json');

    expect(readDockPrefs(storage)).toEqual(createDefaultDockPrefs());
  });

  it('falls back to defaults when runtime validation rejects the shape', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      CHIP_DOCK_STORAGE_KEY,
      JSON.stringify({
        collapsed: 'yes',
        quietForScreen: 12,
        quietUntilWeek: 'next',
        quietForSeason: null,
        reducedGuidance: false,
        animationsDisabled: false,
        lastUpdated: '2026-04-29T18:00:00.000Z',
      }),
    );

    expect(readDockPrefs(storage)).toEqual(createDefaultDockPrefs());
  });

  it('merges updates and stamps lastUpdated from the injected clock', () => {
    const storage = new MemoryStorage();
    const timestamp = new Date('2026-04-29T18:05:00.000Z');

    const prefs = updateDockPrefs(
      storage,
      {
        quietUntilWeek: 4,
        reducedGuidance: true,
      },
      () => timestamp,
    );

    expect(prefs).toEqual({
      ...createDefaultDockPrefs(),
      quietUntilWeek: 4,
      reducedGuidance: true,
      lastUpdated: '2026-04-29T18:05:00.000Z',
    });
    expect(readDockPrefs(storage)).toEqual(prefs);
  });
});
