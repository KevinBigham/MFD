export const CHIP_READ_RECEIPTS_STORAGE_KEY = 'mfd.chip.read.v1';

export function resolveReadReceiptsStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage ?? null;
}

function normalizeReceiptArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
}

export function readChipReadReceipts(
  storage: Storage | null = resolveReadReceiptsStorage(),
): Set<string> {
  if (!storage) return new Set();
  const raw = storage.getItem(CHIP_READ_RECEIPTS_STORAGE_KEY);
  if (!raw) return new Set();

  try {
    return new Set(normalizeReceiptArray(JSON.parse(raw) as unknown));
  } catch {
    return new Set();
  }
}

export function writeChipReadReceipts(
  storage: Storage | null,
  beatIds: Iterable<string>,
): Set<string> {
  const merged = new Set(readChipReadReceipts(storage));
  for (const beatId of beatIds) {
    if (beatId) merged.add(beatId);
  }

  if (storage) {
    storage.setItem(CHIP_READ_RECEIPTS_STORAGE_KEY, JSON.stringify([...merged].sort()));
  }
  return merged;
}

export function clearChipReadReceipts(
  storage: Storage | null,
  shouldClear: (beatId: string) => boolean,
): Set<string> {
  const remaining = [...readChipReadReceipts(storage)].filter((beatId) => !shouldClear(beatId));

  if (storage) {
    if (remaining.length === 0) {
      storage.removeItem(CHIP_READ_RECEIPTS_STORAGE_KEY);
    } else {
      storage.setItem(CHIP_READ_RECEIPTS_STORAGE_KEY, JSON.stringify(remaining.sort()));
    }
  }

  return new Set(remaining);
}
