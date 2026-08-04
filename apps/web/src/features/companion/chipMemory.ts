import { resolveBrowserStorage } from './storageBoundary';

/**
 * Chip session memory sidecar (B5/B12/B13). Records what Chip actually said —
 * recent weekly outcomes, the last flavor line served, and the last Must Do
 * advice — so later weeks can avoid immediate flavor repeats and future
 * surfaces can reference prior conversations.
 *
 * Contracts:
 * - pure reads/writes with injectable Storage; every storage touch is
 *   try/catch-guarded so a blocked or full browser store never breaks Chip
 * - pruning (B12): outcomes cap at CHIP_MEMORY_MAX_OUTCOMES, the serialized
 *   payload must fit CHIP_MEMORY_MAX_BYTES (oldest outcomes trim first), and
 *   a quota failure retries once with a minimal outcome tail before giving up
 * - reset/quiet respect (B13): resetOnboarding clears this key alongside the
 *   other Chip keys, and recording happens only after the event bridge's
 *   quiet-pref gate passes — quiet weeks form no memories
 */

export const CHIP_MEMORY_STORAGE_KEY = 'mfd.chip.memory.v1';
export const CHIP_MEMORY_MAX_OUTCOMES = 12;
export const CHIP_MEMORY_MAX_BYTES = 2048;
/** On a quota failure, retry once with only this many recent outcomes. */
export const CHIP_MEMORY_QUOTA_RETRY_OUTCOMES = 4;

export interface ChipMemoryOutcome {
  year: number;
  week: number;
  variant: string;
}

export interface ChipMemoryFlavor {
  variant: string;
  line: string;
}

export interface ChipMemoryAdvice {
  year: number;
  week: number;
  advice: string;
}

export interface ChipMemory {
  version: 1;
  outcomes: ChipMemoryOutcome[];
  lastFlavor: ChipMemoryFlavor | null;
  lastAdvice: ChipMemoryAdvice | null;
}

/** Optional one-shot update applied by withChipMemoryEntry. */
export interface ChipMemoryEntry {
  outcome?: ChipMemoryOutcome;
  flavor?: ChipMemoryFlavor;
  advice?: ChipMemoryAdvice;
}

export function createEmptyChipMemory(): ChipMemory {
  return { version: 1, outcomes: [], lastFlavor: null, lastAdvice: null };
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function normalizeOutcome(value: unknown): ChipMemoryOutcome | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const year = asFiniteNumber(record.year);
  const week = asFiniteNumber(record.week);
  const variant = asNonEmptyString(record.variant);
  if (year === null || week === null || variant === null) return null;
  return { year, week, variant };
}

function normalizeFlavor(value: unknown): ChipMemoryFlavor | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const variant = asNonEmptyString(record.variant);
  const line = asNonEmptyString(record.line);
  if (variant === null || line === null) return null;
  return { variant, line };
}

function normalizeAdvice(value: unknown): ChipMemoryAdvice | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const year = asFiniteNumber(record.year);
  const week = asFiniteNumber(record.week);
  const advice = asNonEmptyString(record.advice);
  if (year === null || week === null || advice === null) return null;
  return { year, week, advice };
}

function normalizeChipMemory(value: unknown): ChipMemory {
  if (!value || typeof value !== 'object') return createEmptyChipMemory();
  const record = value as Record<string, unknown>;
  if (record.version !== 1) return createEmptyChipMemory();
  const outcomes = Array.isArray(record.outcomes)
    ? record.outcomes.map(normalizeOutcome).filter((entry): entry is ChipMemoryOutcome => entry !== null)
    : [];
  return {
    version: 1,
    outcomes,
    lastFlavor: normalizeFlavor(record.lastFlavor),
    lastAdvice: normalizeAdvice(record.lastAdvice),
  };
}

/** B12: keep only the newest outcomes; the sidecar stays small by contract. */
function pruneChipMemory(memory: ChipMemory): ChipMemory {
  return { ...memory, outcomes: memory.outcomes.slice(-CHIP_MEMORY_MAX_OUTCOMES) };
}

export function readChipMemory(storage: Storage | null = resolveBrowserStorage()): ChipMemory {
  if (!storage) return createEmptyChipMemory();
  let raw: string | null;
  try {
    raw = storage.getItem(CHIP_MEMORY_STORAGE_KEY);
  } catch {
    return createEmptyChipMemory();
  }
  if (!raw) return createEmptyChipMemory();
  try {
    return normalizeChipMemory(JSON.parse(raw) as unknown);
  } catch {
    return createEmptyChipMemory();
  }
}

function serializeWithinBudget(memory: ChipMemory): { payload: string; memory: ChipMemory } {
  let trimmed = memory;
  let payload = JSON.stringify(trimmed);
  while (payload.length > CHIP_MEMORY_MAX_BYTES && trimmed.outcomes.length > 0) {
    trimmed = { ...trimmed, outcomes: trimmed.outcomes.slice(1) };
    payload = JSON.stringify(trimmed);
  }
  return { payload, memory: trimmed };
}

/**
 * Persist memory. Returns the memory actually persisted (post-prune, and
 * post-quota-retry trim when the first write fails). Never throws.
 */
export function writeChipMemory(storage: Storage | null, memory: ChipMemory): ChipMemory {
  const pruned = pruneChipMemory(normalizeChipMemory(memory));
  if (!storage) return pruned;

  const sized = serializeWithinBudget(pruned);
  try {
    storage.setItem(CHIP_MEMORY_STORAGE_KEY, sized.payload);
    return sized.memory;
  } catch {
    // B12 quota guard: retry once with a minimal outcome tail.
    const minimal = { ...sized.memory, outcomes: sized.memory.outcomes.slice(-CHIP_MEMORY_QUOTA_RETRY_OUTCOMES) };
    try {
      storage.setItem(CHIP_MEMORY_STORAGE_KEY, JSON.stringify(minimal));
      return minimal;
    } catch {
      // Storage stays blocked/full; Chip keeps working without memory.
      return minimal;
    }
  }
}

/** Apply one remembered moment immutably (read -> build -> single write). */
export function withChipMemoryEntry(memory: ChipMemory, entry: ChipMemoryEntry): ChipMemory {
  const base = normalizeChipMemory(memory);
  return {
    version: 1,
    outcomes: entry.outcome ? [...base.outcomes, entry.outcome] : base.outcomes,
    lastFlavor: entry.flavor ?? base.lastFlavor,
    lastAdvice: entry.advice ?? base.lastAdvice,
  };
}

export function clearChipMemory(storage: Storage | null): void {
  if (!storage) return;
  try {
    storage.removeItem(CHIP_MEMORY_STORAGE_KEY);
  } catch {
    // Clearing must not break the Chip controls.
  }
}

/** Storage-backed bridge between the event bridge and this sidecar. */
export interface ChipMemoryStore {
  read: () => ChipMemory;
  write: (memory: ChipMemory) => ChipMemory;
}

export function createChipMemoryStore(storage: Storage | null = resolveBrowserStorage()): ChipMemoryStore {
  return {
    read: () => readChipMemory(storage),
    write: (memory) => writeChipMemory(storage, memory),
  };
}
