import { describe, expect, it } from 'vitest';
import type { DynastySidecarArchivePayload } from './dynasty-sidecar-archive';
import {
  COMBINED_IMPORT_COMPLETE_KEY,
  COMBINED_IMPORT_JOURNAL_KEY,
  recoverIncompleteCombinedImport,
} from './combined-import-journal';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

function payload(marker: string): DynastySidecarArchivePayload {
  void marker;
  return {
    schemaVersion: 1,
    sidecars: {
      hallOfFame: { schemaVersion: 1, dynastiesById: {} },
      scrapbook: { schemaVersion: 2, entriesByDynastyId: {}, pendingPlayoffLoreByDynastyId: {} },
      rookieOfYear: { schemaVersion: 1, byDynastyId: {} },
      rosterContinuity: { schemaVersion: 1, byDynastyId: {} },
      careerMeta: {
        schemaVersion: 1,
        dynasties: [],
        careerTotals: {
          dynasties: 0,
          seasonsCoached: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          championships: 0,
          playoffAppearances: 0,
          breakoutsDeveloped: 0,
        },
      },
      rivalries: { schemaVersion: 1, generatedAt: 0, teams: {} },
    },
  };
}

describe('combined import journal recovery', () => {
  it('rolls back the old sidecars and deletes the staged save after a mid-import crash', async () => {
    const storage = memoryStorage();
    const previous = payload('old-dynasty');
    const restored: DynastySidecarArchivePayload[] = [];
    const deleted: number[] = [];
    storage.setItem(COMBINED_IMPORT_JOURNAL_KEY, JSON.stringify({
      schemaVersion: 1,
      id: 'crashed-import',
      previousSidecars: previous,
      saveSlotId: 91,
    }));

    const result = await recoverIncompleteCombinedImport({
      storage,
      restoreSidecars: (value) => { restored.push(value); },
      deleteSaveSlot: async (id) => { deleted.push(id); },
    });

    expect(result).toBe('rolled_back');
    expect(restored).toEqual([previous]);
    expect(deleted).toEqual([91]);
    expect(storage.getItem(COMBINED_IMPORT_JOURNAL_KEY)).toBeNull();
  });

  it('does not roll back a transaction whose completion marker was written', async () => {
    const storage = memoryStorage();
    const restored: DynastySidecarArchivePayload[] = [];
    storage.setItem(COMBINED_IMPORT_JOURNAL_KEY, JSON.stringify({
      schemaVersion: 1,
      id: 'complete-import',
      previousSidecars: payload('old-dynasty'),
      saveSlotId: 42,
    }));
    storage.setItem(COMBINED_IMPORT_COMPLETE_KEY, 'complete-import');

    const result = await recoverIncompleteCombinedImport({
      storage,
      restoreSidecars: (value) => { restored.push(value); },
      deleteSaveSlot: async () => { throw new Error('must not delete committed save'); },
    });

    expect(result).toBe('committed');
    expect(restored).toEqual([]);
    expect(storage.getItem(COMBINED_IMPORT_COMPLETE_KEY)).toBeNull();
  });
});
