import { getSalaryCap } from '../config';
import { SAVE_VERSION } from '../config/difficulty';
import { SaveStateSchema, migrate } from '../save';
import { isPlayerUnavailable } from '../systems/injury-system';
import { STARTER_SLOTS } from '../systems/roster-management';
import { getRegularSeasonWeekCount } from '../systems/season-schedule';
import type { DraftProspect, Player, RecordBook } from '../types';
import type {
  PlaytestDetector,
  PlaytestDetectorContext,
  PlaytestDetectorVerdict,
  PlaytestFrame,
  PlaytestSeverity,
} from './types';

export const PLAYTEST_PHASE_ORDER = [
  'offseason',
  'free_agency',
  'draft',
  'post_draft',
  'training_camp',
  'preseason',
  'regular_season',
  'playoffs',
] as const;

type NamedDetector = {
  id: string;
  detect: PlaytestDetector;
};

function fail(
  seed: number,
  severity: PlaytestSeverity,
  detail: string,
): PlaytestDetectorVerdict {
  return {
    ok: false,
    severity,
    detail,
    reproSeed: seed,
  };
}

function pass(): PlaytestDetectorVerdict {
  return { ok: true };
}

function phaseOrder(phase: PlaytestFrame['phase']): number {
  const idx = PLAYTEST_PHASE_ORDER.indexOf(phase);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

function percentile(sortedAsc: readonly number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.max(0, Math.min(sortedAsc.length - 1, Math.ceil((p / 100) * sortedAsc.length) - 1));
  return sortedAsc[idx] ?? 0;
}

function playerLabel(player: Pick<Player, 'id' | 'name' | 'age'>): string {
  return `${player.id}:${player.name ?? 'unknown'} age=${String(player.age)}`;
}

function knownPlayers(context: PlaytestDetectorContext): Player[] {
  const byId = new Map<string, Player>();
  for (const player of Object.values(context.state.players ?? {})) {
    if (player?.id) byId.set(player.id, player);
  }
  for (const team of Object.values(context.state.teams ?? {})) {
    for (const player of team.roster ?? []) {
      if (player?.id && !byId.has(player.id)) {
        byId.set(player.id, player);
      }
    }
  }
  return [...byId.values()];
}

function duplicateIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return [...duplicates].sort();
}

function sortJson(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortJson);

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, sortJson(child)]),
  );
}

export function canonicalJsonStringify(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

export function saveRoundTripBytes(state: PlaytestDetectorContext['state']): string {
  try {
    const serialized = JSON.stringify(state);
    const migrated = migrate(JSON.parse(serialized) as Record<string, unknown>, SAVE_VERSION);
    const restored = SaveStateSchema.parse(migrated);
    return canonicalJsonStringify(restored);
  } catch (error) {
    return `__PLAYTEST_ROUNDTRIP_ERROR__:${error instanceof Error ? error.message : String(error)}`;
  }
}

export function detectCapSanity(context: PlaytestDetectorContext): PlaytestDetectorVerdict {
  const invalid: string[] = [];
  const salaryCap = getSalaryCap(context.state.year, context.state);
  const maxCapUsed = Math.max(500, salaryCap * 1.35);
  const maxCapSpace = Math.max(500, salaryCap + 50);
  const maxDeadCap = Math.max(500, salaryCap);

  for (const [teamId, team] of Object.entries(context.state.teams)) {
    const values = {
      capSpace: { value: team.capSpace, min: -50, max: maxCapSpace },
      capUsed: { value: team.capUsed, min: 0, max: maxCapUsed },
      deadCap: { value: team.deadCap, min: 0, max: maxDeadCap },
    };
    for (const [label, range] of Object.entries(values)) {
      if (!Number.isFinite(range.value) || range.value < range.min || range.value > range.max) {
        invalid.push(`${teamId}.${label}=${String(range.value)}`);
      }
    }
  }

  if (invalid.length === 0) return pass();
  return fail(context.seed, 'high', `Cap sanity failed: ${invalid.slice(0, 5).join(', ')}`);
}

export function detectRosterMinimums(context: PlaytestDetectorContext): PlaytestDetectorVerdict {
  const missing: string[] = [];

  for (const [teamId, team] of Object.entries(context.state.teams)) {
    for (const [position, minimum] of Object.entries(STARTER_SLOTS)) {
      const available = team.roster.filter((player) => player.pos === position && !isPlayerUnavailable(player)).length;
      if (available < minimum) {
        missing.push(`${teamId}:${position}=${available}/${minimum}`);
      }
    }
  }

  if (missing.length === 0) return pass();
  return fail(context.seed, 'medium', `Roster minimums failed: ${missing.slice(0, 5).join(', ')}`);
}

export function detectPlayerAgeSanity(context: PlaytestDetectorContext): PlaytestDetectorVerdict {
  const invalid = knownPlayers(context)
    .filter((player) => !Number.isFinite(player.age) || player.age < 18 || player.age > 55)
    .map(playerLabel);

  if (invalid.length === 0) return pass();
  return fail(context.seed, 'high', `Player age sanity failed: ${invalid.slice(0, 5).join(', ')}`);
}

export function detectInjurySanity(context: PlaytestDetectorContext): PlaytestDetectorVerdict {
  const invalid: string[] = [];

  for (const player of knownPlayers(context)) {
    if (!player.injury) continue;
    const injury = player.injury;
    if (!Number.isFinite(injury.gamesOut) || injury.gamesOut < 0 || injury.gamesOut > 52) {
      invalid.push(`${player.id}.gamesOut=${String(injury.gamesOut)}`);
    }
    if (!Number.isFinite(injury.gamesRecovered) || injury.gamesRecovered < 0 || injury.gamesRecovered > 52) {
      invalid.push(`${player.id}.gamesRecovered=${String(injury.gamesRecovered)}`);
    }
    if (!Number.isFinite(injury.reinjuryRisk) || injury.reinjuryRisk < 0 || injury.reinjuryRisk > 1) {
      invalid.push(`${player.id}.reinjuryRisk=${String(injury.reinjuryRisk)}`);
    }
    if (!Number.isFinite(injury.ratingPenalty)) {
      invalid.push(`${player.id}.ratingPenalty=${String(injury.ratingPenalty)}`);
    }
  }

  if (invalid.length === 0) return pass();
  return fail(context.seed, 'high', `Injury sanity failed: ${invalid.slice(0, 5).join(', ')}`);
}

export function detectDraftClassSanity(context: PlaytestDetectorContext): PlaytestDetectorVerdict {
  const draftClass = context.state.draftClass ?? [];
  const duplicateProspects = duplicateIds(draftClass.map((prospect) => prospect.id));
  const invalid: string[] = duplicateProspects.map((id) => `duplicate prospect ${id}`);

  for (const prospect of draftClass) {
    if (!Number.isFinite(prospect.trueGrade) || prospect.trueGrade < 0 || prospect.trueGrade > 100) {
      invalid.push(`${prospect.id}.trueGrade=${String(prospect.trueGrade)}`);
    }
    if (!Number.isFinite(prospect.scoutGrade) || prospect.scoutGrade < 0 || prospect.scoutGrade > 100) {
      invalid.push(`${prospect.id}.scoutGrade=${String(prospect.scoutGrade)}`);
    }
  }

  if (invalid.length === 0) return pass();
  return fail(context.seed, 'high', `Draft class sanity failed: ${invalid.slice(0, 5).join(', ')}`);
}

export function detectAwardsSanity(context: PlaytestDetectorContext): PlaytestDetectorVerdict {
  const history = context.state.awardsHistory ?? [];
  const duplicateYears = duplicateIds(history.map((entry) => String(entry.year)));
  const invalid = duplicateYears.map((year) => `duplicate awards year ${year}`);

  for (const entry of history) {
    if (!Number.isFinite(entry.year) || entry.year < 1900 || entry.year > context.state.year + 1) {
      invalid.push(`awards year=${String(entry.year)}`);
    }
    const duplicateAwards = duplicateIds(entry.awards.map((award) => award.awardId));
    for (const awardId of duplicateAwards) {
      invalid.push(`${entry.year}.duplicate award ${awardId}`);
    }
    for (const award of entry.awards) {
      if (!award.winnerId || !award.awardId) {
        invalid.push(`${entry.year}.blank award winner/id`);
      }
      if (!Number.isFinite(award.score)) {
        invalid.push(`${entry.year}.${award.awardId}.score=${String(award.score)}`);
      }
    }
  }

  if (invalid.length === 0) return pass();
  return fail(context.seed, 'high', `Awards sanity failed: ${invalid.slice(0, 5).join(', ')}`);
}

export function detectBloodlineSanity(context: PlaytestDetectorContext): PlaytestDetectorVerdict {
  const knownParentIds = new Set<string>();
  for (const player of knownPlayers(context)) knownParentIds.add(player.id);
  for (const archiveEntry of context.state.playerArchive ?? []) knownParentIds.add(archiveEntry.playerId);
  for (const hallEntry of context.state.hallOfFame ?? []) knownParentIds.add(hallEntry.playerId);

  const candidates: Array<Pick<Player, 'id' | 'bloodline'> | Pick<DraftProspect, 'id' | 'bloodline'>> = [
    ...knownPlayers(context),
    ...(context.state.draftClass ?? []),
  ];
  const invalid: string[] = [];

  for (const candidate of candidates) {
    const bloodline = candidate.bloodline;
    if (!bloodline) continue;
    if (!bloodline.parentPlayerId || !knownParentIds.has(bloodline.parentPlayerId)) {
      invalid.push(`${candidate.id}.parent=${bloodline.parentPlayerId || '<blank>'}`);
    }
    if (!bloodline.parentName.trim()) {
      invalid.push(`${candidate.id}.parentName blank`);
    }
    if (!context.state.teams[bloodline.parentTeamId]) {
      invalid.push(`${candidate.id}.parentTeam=${bloodline.parentTeamId}`);
    }
  }

  if (invalid.length === 0) return pass();
  return fail(context.seed, 'high', `Bloodline sanity failed: ${invalid.slice(0, 5).join(', ')}`);
}

export function detectRecordBookSanity(context: PlaytestDetectorContext): PlaytestDetectorVerdict {
  const book = context.state.records as RecordBook | undefined;
  if (!book) return pass();

  const invalid: string[] = [];
  const categories: Array<keyof RecordBook> = ['singleGame', 'singleSeason', 'career', 'franchise'];
  for (const category of categories) {
    const bucket = book[category];
    for (const [stat, entries] of Object.entries(bucket)) {
      for (const entry of entries) {
        if (!Number.isFinite(entry.value) || entry.value < 0) {
          invalid.push(`${category}.${stat}.value=${String(entry.value)}`);
        }
        if (!Number.isFinite(entry.year) || entry.year < 1900 || entry.year > context.state.year + 1) {
          invalid.push(`${category}.${stat}.year=${String(entry.year)}`);
        }
      }
    }
  }

  if (invalid.length === 0) return pass();
  return fail(context.seed, 'high', `Record book sanity failed: ${invalid.slice(0, 5).join(', ')}`);
}

export function detectMonotonicTime(context: PlaytestDetectorContext): PlaytestDetectorVerdict {
  if (!context.previousFrame) return pass();

  const previous = context.previousFrame;
  const current = context.currentFrame;

  if (current.year < previous.year) {
    return fail(context.seed, 'high', `Year regressed from ${previous.year} to ${current.year}.`);
  }

  if (current.year > previous.year) return pass();

  const previousPhase = phaseOrder(previous.phase);
  const currentPhase = phaseOrder(current.phase);
  if (currentPhase < previousPhase) {
    return fail(
      context.seed,
      'high',
      `Phase regressed from ${previous.phase} to ${current.phase} in year ${current.year}.`,
    );
  }

  if (currentPhase === previousPhase && current.week < previous.week) {
    return fail(
      context.seed,
      'high',
      `Week regressed from ${previous.week} to ${current.week} in ${current.phase} ${current.year}.`,
    );
  }

  return pass();
}

export function detectPhaseBoundaries(context: PlaytestDetectorContext): PlaytestDetectorVerdict {
  if (!context.previousFrame) return pass();

  const previous = context.previousFrame;
  const current = context.currentFrame;
  const expected = (() => {
    switch (previous.phase) {
      case 'training_camp':
        return current.phase === 'preseason'
          && current.year === previous.year
          && current.week === previous.week;
      case 'preseason':
        return current.phase === 'regular_season'
          && current.year === previous.year
          && current.week === previous.week;
      case 'regular_season': {
        const regularSeasonWeeks = getRegularSeasonWeekCount(context.state);
        if (previous.week < regularSeasonWeeks) {
          return current.phase === 'regular_season'
            && current.year === previous.year
            && current.week === previous.week + 1;
        }
        return current.phase === 'playoffs'
          && current.year === previous.year
          && current.week === regularSeasonWeeks + 1;
      }
      case 'playoffs':
        if (current.phase === 'playoffs') {
          return current.year === previous.year
            && current.week === previous.week + 1;
        }
        return current.phase === 'offseason'
          && current.year === previous.year + 1
          && current.week === 1;
      case 'offseason':
        return current.phase === 'free_agency'
          && current.year === previous.year
          && current.week === 1;
      case 'free_agency':
        if (previous.week < 3) {
          return current.phase === 'free_agency'
            && current.year === previous.year
            && current.week === previous.week + 1;
        }
        return current.phase === 'draft'
          && current.year === previous.year
          && current.week === 1;
      case 'draft':
        return current.phase === 'post_draft'
          && current.year === previous.year
          && current.week === previous.week;
      case 'post_draft':
        return current.phase === 'training_camp'
          && current.year === previous.year
          && current.week === 1;
      default:
        return true;
    }
  })();

  if (expected) return pass();

  return fail(
    context.seed,
    'high',
    `Unexpected phase boundary: ${previous.phase} Y${previous.year} W${previous.week} -> ${current.phase} Y${current.year} W${current.week}.`,
  );
}

export function detectSaveRoundTrip(context: PlaytestDetectorContext): PlaytestDetectorVerdict {
  if (context.serializedState === context.roundTripSerializedState) return pass();
  return fail(context.seed, 'high', 'Save round-trip produced different canonical bytes.');
}

export function detectRngChannel(context: PlaytestDetectorContext): PlaytestDetectorVerdict {
  if (context.mathRandomCalls === 0) return pass();
  return fail(context.seed, 'high', `Math.random was invoked ${context.mathRandomCalls} time(s) during advance.`);
}

export function detectPerfBudget(context: PlaytestDetectorContext): PlaytestDetectorVerdict {
  const sorted = [...context.elapsedHistoryMs].sort((left, right) => left - right);
  if (percentile(sorted, 99) <= 500) return pass();
  return fail(context.seed, 'medium', 'advanceFranchiseWeek p99 exceeded the 500ms playtest budget.');
}

export const PLAYTEST_DETECTORS: readonly NamedDetector[] = Object.freeze([
  { id: 'cap-sanity', detect: detectCapSanity },
  { id: 'roster-minimums', detect: detectRosterMinimums },
  { id: 'player-age-sanity', detect: detectPlayerAgeSanity },
  { id: 'injury-sanity', detect: detectInjurySanity },
  { id: 'draft-class-sanity', detect: detectDraftClassSanity },
  { id: 'awards-sanity', detect: detectAwardsSanity },
  { id: 'bloodline-sanity', detect: detectBloodlineSanity },
  { id: 'record-book-sanity', detect: detectRecordBookSanity },
  { id: 'monotonic-time', detect: detectMonotonicTime },
  { id: 'phase-boundaries', detect: detectPhaseBoundaries },
  { id: 'save-roundtrip', detect: detectSaveRoundTrip },
  { id: 'rng-channel', detect: detectRngChannel },
  { id: 'perf-budget', detect: detectPerfBudget },
]);
