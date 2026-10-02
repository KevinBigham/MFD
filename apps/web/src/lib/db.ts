/**
 * MFD Dexie Database — IndexedDB Save Slots
 *
 * Replaces fragile localStorage with proper save management.
 * Supports: 8+ save slots, autosaves, crash recovery, backups.
 */

import Dexie, { type EntityTable } from 'dexie';

export interface SaveSlot {
  id?: number;
  name: string;
  data: string;           // Plain cartridge JSON
  timestamp: number;
  year: number;
  week: number;
  teamName: string;
  difficulty: string;
  isAutosave: boolean;
  version: number;
}

/** Save-manager metadata only; never carries the cartridge JSON payload. */
export type SaveSlotSummary = Omit<SaveSlot, 'data'>;

class MfdDatabase extends Dexie {
  saves!: EntityTable<SaveSlot, 'id'>;

  constructor() {
    super('mfd');
    this.version(1).stores({
      saves: '++id, name, timestamp, isAutosave',
    });
  }
}

const db = new MfdDatabase();

/** Save game state to a slot. */
export async function saveGame(slot: Omit<SaveSlot, 'id'>): Promise<number> {
  const id = await db.saves.add(slot as SaveSlot);
  return id as number;
}

/** Load a save by ID. */
export async function loadGame(id: number): Promise<SaveSlot | undefined> {
  return db.saves.get(id);
}

/** List all saves, most recent first. */
export async function listSaves(): Promise<SaveSlot[]> {
  return db.saves.orderBy('timestamp').reverse().toArray();
}

/** List scalar metadata without retaining an array of full cartridge payloads.
 * The cursor still reads each record; this is not an index-only projection. */
export async function listSaveSummaries(): Promise<SaveSlotSummary[]> {
  const summaries: SaveSlotSummary[] = [];
  await db.saves.orderBy('timestamp').reverse().each((slot) => {
    // Explicit projection prevents data (or future payload fields) leaking into UI state.
    summaries.push({
      id: slot.id,
      name: slot.name,
      timestamp: slot.timestamp,
      year: slot.year,
      week: slot.week,
      teamName: slot.teamName,
      difficulty: slot.difficulty,
      isAutosave: slot.isAutosave,
      version: slot.version,
    });
  });
  return summaries;
}

/** Delete a save by ID. */
export async function deleteSave(id: number): Promise<void> {
  return db.saves.delete(id);
}

/** Get the most recent autosave. */
export async function getLatestAutosave(): Promise<SaveSlot | undefined> {
  return db.saves.orderBy('timestamp').reverse()
    .filter((slot) => slot.isAutosave)
    .first();
}

/** Trim autosaves to keep only the N most recent. */
export async function trimAutosaves(keepCount: number = 3): Promise<void> {
  const obsoleteIds: number[] = [];
  let autosaveCount = 0;
  const firstObsoleteIndex = Math.trunc(keepCount);
  await db.saves.orderBy('timestamp').reverse().each((slot) => {
    if (!slot.isAutosave) return;
    if (autosaveCount >= firstObsoleteIndex) obsoleteIds.push(slot.id!);
    autosaveCount += 1;
  });

  if (autosaveCount > keepCount) {
    // Preserve the old Array.slice behavior for unusual negative/fractional counts.
    // The normal nonnegative path retains only obsolete IDs, never save payloads.
    const toDelete = keepCount < 0 ? obsoleteIds.slice(keepCount) : obsoleteIds;
    await db.saves.bulkDelete(toDelete);
  }
}
