import { describe, expect, it } from 'vitest';
import {
  CHIP_READ_RECEIPTS_STORAGE_KEY,
  readChipReadReceipts,
  writeChipReadReceipts,
} from './readReceipts';

class MemoryStorage implements Storage {
  private readonly backing = new Map<string, string>();

  get length() {
    return this.backing.size;
  }

  clear(): void {
    this.backing.clear();
  }

  getItem(key: string): string | null {
    return this.backing.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.backing.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.backing.delete(key);
  }

  setItem(key: string, value: string): void {
    this.backing.set(key, value);
  }
}

describe('Chip read receipts', () => {
  it('returns an empty set when storage is unavailable', () => {
    expect(readChipReadReceipts(null)).toEqual(new Set());
  });

  it('returns an empty set when storage has no read receipt key', () => {
    expect(readChipReadReceipts(new MemoryStorage())).toEqual(new Set());
  });

  it('round-trips receipt ids through the read receipt storage key', () => {
    const storage = new MemoryStorage();

    writeChipReadReceipts(storage, new Set(['chip.route.roster.beat-1']));

    expect(readChipReadReceipts(storage)).toEqual(new Set(['chip.route.roster.beat-1']));
  });

  it('falls back to an empty set for malformed JSON', () => {
    const storage = new MemoryStorage();
    storage.setItem(CHIP_READ_RECEIPTS_STORAGE_KEY, '{not-json');

    expect(readChipReadReceipts(storage)).toEqual(new Set());
  });

  it('merges writes without overwriting existing receipts', () => {
    const storage = new MemoryStorage();
    writeChipReadReceipts(storage, new Set(['chip.route.roster.beat-1']));
    writeChipReadReceipts(storage, new Set(['chip.route.staff.beat-1']));

    expect(readChipReadReceipts(storage)).toEqual(new Set([
      'chip.route.roster.beat-1',
      'chip.route.staff.beat-1',
    ]));
  });

  it('exports the locked localStorage key constant', () => {
    expect(CHIP_READ_RECEIPTS_STORAGE_KEY).toBe('mfd.chip.read.v1');
  });

  it('keeps a set entry alive through a JSON string array payload', () => {
    const storage = new MemoryStorage();
    storage.setItem(CHIP_READ_RECEIPTS_STORAGE_KEY, JSON.stringify(['chip.route.draft-board.beat-2']));

    expect(readChipReadReceipts(storage).has('chip.route.draft-board.beat-2')).toBe(true);
  });
});
