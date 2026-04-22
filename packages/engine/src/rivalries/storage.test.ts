import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadRivalries, saveRivalries } from './storage';
import type { RivalryPayload } from './types';

const STORAGE_KEY = 'mfd.rivalries.v1';

class MemoryStorage {
  private readonly backing = new Map<string, string>();

  getItem(key: string): string | null {
    return this.backing.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.backing.set(key, value);
  }
}

function samplePayload(): RivalryPayload {
  return {
    schemaVersion: 1,
    generatedAt: 0,
    teams: {
      afce2: [{
        opponentId: 'afce1',
        intensity: 40,
        dramaTags: [],
        lastMatchup: {
          season: 2026,
          week: 1,
          result: 'loss',
          margin: -7,
        },
        headToHeadRecent: {
          wins: 0,
          losses: 1,
          ties: 0,
        },
      }],
      afce1: [{
        opponentId: 'nfce1',
        intensity: 10,
        dramaTags: [],
        lastMatchup: null,
        headToHeadRecent: {
          wins: 0,
          losses: 0,
          ties: 0,
        },
      }, {
        opponentId: 'afce2',
        intensity: 40,
        dramaTags: ['last-second'],
        lastMatchup: {
          season: 2026,
          week: 1,
          result: 'win',
          margin: 7,
        },
        headToHeadRecent: {
          wins: 1,
          losses: 0,
          ties: 0,
        },
      }],
    },
  };
}

describe('rivalries storage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns an empty payload when storage is empty', () => {
    expect(loadRivalries()).toEqual({
      schemaVersion: 1,
      generatedAt: 0,
      teams: {},
    });
  });

  it('round-trips a payload and stamps generatedAt at the storage boundary', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_717_171_717);

    const saved = saveRivalries(samplePayload());
    const loaded = loadRivalries();

    expect(saved.generatedAt).toBe(1_717_171_717);
    expect(loaded).toEqual(saved);
    expect(Object.keys(loaded.teams)).toEqual(['afce1', 'afce2']);
    expect(loaded.teams.afce1?.map((record) => record.opponentId)).toEqual(['afce2', 'nfce1']);
  });

  it('rejects payloads with the wrong schema version', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      schemaVersion: 99,
      generatedAt: 123,
      teams: {},
    }));

    expect(loadRivalries()).toEqual({
      schemaVersion: 1,
      generatedAt: 0,
      teams: {},
    });
  });

  it('rejects corrupted json without throwing', () => {
    localStorage.setItem(STORAGE_KEY, '{broken-json');

    expect(loadRivalries()).toEqual({
      schemaVersion: 1,
      generatedAt: 0,
      teams: {},
    });
  });

  it('returns the stamped payload even when localStorage is unavailable', () => {
    vi.unstubAllGlobals();
    vi.spyOn(Date, 'now').mockReturnValue(9_999);

    expect(saveRivalries(samplePayload())).toMatchObject({
      schemaVersion: 1,
      generatedAt: 9_999,
    });
  });
});
