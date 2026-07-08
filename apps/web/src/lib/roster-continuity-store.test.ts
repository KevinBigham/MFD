import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearRosterContinuityForDynasty,
  readDynastyStarters,
  readRosterContinuity,
  upsertDynastyStarters,
} from './roster-continuity-store';

const STORAGE_KEY = 'mfd.rosterContinuity.v1';

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

describe('roster-continuity-store', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns an empty payload when storage is empty', () => {
    const payload = readRosterContinuity();
    expect(payload.schemaVersion).toBe(1);
    expect(payload.byDynastyId).toEqual({});
  });

  it('persists a dynasty starter snapshot and reads it back', () => {
    upsertDynastyStarters('dynasty-a', 2026, ['qb-1', 'rb-1', 'wr-1']);

    expect(readDynastyStarters('dynasty-a')).toEqual({
      lastSyncedYear: 2026,
      starterIds: ['qb-1', 'rb-1', 'wr-1'],
    });
  });

  it('replaces an existing dynasty snapshot on upsert', () => {
    upsertDynastyStarters('dynasty-a', 2026, ['qb-1', 'rb-1']);
    upsertDynastyStarters('dynasty-a', 2027, ['qb-2']);

    expect(readDynastyStarters('dynasty-a')).toEqual({
      lastSyncedYear: 2027,
      starterIds: ['qb-2'],
    });
  });

  it('clears one dynasty without affecting others', () => {
    upsertDynastyStarters('dynasty-a', 2026, ['qb-1']);
    upsertDynastyStarters('dynasty-b', 2027, ['qb-9']);

    clearRosterContinuityForDynasty('dynasty-a');

    expect(readDynastyStarters('dynasty-a')).toBeNull();
    expect(readDynastyStarters('dynasty-b')).toEqual({
      lastSyncedYear: 2027,
      starterIds: ['qb-9'],
    });
  });

  it('falls back to the default payload on malformed json', () => {
    localStorage.setItem(STORAGE_KEY, '{bad-json');

    expect(readRosterContinuity()).toEqual({
      schemaVersion: 1,
      byDynastyId: {},
    });
  });

  it('falls back to the default payload on wrong schema version', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      schemaVersion: 99,
      byDynastyId: {},
    }));

    expect(readRosterContinuity()).toEqual({
      schemaVersion: 1,
      byDynastyId: {},
    });
  });

  it('treats clearing a missing dynasty as a no-op', () => {
    upsertDynastyStarters('dynasty-a', 2026, ['qb-1']);

    clearRosterContinuityForDynasty('missing-dynasty');

    expect(readDynastyStarters('dynasty-a')).toEqual({
      lastSyncedYear: 2026,
      starterIds: ['qb-1'],
    });
  });

  it('returns null when reading an unknown dynasty id', () => {
    expect(readDynastyStarters('unknown')).toBeNull();
  });

  it('falls back to the default payload when global localStorage is not Storage-like', () => {
    vi.stubGlobal('localStorage', {} as Storage);

    expect(readRosterContinuity()).toEqual({
      schemaVersion: 1,
      byDynastyId: {},
    });
  });
});
