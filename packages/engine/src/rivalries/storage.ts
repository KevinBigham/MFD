import { z } from 'zod';
import {
  RIVALRIES_SCHEMA_VERSION,
  type DramaTag,
  type RivalryPayload,
  type RivalryRecord,
} from './types';

const STORAGE_KEY = 'mfd.rivalries.v1';

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const DramaTagSchema: z.ZodType<DramaTag> = z.enum([
  'last-second',
  'comeback-win',
  'blowout-revenge-pending',
  'streak-breaker',
  'divisional-implications',
]);

const LastMatchupSchema = z.object({
  season: z.number().int(),
  week: z.number().int(),
  result: z.enum(['win', 'loss', 'tie']),
  margin: z.number().int(),
});

const HeadToHeadRecentSchema = z.object({
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  ties: z.number().int().min(0),
});

const RivalryRecordSchema: z.ZodType<RivalryRecord> = z.object({
  opponentId: z.string().min(1),
  intensity: z.number(),
  dramaTags: z.array(DramaTagSchema),
  lastMatchup: LastMatchupSchema.nullable(),
  headToHeadRecent: HeadToHeadRecentSchema,
});

const RivalryPayloadSchema = z.object({
  schemaVersion: z.literal(RIVALRIES_SCHEMA_VERSION),
  generatedAt: z.number().int().min(0),
  teams: z.record(z.string(), z.array(RivalryRecordSchema)),
});

function defaultPayload(): RivalryPayload {
  return {
    schemaVersion: RIVALRIES_SCHEMA_VERSION,
    generatedAt: 0,
    teams: {},
  };
}

function storage(): StorageLike | null {
  const scopedGlobal = globalThis as { localStorage?: unknown };
  const candidate = scopedGlobal.localStorage;
  if (!candidate || typeof candidate !== 'object') return null;

  const maybeStorage = candidate as Partial<StorageLike>;
  if (typeof maybeStorage.getItem !== 'function' || typeof maybeStorage.setItem !== 'function') {
    return null;
  }

  return maybeStorage as StorageLike;
}

function compareRecords(left: RivalryRecord, right: RivalryRecord): number {
  const leftSeason = left.lastMatchup?.season ?? -1;
  const rightSeason = right.lastMatchup?.season ?? -1;
  const leftWeek = left.lastMatchup?.week ?? -1;
  const rightWeek = right.lastMatchup?.week ?? -1;

  return right.intensity - left.intensity
    || rightSeason - leftSeason
    || rightWeek - leftWeek
    || left.opponentId.localeCompare(right.opponentId);
}

function normalizeDramaTags(tags: DramaTag[]): DramaTag[] {
  const ordered: DramaTag[] = [
    'last-second',
    'comeback-win',
    'blowout-revenge-pending',
    'streak-breaker',
    'divisional-implications',
  ];

  return ordered.filter((tag) => tags.includes(tag));
}

function normalizeRecord(record: RivalryRecord): RivalryRecord {
  return {
    opponentId: record.opponentId,
    intensity: Math.max(0, Math.min(100, record.intensity)),
    dramaTags: normalizeDramaTags(record.dramaTags),
    lastMatchup: record.lastMatchup
      ? {
        season: record.lastMatchup.season,
        week: record.lastMatchup.week,
        result: record.lastMatchup.result,
        margin: record.lastMatchup.margin,
      }
      : null,
    headToHeadRecent: {
      wins: record.headToHeadRecent.wins,
      losses: record.headToHeadRecent.losses,
      ties: record.headToHeadRecent.ties,
    },
  };
}

function normalizePayload(payload: RivalryPayload, generatedAt = payload.generatedAt): RivalryPayload {
  return {
    schemaVersion: RIVALRIES_SCHEMA_VERSION,
    generatedAt,
    teams: Object.fromEntries(
      Object.keys(payload.teams)
        .sort((left, right) => left.localeCompare(right))
        .map((teamId) => [
          teamId,
          [...(payload.teams[teamId] ?? [])].map(normalizeRecord).sort(compareRecords),
        ]),
    ),
  };
}

export function loadRivalries(): RivalryPayload {
  const backingStore = storage();
  if (!backingStore) return defaultPayload();

  const raw = backingStore.getItem(STORAGE_KEY);
  if (!raw) return defaultPayload();

  try {
    const parsed = JSON.parse(raw);
    const validated = RivalryPayloadSchema.safeParse(parsed);
    if (!validated.success) return defaultPayload();
    return normalizePayload(validated.data);
  } catch {
    return defaultPayload();
  }
}

export function saveRivalries(payload: RivalryPayload): RivalryPayload {
  // This timestamp is storage metadata only and never feeds back into sim logic.
  const stamped = normalizePayload(payload, Date.now());
  const backingStore = storage();
  if (!backingStore) return stamped;

  backingStore.setItem(STORAGE_KEY, JSON.stringify(stamped));
  return stamped;
}
