import {
  ensureAgentsInitialized,
  SAVE_VERSION,
  SaveStateSchema,
  buildCartridge,
  migrate,
  parseCartridge,
  type GameState,
} from '@mfd/engine';
import {
  deleteSave,
  getLatestAutosave,
  listSaves,
  loadGame,
  saveGame,
  trimAutosaves,
  type SaveSlot,
} from '../../lib/db';

function getUserTeam(game: GameState) {
  return Object.values(game.teams).find((team) => team.isUser) ?? null;
}

function normalizeImportedGame(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Save data is missing.');
  }

  const migrated = migrate(raw as Record<string, unknown>, SAVE_VERSION);
  const result = SaveStateSchema.safeParse(migrated);
  if (!result.success) {
    throw new Error('Save data failed schema validation.');
  }

  const game = result.data as unknown as GameState;
  ensureAgentsInitialized(game);
  return game;
}

function buildSlotPayload(game: GameState, isAutosave: boolean, name?: string): Omit<SaveSlot, 'id'> {
  const team = getUserTeam(game);
  const teamName = team ? `${team.city} ${team.name}` : 'Dynasty';
  const cartridge = buildCartridge(game, { teamName, season: game.year, week: game.week });

  if (!cartridge.ok) {
    throw new Error(cartridge.error);
  }

  return {
    name: name ?? `${isAutosave ? 'Autosave' : 'Manual'} S${game.year}W${game.week}`,
    data: cartridge.json,
    timestamp: Date.now(),
    year: game.year,
    week: game.week,
    teamName,
    difficulty: game.difficulty,
    isAutosave,
    version: game.version,
  };
}

export async function autosaveDynasty(game: GameState): Promise<number> {
  const id = await saveGame(buildSlotPayload(game, true));
  await trimAutosaves();
  return id;
}

export async function saveDynastyToSlot(game: GameState, name?: string): Promise<number> {
  return saveGame(buildSlotPayload(game, false, name));
}

export async function listSaveSlots(): Promise<SaveSlot[]> {
  return listSaves();
}

export async function deleteSaveSlot(id: number): Promise<void> {
  await deleteSave(id);
}

export async function loadSaveSlot(id: number): Promise<GameState | null> {
  const slot = await loadGame(id);
  if (!slot) return null;

  const parsed = parseCartridge(slot.data);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }

  return normalizeImportedGame(parsed.save);
}

export async function loadLatestAutosaveGame(): Promise<GameState | null> {
  const slot = await getLatestAutosave();
  if (!slot?.id) return null;
  return loadSaveSlot(slot.id);
}

export function loadImportedCartridge(text: string): GameState {
  const parsed = parseCartridge(text);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  return normalizeImportedGame(parsed.save);
}
