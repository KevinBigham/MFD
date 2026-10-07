import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCartridge, type GameState } from '@mfd/engine';
import { autosaveDynasty, loadImportedCartridge, loadSaveSlot } from '../app/store/persistence';
import { exportDynastyCombinedBackupJson, parseDynastyCombinedBackupJson } from './dynasty-combined-backup';
import { summarizeDynastySidecarArchive } from './dynasty-sidecar-archive';
import type { SaveSlot } from './db';
import {
  createPopulatedDurableState,
  durableFeatureState,
} from '../../../../packages/engine/src/save/durable-feature-state.test-helpers';
import type { DynastySidecarArchivePayload } from './dynasty-sidecar-archive';
import {
  COMBINED_IMPORT_COMPLETE_KEY,
  COMBINED_IMPORT_JOURNAL_KEY,
  importCombinedBackupAtomically,
  recoverIncompleteCombinedImport,
} from './combined-import-journal';

const dbMock = vi.hoisted(() => ({
  deleteSave: vi.fn(), getLatestAutosave: vi.fn(), listSaves: vi.fn(),
  listSaveSummaries: vi.fn(), loadGame: vi.fn(), saveGame: vi.fn(), trimAutosaves: vi.fn(),
}));
vi.mock('./db', () => dbMock);
beforeEach(() => { for (const mock of Object.values(dbMock)) mock.mockReset(); });

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

describe('combined import durable-game transaction', () => {
  function stage(game: GameState) {
    const built = buildCartridge(game);
    if (!built.ok) throw new Error(built.error);
    const parsed = parseDynastyCombinedBackupJson(exportDynastyCombinedBackupJson(built.json, payload('new')));
    if (!parsed.ok) throw new Error(parsed.reason);
    // Match the UI staging boundary before any journal/save/sidecar mutation.
    return { loaded: loadImportedCartridge(parsed.cartridgeText), sidecars: parsed.sidecarPayload };
  }

  it('persists the validated staged game and reloads all durable fields before committing sidecars', async () => {
    const game = createPopulatedDurableState();
    game.version = 37;
    const { loaded, sidecars } = stage(game);
    const storage = memoryStorage();
    let saved: SaveSlot | undefined;
    dbMock.saveGame.mockImplementation(async (slot: Omit<SaveSlot, 'id'>) => {
      saved = { ...slot, id: 91 };
      return 91;
    });
    dbMock.loadGame.mockImplementation(async () => saved);
    const persistGame = vi.fn(async (candidate: GameState) => {
      expect(durableFeatureState(candidate)).toEqual(durableFeatureState(game));
      const id = await autosaveDynasty(candidate);
      expect(durableFeatureState((await loadSaveSlot(id))!)).toEqual(durableFeatureState(game));
      return id;
    });
    const applySidecars = vi.fn((candidate: DynastySidecarArchivePayload) => ({
      ok: true as const, payload: candidate, summary: summarizeDynastySidecarArchive(candidate),
    }));
    const restoreSidecars = vi.fn();
    const result = await importCombinedBackupAtomically(loaded, sidecars, { storage, persistGame, applySidecars, restoreSidecars });

    expect(result.ok).toBe(true);
    expect(persistGame).toHaveBeenCalledOnce();
    expect(applySidecars).toHaveBeenCalledWith(sidecars);
    expect(restoreSidecars).not.toHaveBeenCalled();
    expect(dbMock.deleteSave).not.toHaveBeenCalled();
    expect(storage.getItem(COMBINED_IMPORT_COMPLETE_KEY)).not.toBeNull();
    expect(await recoverIncompleteCombinedImport({ storage, restoreSidecars })).toBe('committed');
    expect(durableFeatureState((await loadSaveSlot(91))!)).toEqual(durableFeatureState(game));
  });

  it.each(['persistence', 'sidecars'])('rolls back when %s fails without keeping a partial imported save', async (failure) => {
    const { loaded, sidecars } = stage(createPopulatedDurableState());
    const storage = memoryStorage();
    const restored: DynastySidecarArchivePayload[] = [];
    const deleted: number[] = [];
    const previous = { id: 7, data: 'previous raw cartridge' };
    const slots = new Map<number, { id: number; data: string }>([[7, previous]]);
    dbMock.saveGame.mockImplementation(async (slot: Omit<SaveSlot, 'id'>) => {
      if (failure === 'persistence') throw new Error('Storage refused import');
      slots.set(91, { id: 91, data: slot.data });
      return 91;
    });
    const applySidecars = vi.fn(() => ({ ok: false as const, reason: 'Sidecars refused import' }));
    await expect(importCombinedBackupAtomically(loaded, sidecars, {
      storage,
      persistGame: autosaveDynasty,
      applySidecars,
      restoreSidecars: (value) => { restored.push(value); },
      deleteSaveSlot: async (id) => { deleted.push(id); slots.delete(id); },
    })).rejects.toThrow(failure === 'persistence' ? 'Storage refused import' : 'Sidecars refused import');

    expect(restored).toHaveLength(1);
    expect(deleted).toEqual(failure === 'sidecars' ? [91] : []);
    expect(slots.get(7)).toBe(previous);
    expect(slots.has(91)).toBe(false);
    expect(storage.getItem(COMBINED_IMPORT_JOURNAL_KEY)).toBeNull();
    expect(storage.getItem(COMBINED_IMPORT_COMPLETE_KEY)).toBeNull();
    expect(applySidecars).toHaveBeenCalledTimes(failure === 'sidecars' ? 1 : 0);
  });

  it('rejects invalid staged mentor state before the import journal or save is written', () => {
    const game = createPopulatedDurableState();
    delete game.mentorBudget;
    expect(() => stage(game)).toThrow(/mentorBudget.*required/);
    expect(dbMock.saveGame).not.toHaveBeenCalled();
    expect(dbMock.deleteSave).not.toHaveBeenCalled();
  });
});
