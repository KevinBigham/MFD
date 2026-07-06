import type { HallOfFameEntry, Position } from '@mfd/engine';
import { z } from 'zod';

const STORAGE_KEY = 'mfd.hallOfFame.v1';
const SCHEMA_VERSION = 1 as const;
export const HALL_OF_FAME_ARCHIVE_EXPORT_KIND = 'mfd.hallOfFame.archive.v1' as const;

const POSITION_VALUES = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'] as const;

export interface HallOfFameArchiveDynasty {
  dynastyId: string;
  teamId: string;
  teamCity: string;
  teamName: string;
  teamAbbr: string;
  startYear: number;
  lastSyncedYear: number;
  entries: HallOfFameEntry[];
}

export interface HallOfFameArchivePayload {
  schemaVersion: typeof SCHEMA_VERSION;
  dynastiesById: Record<string, HallOfFameArchiveDynasty>;
}

export interface HallOfFameArchiveSummary {
  totalInductees: number;
  totalHomegrown: number;
  totalChampionships: number;
  totalMvps: number;
  dynastiesRepresented: number;
}

export interface HallOfFameArchiveExportEnvelope {
  kind: typeof HALL_OF_FAME_ARCHIVE_EXPORT_KIND;
  exportedAt: string;
  payload: HallOfFameArchivePayload;
}

export type HallOfFameArchiveImportResult =
  | {
    ok: true;
    payload: HallOfFameArchivePayload;
    dynasties: number;
    inductees: number;
  }
  | {
    ok: false;
    reason: string;
  };

const PositionSchema: z.ZodType<Position> = z.enum(POSITION_VALUES);

const HallOfFameEntrySchema: z.ZodType<HallOfFameEntry> = z.object({
  playerId: z.string().min(1),
  name: z.string().min(1),
  position: PositionSchema,
  inductionYear: z.number().int(),
  peakOvr: z.number().int().min(0),
  careerYears: z.number().int().min(0),
  score: z.number(),
  awards: z.object({
    mvps: z.number().int().min(0),
    allPros: z.number().int().min(0),
    proBowls: z.number().int().min(0),
    championships: z.number().int().min(0),
  }),
  highlights: z.array(z.string()),
  teams: z.array(z.string().min(1)),
  epilogue: z.unknown().optional(),
}) as z.ZodType<HallOfFameEntry>;

const HallOfFameArchiveDynastySchema: z.ZodType<HallOfFameArchiveDynasty> = z.object({
  dynastyId: z.string().min(1),
  teamId: z.string().min(1),
  teamCity: z.string().min(1),
  teamName: z.string().min(1),
  teamAbbr: z.string().min(1),
  startYear: z.number().int(),
  lastSyncedYear: z.number().int(),
  entries: z.array(HallOfFameEntrySchema),
});

const PayloadSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  dynastiesById: z.record(z.string(), HallOfFameArchiveDynastySchema),
});

const ExportEnvelopeSchema: z.ZodType<HallOfFameArchiveExportEnvelope> = z.object({
  kind: z.literal(HALL_OF_FAME_ARCHIVE_EXPORT_KIND),
  exportedAt: z.string().min(1),
  payload: PayloadSchema,
});

function defaultPayload(): HallOfFameArchivePayload {
  return { schemaVersion: SCHEMA_VERSION, dynastiesById: {} };
}

function storage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  return null;
}

function compareEntriesByInductionNewestFirst(left: HallOfFameEntry, right: HallOfFameEntry): number {
  return right.inductionYear - left.inductionYear
    || right.peakOvr - left.peakOvr
    || left.name.localeCompare(right.name);
}

function normalizeDynasty(dynasty: HallOfFameArchiveDynasty): HallOfFameArchiveDynasty {
  return {
    ...dynasty,
    entries: [...dynasty.entries].sort(compareEntriesByInductionNewestFirst),
  };
}

function normalizePayload(payload: HallOfFameArchivePayload): HallOfFameArchivePayload {
  return {
    schemaVersion: SCHEMA_VERSION,
    dynastiesById: Object.fromEntries(
      Object.entries(payload.dynastiesById).map(([dynastyId, dynasty]) => [
        dynastyId,
        normalizeDynasty(dynasty),
      ]),
    ),
  };
}

function readPayload(): HallOfFameArchivePayload {
  const backingStore = storage();
  if (!backingStore) return defaultPayload();

  const raw = backingStore.getItem(STORAGE_KEY);
  if (!raw) return defaultPayload();

  try {
    const parsed = JSON.parse(raw);
    const validated = PayloadSchema.safeParse(parsed);
    if (!validated.success) return defaultPayload();
    return normalizePayload(validated.data);
  } catch {
    return defaultPayload();
  }
}

function writePayload(payload: HallOfFameArchivePayload): HallOfFameArchivePayload {
  const next = normalizePayload(payload);
  const backingStore = storage();
  if (!backingStore) return next;
  backingStore.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function readHallOfFameArchive(): HallOfFameArchivePayload {
  return readPayload();
}

export function exportHallOfFameArchiveJson(
  payload: HallOfFameArchivePayload = readPayload(),
  exportedAt: Date = new Date(),
): string {
  const envelope: HallOfFameArchiveExportEnvelope = {
    kind: HALL_OF_FAME_ARCHIVE_EXPORT_KIND,
    exportedAt: exportedAt.toISOString(),
    payload: normalizePayload(payload),
  };
  return JSON.stringify(envelope, null, 2);
}

export function parseHallOfFameArchiveJson(raw: string): HallOfFameArchiveImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'Import must be valid JSON.' };
  }

  const envelope = ExportEnvelopeSchema.safeParse(parsed);
  const payloadCandidate = envelope.success ? envelope.data.payload : parsed;
  const validated = PayloadSchema.safeParse(payloadCandidate);
  if (!validated.success) {
    return { ok: false, reason: 'Import is not a valid Hall of Fame archive.' };
  }

  const normalized = normalizePayload(validated.data);
  const summary = summarizeHallOfFameArchive(normalized);
  return {
    ok: true,
    payload: normalized,
    dynasties: Object.keys(normalized.dynastiesById).length,
    inductees: summary.totalInductees,
  };
}

export function importHallOfFameArchiveJson(raw: string): HallOfFameArchiveImportResult {
  const result = parseHallOfFameArchiveJson(raw);
  if (!result.ok) return result;
  return {
    ...result,
    payload: writePayload(result.payload),
  };
}

export function replaceHallOfFameArchive(payload: HallOfFameArchivePayload): HallOfFameArchivePayload {
  return writePayload(payload);
}

export function readHallOfFameDynasty(dynastyId: string): HallOfFameArchiveDynasty | null {
  return readPayload().dynastiesById[dynastyId] ?? null;
}

export function upsertHallOfFameDynasty(dynasty: HallOfFameArchiveDynasty): HallOfFameArchivePayload {
  const payload = readPayload();
  return writePayload({
    schemaVersion: SCHEMA_VERSION,
    dynastiesById: {
      ...payload.dynastiesById,
      [dynasty.dynastyId]: dynasty,
    },
  });
}

export function clearHallOfFameForDynasty(dynastyId: string): void {
  const payload = readPayload();
  if (!(dynastyId in payload.dynastiesById)) return;
  const next = { ...payload.dynastiesById };
  delete next[dynastyId];
  writePayload({
    schemaVersion: SCHEMA_VERSION,
    dynastiesById: next,
  });
}

export function summarizeHallOfFameArchive(payload: HallOfFameArchivePayload): HallOfFameArchiveSummary {
  const dynasties = Object.values(payload.dynastiesById);
  let totalInductees = 0;
  let totalHomegrown = 0;
  let totalChampionships = 0;
  let totalMvps = 0;

  for (const dynasty of dynasties) {
    totalInductees += dynasty.entries.length;
    for (const entry of dynasty.entries) {
      if (entry.teams[0] === dynasty.teamId) totalHomegrown += 1;
      totalChampionships += entry.awards.championships;
      totalMvps += entry.awards.mvps;
    }
  }

  return {
    totalInductees,
    totalHomegrown,
    totalChampionships,
    totalMvps,
    dynastiesRepresented: dynasties.filter((dynasty) => dynasty.entries.length > 0).length,
  };
}

export function listDynastiesByStartYear(payload: HallOfFameArchivePayload): HallOfFameArchiveDynasty[] {
  return Object.values(payload.dynastiesById)
    .slice()
    .sort((left, right) => left.startYear - right.startYear || left.teamAbbr.localeCompare(right.teamAbbr));
}

export function topHallOfFamerByScore(
  dynasty: HallOfFameArchiveDynasty,
): HallOfFameEntry | null {
  if (dynasty.entries.length === 0) return null;
  return [...dynasty.entries].sort((a, b) =>
    b.score - a.score
    || a.inductionYear - b.inductionYear
    || a.name.localeCompare(b.name))[0] ?? null;
}
