import { afterEach, describe, expect, it } from 'vitest';
import {
  GHOST_BROADCAST_PREFS_STORAGE_KEY,
  createDefaultGhostBroadcastPrefs,
  readGhostBroadcastPrefs,
  setGhostBroadcastEnabled,
  writeGhostBroadcastPrefs,
} from './ghostBroadcastPrefs';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe('ghostBroadcastPrefs', () => {
  let storage: MemoryStorage;

  afterEach(() => {
    storage?.clear();
  });

  it('returns the default prefs (enabled) when storage is empty', () => {
    storage = new MemoryStorage();

    const prefs = readGhostBroadcastPrefs(storage);

    expect(prefs).toEqual(createDefaultGhostBroadcastPrefs());
    expect(prefs.enabled).toBe(true);
  });

  it('returns the default prefs when storage is null (SSR-safe)', () => {
    expect(readGhostBroadcastPrefs(null)).toEqual(createDefaultGhostBroadcastPrefs());
  });

  it('round-trips a written pref through storage', () => {
    storage = new MemoryStorage();
    const written = setGhostBroadcastEnabled(storage, false, () => new Date('2026-04-30T12:00:00Z'));

    expect(written.enabled).toBe(false);
    expect(written.lastUpdated).toBe('2026-04-30T12:00:00.000Z');

    const reread = readGhostBroadcastPrefs(storage);
    expect(reread).toEqual(written);
  });

  it('falls back to defaults when storage contains malformed JSON', () => {
    storage = new MemoryStorage();
    storage.setItem(GHOST_BROADCAST_PREFS_STORAGE_KEY, '{not-json');

    const prefs = readGhostBroadcastPrefs(storage);

    expect(prefs).toEqual(createDefaultGhostBroadcastPrefs());
  });

  it('falls back to defaults when storage contains a wrong-shape object', () => {
    storage = new MemoryStorage();
    storage.setItem(GHOST_BROADCAST_PREFS_STORAGE_KEY, JSON.stringify({ random: 'value' }));

    const prefs = readGhostBroadcastPrefs(storage);

    expect(prefs.enabled).toBe(true);
    expect(prefs.lastUpdated).toBe('');
  });

  it('writeGhostBroadcastPrefs is a no-op when storage is null', () => {
    storage = new MemoryStorage();
    expect(() => writeGhostBroadcastPrefs(null, { enabled: false, lastUpdated: '' })).not.toThrow();
    // Storage instance unaffected because we never passed it.
    expect(storage.getItem(GHOST_BROADCAST_PREFS_STORAGE_KEY)).toBeNull();
  });

  it('uses the versioned storage key so a future shape change can migrate', () => {
    expect(GHOST_BROADCAST_PREFS_STORAGE_KEY).toBe('mfd.broadcast.ghost.v1');
  });
});
