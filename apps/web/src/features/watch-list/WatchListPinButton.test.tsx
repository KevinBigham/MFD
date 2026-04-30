import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WatchListPinButton, toggleWatchListPin } from './WatchListPinButton';
import { addToWatchList, getWatchList, removeFromWatchList } from './watchListPrefs';

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

const storage = new MemoryStorage();

vi.stubGlobal('window', {
  localStorage: storage,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

describe('WatchListPinButton', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  it('renders an unpinned watch state by default', () => {
    const markup = renderToStaticMarkup(<WatchListPinButton playerId="p1" />);

    expect(markup).toContain('Watch');
    expect(markup).toContain('Add p1 to watch list');
  });

  it('renders a pinned state when the id is stored', () => {
    addToWatchList('p1', storage, () => new Date('2026-04-30T12:00:00.000Z'));

    const markup = renderToStaticMarkup(<WatchListPinButton playerId="p1" />);

    expect(markup).toContain('Pinned');
    expect(markup).toContain('Remove p1 from watch list');
  });

  it('toggle helper adds an unpinned id', () => {
    expect(toggleWatchListPin('p1', false)).toBe(true);

    expect(getWatchList(storage).playerIds).toEqual(['p1']);
  });

  it('toggle helper removes a pinned id', () => {
    addToWatchList('p1', storage, () => new Date('2026-04-30T12:00:00.000Z'));

    expect(toggleWatchListPin('p1', true)).toBe(false);

    expect(getWatchList(storage).playerIds).toEqual([]);
  });

  it('dispatches storage updates through the prefs helpers', () => {
    addToWatchList('p2', storage, () => new Date('2026-04-30T12:00:00.000Z'));
    removeFromWatchList('p2', storage, () => new Date('2026-04-30T12:01:00.000Z'));

    expect(window.dispatchEvent).toHaveBeenCalledTimes(2);
  });
});
