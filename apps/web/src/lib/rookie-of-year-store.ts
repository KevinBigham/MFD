import type { Position } from '@mfd/engine';
import { z } from 'zod';
import type { RookieOfYearEntry } from './rookie-of-year';

const STORAGE_KEY = 'mfd.rookieOfYear.v1';
const SCHEMA_VERSION = 1 as const;
const POSITION_VALUES = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'] as const;

export interface RookieOfYearPayload {
  schemaVersion: typeof SCHEMA_VERSION;
  byDynastyId: Record<string, RookieOfYearEntry[]>;
}

const PositionSchema: z.ZodType<Position> = z.enum(POSITION_VALUES);

const RookieOfYearEntrySchema: z.ZodType<RookieOfYearEntry> = z.object({
  playerId: z.string().min(1),
  playerName: z.string().min(1),
  teamId: z.string().min(1),
  teamAbbr: z.string().min(1),
  position: PositionSchema,
  compositeScore: z.number(),
  headline: z.string().min(1),
  highlights: z.array(z.string()),
  season: z.number().int(),
});

const PayloadSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  byDynastyId: z.record(z.string(), z.array(RookieOfYearEntrySchema)),
});

function defaultPayload(): RookieOfYearPayload {
  return {
    schemaVersion: SCHEMA_VERSION,
    byDynastyId: {},
  };
}

function storage(): Storage | null {
  const candidate = typeof window !== 'undefined'
    ? window.localStorage
    : typeof globalThis !== 'undefined' && 'localStorage' in globalThis
      ? globalThis.localStorage
      : null;
  if (candidate && typeof candidate.getItem === 'function' && typeof candidate.setItem === 'function') return candidate;
  return null;
}

function compareEntriesNewestFirst(left: RookieOfYearEntry, right: RookieOfYearEntry): number {
  return right.season - left.season
    || right.compositeScore - left.compositeScore
    || left.playerName.localeCompare(right.playerName)
    || left.playerId.localeCompare(right.playerId);
}

function normalizeEntries(entries: RookieOfYearEntry[]): RookieOfYearEntry[] {
  return [...entries].sort(compareEntriesNewestFirst);
}

function readPayload(): RookieOfYearPayload {
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
        Object.entries(validated.data.byDynastyId).map(([dynastyId, entries]) => [
          dynastyId,
          normalizeEntries(entries),
        ]),
      ),
    };
  } catch {
    return defaultPayload();
  }
}

function writePayload(payload: RookieOfYearPayload): RookieOfYearPayload {
  const next: RookieOfYearPayload = {
    schemaVersion: SCHEMA_VERSION,
    byDynastyId: Object.fromEntries(
      Object.entries(payload.byDynastyId).map(([dynastyId, entries]) => [
        dynastyId,
        normalizeEntries(entries),
      ]),
    ),
  };

  const backingStore = storage();
  if (!backingStore) return next;
  backingStore.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function parseRookieOfYearPayload(candidate: unknown): RookieOfYearPayload | null {
  const validated = PayloadSchema.safeParse(candidate);
  if (!validated.success) return null;

  return {
    schemaVersion: SCHEMA_VERSION,
    byDynastyId: Object.fromEntries(
      Object.entries(validated.data.byDynastyId).map(([dynastyId, entries]) => [
        dynastyId,
        normalizeEntries(entries),
      ]),
    ),
  };
}

export function readRookieOfYearStore(): RookieOfYearPayload {
  return readPayload();
}

export function replaceRookieOfYearStore(payload: RookieOfYearPayload): RookieOfYearPayload {
  return writePayload(payload);
}

export function readRookieOfYearEntries(dynastyId: string): RookieOfYearEntry[] {
  return readPayload().byDynastyId[dynastyId] ?? [];
}

export function upsertRookieOfYearEntry(dynastyId: string, entry: RookieOfYearEntry): RookieOfYearPayload {
  const payload = readPayload();
  const existing = payload.byDynastyId[dynastyId] ?? [];
  const nextEntries = [
    entry,
    ...existing.filter((candidate) => candidate.season !== entry.season),
  ];

  return writePayload({
    schemaVersion: SCHEMA_VERSION,
    byDynastyId: {
      ...payload.byDynastyId,
      [dynastyId]: nextEntries,
    },
  });
}

export function clearRookieOfYearForDynasty(dynastyId: string): void {
  const payload = readPayload();
  if (!(dynastyId in payload.byDynastyId)) return;

  const next = { ...payload.byDynastyId };
  delete next[dynastyId];

  writePayload({
    schemaVersion: SCHEMA_VERSION,
    byDynastyId: next,
  });
}
