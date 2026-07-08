import type {
  BreakoutCandidate,
  Position,
  ScrapbookEntry,
  ScrapbookMoment,
  SeasonRecap,
  SeasonRecapLeader,
} from '@mfd/engine';
import { z } from 'zod';
import {
  mergePlayoffLoreCards,
  type PlayoffLoreCard,
  type PlayoffLoreHeroBlock,
} from './playoff-lore';

const STORAGE_KEY = 'mfd.scrapbook.v1';
const SCHEMA_VERSION = 2 as const;
const LEGACY_SCHEMA_VERSION = 1 as const;

const POSITION_VALUES = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'] as const;

export type StoredScrapbookEntry = ScrapbookEntry & {
  playoffLoreCards: PlayoffLoreCard[];
};

type ScrapbookEntryInput = ScrapbookEntry & {
  playoffLoreCards?: PlayoffLoreCard[];
};

export type ScrapbookPayload = {
  schemaVersion: typeof SCHEMA_VERSION;
  entriesByDynastyId: Record<string, StoredScrapbookEntry[]>;
  pendingPlayoffLoreByDynastyId: Record<string, Record<string, PlayoffLoreCard[]>>;
};

export interface PlayoffLoreAggregateEntry {
  dynastyId: string;
  seasonYear: number;
  card: PlayoffLoreCard;
  source: 'archived' | 'pending';
}

const PositionSchema: z.ZodType<Position> = z.enum(POSITION_VALUES);

const ScrapbookMomentSchema = z.object({
  headline: z.string().min(1),
  detail: z.string(),
  week: z.number().int().nullable(),
  importance: z.enum(['breaking', 'major', 'minor']),
});

const SeasonRecapLeaderSchema = z.object({
  playerId: z.string().min(1),
  playerName: z.string().min(1),
  pos: PositionSchema,
  value: z.number(),
  gamesPlayed: z.number().int().min(0),
  perGame: z.number(),
});

const BreakoutCandidateSchema = z.object({
  playerId: z.string().min(1),
  playerName: z.string().min(1),
  pos: PositionSchema,
  age: z.number().int().min(0),
  ovr: z.number().int().min(0),
  ovrDelta: z.number().int(),
  reason: z.string(),
});

const SeasonRecapSchema = z.object({
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

const PlayoffLoreHeroBlockSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

const PlayoffLoreCardSchema = z.object({
  gameId: z.string().min(1),
  seasonYear: z.number().int(),
  week: z.number().int(),
  round: z.enum(['wild_card', 'divisional', 'conference', 'super_bowl']),
  outcome: z.enum(['win', 'loss']),
  headline: z.string().min(1),
  finalScore: z.string().min(1),
  opponentTeamId: z.string().min(1),
  loreHook: z.string().min(1),
  heroBlocks: z.array(PlayoffLoreHeroBlockSchema).min(1),
  tags: z.array(z.string().min(1)),
  namedGameName: z.string().min(1).optional(),
});

const ScrapbookEntrySchema = z.object({
  year: z.number().int(),
  eraTag: z.string().min(1),
  seasonHighlightLine: z.string().min(1),
  notableMoments: z.array(ScrapbookMomentSchema),
  recap: SeasonRecapSchema,
});

const StoredScrapbookEntrySchema = ScrapbookEntrySchema.extend({
  playoffLoreCards: z.array(PlayoffLoreCardSchema).default([]),
});

const LegacyScrapbookPayloadSchema = z.object({
  schemaVersion: z.literal(LEGACY_SCHEMA_VERSION),
  entriesByDynastyId: z.record(z.string(), z.array(ScrapbookEntrySchema)),
});

const ScrapbookPayloadSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  entriesByDynastyId: z.record(z.string(), z.array(StoredScrapbookEntrySchema)),
  pendingPlayoffLoreByDynastyId: z.record(
    z.string(),
    z.record(z.string(), z.array(PlayoffLoreCardSchema)),
  ).default({}),
});

function defaultPayload(): ScrapbookPayload {
  return {
    schemaVersion: SCHEMA_VERSION,
    entriesByDynastyId: {},
    pendingPlayoffLoreByDynastyId: {},
  };
}

function storage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  return null;
}

function compareEntriesNewestFirst(left: StoredScrapbookEntry, right: StoredScrapbookEntry): number {
  return right.year - left.year
    || right.recap.seasonYear - left.recap.seasonYear
    || left.recap.teamId.localeCompare(right.recap.teamId);
}

function normalizeEntry(entry: ScrapbookEntryInput): StoredScrapbookEntry {
  return {
    ...entry,
    playoffLoreCards: mergePlayoffLoreCards([], entry.playoffLoreCards ?? []),
  };
}

function normalizeEntries(entries: ScrapbookEntryInput[]): StoredScrapbookEntry[] {
  return [...entries].map(normalizeEntry).sort(compareEntriesNewestFirst);
}

function normalizePendingBuckets(
  pendingBuckets: ScrapbookPayload['pendingPlayoffLoreByDynastyId'],
): ScrapbookPayload['pendingPlayoffLoreByDynastyId'] {
  return Object.fromEntries(
    Object.entries(pendingBuckets).map(([dynastyId, seasonBuckets]) => [
      dynastyId,
      Object.fromEntries(
        Object.entries(seasonBuckets).map(([seasonYear, cards]) => [
          seasonYear,
          mergePlayoffLoreCards([], cards),
        ]),
      ),
    ]),
  );
}

function readPayload(): ScrapbookPayload {
  const backingStore = storage();
  if (!backingStore) return defaultPayload();

  const raw = backingStore.getItem(STORAGE_KEY);
  if (!raw) return defaultPayload();

  try {
    const parsed = JSON.parse(raw);
    const validated = ScrapbookPayloadSchema.safeParse(parsed);
    if (validated.success) {
      return {
        schemaVersion: SCHEMA_VERSION,
        entriesByDynastyId: Object.fromEntries(
          Object.entries(validated.data.entriesByDynastyId).map(([dynastyId, entries]) => [
            dynastyId,
            normalizeEntries(entries),
          ]),
        ),
        pendingPlayoffLoreByDynastyId: normalizePendingBuckets(validated.data.pendingPlayoffLoreByDynastyId),
      };
    }

    const legacy = LegacyScrapbookPayloadSchema.safeParse(parsed);
    if (!legacy.success) return defaultPayload();

    return {
      schemaVersion: SCHEMA_VERSION,
      entriesByDynastyId: Object.fromEntries(
        Object.entries(legacy.data.entriesByDynastyId).map(([dynastyId, entries]) => [
          dynastyId,
          normalizeEntries(entries),
        ]),
      ),
      pendingPlayoffLoreByDynastyId: {},
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
    pendingPlayoffLoreByDynastyId: normalizePendingBuckets(payload.pendingPlayoffLoreByDynastyId),
  };

  const backingStore = storage();
  if (!backingStore) return next;

  backingStore.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function parseScrapbookPayload(candidate: unknown): ScrapbookPayload | null {
  const validated = ScrapbookPayloadSchema.safeParse(candidate);
  if (!validated.success) return null;

  return {
    schemaVersion: SCHEMA_VERSION,
    entriesByDynastyId: Object.fromEntries(
      Object.entries(validated.data.entriesByDynastyId).map(([dynastyId, entries]) => [
        dynastyId,
        normalizeEntries(entries),
      ]),
    ),
    pendingPlayoffLoreByDynastyId: normalizePendingBuckets(validated.data.pendingPlayoffLoreByDynastyId),
  };
}

export function readScrapbookStore(): ScrapbookPayload {
  return readPayload();
}

export function replaceScrapbookStore(payload: ScrapbookPayload): ScrapbookPayload {
  return writePayload(payload);
}

function seasonKey(seasonYear: number): string {
  return String(seasonYear);
}

export function readScrapbookForDynasty(dynastyId: string): StoredScrapbookEntry[] {
  const payload = readPayload();
  return payload.entriesByDynastyId[dynastyId] ?? [];
}

export function readPendingPlayoffLoreCards(dynastyId: string, seasonYear: number): PlayoffLoreCard[] {
  const payload = readPayload();
  return payload.pendingPlayoffLoreByDynastyId[dynastyId]?.[seasonKey(seasonYear)] ?? [];
}

export function listAllPlayoffLoreCards(): PlayoffLoreAggregateEntry[] {
  const payload = readPayload();
  const aggregate: PlayoffLoreAggregateEntry[] = [];

  for (const [dynastyId, entries] of Object.entries(payload.entriesByDynastyId)) {
    for (const entry of entries) {
      for (const card of entry.playoffLoreCards ?? []) {
        aggregate.push({
          dynastyId,
          seasonYear: card.seasonYear,
          card,
          source: 'archived',
        });
      }
    }
  }

  for (const [dynastyId, seasonBuckets] of Object.entries(payload.pendingPlayoffLoreByDynastyId)) {
    for (const [seasonYear, cards] of Object.entries(seasonBuckets)) {
      for (const card of cards) {
        aggregate.push({
          dynastyId,
          seasonYear: Number(seasonYear) || card.seasonYear,
          card,
          source: 'pending',
        });
      }
    }
  }

  return aggregate;
}

export function stagePendingPlayoffLoreCard(
  dynastyId: string,
  seasonYear: number,
  card: PlayoffLoreCard,
): PlayoffLoreCard[] {
  const payload = readPayload();
  const currentCards = payload.pendingPlayoffLoreByDynastyId[dynastyId]?.[seasonKey(seasonYear)] ?? [];
  const mergedCards = mergePlayoffLoreCards(currentCards, card);

  const nextPayload = writePayload({
    schemaVersion: SCHEMA_VERSION,
    entriesByDynastyId: payload.entriesByDynastyId,
    pendingPlayoffLoreByDynastyId: {
      ...payload.pendingPlayoffLoreByDynastyId,
      [dynastyId]: {
        ...(payload.pendingPlayoffLoreByDynastyId[dynastyId] ?? {}),
        [seasonKey(seasonYear)]: mergedCards,
      },
    },
  });

  return nextPayload.pendingPlayoffLoreByDynastyId[dynastyId]?.[seasonKey(seasonYear)] ?? [];
}

export function appendScrapbookEntry(dynastyId: string, entry: ScrapbookEntryInput): StoredScrapbookEntry[] {
  const payload = readPayload();
  const current = payload.entriesByDynastyId[dynastyId] ?? [];
  const mergedEntry = normalizeEntry({
    ...entry,
    playoffLoreCards: mergePlayoffLoreCards(
      entry.playoffLoreCards ?? [],
      readPendingPlayoffLoreCards(dynastyId, entry.year),
    ),
  });
  const existingIndex = current.findIndex((candidate) => candidate.year === entry.year);
  const nextEntries = existingIndex === -1
    ? [...current, mergedEntry]
    : current.map((candidate, index) => (index === existingIndex ? mergedEntry : candidate));

  const nextPendingByDynastyId = {
    ...payload.pendingPlayoffLoreByDynastyId,
  };
  const dynastyPending = { ...(nextPendingByDynastyId[dynastyId] ?? {}) };
  delete dynastyPending[seasonKey(entry.year)];
  if (Object.keys(dynastyPending).length > 0) {
    nextPendingByDynastyId[dynastyId] = dynastyPending;
  } else {
    delete nextPendingByDynastyId[dynastyId];
  }

  const nextPayload = writePayload({
    schemaVersion: SCHEMA_VERSION,
    entriesByDynastyId: {
      ...payload.entriesByDynastyId,
      [dynastyId]: nextEntries,
    },
    pendingPlayoffLoreByDynastyId: nextPendingByDynastyId,
  });

  return nextPayload.entriesByDynastyId[dynastyId] ?? [];
}

export function clearScrapbookForDynasty(dynastyId: string): void {
  const payload = readPayload();
  if (!(dynastyId in payload.entriesByDynastyId) && !(dynastyId in payload.pendingPlayoffLoreByDynastyId)) return;

  const nextEntriesByDynastyId = { ...payload.entriesByDynastyId };
  delete nextEntriesByDynastyId[dynastyId];
  const nextPendingPlayoffLoreByDynastyId = { ...payload.pendingPlayoffLoreByDynastyId };
  delete nextPendingPlayoffLoreByDynastyId[dynastyId];

  writePayload({
    schemaVersion: SCHEMA_VERSION,
    entriesByDynastyId: nextEntriesByDynastyId,
    pendingPlayoffLoreByDynastyId: nextPendingPlayoffLoreByDynastyId,
  });
}
