import { describe, expect, it } from 'vitest';
import {
  CHIP_MEMORY_MAX_OUTCOMES,
  CHIP_MEMORY_QUOTA_RETRY_OUTCOMES,
  CHIP_MEMORY_STORAGE_KEY,
  clearChipMemory,
  createChipMemoryStore,
  createEmptyChipMemory,
  readChipMemory,
  withChipMemoryEntry,
  writeChipMemory,
  type ChipMemory,
} from './chipMemory';

class MemoryStorage implements Storage {
  private readonly backing = new Map<string, string>();
  get length() { return this.backing.size; }
  clear(): void { this.backing.clear(); }
  getItem(key: string): string | null { return this.backing.get(key) ?? null; }
  key(index: number): string | null { return [...this.backing.keys()][index] ?? null; }
  removeItem(key: string): void { this.backing.delete(key); }
  setItem(key: string, value: string): void { this.backing.set(key, value); }
}

class QuotaStorage extends MemoryStorage {
  failuresRemaining: number;
  constructor(failures: number) {
    super();
    this.failuresRemaining = failures;
  }
  override setItem(key: string, value: string): void {
    if (this.failuresRemaining > 0) {
      this.failuresRemaining -= 1;
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    }
    super.setItem(key, value);
  }
}

function memoryWithOutcomes(count: number): ChipMemory {
  return {
    version: 1,
    outcomes: Array.from({ length: count }, (_, index) => ({
      year: 2030,
      week: index + 1,
      variant: 'cleanWin',
    })),
    lastFlavor: { variant: 'cleanWin', line: 'Line one.' },
    lastAdvice: { year: 2030, week: count, advice: 'Must Do: open Monday Briefing.' },
  };
}

describe('chipMemory sidecar', () => {
  it('returns empty memory for missing storage, missing key, or corrupt JSON', () => {
    expect(readChipMemory(null)).toEqual(createEmptyChipMemory());

    const storage = new MemoryStorage();
    expect(readChipMemory(storage)).toEqual(createEmptyChipMemory());

    storage.setItem(CHIP_MEMORY_STORAGE_KEY, '{not json');
    expect(readChipMemory(storage)).toEqual(createEmptyChipMemory());

    storage.setItem(CHIP_MEMORY_STORAGE_KEY, JSON.stringify({ version: 99, outcomes: [] }));
    expect(readChipMemory(storage)).toEqual(createEmptyChipMemory());
  });

  it('normalizes malformed entries instead of trusting stored shape', () => {
    const storage = new MemoryStorage();
    storage.setItem(CHIP_MEMORY_STORAGE_KEY, JSON.stringify({
      version: 1,
      outcomes: [
        { year: 2030, week: 4, variant: 'loss' },
        { year: 'bad', week: 4, variant: 'loss' },
        { year: 2030, week: 5, variant: '' },
        'garbage',
      ],
      lastFlavor: { variant: 'loss', line: '  ' },
      lastAdvice: { year: 2030, week: 4, advice: 'Must Do: name the fix.' },
    }));

    expect(readChipMemory(storage)).toEqual({
      version: 1,
      outcomes: [{ year: 2030, week: 4, variant: 'loss' }],
      lastFlavor: null,
      lastAdvice: { year: 2030, week: 4, advice: 'Must Do: name the fix.' },
    });
  });

  it('round-trips memory through storage', () => {
    const storage = new MemoryStorage();
    const memory = memoryWithOutcomes(3);

    writeChipMemory(storage, memory);
    expect(readChipMemory(storage)).toEqual(memory);
  });

  it('prunes outcomes to the newest CHIP_MEMORY_MAX_OUTCOMES on write', () => {
    const storage = new MemoryStorage();
    const persisted = writeChipMemory(storage, memoryWithOutcomes(CHIP_MEMORY_MAX_OUTCOMES + 5));

    expect(persisted.outcomes).toHaveLength(CHIP_MEMORY_MAX_OUTCOMES);
    expect(persisted.outcomes[0]).toEqual({ year: 2030, week: 6, variant: 'cleanWin' });
    expect(readChipMemory(storage).outcomes).toHaveLength(CHIP_MEMORY_MAX_OUTCOMES);
  });

  it('trims oldest outcomes when the serialized payload exceeds the byte budget', () => {
    const storage = new MemoryStorage();
    const huge: ChipMemory = {
      version: 1,
      outcomes: Array.from({ length: 12 }, (_, index) => ({
        year: 2030,
        week: index + 1,
        variant: `variant-${'x'.repeat(150)}`,
      })),
      lastFlavor: null,
      lastAdvice: null,
    };

    const persisted = writeChipMemory(storage, huge);
    const raw = storage.getItem(CHIP_MEMORY_STORAGE_KEY)!;

    expect(raw.length).toBeLessThanOrEqual(2048);
    expect(persisted.outcomes.length).toBeLessThan(12);
    expect(readChipMemory(storage).outcomes.length).toBe(persisted.outcomes.length);
  });

  it('retries once with a minimal outcome tail on quota failure, then gives up quietly', () => {
    const recoverable = new QuotaStorage(1);
    const persisted = writeChipMemory(recoverable, memoryWithOutcomes(12));

    expect(persisted.outcomes).toHaveLength(CHIP_MEMORY_QUOTA_RETRY_OUTCOMES);
    expect(readChipMemory(recoverable).outcomes).toHaveLength(CHIP_MEMORY_QUOTA_RETRY_OUTCOMES);

    const alwaysFull = new QuotaStorage(Number.POSITIVE_INFINITY);
    expect(() => writeChipMemory(alwaysFull, memoryWithOutcomes(12))).not.toThrow();
    expect(alwaysFull.getItem(CHIP_MEMORY_STORAGE_KEY)).toBeNull();
  });

  it('applies entries immutably with withChipMemoryEntry', () => {
    const base = memoryWithOutcomes(2);
    const next = withChipMemoryEntry(base, {
      outcome: { year: 2030, week: 3, variant: 'uglyWin' },
      flavor: { variant: 'uglyWin', line: 'Line two.' },
      advice: { year: 2030, week: 3, advice: 'Must Do: open Recap.' },
    });

    expect(base.outcomes).toHaveLength(2);
    expect(next.outcomes).toHaveLength(3);
    expect(next.outcomes.at(-1)).toEqual({ year: 2030, week: 3, variant: 'uglyWin' });
    expect(next.lastFlavor).toEqual({ variant: 'uglyWin', line: 'Line two.' });
    expect(next.lastAdvice).toEqual({ year: 2030, week: 3, advice: 'Must Do: open Recap.' });

    // Partial entries keep the untouched fields.
    const flavorOnly = withChipMemoryEntry(base, {
      flavor: { variant: 'loss', line: 'Line three.' },
    });
    expect(flavorOnly.outcomes).toHaveLength(2);
    expect(flavorOnly.lastAdvice).toEqual(base.lastAdvice);
  });

  it('clears the memory key and tolerates blocked storage', () => {
    const storage = new MemoryStorage();
    writeChipMemory(storage, memoryWithOutcomes(1));
    clearChipMemory(storage);
    expect(storage.getItem(CHIP_MEMORY_STORAGE_KEY)).toBeNull();
    expect(readChipMemory(storage)).toEqual(createEmptyChipMemory());

    expect(() => clearChipMemory(null)).not.toThrow();
    expect(() => writeChipMemory(null, memoryWithOutcomes(1))).not.toThrow();
  });

  it('createChipMemoryStore adapts a Storage into the bridge store shape', () => {
    const storage = new MemoryStorage();
    const store = createChipMemoryStore(storage);

    expect(store.read()).toEqual(createEmptyChipMemory());
    store.write(memoryWithOutcomes(2));
    expect(store.read().outcomes).toHaveLength(2);
  });
});
