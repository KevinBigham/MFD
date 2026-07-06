import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  WATCH_LIST_CHANGE_EVENT,
  WATCH_LIST_STORAGE_KEY,
  addToWatchList,
  createDefaultWatchListPrefs,
  getWatchList,
  isOnWatchList,
  removeFromWatchList,
  subscribeWatchList,
  writeWatchList,
} from './watchListPrefs';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const fixedDate = () => new Date('2026-04-30T12:00:00.000Z');

describe('watchListPrefs', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function installWindow(storage = new MemoryStorage()) {
    const windowTarget = new EventTarget() as EventTarget & { localStorage: Storage };
    windowTarget.localStorage = storage;
    vi.stubGlobal('window', windowTarget);
    return { storage, windowTarget };
  }

  function dispatchStorageEvent(windowTarget: EventTarget, key: string): void {
    const event = new Event('storage') as StorageEvent;
    Object.defineProperty(event, 'key', { value: key });
    windowTarget.dispatchEvent(event);
  }

  it('round-trips ids through the versioned storage key', () => {
    const storage = new MemoryStorage();

    writeWatchList({ playerIds: ['p1', 'p2'], updatedAt: fixedDate().toISOString() }, storage);

    expect(storage.getItem(WATCH_LIST_STORAGE_KEY)).toContain('p1');
    expect(getWatchList(storage)).toEqual({
      playerIds: ['p1', 'p2'],
      updatedAt: '2026-04-30T12:00:00.000Z',
    });
  });

  it('falls back to empty prefs for malformed JSON', () => {
    const storage = new MemoryStorage();
    storage.setItem(WATCH_LIST_STORAGE_KEY, '{nope');

    expect(getWatchList(storage)).toEqual(createDefaultWatchListPrefs());
  });

  it('falls back to empty prefs for malformed payload shape', () => {
    const storage = new MemoryStorage();
    storage.setItem(WATCH_LIST_STORAGE_KEY, JSON.stringify({
      playerIds: ['p1', 42],
      updatedAt: fixedDate().toISOString(),
    }));

    expect(getWatchList(storage)).toEqual(createDefaultWatchListPrefs());
  });

  it('normalizes duplicate and blank ids without changing kept id order', () => {
    const storage = new MemoryStorage();

    writeWatchList({ playerIds: ['p2', '', 'p1', 'p2', '   ', 'p3'], updatedAt: 'stamp-1' }, storage);

    expect(getWatchList(storage)).toEqual({
      playerIds: ['p2', 'p1', 'p3'],
      updatedAt: 'stamp-1',
    });
  });

  it('adds ids idempotently', () => {
    const storage = new MemoryStorage();

    addToWatchList('p1', storage, fixedDate);
    addToWatchList('p1', storage, () => new Date('2026-05-01T12:00:00.000Z'));

    expect(getWatchList(storage)).toEqual({
      playerIds: ['p1'],
      updatedAt: '2026-04-30T12:00:00.000Z',
    });
  });

  it('removes ids and no-ops when absent', () => {
    const storage = new MemoryStorage();
    writeWatchList({ playerIds: ['p1', 'p2'], updatedAt: 'stamp-1' }, storage);

    removeFromWatchList('p1', storage, fixedDate);
    removeFromWatchList('missing', storage, () => new Date('2026-05-01T12:00:00.000Z'));

    expect(getWatchList(storage)).toEqual({
      playerIds: ['p2'],
      updatedAt: '2026-04-30T12:00:00.000Z',
    });
  });

  it('preserves insertion ordering', () => {
    const storage = new MemoryStorage();

    addToWatchList('p3', storage, fixedDate);
    addToWatchList('p1', storage, fixedDate);
    addToWatchList('p2', storage, fixedDate);

    expect(getWatchList(storage).playerIds).toEqual(['p3', 'p1', 'p2']);
  });

  it('is SSR-safe when storage is unavailable', () => {
    expect(getWatchList(null)).toEqual(createDefaultWatchListPrefs());
    expect(addToWatchList('p1', null, fixedDate)).toEqual({
      playerIds: ['p1'],
      updatedAt: '2026-04-30T12:00:00.000Z',
    });
    expect(isOnWatchList('p1', null)).toBe(false);
  });

  it('emits a local watch-list change event when writing in the current tab', () => {
    const { storage, windowTarget } = installWindow();
    const listener = vi.fn();

    windowTarget.addEventListener(WATCH_LIST_CHANGE_EVENT, listener);
    writeWatchList({ playerIds: ['p1'], updatedAt: 'stamp-1' }, storage);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('subscribes to local and matching cross-tab watch-list changes', () => {
    const { storage, windowTarget } = installWindow();
    const listener = vi.fn();
    const unsubscribe = subscribeWatchList(listener);

    writeWatchList({ playerIds: ['p1'], updatedAt: 'stamp-1' }, storage);
    dispatchStorageEvent(windowTarget, 'other-key');
    dispatchStorageEvent(windowTarget, WATCH_LIST_STORAGE_KEY);

    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    writeWatchList({ playerIds: ['p2'], updatedAt: 'stamp-2' }, storage);
    dispatchStorageEvent(windowTarget, WATCH_LIST_STORAGE_KEY);

    expect(listener).toHaveBeenCalledTimes(2);
  });
});
