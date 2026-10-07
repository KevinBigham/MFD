import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PHASE_ORDER,
  SAVE_VERSION,
  advanceDraft,
  advanceSetupPhase,
  applySetupDecision,
  buildCartridge,
  calculateMentorEffects,
  createFastLaneSetupState,
  fireMentor,
  getDynastyEraHistory,
  hireMentor,
  parseCartridge,
  type GameState,
} from '@mfd/engine';
import { createSeedGameState } from './seed';
import {
  createPopulatedDurableState,
  durableFeatureState,
} from '../../../../../packages/engine/src/save/durable-feature-state.test-helpers';
import v10Fixture from '../../../../../packages/engine/src/save/fixtures/v10.json';
import v20Fixture from '../../../../../packages/engine/src/save/fixtures/v20.json';
import type { SaveSlot, SaveSlotSummary } from '../../lib/db';
import {
  loadImportedCartridge, loadImportedCartridgeFile, loadLatestAutosaveGame,
  loadSaveSlot, listSaveSlotSummaries, listSaveSlots, autosaveDynasty, saveDynastyToSlot,
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
  it('preserves populated durable feature state through the real cartridge loader', () => {
    const game = createPopulatedDurableState(createSeedGameState(42, 0, 'pro'));
    const built = buildCartridge(game);
    if (!built.ok) throw new Error(built.error);

    expect(game.activeMentors).toHaveLength(1);
    expect(game.mentorBudget).toBe(2);
    expect(game.userDynastyEras).toHaveLength(2);
    expect(game.trainingCampResults?.[0]?.headlines.length).toBeGreaterThan(0);
    expect(game.pendingPassedPickTargets).toHaveLength(1);
    expect(game.setupState?.completedPhases).toContain('blueprint');
    expect(game.franchiseBlueprint).toBeDefined();

    const loaded = loadImportedCartridge(built.json);
    expect(durableFeatureState(loaded)).toEqual(durableFeatureState(game));
  });

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


describe('persistence loaded-player fields', () => {
  function loadWith(mutate?: (game: ReturnType<typeof createSeedGameState>) => void) {
    const game = createSeedGameState(42, 0, 'pro');
    mutate?.(game);
    const built = buildCartridge(game);
    if (!built.ok) throw new Error(built.error);
    return { game, loaded: loadImportedCartridge(built.json) };
  }

  it('gives every loaded player a name and a stats block (the schema does not persist them on the players map)', () => {
    const { loaded } = loadWith();

    const mapPlayers = Object.values(loaded.players);
    expect(mapPlayers.length).toBeGreaterThan(0);
    for (const player of mapPlayers) {
      expect(player.name).toBe(`${player.firstName} ${player.lastName}`.trim());
      expect(player.stats).toBeDefined();
      expect(player.stats.passYds).toBe(0);
      expect(player.stats.gamesPlayed).toBe(0);
    }
    for (const team of Object.values(loaded.teams)) {
      for (const player of team.roster) {
        expect(player.name.length).toBeGreaterThan(0);
        expect(player.stats.rushYds).toBe(0);
      }
    }
  });

  it('restores a rostered player real stats from the roster copy instead of zeroing them', () => {
    let targetId = '';
    const { loaded } = loadWith((game) => {
      const roster = Object.values(game.teams).find((team) => team.isUser)!.roster;
      const target = roster.find((player) => player.pos === 'QB') ?? roster[0]!;
      targetId = target.id;
      target.stats = { ...target.stats, passYds: 1234, gamesPlayed: 9 };
    });

    const rostered = Object.values(loaded.teams).flatMap((team) => team.roster).find((player) => player.id === targetId)!;
    expect(rostered.stats.passYds).toBe(1234);
    expect(loaded.players[targetId]).toBe(rostered);
    expect(loaded.players[targetId]!.stats.gamesPlayed).toBe(9);
  });

  it('fills a player who is on no roster with zeros and a derived name', () => {
    let orphanId = '';
    const { loaded } = loadWith((game) => {
      const clone = structuredClone(Object.values(game.players)[0]!);
      orphanId = 'orphan-player-for-test';
      clone.id = orphanId;
      clone.teamId = null;
      clone.firstName = 'Test';
      clone.lastName = 'Orphan';
      game.players[orphanId] = clone;
    });

    expect(loaded.players[orphanId]!.name).toBe('Test Orphan');
    expect(loaded.players[orphanId]!.stats.passYds).toBe(0);
  });
});

function cartridgeText(game: GameState): string {
  const built = buildCartridge(game);
  if (!built.ok) throw new Error(built.error);
  return built.json;
}

/** Real slot serialization and normalization; storage itself remains a DB seam. */
function captureSaveSlots(): SaveSlot[] {
  const slots: SaveSlot[] = [];
  dbMock.saveGame.mockImplementation(async (payload: Omit<SaveSlot, 'id'>) => {
    const id = slots.length + 1;
    slots.push({ ...payload, id });
    return id;
  });
  dbMock.loadGame.mockImplementation(async (id: number) => slots.find((slot) => slot.id === id));
  dbMock.getLatestAutosave.mockImplementation(async () => [...slots].reverse().find((slot) => slot.isAutosave));
  dbMock.trimAutosaves.mockResolvedValue(undefined);
  return slots;
}

describe('durable feature persistence paths and continuity', () => {
  it.each([['v10', v10Fixture], ['v20', v20Fixture]])('loads historical %s through the real importer after safe record defaults', (_label, fixture) => {
    const built = buildCartridge(structuredClone(fixture));
    if (!built.ok) throw new Error(built.error);
    const loaded = loadImportedCartridge(built.json);
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.mentorBudget).toBe(2.5);
    expect(loaded.activeMentors).toEqual([]);
    expect(loaded.records.franchise).toBeDefined();
    expect(loaded.setupState).toBeUndefined();
    expect(loaded.franchiseBlueprint).toBeUndefined();
  });

  it.each([37, 38])('retains populated v%i state through file import, manual slots and autosave reload', async (version) => {
    const game = createPopulatedDurableState();
    game.version = version;
    const expected = durableFeatureState(game);
    const fromFile = await loadImportedCartridgeFile({ text: async () => cartridgeText(game) });
    expect(durableFeatureState(fromFile)).toEqual(expected);
    expect(fromFile.version).toBe(SAVE_VERSION);

    const slots = captureSaveSlots();
    const manualId = await saveDynastyToSlot(game, 'Durable manual snapshot');
    const manual = await loadSaveSlot(manualId);
    expect(manual).not.toBeNull();
    expect(durableFeatureState(manual!)).toEqual(expected);
    expect(slots[0]?.isAutosave).toBe(false);
    expect(dbMock.trimAutosaves).not.toHaveBeenCalled();

    await autosaveDynasty(game);
    const autosave = await loadLatestAutosaveGame();
    expect(autosave).not.toBeNull();
    expect(durableFeatureState(autosave!)).toEqual(expected);
    expect(autosave!.version).toBe(SAVE_VERSION);

    // Save the loaded result again, then inspect the real serialized cartridge.
    await saveDynastyToSlot(autosave!, 'After reload');
    const resaved = parseCartridge(slots[2]!.data);
    expect(resaved.ok).toBe(true);
    if (resaved.ok) expect(resaved.save).toMatchObject({ ...expected, version: SAVE_VERSION });
    expect(durableFeatureState((await loadSaveSlot(3))!)).toEqual(expected);
  });

  it('retains mentor effects and spending across reload, repeated hire and firing', () => {
    const game = createPopulatedDurableState();
    const userId = Object.values(game.teams).find((team) => team.isUser)!.id;
    const before = calculateMentorEffects(game.activeMentors!, game.teams[userId]!.roster);
    expect(before.length).toBeGreaterThan(0);
    const loaded = loadImportedCartridge(cartridgeText(game));

    expect(calculateMentorEffects(loaded.activeMentors!, loaded.teams[userId]!.roster)).toEqual(before);
    const rehired = hireMentor(loaded, 'save-legend');
    expect(rehired.activeMentors).toEqual(game.activeMentors);
    expect(rehired.mentorBudget).toBe(2);
    const fired = loadImportedCartridge(cartridgeText(fireMentor(rehired, 'save-legend')));
    expect(fired.activeMentors).toEqual([]);
    expect(fired.mentorBudget).toBe(2);

    loaded.mentorBudget = 0;
    expect(loadImportedCartridge(cartridgeText(loaded)).mentorBudget).toBe(0);
  });

  it('keeps named era history, camp outcomes and finalized setup effects without replaying them', () => {
    const game = createPopulatedDurableState();
    expect(game.trainingCampResults![0]!.battles.length).toBeGreaterThan(0);
    expect(game.activeEffects.length).toBeGreaterThan(0);
    const userId = Object.values(game.teams).find((team) => team.isUser)!.id;
    const outcomes = (state: GameState) => state.teams[userId]!.roster.map((player) => ({
      id: player.id, ovr: player.ovr, morale: player.morale, injury: player.injury,
      contract: player.contract, isStarter: player.isStarter,
    }));
    const loaded = loadImportedCartridge(cartridgeText(game));
    const reloaded = loadImportedCartridge(cartridgeText(loaded));

    expect(getDynastyEraHistory(reloaded)).toEqual(getDynastyEraHistory(game));
    expect(reloaded.teams[userId]?.era).toBe('The Second Window');
    expect(reloaded.trainingCampResults).toEqual(game.trainingCampResults);
    expect(outcomes(reloaded)).toEqual(outcomes(game));
    expect(reloaded.activeEffects).toEqual(game.activeEffects);
    expect(reloaded.ownerMandates).toEqual(game.ownerMandates);
    expect(reloaded.frontOffice).toEqual(game.frontOffice);
    expect(reloaded.setupState).toEqual(game.setupState);
    expect(reloaded.setupState!.completedPhases).toEqual([...PHASE_ORDER]);
    expect(reloaded.franchiseBlueprint).toEqual(game.franchiseBlueprint);
    expect(reloaded.setupState!.blueprint).toEqual(reloaded.franchiseBlueprint);
  });

  it('resumes an incomplete setup at its saved phase, while missing setup stays absent', () => {
    const game = createPopulatedDurableState();
    const userId = Object.values(game.teams).find((team) => team.isUser)!.id;
    delete game.franchiseBlueprint;
    game.setupState = applySetupDecision(createFastLaneSetupState(game, userId), { acknowledged: ['intel_briefing'] });
    const loaded = loadImportedCartridge(cartridgeText(game));
    expect(loaded.setupState).toEqual(game.setupState);
    expect(loaded.setupState!.completedPhases.length).toBeLessThan(PHASE_ORDER.length);
    expect(advanceSetupPhase(loaded.setupState!).currentPhase).toBe('meet_roster');
    expect(loaded.franchiseBlueprint).toBeUndefined();

    delete game.setupState;
    game.version = 37;
    const legacy = loadImportedCartridge(cartridgeText(game));
    expect(legacy.setupState).toBeUndefined();
    expect(legacy.franchiseBlueprint).toBeUndefined();
  });

  it('consumes a saved passed-pick queue once at the next draft action', () => {
    const game = createPopulatedDurableState();
    const loaded = loadImportedCartridge(cartridgeText(game));
    expect(loaded.pendingPassedPickTargets).toEqual(game.pendingPassedPickTargets);
    expect(loaded.nearMissTracker?.passedPicks ?? []).toEqual([]);
    const undraftedId = loaded.pendingPassedPickTargets![0]!.prospectId;
    expect(loaded.draftClass.some((entry) => entry.id === undraftedId)).toBe(true);

    advanceDraft(loaded);
    expect(loaded.pendingPassedPickTargets).toEqual([]);
    expect(loaded.nearMissTracker?.passedPicks).toHaveLength(1);
    expect(loaded.nearMissTracker?.passedPicks[0]?.playerName).toBe('Save passed-qb');
    const reloaded = loadImportedCartridge(cartridgeText(loaded));
    advanceDraft(reloaded);
    expect(reloaded.pendingPassedPickTargets).toEqual([]);
    expect(reloaded.nearMissTracker?.passedPicks).toEqual(loaded.nearMissTracker?.passedPicks);
  });

  it('rejects an inconsistent mentor import without replacing the active game or writing a save', async () => {
    const { useGameStore } = await import('./game-store');
    const previousState = useGameStore.getState();
    const previous = createSeedGameState(7, 0, 'pro');
    const invalid = createPopulatedDurableState();
    invalid.version = 37;
    delete invalid.mentorBudget;
    const input = cartridgeText(invalid);
    const slot: SaveSlot = {
      id: 91, name: 'Inconsistent import', data: input, timestamp: 1, year: invalid.year,
      week: invalid.week, teamName: 'Test', difficulty: invalid.difficulty, isAutosave: true, version: 37,
    };
    dbMock.getLatestAutosave.mockResolvedValue(slot);
    useGameStore.setState({ game: previous, initialized: true });
    try {
      expect(() => loadImportedCartridge(input)).toThrow(/mentorBudget.*required/);
      await expect(loadImportedCartridgeFile({ text: async () => input })).rejects.toThrow(/mentorBudget.*required/);
      await expect(useGameStore.getState().actions.loadLatestAutosave()).rejects.toThrow(/mentorBudget.*required/);
      expect(useGameStore.getState().game).toBe(previous);
      expect(slot.data).toBe(input);
      expect(dbMock.saveGame).not.toHaveBeenCalled();
      expect(dbMock.trimAutosaves).not.toHaveBeenCalled();
      expect(dbMock.deleteSave).not.toHaveBeenCalled();
    } finally {
      useGameStore.setState(previousState);
    }
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
