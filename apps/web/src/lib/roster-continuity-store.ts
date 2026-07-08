import { z } from 'zod';

const STORAGE_KEY = 'mfd.rosterContinuity.v1';
const SCHEMA_VERSION = 1 as const;

export interface RosterContinuitySnapshot {
  lastSyncedYear: number;
  starterIds: string[];
}

export interface RosterContinuityPayload {
  schemaVersion: typeof SCHEMA_VERSION;
  byDynastyId: Record<string, RosterContinuitySnapshot>;
}

const SnapshotSchema: z.ZodType<RosterContinuitySnapshot> = z.object({
  lastSyncedYear: z.number().int(),
  starterIds: z.array(z.string().min(1)),
});

const PayloadSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  byDynastyId: z.record(z.string(), SnapshotSchema),
});

function defaultPayload(): RosterContinuityPayload {
  return {
    schemaVersion: SCHEMA_VERSION,
    byDynastyId: {},
  };
}

function isStorageLike(value: unknown): value is Storage {
  return !!value
    && typeof value === 'object'
    && typeof (value as Storage).getItem === 'function'
    && typeof (value as Storage).setItem === 'function';
}

function storage(): Storage | null {
  if (typeof window !== 'undefined' && isStorageLike(window.localStorage)) return window.localStorage;
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && isStorageLike(globalThis.localStorage)) {
    return globalThis.localStorage;
  }
  return null;
}

function normalizeStarterIds(starterIds: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const starterId of starterIds) {
    if (!starterId || seen.has(starterId)) continue;
    seen.add(starterId);
    normalized.push(starterId);
  }

  return normalized;
}

function normalizeSnapshot(snapshot: RosterContinuitySnapshot): RosterContinuitySnapshot {
  return {
    lastSyncedYear: snapshot.lastSyncedYear,
    starterIds: normalizeStarterIds(snapshot.starterIds),
  };
}

function readPayload(): RosterContinuityPayload {
  const backingStore = storage();
  if (!backingStore) return defaultPayload();

  const raw = backingStore.getItem(STORAGE_KEY);
  if (!raw) return defaultPayload();

  try {
    const parsed = JSON.parse(raw);
    const validated = PayloadSchema.safeParse(parsed);
    if (!validated.success) return defaultPayload();

    return {
      schemaVersion: SCHEMA_VERSION,
      byDynastyId: Object.fromEntries(
        Object.entries(validated.data.byDynastyId).map(([dynastyId, snapshot]) => [
          dynastyId,
          normalizeSnapshot(snapshot),
        ]),
      ),
    };
  } catch {
    return defaultPayload();
  }
}

function writePayload(payload: RosterContinuityPayload): RosterContinuityPayload {
  const next: RosterContinuityPayload = {
    schemaVersion: SCHEMA_VERSION,
    byDynastyId: Object.fromEntries(
      Object.entries(payload.byDynastyId).map(([dynastyId, snapshot]) => [
        dynastyId,
        normalizeSnapshot(snapshot),
      ]),
    ),
  };

  const backingStore = storage();
  if (!backingStore) return next;
  backingStore.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function parseRosterContinuityPayload(candidate: unknown): RosterContinuityPayload | null {
  const validated = PayloadSchema.safeParse(candidate);
  if (!validated.success) return null;

  return {
    schemaVersion: SCHEMA_VERSION,
    byDynastyId: Object.fromEntries(
      Object.entries(validated.data.byDynastyId).map(([dynastyId, snapshot]) => [
        dynastyId,
        normalizeSnapshot(snapshot),
      ]),
    ),
  };
}

export function readRosterContinuity(): RosterContinuityPayload {
  return readPayload();
}

export function replaceRosterContinuity(payload: RosterContinuityPayload): RosterContinuityPayload {
  return writePayload(payload);
}

export function readDynastyStarters(dynastyId: string): RosterContinuitySnapshot | null {
  return readPayload().byDynastyId[dynastyId] ?? null;
}

export function upsertDynastyStarters(
  dynastyId: string,
  year: number,
  starterIds: string[],
): RosterContinuityPayload {
  const payload = readPayload();
  return writePayload({
    schemaVersion: SCHEMA_VERSION,
    byDynastyId: {
      ...payload.byDynastyId,
      [dynastyId]: {
        lastSyncedYear: year,
        starterIds,
      },
    },
  });
}

export function clearRosterContinuityForDynasty(dynastyId: string): void {
  const payload = readPayload();
  if (!(dynastyId in payload.byDynastyId)) return;

  const next = { ...payload.byDynastyId };
  delete next[dynastyId];

  writePayload({
    schemaVersion: SCHEMA_VERSION,
    byDynastyId: next,
  });
}
