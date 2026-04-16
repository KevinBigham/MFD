/**
 * Sprint 44 — Dexie save/load round-trip test.
 *
 * Mobile Safari + Chrome Android rely on this exact path; verifying the
 * code round-trips a SaveSlot through the Dexie API with an in-memory
 * mock prevents regressions that would only surface on-device.
 *
 * We mock `dexie` itself because fake-indexeddb isn't a listed dep.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('dexie', () => {
  // Minimal in-memory stand-in for the Dexie API surface db.ts uses.
  class FakeTable<T extends { id?: number }> {
    private rows: T[] = [];
    private nextId = 1;

    async add(row: T): Promise<number> {
      const id = this.nextId++;
      this.rows.push({ ...row, id } as T);
      return id;
    }
    async get(id: number): Promise<T | undefined> {
      return this.rows.find((r) => r.id === id);
    }
    async delete(id: number): Promise<void> {
      this.rows = this.rows.filter((r) => r.id !== id);
    }
    async bulkDelete(ids: number[]): Promise<void> {
      const set = new Set(ids);
      this.rows = this.rows.filter((r) => r.id != null && !set.has(r.id));
    }
    orderBy(field: keyof T) {
      const data = [...this.rows].sort((a, b) => {
        const av = a[field] as unknown as number;
        const bv = b[field] as unknown as number;
        return av - bv;
      });
      return {
        reverse: () => ({
          toArray: async () => [...data].reverse(),
        }),
        toArray: async () => data,
      };
    }
  }

  class FakeDexie {
    constructor(_name: string) {}
    version(_v: number) {
      return {
        // Assign tables here (not in the constructor) so subclass field
        // declarations like `saves!: EntityTable<...>` don't stomp them
        // when useDefineForClassFields is on.
        stores: (schema: Record<string, string>) => {
          for (const key of Object.keys(schema)) {
            (this as Record<string, unknown>)[key] = new FakeTable();
          }
          return this;
        },
      };
    }
  }

  return { default: FakeDexie };
});

import { saveGame, loadGame, listSaves, deleteSave, getLatestAutosave, trimAutosaves } from './db';

function makeSlot(overrides: Partial<Parameters<typeof saveGame>[0]> = {}) {
  return {
    name: 'Slot 1',
    data: 'compressed-blob',
    timestamp: Date.now(),
    year: 2026,
    week: 1,
    teamName: 'Kansas City',
    difficulty: 'veteran',
    isAutosave: false,
    version: 31,
    ...overrides,
  };
}

describe('db (Dexie save slots)', () => {
  beforeEach(() => {
    // Module-level singleton db is reset by re-importing; the mock keeps its
    // own rows between tests, so we use unique names + explicit deletes.
  });

  it('round-trips a manual save through saveGame / loadGame', async () => {
    const slot = makeSlot({ name: 'RoundTrip' });
    const id = await saveGame(slot);
    expect(id).toBeGreaterThan(0);
    const loaded = await loadGame(id);
    expect(loaded?.name).toBe('RoundTrip');
    expect(loaded?.data).toBe('compressed-blob');
    expect(loaded?.version).toBe(31);
    await deleteSave(id);
  });

  it('listSaves returns most recent first', async () => {
    const older = await saveGame(makeSlot({ name: 'OldSave', timestamp: 1000 }));
    const newer = await saveGame(makeSlot({ name: 'NewSave', timestamp: 2000 }));
    const saves = await listSaves();
    const names = saves.map((s) => s.name);
    // NewSave must come before OldSave in the reversed ordering.
    expect(names.indexOf('NewSave')).toBeLessThan(names.indexOf('OldSave'));
    await deleteSave(older);
    await deleteSave(newer);
  });

  it('getLatestAutosave skips manual saves', async () => {
    const manualId = await saveGame(makeSlot({ name: 'Manual', isAutosave: false, timestamp: 5000 }));
    const autoId = await saveGame(makeSlot({ name: 'Auto', isAutosave: true, timestamp: 4000 }));
    const latest = await getLatestAutosave();
    expect(latest?.name).toBe('Auto');
    await deleteSave(manualId);
    await deleteSave(autoId);
  });

  it('trimAutosaves keeps only the N most recent autosaves', async () => {
    const ids: number[] = [];
    for (let i = 0; i < 5; i++) {
      ids.push(await saveGame(makeSlot({ name: `A${i}`, isAutosave: true, timestamp: 10_000 + i })));
    }
    await trimAutosaves(2);
    const remaining = (await listSaves()).filter((s) => s.isAutosave && s.name.startsWith('A'));
    expect(remaining.length).toBe(2);
    for (const slot of remaining) {
      if (slot.id != null) await deleteSave(slot.id);
    }
  });

  it('deleteSave removes a slot so loadGame returns undefined', async () => {
    const id = await saveGame(makeSlot({ name: 'Ephemeral' }));
    await deleteSave(id);
    const gone = await loadGame(id);
    expect(gone).toBeUndefined();
  });
});
