import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCartridge, SAVE_VERSION } from '@mfd/engine';
import { createSeedGameState } from './seed';
import type { SaveSlot, SaveSlotSummary } from '../../lib/db';
import {
  loadImportedCartridge, loadImportedCartridgeFile, loadLatestAutosaveGame,
  loadSaveSlot, listSaveSlotSummaries, listSaveSlots, autosaveDynasty,
} from './persistence';

const dbMock = vi.hoisted(() => ({
  deleteSave: vi.fn(), getLatestAutosave: vi.fn(), listSaves: vi.fn(),
  listSaveSummaries: vi.fn(), loadGame: vi.fn(), saveGame: vi.fn(), trimAutosaves: vi.fn(),
}));
vi.mock('../../lib/db', () => dbMock);

beforeEach(() => {
  for (const mock of Object.values(dbMock)) mock.mockReset();
});

describe('persistence import helpers', () => {
  it('round-trips a current dynasty cartridge through text import', () => {
    const game = createSeedGameState(42, 0, 'pro');
    const built = buildCartridge(game, { teamName: 'Chicago Test', season: game.year, week: game.week });

    if (!built.ok) throw new Error(built.error);
    const loaded = loadImportedCartridge(built.json);

    expect(loaded.seed).toBe(game.seed);
    expect(loaded.version).toBe(game.version);
    expect(loaded.lastPortableExportYear).toBeNull();
  });

  it('defaults hall of fame ballot state on cartridge import when older payloads omit it', () => {
    const game = createSeedGameState(44, 0, 'pro') as ReturnType<typeof createSeedGameState> & {
      ballotWaitlist?: unknown;
      ballotEliminatedIds?: unknown;
    };
    delete game.ballotWaitlist;
    delete game.ballotEliminatedIds;
    const built = buildCartridge(game, { teamName: 'Ballot Import', season: game.year, week: game.week });

    if (!built.ok) throw new Error(built.error);
    const loaded = loadImportedCartridge(built.json);

    expect(loaded.ballotWaitlist).toEqual([]);
    expect(loaded.ballotEliminatedIds).toEqual([]);
  });

  it('loads a dynasty cartridge from a file-like object', async () => {
    const game = createSeedGameState(7, 1, 'legend');
    const built = buildCartridge(game, { teamName: 'File Test', season: game.year, week: game.week });

    if (!built.ok) throw new Error(built.error);
    const loaded = await loadImportedCartridgeFile({
      text: async () => built.json,
    });

    expect(loaded.seed).toBe(game.seed);
    expect(loaded.difficulty).toBe('legend');
  });

  it('rejects invalid cartridge text', () => {
    expect(() => loadImportedCartridge('not-json')).toThrow(/Could not decode cartridge/i);
  });

  it('migrates legacy manual-save metadata into the portable export year on import', () => {
    const game = createSeedGameState(19, 0, 'pro') as typeof createSeedGameState extends (...args: any[]) => infer T ? T : never;
    (game as typeof game & { version: number; lastManualSaveYear?: number }).version = 33;
    (game as typeof game & { version: number; lastManualSaveYear?: number }).lastManualSaveYear = 8;
    const built = buildCartridge(game, { teamName: 'Legacy Import', season: game.year, week: game.week });

    if (!built.ok) throw new Error(built.error);
    const loaded = loadImportedCartridge(built.json);

    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.lastPortableExportYear).toBe(8);
  });

  it('preserves current portable export metadata on import', () => {
    const game = createSeedGameState(99, 0, 'allpro') as typeof createSeedGameState extends (...args: any[]) => infer T ? T : never;
    (game as typeof game & { lastPortableExportYear?: number | null }).lastPortableExportYear = 11;
    const built = buildCartridge(game, { teamName: 'Portable Import', season: game.year, week: game.week });

    if (!built.ok) throw new Error(built.error);
    const loaded = loadImportedCartridge(built.json);

    expect(loaded.lastPortableExportYear).toBe(11);
    expect(loaded.version).toBe(game.version);
  });

  it('normalizes legacy CPU GM strategy values on current-version cartridge import', () => {
    const game = createSeedGameState(123, 0, 'pro');
    const cpuTeam = Object.values(game.teams).find((team) => !team.isUser);
    if (!cpuTeam) throw new Error('Expected a CPU team in seed game');
    cpuTeam.gmStrategy = 'buy' as typeof cpuTeam.gmStrategy;
    const built = buildCartridge(game, { teamName: 'Legacy CPU Import', season: game.year, week: game.week });

    if (!built.ok) throw new Error(built.error);
    const loaded = loadImportedCartridge(built.json);

    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.teams[cpuTeam.id]?.gmStrategy).toBe('contend');
  });
});


/** Real cartridge normalization with mocked storage boundaries; not native IDB proof. */
describe('persistence save-slot read boundaries', () => {
  function currentSlot(id = 7): SaveSlot {
    const game = createSeedGameState(42, 0, 'pro');
    const built = buildCartridge(game);
    if (!built.ok) throw new Error(built.error);
    return { id, name: 'Snapshot', data: built.json, timestamp: 100, year: game.year,
      week: game.week, teamName: 'Test', difficulty: game.difficulty, isAutosave: true, version: game.version };
  }

  it('delegates summary listing without requesting full saves', async () => {
    const rows: SaveSlotSummary[] = [{ id: 1, name: 'Summary', timestamp: 100,
      year: 2026, week: 1, teamName: 'Test', difficulty: 'pro', isAutosave: true, version: SAVE_VERSION }];
    dbMock.listSaveSummaries.mockResolvedValueOnce(rows);
    expect(await listSaveSlotSummaries()).toBe(rows);
    expect(dbMock.listSaveSummaries).toHaveBeenCalledOnce();
    expect(dbMock.listSaves).not.toHaveBeenCalled();
    expect(dbMock.loadGame).not.toHaveBeenCalled();
    expect(rows.every((row) => !('data' in row))).toBe(true);
  });

  it('preserves the old full-save listing API for other callers', async () => {
    const rows = [currentSlot()];
    dbMock.listSaves.mockResolvedValueOnce(rows);
    expect(await listSaveSlots()).toBe(rows);
    expect(dbMock.listSaveSummaries).not.toHaveBeenCalled();
  });

  it('decodes the selected autosave once without a second ID lookup', async () => {
    const selected = currentSlot();
    const json = selected.data;
    let payloadReads = 0;
    Object.defineProperty(selected, 'data', { get: () => {
      payloadReads += 1;
      return json;
    } });
    dbMock.getLatestAutosave.mockResolvedValueOnce(selected);
    dbMock.loadGame.mockRejectedValue(new Error('Unexpected duplicate read'));
    const loaded = await loadLatestAutosaveGame();
    expect(loaded?.seed).toBe(42);
    expect(loaded?.version).toBe(SAVE_VERSION);
    expect(payloadReads).toBe(1);
    expect(dbMock.getLatestAutosave).toHaveBeenCalledOnce();
    expect(dbMock.loadGame).not.toHaveBeenCalled();
  });

  it('loads the selected snapshot even if the underlying slot disappears after selection', async () => {
    const selected = currentSlot();
    dbMock.getLatestAutosave.mockResolvedValueOnce(selected).mockResolvedValueOnce(undefined);
    dbMock.loadGame.mockResolvedValue(undefined);
    expect((await loadLatestAutosaveGame())?.seed).toBe(42);
    expect(dbMock.loadGame).not.toHaveBeenCalled();
    expect(await loadLatestAutosaveGame()).toBeNull();
  });

  it('returns null for no autosave or an unusable selected ID', async () => {
    dbMock.getLatestAutosave.mockResolvedValueOnce(undefined);
    expect(await loadLatestAutosaveGame()).toBeNull();
    dbMock.getLatestAutosave.mockResolvedValueOnce({ ...currentSlot(), id: undefined });
    expect(await loadLatestAutosaveGame()).toBeNull();
    expect(dbMock.loadGame).not.toHaveBeenCalled();
  });

  it('rejects a corrupt newest autosave without falling back to an older dynasty', async () => {
    dbMock.getLatestAutosave.mockResolvedValueOnce({ ...currentSlot(), data: 'not-json' });
    dbMock.loadGame.mockResolvedValue(currentSlot(1));
    await expect(loadLatestAutosaveGame()).rejects.toThrow(/Could not decode cartridge/i);
    expect(dbMock.getLatestAutosave).toHaveBeenCalledOnce();
    expect(dbMock.loadGame).not.toHaveBeenCalled();
    expect(dbMock.listSaves).not.toHaveBeenCalled();
  });

  it('keeps schema validation on the selected autosave path', async () => {
    const selected = currentSlot();
    const envelope = JSON.parse(selected.data);
    envelope.save.seed = 'not-a-number';
    dbMock.getLatestAutosave.mockResolvedValueOnce({ ...selected, data: JSON.stringify(envelope) });
    await expect(loadLatestAutosaveGame()).rejects.toThrow();
    expect(dbMock.loadGame).not.toHaveBeenCalled();
  });

  it('preserves ID-driven load, missing-slot and corrupt-slot handling', async () => {
    const selected = currentSlot();
    dbMock.loadGame.mockResolvedValueOnce(selected).mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ ...selected, data: 'not-json' });
    expect((await loadSaveSlot(7))?.seed).toBe(42);
    expect(await loadSaveSlot(8)).toBeNull();
    await expect(loadSaveSlot(9)).rejects.toThrow(/Could not decode cartridge/i);
    expect(dbMock.loadGame.mock.calls).toEqual([[7], [8], [9]]);
    expect(dbMock.getLatestAutosave).not.toHaveBeenCalled();
  });

  it('propagates storage-read failures', async () => {
    const error = new Error('IDB unavailable');
    dbMock.getLatestAutosave.mockRejectedValueOnce(error);
    dbMock.loadGame.mockRejectedValueOnce(error);
    dbMock.listSaveSummaries.mockRejectedValueOnce(error);
    await expect(loadLatestAutosaveGame()).rejects.toBe(error);
    await expect(loadSaveSlot(7)).rejects.toBe(error);
    await expect(listSaveSlotSummaries()).rejects.toBe(error);
  });

  it('preserves autosave write-before-trim ordering and the default retention call', async () => {
    const calls: string[] = [];
    dbMock.saveGame.mockImplementation(async () => { calls.push('save'); return 8; });
    dbMock.trimAutosaves.mockImplementation(async () => { calls.push('trim'); });
    expect(await autosaveDynasty(createSeedGameState(42, 0, 'pro'))).toBe(8);
    expect(calls).toEqual(['save', 'trim']);
    expect(dbMock.trimAutosaves).toHaveBeenCalledWith();
  });
});
