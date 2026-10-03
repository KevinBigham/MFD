import {
  emptyPlayerStats,
  ensureAgentsInitialized,
  SAVE_VERSION,
  SaveStateSchema,
  buildCartridge,
  migrate,
  parseCartridge,
  type GameState,
  type Player,
} from '@mfd/engine';
import {
  deleteSave,
  getLatestAutosave,
  listSaves,
  listSaveSummaries,
  loadGame,
  saveGame,
  trimAutosaves,
  type SaveSlot,
  type SaveSlotSummary,
} from '../../lib/db';

function getUserTeam(game: GameState) {
  return Object.values(game.teams).find((team) => team.isUser) ?? null;
}

/**
 * The save schema validates the global `players` map with a player schema that has no
 * current-season `stats` block and no full `name` (and drops other derived fields), but
 * every team roster keeps the complete player. Screens such as Analytics and Stat Central
 * read those fields straight from the map, so a freshly loaded dynasty crashed them.
 *
 * Mirror the engine's own `syncPlayers`: point each map entry at its roster player (which
 * restores every field with its real value), then give players on no roster an empty stats
 * block and a name built from first and last name.
 */
function restoreTransientPlayerFields(game: GameState): void {
  const fill = (player: Player) => {
    player.stats = { ...emptyPlayerStats(), ...(player.stats ?? {}) };
    if (!player.name) player.name = `${player.firstName} ${player.lastName}`.trim();
  };
  for (const team of Object.values(game.teams)) {
    for (const player of team.roster) {
      fill(player);
      game.players[player.id] = player;
    }
  }
  for (const player of Object.values(game.players)) fill(player);
}

function normalizeImportedGame(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Save data is missing.');
  }

  const migrated = migrate(raw as Record<string, unknown>, SAVE_VERSION);
  const result = SaveStateSchema.safeParse(migrated);
  if (!result.success) {
    const issueSummary = result.error.issues
      .slice(0, 6)
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Save data failed schema validation.${issueSummary ? ` ${issueSummary}` : ''}`);
  }

  const game = result.data as unknown as GameState;
  ensureAgentsInitialized(game);
  restoreTransientPlayerFields(game);
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

export async function listSaveSlotSummaries(): Promise<SaveSlotSummary[]> {
  return listSaveSummaries();
}

export async function deleteSaveSlot(id: number): Promise<void> {
  await deleteSave(id);
}

function decodeSaveSlot(slot: SaveSlot): GameState {
  const parsed = parseCartridge(slot.data);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }

  return normalizeImportedGame(parsed.save);
}

export async function loadSaveSlot(id: number): Promise<GameState | null> {
  const slot = await loadGame(id);
  if (!slot) return null;
  return decodeSaveSlot(slot);
}

export async function loadLatestAutosaveGame(): Promise<GameState | null> {
  const slot = await getLatestAutosave();
  if (!slot?.id) return null;
  // Decode the snapshot selected by the cursor. A concurrent deletion does not
  // force a second payload read or silently switch to a different dynasty.
  return decodeSaveSlot(slot);
}

export function loadImportedCartridge(text: string): GameState {
  const parsed = parseCartridge(text);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  return normalizeImportedGame(parsed.save);
}

export interface PortableBackupFile {
  text: () => Promise<string>;
}

export async function loadImportedCartridgeFile(file: PortableBackupFile): Promise<GameState> {
  return loadImportedCartridge(await file.text());
}
