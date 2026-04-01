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
  data: string;           // LZW-compressed JSON
  timestamp: number;
  year: number;
  week: number;
  teamName: string;
  difficulty: string;
  isAutosave: boolean;
  version: number;
}

export class MfdDatabase extends Dexie {
  saves!: EntityTable<SaveSlot, 'id'>;

  constructor() {
    super('mfd');
    this.version(1).stores({
      saves: '++id, name, timestamp, isAutosave',
    });
  }
}

export const db = new MfdDatabase();

/** Save game state to a slot. */
export async function saveGame(slot: Omit<SaveSlot, 'id'>): Promise<number> {
  return db.saves.add(slot as SaveSlot);
}

/** Load a save by ID. */
export async function loadGame(id: number): Promise<SaveSlot | undefined> {
  return db.saves.get(id);
}

/** List all saves, most recent first. */
export async function listSaves(): Promise<SaveSlot[]> {
  return db.saves.orderBy('timestamp').reverse().toArray();
}

/** Delete a save by ID. */
export async function deleteSave(id: number): Promise<void> {
  return db.saves.delete(id);
}

/** Get the most recent autosave. */
export async function getLatestAutosave(): Promise<SaveSlot | undefined> {
  return db.saves
    .where('isAutosave')
    .equals(1)
    .reverse()
    .sortBy('timestamp')
    .then(saves => saves[0]);
}

/** Trim autosaves to keep only the N most recent. */
export async function trimAutosaves(keepCount: number = 3): Promise<void> {
  const autosaves = await db.saves
    .where('isAutosave')
    .equals(1)
    .reverse()
    .sortBy('timestamp');

  if (autosaves.length > keepCount) {
    const toDelete = autosaves.slice(keepCount);
    await db.saves.bulkDelete(toDelete.map(s => s.id!));
  }
}
