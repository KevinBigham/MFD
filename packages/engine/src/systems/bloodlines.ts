import { mulberry32 } from '../rng';
import type {
  BloodlineInfo,
  BloodlineLegacyTag,
  DraftProspect,
  GameState,
  HallOfFameEntry,
  PlayerArchiveEntry,
  Position,
} from '../types';

export const BLOODLINE_CLASS_CHANCE = 0.05;
export const MAX_BLOODLINES_PER_CLASS = 3;

const BLOODLINE_RNG_SALT = 0xb100d;

export interface BloodlineParentCandidate {
  playerId: string;
  name: string;
  primaryTeamId: string;
  position: Position;
  peakOvr: number;
  legacyTag: BloodlineLegacyTag;
}

interface BloodlineAssignmentOptions {
  chance?: number;
  maxPerClass?: number;
  rand?: () => number;
}

function primaryTeamId(entry: PlayerArchiveEntry): string | null {
  const [primary] = [...entry.teamHistory].sort((a, b) => {
    const aSeasons = Math.max(1, a.lastYear - a.firstYear + 1);
    const bSeasons = Math.max(1, b.lastYear - b.firstYear + 1);
    return bSeasons - aSeasons || a.teamId.localeCompare(b.teamId);
  });
  return primary?.teamId ?? null;
}

function hallOfFameByPlayerId(hallOfFame: readonly HallOfFameEntry[]): Map<string, HallOfFameEntry> {
  return new Map(hallOfFame.map((entry) => [entry.playerId, entry]));
}

function legacyTagFor(entry: PlayerArchiveEntry, hofEntry: HallOfFameEntry | undefined): BloodlineLegacyTag {
  const championships = hofEntry?.awards.championships ?? 0;
  if (championships > 0 || (hofEntry?.score ?? 0) >= 96) return 'franchise_royalty';
  if (entry.peakOvr >= 90) return 'famous_name';
  if (entry.peakOvr < 85 && hofEntry) return 'chip_on_shoulder';
  return 'late_bloomer_family';
}

function isArchivedLegend(entry: PlayerArchiveEntry, hofEntry: HallOfFameEntry | undefined, year: number): boolean {
  const isArchivedOrRetired = entry.retirementYear !== null || entry.lastYear < year;
  if (!isArchivedOrRetired) return false;
  return entry.peakOvr >= 85 || Boolean(hofEntry);
}

function bloodlineRng(seed: number, year: number): () => number {
  return mulberry32((seed ^ Math.imul(year, 104729) ^ BLOODLINE_RNG_SALT) >>> 0);
}

export function selectEligibleBloodlineParents(game: Pick<GameState, 'playerArchive' | 'hallOfFame' | 'year'>): BloodlineParentCandidate[] {
  const hallById = hallOfFameByPlayerId(game.hallOfFame);
  return game.playerArchive
    .filter((entry) => entry.teamHistory.length > 0)
    .filter((entry) => isArchivedLegend(entry, hallById.get(entry.playerId), game.year))
    .map((entry) => {
      const teamId = primaryTeamId(entry);
      const position = entry.positions[0] ?? hallById.get(entry.playerId)?.position ?? 'WR';
      if (!teamId) return null;
      return {
        playerId: entry.playerId,
        name: entry.name,
        primaryTeamId: teamId,
        position,
        peakOvr: entry.peakOvr,
        legacyTag: legacyTagFor(entry, hallById.get(entry.playerId)),
      };
    })
    .filter((candidate): candidate is BloodlineParentCandidate => candidate !== null)
    .sort((a, b) => b.peakOvr - a.peakOvr || a.playerId.localeCompare(b.playerId));
}

export function assignBloodlinesToDraftClass(
  prospects: readonly DraftProspect[],
  game: Pick<GameState, 'playerArchive' | 'hallOfFame' | 'seed' | 'year'>,
  options: BloodlineAssignmentOptions = {},
): DraftProspect[] {
  const parents = selectEligibleBloodlineParents({
    playerArchive: game.playerArchive,
    hallOfFame: game.hallOfFame,
    year: game.year,
  });
  if (parents.length === 0) {
    return prospects.map((prospect) => ({ ...prospect, bloodline: prospect.bloodline ?? null }));
  }

  const chance = options.chance ?? BLOODLINE_CLASS_CHANCE;
  const maxPerClass = options.maxPerClass ?? MAX_BLOODLINES_PER_CLASS;
  const rand = options.rand ?? bloodlineRng(game.seed, game.year);
  let assigned = 0;

  return prospects.map((prospect) => {
    if (assigned >= maxPerClass || prospect.bloodline || rand() >= chance) {
      return { ...prospect, bloodline: prospect.bloodline ?? null };
    }

    const parent = parents[Math.floor(rand() * parents.length)] ?? parents[0]!;
    const bloodline: BloodlineInfo = {
      parentPlayerId: parent.playerId,
      parentName: parent.name,
      parentTeamId: parent.primaryTeamId,
      parentPosition: parent.position,
      relationship: 'son',
      legacyTag: parent.legacyTag,
    };
    assigned += 1;
    return { ...prospect, bloodline };
  });
}
