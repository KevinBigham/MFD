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

// ── C8 phase 2: selective per-dynasty merge ─────────────
// Unlike the wholesale import above (which replaces whole stores), the
// selective merge works per dynasty: chosen archive dynasties are written
// over (or added to) the local stores while every unselected dynasty —
// local or archive — is left byte-identical. Nothing local can be
// surprise-wiped. Rivalry heat is league-scoped rather than
// dynasty-scoped, so selective import never touches it; the wholesale
// import remains the rivalry path.

export type DynastySidecarMergeOutcome = 'added' | 'overwritten';

export interface DynastySidecarStoreMergeDetail {
  store: DynastySidecarStoreKey;
  outcome: DynastySidecarMergeOutcome;
  detail: string;
}

export interface DynastySidecarMergeConflict {
  dynastyId: string;
  stores: DynastySidecarStoreMergeDetail[];
}

export interface DynastySidecarMergePlan {
  selectedDynastyIds: string[];
  conflicts: DynastySidecarMergeConflict[];
  notes: string[];
}

export type DynastySidecarArchiveMergeResult =
  | {
    ok: true;
    payload: DynastySidecarArchivePayload;
    summary: DynastySidecarArchiveSummary;
    plan: DynastySidecarMergePlan;
  }
  | {
    ok: false;
    reason: string;
  };

export const SELECTIVE_MERGE_RIVALRY_NOTE =
  'Rivalry heat is league-scoped, not per-dynasty — selective import leaves it untouched. Use the full-archive import to move rivalry data.';

function detail(store: DynastySidecarStoreKey, hasLocal: boolean, text: string): DynastySidecarStoreMergeDetail {
  return { store, outcome: hasLocal ? 'overwritten' : 'added', detail: text };
}

export function planDynastySidecarMerge(
  imported: DynastySidecarArchivePayload,
  selectedDynastyIds: readonly string[],
  current: DynastySidecarArchivePayload = readDynastySidecarArchivePayload(),
): DynastySidecarMergePlan {
  const archiveIds = new Set(summarizeDynastySidecarArchive(imported).dynastyIds);
  const known = [...new Set(selectedDynastyIds)].filter((id) => archiveIds.has(id));
  const unknown = [...new Set(selectedDynastyIds)].filter((id) => !archiveIds.has(id));

  const conflicts: DynastySidecarMergeConflict[] = known.map((dynastyId) => {
    const stores: DynastySidecarStoreMergeDetail[] = [];

    const importedHof = imported.sidecars.hallOfFame.dynastiesById[dynastyId];
    if (importedHof) {
      stores.push(detail('hallOfFame', Boolean(current.sidecars.hallOfFame.dynastiesById[dynastyId]),
        `${importedHof.entries.length} inductee(s), synced through ${importedHof.lastSyncedYear}`));
    }

    const importedEntries = imported.sidecars.scrapbook.entriesByDynastyId[dynastyId];
    const importedLore = imported.sidecars.scrapbook.pendingPlayoffLoreByDynastyId[dynastyId];
    if (importedEntries || importedLore) {
      const loreCount = Object.values(importedLore ?? {}).reduce((total, cards) => total + cards.length, 0);
      const hasLocal = Boolean(current.sidecars.scrapbook.entriesByDynastyId[dynastyId])
        || Boolean(current.sidecars.scrapbook.pendingPlayoffLoreByDynastyId[dynastyId]);
      stores.push(detail('scrapbook', hasLocal,
        `${importedEntries?.length ?? 0} scrapbook entrie(s), ${loreCount} pending lore card(s)`));
    }

    const importedRoy = imported.sidecars.rookieOfYear.byDynastyId[dynastyId];
    if (importedRoy) {
      stores.push(detail('rookieOfYear', Boolean(current.sidecars.rookieOfYear.byDynastyId[dynastyId]),
        `${importedRoy.length} Rookie of the Year entrie(s)`));
    }

    const importedContinuity = imported.sidecars.rosterContinuity.byDynastyId[dynastyId];
    if (importedContinuity) {
      stores.push(detail('rosterContinuity', Boolean(current.sidecars.rosterContinuity.byDynastyId[dynastyId]),
        `continuity snapshot through ${importedContinuity.lastSyncedYear}`));
    }

    const importedCareer = imported.sidecars.careerMeta.dynasties.find((dynasty) => dynasty.dynastyId === dynastyId);
    if (importedCareer) {
      stores.push(detail('careerMeta',
        current.sidecars.careerMeta.dynasties.some((dynasty) => dynasty.dynastyId === dynastyId),
        `${importedCareer.seasonsCoached} season(s) coached, ${importedCareer.wins}-${importedCareer.losses}`));
    }

    return { dynastyId, stores };
  });

  const notes: string[] = [];
  if (unknown.length > 0) {
    notes.push(`Not present in this archive, ignored: ${unknown.join(', ')}.`);
  }
  if (known.length === 0) {
    notes.push('No dynasties selected — importing nothing.');
  }
  notes.push(SELECTIVE_MERGE_RIVALRY_NOTE);

  return { selectedDynastyIds: known, conflicts, notes };
}

export function mergeDynastySidecarPayloads(
  imported: DynastySidecarArchivePayload,
  current: DynastySidecarArchivePayload,
  selectedDynastyIds: readonly string[],
): DynastySidecarArchivePayload {
  const picked = new Set(selectedDynastyIds);
  const pickKeys = <T>(source: Record<string, T>): Record<string, T> => Object.fromEntries(
    Object.entries(source).filter(([dynastyId]) => picked.has(dynastyId)),
  );

  const careerKeep = current.sidecars.careerMeta.dynasties.filter((dynasty) => !picked.has(dynasty.dynastyId));
  const careerAdd = imported.sidecars.careerMeta.dynasties.filter((dynasty) => picked.has(dynasty.dynastyId));

  return {
    schemaVersion: SCHEMA_VERSION,
    sidecars: {
      hallOfFame: {
        schemaVersion: current.sidecars.hallOfFame.schemaVersion,
        dynastiesById: {
          ...current.sidecars.hallOfFame.dynastiesById,
          ...pickKeys(imported.sidecars.hallOfFame.dynastiesById),
        },
      },
      scrapbook: {
        schemaVersion: current.sidecars.scrapbook.schemaVersion,
        entriesByDynastyId: {
          ...current.sidecars.scrapbook.entriesByDynastyId,
          ...pickKeys(imported.sidecars.scrapbook.entriesByDynastyId),
        },
        pendingPlayoffLoreByDynastyId: {
          ...current.sidecars.scrapbook.pendingPlayoffLoreByDynastyId,
          ...pickKeys(imported.sidecars.scrapbook.pendingPlayoffLoreByDynastyId),
        },
      },
      rookieOfYear: {
        schemaVersion: current.sidecars.rookieOfYear.schemaVersion,
        byDynastyId: {
          ...current.sidecars.rookieOfYear.byDynastyId,
          ...pickKeys(imported.sidecars.rookieOfYear.byDynastyId),
        },
      },
      rosterContinuity: {
        schemaVersion: current.sidecars.rosterContinuity.schemaVersion,
        byDynastyId: {
          ...current.sidecars.rosterContinuity.byDynastyId,
          ...pickKeys(imported.sidecars.rosterContinuity.byDynastyId),
        },
      },
      careerMeta: {
        schemaVersion: current.sidecars.careerMeta.schemaVersion,
        dynasties: [...careerKeep, ...careerAdd],
        // replaceCareerMeta normalizes on write and recomputes careerTotals
        // from the merged dynasty list, so the carried value is inert.
        careerTotals: current.sidecars.careerMeta.careerTotals,
      },
      // Rivalries are league-scoped: untouched by selective merge.
      ...(current.sidecars.rivalries ? { rivalries: current.sidecars.rivalries } : {}),
    },
  };
}

export function mergeDynastySidecarArchiveJson(
  raw: string,
  options: { dynastyIds?: readonly string[] } = {},
): DynastySidecarArchiveMergeResult {
  const result = parseDynastySidecarArchiveJson(raw);
  if (!result.ok) return result;

  const selection = options.dynastyIds ?? result.summary.dynastyIds;
  const current = readDynastySidecarArchivePayload();
  const plan = planDynastySidecarMerge(result.payload, selection, current);
  const merged = mergeDynastySidecarPayloads(result.payload, current, plan.selectedDynastyIds);

  replaceHallOfFameArchive(merged.sidecars.hallOfFame);
  replaceScrapbookStore(merged.sidecars.scrapbook);
  replaceRookieOfYearStore(merged.sidecars.rookieOfYear);
  replaceRosterContinuity(merged.sidecars.rosterContinuity);
  replaceCareerMeta(merged.sidecars.careerMeta);

  const payload = readDynastySidecarArchivePayload();
  return {
    ok: true,
    payload,
    summary: summarizeDynastySidecarArchive(payload),
    plan,
  };
}
