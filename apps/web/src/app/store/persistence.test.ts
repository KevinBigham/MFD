import { describe, expect, it } from 'vitest';
import { buildCartridge, SAVE_VERSION } from '@mfd/engine';
import { createSeedGameState } from './seed';
import { loadImportedCartridge, loadImportedCartridgeFile } from './persistence';

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

  it('rehydrates roster and player-map references on cartridge import', () => {
    const game = createSeedGameState(123, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser);
    const rostered = userTeam?.roster[0];
    if (!userTeam || !rostered) throw new Error('Seed game missing rostered user player.');
    const built = buildCartridge(game, { teamName: 'Identity Test', season: game.year, week: game.week });

    if (!built.ok) throw new Error(built.error);
    const loaded = loadImportedCartridge(built.json);
    const loadedTeam = loaded.teams[userTeam.id];
    const loadedRostered = loadedTeam?.roster.find((player) => player.id === rostered.id);

    expect(loadedRostered).toBeDefined();
    expect(loadedRostered).toBe(loaded.players[rostered.id]);
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
