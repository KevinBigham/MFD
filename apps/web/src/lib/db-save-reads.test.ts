import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SaveSlot } from './db';

const table = vi.hoisted(() => ({
  orderBy: vi.fn(),
  get: vi.fn(),
  add: vi.fn(),
  delete: vi.fn(),
  bulkDelete: vi.fn(),
}));

vi.mock('dexie', () => ({
  default: class {
    saves = table;
    version() {
      return { stores: vi.fn(() => { this.saves = table; }) };
    }
  },
}));

import { getLatestAutosave, listSaves, listSaveSummaries, trimAutosaves } from './db';

function slot(id: number, timestamp: number, isAutosave: boolean, data = `payload-${id}`): SaveSlot {
  return { id, timestamp, isAutosave, data, name: `Slot ${id}`, year: 2026,
    week: id, teamName: `Team ${id}`, difficulty: 'pro', version: 37 };
}

/** Models the timestamp index: iteration is ascending (timestamp, then primary key) until
 * reverse() is called, so code that forgets reverse() sees oldest-first rows. `ordered` is the
 * expected newest-first order. Not native IndexedDB: real Dexie cursor ordering, early
 * termination and transactions need browser proof. */
function wireRows(rows: SaveSlot[]) {
  const ascending = [...rows].sort((a, b) => a.timestamp - b.timestamp || a.id! - b.id!);
  const ordered = [...ascending].reverse();
  const persisted = new Map(rows.map((row) => [row.id!, row]));
  const visitedIds: number[] = [];
  let predicate: (row: SaveSlot) => boolean = () => true;
  let reversed = false;
  const iteration = () => (reversed ? ordered : ascending);
  const collection = {
    reverse: vi.fn(() => {
      reversed = !reversed;
      return collection;
    }),
    filter: vi.fn((filter: (row: SaveSlot) => boolean) => {
      predicate = filter;
      return collection;
    }),
    each: vi.fn(async (callback: (row: SaveSlot) => void) => {
      for (const row of iteration()) {
        visitedIds.push(row.id!);
        if (predicate(row)) callback(row);
      }
    }),
    first: vi.fn(async (): Promise<SaveSlot | undefined> => {
      for (const row of iteration()) {
        visitedIds.push(row.id!);
        if (predicate(row)) return row;
      }
      return undefined;
    }),
    toArray: vi.fn(async (): Promise<SaveSlot[]> => {
      throw new Error('Affected paths must not request a full payload array.');
    }),
  };
  table.orderBy.mockReturnValue(collection);
  table.bulkDelete.mockImplementation(async (ids: number[]) => {
    for (const id of ids) persisted.delete(id);
  });
  return { collection, ordered, persisted, visitedIds };
}

function hash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

beforeEach(() => {
  for (const mock of Object.values(table)) mock.mockReset();
});

describe('save metadata reads', () => {
  it('returns only explicit metadata, in the same reverse timestamp order', async () => {
    const rows = [slot(1, 100, false), slot(2, 200, true), slot(3, 200, false)];
    const { collection } = wireRows(rows);
    const summaries = await listSaveSummaries();
    expect(summaries.map((row) => row.id)).toEqual([3, 2, 1]);
    expect(Object.keys(summaries[0]!).sort()).toEqual([
      'id', 'name', 'timestamp', 'year', 'week', 'teamName', 'difficulty', 'isAutosave', 'version',
    ].sort());
    expect(summaries.every((row) => !('data' in row))).toBe(true);
    expect(table.orderBy).toHaveBeenCalledWith('timestamp');
    expect(collection.reverse).toHaveBeenCalledOnce();
    expect(collection.each).toHaveBeenCalledOnce();
    expect(collection.toArray).not.toHaveBeenCalled();
    expect(table.get).not.toHaveBeenCalled();
  });

  it('does not touch payload properties while projecting a record', async () => {
    const row = slot(1, 100, true);
    Object.defineProperty(row, 'data', { enumerable: true, get: () => {
      throw new Error('Metadata projection must not read data.');
    } });
    wireRows([row]);
    expect(await listSaveSummaries()).toEqual([{
      id: 1, timestamp: 100, isAutosave: true, name: 'Slot 1', year: 2026,
      week: 1, teamName: 'Team 1', difficulty: 'pro', version: 37,
    }]);
  });

  it('leaves large manual-save payloads unchanged and out of the result', async () => {
    const row = slot(1, 100, false, 'large-fixture'.repeat(100_000));
    const before = hash(row.data);
    wireRows([row]);
    const summaries = await listSaveSummaries();
    expect(hash(row.data)).toBe(before);
    expect(JSON.stringify(summaries).length).toBeLessThan(1_024);
    expect(table.bulkDelete).not.toHaveBeenCalled();
  });

  it('returns an empty metadata list for no slots', async () => {
    wireRows([]);
    expect(await listSaveSummaries()).toEqual([]);
  });

  it('propagates cursor errors instead of presenting partial metadata', async () => {
    const { collection } = wireRows([slot(1, 100, false)]);
    const error = new Error('IDB cursor failed');
    collection.each.mockRejectedValueOnce(error);
    await expect(listSaveSummaries()).rejects.toBe(error);
  });

  it('keeps the full-payload listSaves compatibility API', async () => {
    const { collection, ordered } = wireRows([slot(1, 100, false)]);
    collection.toArray.mockResolvedValueOnce(ordered);
    expect(await listSaves()).toBe(ordered);
  });
});

describe('latest autosave selection', () => {
  it('skips newer manual slots and stops after the first autosave', async () => {
    const newestAuto = slot(2, 200, true);
    const olderCorrupt = slot(1, 100, true, 'not-json');
    const { collection, visitedIds } = wireRows([olderCorrupt, newestAuto, slot(3, 300, false)]);
    expect(await getLatestAutosave()).toBe(newestAuto);
    expect(visitedIds).toEqual([3, 2]);
    expect(collection.first).toHaveBeenCalledOnce();
    expect(collection.toArray).not.toHaveBeenCalled();
    expect(table.get).not.toHaveBeenCalled();
  });

  it('uses the existing order for equal timestamps', async () => {
    const newerKey = slot(2, 100, true);
    wireRows([slot(1, 100, true), newerKey]);
    expect(await getLatestAutosave()).toBe(newerKey);
  });

  it.each([{ rows: [] }, { rows: [slot(1, 100, false)] }])('returns undefined without an autosave (%#)', async ({ rows }) => {
    wireRows(rows);
    expect(await getLatestAutosave()).toBeUndefined();
  });

  it('selects a corrupt newest autosave without silently choosing an older payload', async () => {
    const corrupt = slot(2, 200, true, 'not-json');
    const { visitedIds } = wireRows([slot(1, 100, true), corrupt]);
    expect(await getLatestAutosave()).toBe(corrupt);
    expect(visitedIds).toEqual([2]);
  });

  it('propagates selection failures', async () => {
    const { collection } = wireRows([]);
    const error = new Error('IDB unavailable');
    collection.first.mockRejectedValueOnce(error);
    await expect(getLatestAutosave()).rejects.toBe(error);
  });
});

describe('autosave retention', () => {
  it.each([0, 1, 3])('does not delete when the autosave count is %i', async (count) => {
    const rows = Array.from({ length: count }, (_, i) => slot(i + 1, i + 1, true));
    const { collection } = wireRows([...rows, slot(99, 1000, false)]);
    await trimAutosaves();
    expect(table.bulkDelete).not.toHaveBeenCalled();
    expect(collection.toArray).not.toHaveBeenCalled();
  });

  it('deletes only the fourth/older autosaves and preserves all manual payloads', async () => {
    const rows = [slot(1, 100, true), slot(2, 200, true), slot(3, 200, true),
      slot(4, 400, true), slot(5, 500, false), slot(6, 50, false)];
    const beforeManual = rows.filter((row) => !row.isAutosave).map((row) => [row.id, hash(row.data)]);
    const { collection, persisted } = wireRows(rows);
    await trimAutosaves();
    expect(table.bulkDelete).toHaveBeenCalledOnce();
    expect(table.bulkDelete).toHaveBeenCalledWith([1]);
    expect([...persisted.values()].filter((row) => !row.isAutosave)
      .map((row) => [row.id, hash(row.data)])).toEqual(beforeManual);
    expect([...persisted.keys()].sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6]);
    expect(collection.toArray).not.toHaveBeenCalled();
  });

  it.each([0, 1, 2, 3, 4, 8, 2.5, -1, -0.5, -Infinity, Infinity, NaN])(
    'preserves the legacy slice deletion set for keepCount=%s', async (keepCount) => {
      const { ordered, collection } = wireRows([
        slot(1, 100, true), slot(2, 200, false), slot(3, 200, true),
        slot(4, 300, true), slot(5, 400, true),
      ]);
      const autosaves = ordered.filter((row) => row.isAutosave);
      const expected = autosaves.length > keepCount ? autosaves.slice(keepCount).map((row) => row.id) : [];
      await trimAutosaves(keepCount);
      if (autosaves.length > keepCount) {
        expect(table.bulkDelete).toHaveBeenCalledOnce();
        expect(table.bulkDelete).toHaveBeenCalledWith(expected);
      } else {
        expect(table.bulkDelete).not.toHaveBeenCalled();
      }
      expect(collection.toArray).not.toHaveBeenCalled();
    },
  );

  it('does not read save payloads while collecting obsolete IDs', async () => {
    const rows = Array.from({ length: 4 }, (_, i) => slot(i + 1, i + 1, true));
    for (const row of rows) Object.defineProperty(row, 'data', { get: () => {
      throw new Error('Retention must not read data.');
    } });
    wireRows(rows);
    await trimAutosaves();
    expect(table.bulkDelete).toHaveBeenCalledOnce();
    expect(table.bulkDelete).toHaveBeenCalledWith([1]);
  });

  it('does not delete if the read fails', async () => {
    const { collection } = wireRows([slot(1, 100, true)]);
    const error = new Error('IDB cursor failed');
    collection.each.mockRejectedValueOnce(error);
    await expect(trimAutosaves(0)).rejects.toBe(error);
    expect(table.bulkDelete).not.toHaveBeenCalled();
  });

  it('propagates bulk deletion errors', async () => {
    wireRows([slot(1, 100, true)]);
    const error = new Error('IDB delete failed');
    table.bulkDelete.mockRejectedValueOnce(error);
    await expect(trimAutosaves(0)).rejects.toBe(error);
  });
});
