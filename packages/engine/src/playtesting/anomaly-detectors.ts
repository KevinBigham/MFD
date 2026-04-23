import { SAVE_VERSION } from '../config/difficulty';
import { SaveStateSchema, migrate } from '../save';
import { isPlayerUnavailable } from '../systems/injury-system';
import { STARTER_SLOTS } from '../systems/roster-management';
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

  for (const [teamId, team] of Object.entries(context.state.teams)) {
    const values = {
      capSpace: team.capSpace,
      capUsed: team.capUsed,
      deadCap: team.deadCap,
    };
    for (const [label, value] of Object.entries(values)) {
      if (!Number.isFinite(value) || value < -50 || value > 500) {
        invalid.push(`${teamId}.${label}=${String(value)}`);
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
      case 'regular_season':
        if (previous.week < 18) {
          return current.phase === 'regular_season'
            && current.year === previous.year
            && current.week === previous.week + 1;
        }
        return current.phase === 'playoffs'
          && current.year === previous.year
          && current.week === 19;
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
  { id: 'monotonic-time', detect: detectMonotonicTime },
  { id: 'phase-boundaries', detect: detectPhaseBoundaries },
  { id: 'save-roundtrip', detect: detectSaveRoundTrip },
  { id: 'rng-channel', detect: detectRngChannel },
  { id: 'perf-budget', detect: detectPerfBudget },
]);
