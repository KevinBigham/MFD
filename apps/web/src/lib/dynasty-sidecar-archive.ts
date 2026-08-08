import { z } from 'zod';
import {
  type RivalryPayload,
} from '@mfd/engine';
import {
  parseHallOfFameArchiveJson,
  readHallOfFameArchive,
  replaceHallOfFameArchive,
  summarizeHallOfFameArchive,
  type HallOfFameArchivePayload,
} from './hall-of-fame-archive';
import {
  parseScrapbookPayload,
  readScrapbookStore,
  replaceScrapbookStore,
  type ScrapbookPayload,
} from './scrapbook-store';
import {
  parseRookieOfYearPayload,
  readRookieOfYearStore,
  replaceRookieOfYearStore,
  type RookieOfYearPayload,
} from './rookie-of-year-store';
import {
  parseRosterContinuityPayload,
  readRosterContinuity,
  replaceRosterContinuity,
  type RosterContinuityPayload,
} from './roster-continuity-store';
import {
  parseCareerMetaPayload,
  readCareerMeta,
  replaceCareerMeta,
  type CareerMeta,
} from './career-meta';
import {
  loadRivalries,
  parseRivalryPayload,
  replaceRivalries,
} from './rivalry-storage';

export const DYNASTY_SIDECAR_ARCHIVE_KIND = 'mfd.dynastySidecars.archive.v1' as const;
const SCHEMA_VERSION = 1 as const;

export const DYNASTY_SIDECAR_STORE_LABELS = {
  hallOfFame: 'Hall of Fame archive',
  scrapbook: 'Scrapbook and playoff lore',
  rookieOfYear: 'Rookie of the Year history',
  rosterContinuity: 'Roster continuity',
  careerMeta: 'GM career meta',
  rivalries: 'Rivalry heat',
} as const;

export type DynastySidecarStoreKey = keyof typeof DYNASTY_SIDECAR_STORE_LABELS;

const REQUIRED_STORE_KEYS = [
  'hallOfFame',
  'scrapbook',
  'rookieOfYear',
  'rosterContinuity',
  'careerMeta',
] as const satisfies readonly DynastySidecarStoreKey[];

const ALL_STORE_KEYS = [
  ...REQUIRED_STORE_KEYS,
  'rivalries',
] as const satisfies readonly DynastySidecarStoreKey[];

export interface DynastySidecarArchivePayload {
  schemaVersion: typeof SCHEMA_VERSION;
  sidecars: {
    hallOfFame: HallOfFameArchivePayload;
    scrapbook: ScrapbookPayload;
    rookieOfYear: RookieOfYearPayload;
    rosterContinuity: RosterContinuityPayload;
    careerMeta: CareerMeta;
    rivalries?: RivalryPayload;
  };
}

export interface DynastySidecarArchiveEnvelope {
  kind: typeof DYNASTY_SIDECAR_ARCHIVE_KIND;
  exportedAt: string;
  payload: DynastySidecarArchivePayload;
}

export interface DynastySidecarArchiveSummary {
  dynasties: number;
  hallOfFameInductees: number;
  scrapbookEntries: number;
  pendingPlayoffLoreCards: number;
  rookieOfYearEntries: number;
  rosterContinuityDynasties: number;
  careerMetaDynasties: number;
  rivalryTeams: number;
  rivalryRecords: number;
  dynastyIds: string[];
  includedStores: DynastySidecarStoreKey[];
  missingStores: DynastySidecarStoreKey[];
}

export type DynastySidecarArchiveImportResult =
  | {
    ok: true;
    payload: DynastySidecarArchivePayload;
    summary: DynastySidecarArchiveSummary;
  }
  | {
    ok: false;
    reason: string;
  };

const PayloadShapeSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  sidecars: z.object({
    hallOfFame: z.unknown(),
    scrapbook: z.unknown(),
    rookieOfYear: z.unknown(),
    rosterContinuity: z.unknown(),
    careerMeta: z.unknown(),
    rivalries: z.unknown().optional(),
  }),
});

const EnvelopeShapeSchema = z.object({
  kind: z.literal(DYNASTY_SIDECAR_ARCHIVE_KIND),
  exportedAt: z.string().min(1),
  payload: z.unknown(),
});

function parseHallOfFamePayload(candidate: unknown): HallOfFameArchivePayload | null {
  const raw = JSON.stringify(candidate);
  if (!raw) return null;
  const result = parseHallOfFameArchiveJson(raw);
  return result.ok ? result.payload : null;
}

function parsePayload(candidate: unknown): DynastySidecarArchivePayload | null {
  const shaped = PayloadShapeSchema.safeParse(candidate);
  if (!shaped.success) return null;

  const hallOfFame = parseHallOfFamePayload(shaped.data.sidecars.hallOfFame);
  const scrapbook = parseScrapbookPayload(shaped.data.sidecars.scrapbook);
  const rookieOfYear = parseRookieOfYearPayload(shaped.data.sidecars.rookieOfYear);
  const rosterContinuity = parseRosterContinuityPayload(shaped.data.sidecars.rosterContinuity);
  const careerMeta = parseCareerMetaPayload(shaped.data.sidecars.careerMeta);
  const hasRivalries = Object.prototype.hasOwnProperty.call(shaped.data.sidecars, 'rivalries');
  const rivalries = hasRivalries ? parseRivalryPayload(shaped.data.sidecars.rivalries) : undefined;

  if (!hallOfFame || !scrapbook || !rookieOfYear || !rosterContinuity || !careerMeta || (hasRivalries && !rivalries)) {
    return null;
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    sidecars: {
      hallOfFame,
      scrapbook,
      rookieOfYear,
      rosterContinuity,
      careerMeta,
      ...(rivalries ? { rivalries } : {}),
    },
  };
}

function countPendingPlayoffLoreCards(payload: ScrapbookPayload): number {
  return Object.values(payload.pendingPlayoffLoreByDynastyId).reduce((dynastyTotal, seasonBuckets) => (
    dynastyTotal + Object.values(seasonBuckets).reduce((seasonTotal, cards) => seasonTotal + cards.length, 0)
  ), 0);
}

export function summarizeDynastySidecarArchive(
  payload: DynastySidecarArchivePayload,
): DynastySidecarArchiveSummary {
  const dynastyIds = new Set<string>();
  Object.keys(payload.sidecars.hallOfFame.dynastiesById).forEach((dynastyId) => dynastyIds.add(dynastyId));
  Object.keys(payload.sidecars.scrapbook.entriesByDynastyId).forEach((dynastyId) => dynastyIds.add(dynastyId));
  Object.keys(payload.sidecars.scrapbook.pendingPlayoffLoreByDynastyId).forEach((dynastyId) => dynastyIds.add(dynastyId));
  Object.keys(payload.sidecars.rookieOfYear.byDynastyId).forEach((dynastyId) => dynastyIds.add(dynastyId));
  Object.keys(payload.sidecars.rosterContinuity.byDynastyId).forEach((dynastyId) => dynastyIds.add(dynastyId));
  payload.sidecars.careerMeta.dynasties.forEach((dynasty) => dynastyIds.add(dynasty.dynastyId));
  const includedStores = ALL_STORE_KEYS.filter((key) => key !== 'rivalries' || Boolean(payload.sidecars.rivalries));
  const missingStores = ALL_STORE_KEYS.filter((key) => !includedStores.includes(key));
  const rivalries = payload.sidecars.rivalries;

  return {
    dynasties: dynastyIds.size,
    hallOfFameInductees: summarizeHallOfFameArchive(payload.sidecars.hallOfFame).totalInductees,
    scrapbookEntries: Object.values(payload.sidecars.scrapbook.entriesByDynastyId)
      .reduce((total, entries) => total + entries.length, 0),
    pendingPlayoffLoreCards: countPendingPlayoffLoreCards(payload.sidecars.scrapbook),
    rookieOfYearEntries: Object.values(payload.sidecars.rookieOfYear.byDynastyId)
      .reduce((total, entries) => total + entries.length, 0),
    rosterContinuityDynasties: Object.keys(payload.sidecars.rosterContinuity.byDynastyId).length,
    careerMetaDynasties: payload.sidecars.careerMeta.dynasties.length,
    rivalryTeams: rivalries ? Object.keys(rivalries.teams).length : 0,
    rivalryRecords: Object.values(rivalries?.teams ?? {})
      .reduce((total, records) => total + records.length, 0),
    dynastyIds: [...dynastyIds].sort((left, right) => left.localeCompare(right)),
    includedStores,
    missingStores,
  };
}

export function readDynastySidecarArchivePayload(): DynastySidecarArchivePayload {
  return {
    schemaVersion: SCHEMA_VERSION,
    sidecars: {
      hallOfFame: readHallOfFameArchive(),
      scrapbook: readScrapbookStore(),
      rookieOfYear: readRookieOfYearStore(),
      rosterContinuity: readRosterContinuity(),
      careerMeta: readCareerMeta(),
      rivalries: loadRivalries(),
    },
  };
}

export function exportDynastySidecarArchiveJson(
  payload: DynastySidecarArchivePayload = readDynastySidecarArchivePayload(),
  exportedAt: Date = new Date(),
): string {
  const envelope: DynastySidecarArchiveEnvelope = {
    kind: DYNASTY_SIDECAR_ARCHIVE_KIND,
    exportedAt: exportedAt.toISOString(),
    payload,
  };
  return JSON.stringify(envelope, null, 2);
}

export function parseDynastySidecarArchiveJson(raw: string): DynastySidecarArchiveImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'Sidecar archive must be valid JSON.' };
  }

  const envelope = EnvelopeShapeSchema.safeParse(parsed);
  const payloadCandidate = envelope.success ? envelope.data.payload : parsed;
  const payload = parsePayload(payloadCandidate);
  if (!payload) {
    return { ok: false, reason: 'Import is not a valid complete-dynasty sidecar archive.' };
  }

  return {
    ok: true,
    payload,
    summary: summarizeDynastySidecarArchive(payload),
  };
}

export interface DynastySidecarMergePlan {
  incomingDynastyIds: string[];
  selectedDynastyIds: string[];
  unknownSelectedDynastyIds: string[];
  canApply: boolean;
  dynastyStatuses: Array<{
    dynastyId: string;
    status: 'new' | 'overwrite';
    hasIncomingHallOfFame: boolean;
    hasIncomingScrapbook: boolean;
    hasIncomingRookieOfYear: boolean;
    hasIncomingRosterContinuity: boolean;
    hasIncomingCareerMeta: boolean;
  }>;
  totalAddedDynasties: number;
  totalOverwrittenDynasties: number;
}

export function planDynastySidecarMerge(
  localPayload: DynastySidecarArchivePayload,
  incomingPayload: DynastySidecarArchivePayload,
  selectedDynastyIds: string[],
): DynastySidecarMergePlan {
  const incomingSummary = summarizeDynastySidecarArchive(incomingPayload);
  const localSummary = summarizeDynastySidecarArchive(localPayload);

  const incomingSet = new Set(incomingSummary.dynastyIds);
  const localSet = new Set(localSummary.dynastyIds);

  const unknownSelectedDynastyIds = selectedDynastyIds.filter((id) => !incomingSet.has(id));
  const canApply = selectedDynastyIds.length > 0 && unknownSelectedDynastyIds.length === 0;

  const dynastyStatuses = selectedDynastyIds.map((dynastyId) => {
    const status: 'new' | 'overwrite' = localSet.has(dynastyId) ? 'overwrite' : 'new';
    return {
      dynastyId,
      status,
      hasIncomingHallOfFame: Object.prototype.hasOwnProperty.call(incomingPayload.sidecars.hallOfFame.dynastiesById, dynastyId),
      hasIncomingScrapbook: Object.prototype.hasOwnProperty.call(incomingPayload.sidecars.scrapbook.entriesByDynastyId, dynastyId)
        || Object.prototype.hasOwnProperty.call(incomingPayload.sidecars.scrapbook.pendingPlayoffLoreByDynastyId, dynastyId),
      hasIncomingRookieOfYear: Object.prototype.hasOwnProperty.call(incomingPayload.sidecars.rookieOfYear.byDynastyId, dynastyId),
      hasIncomingRosterContinuity: Object.prototype.hasOwnProperty.call(incomingPayload.sidecars.rosterContinuity.byDynastyId, dynastyId),
      hasIncomingCareerMeta: incomingPayload.sidecars.careerMeta.dynasties.some((d) => d.dynastyId === dynastyId),
    };
  });

  const totalAddedDynasties = dynastyStatuses.filter((s) => s.status === 'new').length;
  const totalOverwrittenDynasties = dynastyStatuses.filter((s) => s.status === 'overwrite').length;

  return {
    incomingDynastyIds: incomingSummary.dynastyIds,
    selectedDynastyIds,
    unknownSelectedDynastyIds,
    canApply,
    dynastyStatuses,
    totalAddedDynasties,
    totalOverwrittenDynasties,
  };
}

export function mergeDynastySidecarPayloads(
  localPayload: DynastySidecarArchivePayload,
  incomingPayload: DynastySidecarArchivePayload,
  selectedDynastyIds: string[],
): DynastySidecarArchivePayload {
  const plan = planDynastySidecarMerge(localPayload, incomingPayload, selectedDynastyIds);
  if (!plan.canApply) {
    throw new Error(`Cannot apply selective sidecar merge: ${plan.unknownSelectedDynastyIds.length ? 'Unknown selected dynasty IDs' : 'No dynasties selected'}.`);
  }

  // Hall of Fame
  const hallOfFameDynasties = { ...localPayload.sidecars.hallOfFame.dynastiesById };
  for (const dynastyId of selectedDynastyIds) {
    const incomingHof = incomingPayload.sidecars.hallOfFame.dynastiesById[dynastyId];
    if (incomingHof !== undefined) {
      hallOfFameDynasties[dynastyId] = incomingHof;
    }
  }
  const hallOfFame = {
    ...localPayload.sidecars.hallOfFame,
    dynastiesById: hallOfFameDynasties,
  };

  // Scrapbook
  const entriesByDynastyId = { ...localPayload.sidecars.scrapbook.entriesByDynastyId };
  const pendingPlayoffLoreByDynastyId = { ...localPayload.sidecars.scrapbook.pendingPlayoffLoreByDynastyId };
  for (const dynastyId of selectedDynastyIds) {
    const incomingEntries = incomingPayload.sidecars.scrapbook.entriesByDynastyId[dynastyId];
    if (incomingEntries !== undefined) {
      entriesByDynastyId[dynastyId] = incomingEntries;
    }
    const incomingLore = incomingPayload.sidecars.scrapbook.pendingPlayoffLoreByDynastyId[dynastyId];
    if (incomingLore !== undefined) {
      pendingPlayoffLoreByDynastyId[dynastyId] = incomingLore;
    }
  }
  const scrapbook = {
    ...localPayload.sidecars.scrapbook,
    entriesByDynastyId,
    pendingPlayoffLoreByDynastyId,
  };

  // Rookie of the Year
  const rookieOfYearByDynastyId = { ...localPayload.sidecars.rookieOfYear.byDynastyId };
  for (const dynastyId of selectedDynastyIds) {
    const incomingRoy = incomingPayload.sidecars.rookieOfYear.byDynastyId[dynastyId];
    if (incomingRoy !== undefined) {
      rookieOfYearByDynastyId[dynastyId] = incomingRoy;
    }
  }
  const rookieOfYear = {
    ...localPayload.sidecars.rookieOfYear,
    byDynastyId: rookieOfYearByDynastyId,
  };

  // Roster Continuity
  const rosterContinuityByDynastyId = { ...localPayload.sidecars.rosterContinuity.byDynastyId };
  for (const dynastyId of selectedDynastyIds) {
    const incomingRc = incomingPayload.sidecars.rosterContinuity.byDynastyId[dynastyId];
    if (incomingRc !== undefined) {
      rosterContinuityByDynastyId[dynastyId] = incomingRc;
    }
  }
  const rosterContinuity = {
    ...localPayload.sidecars.rosterContinuity,
    byDynastyId: rosterContinuityByDynastyId,
  };

  // GM Career Meta
  const incomingDynastySummaries = incomingPayload.sidecars.careerMeta.dynasties;
  const mergedDynastySummaries = [...localPayload.sidecars.careerMeta.dynasties];
  for (const dynastyId of selectedDynastyIds) {
    const incomingSummary = incomingDynastySummaries.find((d) => d.dynastyId === dynastyId);
    if (incomingSummary) {
      const idx = mergedDynastySummaries.findIndex((d) => d.dynastyId === dynastyId);
      if (idx !== -1) {
        mergedDynastySummaries[idx] = incomingSummary;
      } else {
        mergedDynastySummaries.push(incomingSummary);
      }
    }
  }
  const careerMeta = {
    ...localPayload.sidecars.careerMeta,
    dynasties: mergedDynastySummaries,
  };

  // Rivalries: PRESERVED unchanged in selective mode!
  const rivalries = localPayload.sidecars.rivalries;

  return {
    schemaVersion: 1,
    sidecars: {
      hallOfFame,
      scrapbook,
      rookieOfYear,
      rosterContinuity,
      careerMeta,
      ...(rivalries ? { rivalries } : {}),
    },
  };
}

export function mergeDynastySidecarArchiveJson(
  raw: string,
  selectedDynastyIds: string[],
): DynastySidecarArchiveImportResult {
  const parsed = parseDynastySidecarArchiveJson(raw);
  if (!parsed.ok) return parsed;

  const localPayload = readDynastySidecarArchivePayload();
  const plan = planDynastySidecarMerge(localPayload, parsed.payload, selectedDynastyIds);
  if (!plan.canApply) {
    if (selectedDynastyIds.length === 0) {
      return { ok: false, reason: 'No dynasties selected for selective sidecar import.' };
    }
    return { ok: false, reason: `Unknown selected dynasty IDs: ${plan.unknownSelectedDynastyIds.join(', ')}` };
  }

  const mergedPayload = mergeDynastySidecarPayloads(localPayload, parsed.payload, selectedDynastyIds);

  replaceHallOfFameArchive(mergedPayload.sidecars.hallOfFame);
  replaceScrapbookStore(mergedPayload.sidecars.scrapbook);
  replaceRookieOfYearStore(mergedPayload.sidecars.rookieOfYear);
  replaceRosterContinuity(mergedPayload.sidecars.rosterContinuity);
  replaceCareerMeta(mergedPayload.sidecars.careerMeta);
  // Note: replaceRivalries is NOT called in selective mode to preserve local rivalry heat!

  return {
    ok: true,
    payload: readDynastySidecarArchivePayload(),
    summary: summarizeDynastySidecarArchive(readDynastySidecarArchivePayload()),
  };
}

export function importDynastySidecarArchiveJson(raw: string): DynastySidecarArchiveImportResult {
  const result = parseDynastySidecarArchiveJson(raw);
  if (!result.ok) return result;

  replaceHallOfFameArchive(result.payload.sidecars.hallOfFame);
  replaceScrapbookStore(result.payload.sidecars.scrapbook);
  replaceRookieOfYearStore(result.payload.sidecars.rookieOfYear);
  replaceRosterContinuity(result.payload.sidecars.rosterContinuity);
  replaceCareerMeta(result.payload.sidecars.careerMeta);
  if (result.payload.sidecars.rivalries) {
    replaceRivalries(result.payload.sidecars.rivalries);
  }

  return {
    ...result,
    payload: readDynastySidecarArchivePayload(),
  };
}
