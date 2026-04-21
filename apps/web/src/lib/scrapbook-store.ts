import type {
  BreakoutCandidate,
  Position,
  ScrapbookEntry,
  ScrapbookMoment,
  SeasonRecap,
  SeasonRecapLeader,
} from '@mfd/engine';
import { z } from 'zod';

const STORAGE_KEY = 'mfd.scrapbook.v1';
const SCHEMA_VERSION = 1 as const;

const POSITION_VALUES = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'] as const;

type ScrapbookPayload = {
  schemaVersion: typeof SCHEMA_VERSION;
  entriesByDynastyId: Record<string, ScrapbookEntry[]>;
};

const PositionSchema: z.ZodType<Position> = z.enum(POSITION_VALUES);

const ScrapbookMomentSchema: z.ZodType<ScrapbookMoment> = z.object({
  headline: z.string().min(1),
  detail: z.string(),
  week: z.number().int().nullable(),
  importance: z.enum(['breaking', 'major', 'minor']),
});

const SeasonRecapLeaderSchema: z.ZodType<SeasonRecapLeader> = z.object({
  playerId: z.string().min(1),
  playerName: z.string().min(1),
  pos: PositionSchema,
  value: z.number(),
  gamesPlayed: z.number().int().min(0),
  perGame: z.number(),
});

const BreakoutCandidateSchema: z.ZodType<BreakoutCandidate> = z.object({
  playerId: z.string().min(1),
  playerName: z.string().min(1),
  pos: PositionSchema,
  age: z.number().int().min(0),
  ovr: z.number().int().min(0),
  ovrDelta: z.number().int(),
  reason: z.string(),
});

const SeasonRecapSchema: z.ZodType<SeasonRecap> = z.object({
  teamId: z.string().min(1),
  teamName: z.string().min(1),
  teamCity: z.string().min(1),
  teamAbbr: z.string().min(1),
  seasonYear: z.number().int(),
  record: z.string().min(1),
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  ties: z.number().int().min(0),
  division: z.string().min(1),
  conference: z.enum(['AFC', 'NFC']),
  divisionFinish: z.number().int().min(1),
  conferenceFinish: z.number().int().min(1),
  playoffResult: z.enum(['missed', 'wild-card-loss', 'division-loss', 'conf-loss', 'championship-loss', 'champion']),
  teamAwards: z.array(z.string()),
  topPerformers: z.object({
    passingLeader: SeasonRecapLeaderSchema.nullable(),
    rushingLeader: SeasonRecapLeaderSchema.nullable(),
  }),
  seasonStory: z.string(),
  teamMotto: z.string().nullable(),
  breakoutCandidates: z.array(BreakoutCandidateSchema),
});

const ScrapbookEntrySchema: z.ZodType<ScrapbookEntry> = z.object({
  year: z.number().int(),
  eraTag: z.string().min(1),
  seasonHighlightLine: z.string().min(1),
  notableMoments: z.array(ScrapbookMomentSchema),
  recap: SeasonRecapSchema,
});

const ScrapbookPayloadSchema: z.ZodType<ScrapbookPayload> = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  entriesByDynastyId: z.record(z.string(), z.array(ScrapbookEntrySchema)),
});

function defaultPayload(): ScrapbookPayload {
  return {
    schemaVersion: SCHEMA_VERSION,
    entriesByDynastyId: {},
  };
}

function storage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  return null;
}

function compareEntriesNewestFirst(left: ScrapbookEntry, right: ScrapbookEntry): number {
  return right.year - left.year
    || right.recap.seasonYear - left.recap.seasonYear
    || left.recap.teamId.localeCompare(right.recap.teamId);
}

function normalizeEntries(entries: ScrapbookEntry[]): ScrapbookEntry[] {
  return [...entries].sort(compareEntriesNewestFirst);
}

function readPayload(): ScrapbookPayload {
  const backingStore = storage();
  if (!backingStore) return defaultPayload();

  const raw = backingStore.getItem(STORAGE_KEY);
  if (!raw) return defaultPayload();

  try {
    const parsed = JSON.parse(raw);
    const validated = ScrapbookPayloadSchema.safeParse(parsed);
    if (!validated.success) return defaultPayload();

    return {
      schemaVersion: SCHEMA_VERSION,
      entriesByDynastyId: Object.fromEntries(
        Object.entries(validated.data.entriesByDynastyId).map(([dynastyId, entries]) => [
          dynastyId,
          normalizeEntries(entries),
        ]),
      ),
    };
  } catch {
    return defaultPayload();
  }
}

function writePayload(payload: ScrapbookPayload): ScrapbookPayload {
  const next: ScrapbookPayload = {
    schemaVersion: SCHEMA_VERSION,
    entriesByDynastyId: Object.fromEntries(
      Object.entries(payload.entriesByDynastyId).map(([dynastyId, entries]) => [
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

export function readScrapbookForDynasty(dynastyId: string): ScrapbookEntry[] {
  const payload = readPayload();
  return payload.entriesByDynastyId[dynastyId] ?? [];
}

export function appendScrapbookEntry(dynastyId: string, entry: ScrapbookEntry): ScrapbookEntry[] {
  const payload = readPayload();
  const current = payload.entriesByDynastyId[dynastyId] ?? [];
  const existingIndex = current.findIndex((candidate) => candidate.year === entry.year);
  const nextEntries = existingIndex === -1
    ? [...current, entry]
    : current.map((candidate, index) => (index === existingIndex ? entry : candidate));

  const nextPayload = writePayload({
    schemaVersion: SCHEMA_VERSION,
    entriesByDynastyId: {
      ...payload.entriesByDynastyId,
      [dynastyId]: nextEntries,
    },
  });

  return nextPayload.entriesByDynastyId[dynastyId] ?? [];
}

export function clearScrapbookForDynasty(dynastyId: string): void {
  const payload = readPayload();
  if (!(dynastyId in payload.entriesByDynastyId)) return;

  const nextEntriesByDynastyId = { ...payload.entriesByDynastyId };
  delete nextEntriesByDynastyId[dynastyId];

  writePayload({
    schemaVersion: SCHEMA_VERSION,
    entriesByDynastyId: nextEntriesByDynastyId,
  });
}
