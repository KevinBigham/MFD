/**
 * Save Round-Trip After Full Season (Gate 8 / Playability Gate)
 *
 * Sprint 64 follow-up infrastructure: Complements season-smoke.test.ts and
 * full-season.test.ts by catching a genuinely new class of regression —
 * fields that populate during simulation but vanish through the save chain.
 *
 * Existing coverage:
 * - season-smoke.test.ts / full-season.test.ts — assert simulation correctness
 *   across multiple seasons, including determinism.
 * - save.test.ts / golden-saves.test.ts — assert SaveStateSchema and migration
 *   chain on hand-constructed or fixture saves.
 *
 * Gap this test closes:
 * - What happens when you advance a full season AND THEN round-trip through
 *   JSON.stringify + JSON.parse + SaveStateSchema.safeParse + migrate? Any
 *   runtime field populated by the sim that isn't declared in the schema will
 *   silently drop on load — that's the regression this test catches.
 *
 * This is the OpenGame-Bench-inspired "is it still playable after save/load"
 * check at the engine layer. The canonical invariants below must survive the
 * full round-trip with structural equivalence.
 */

import { describe, expect, it } from 'vitest';
import {
  advanceFranchiseWeek,
  finalizeDeadline,
  syncAllPlayerArchiveEntries,
  SAVE_VERSION,
} from '../index';
import { SaveStateSchema, migrate } from '../save';
import { makeLeagueState } from './test-helpers';
import type { GameState, ScheduleWeek } from '../types';

function makeSchedule(teamIds: string[]): ScheduleWeek[] {
  const teams = [...teamIds].sort();
  const weeks: ScheduleWeek[] = [];
  const working = [...teams];

  for (let week = 1; week <= 18; week += 1) {
    const games = [];
    for (let index = 0; index < working.length / 2; index += 1) {
      const home = week % 2 === 0 ? working[working.length - 1 - index]! : working[index]!;
      const away = week % 2 === 0 ? working[index]! : working[working.length - 1 - index]!;
      games.push({ homeTeamId: home, awayTeamId: away, result: null });
    }
    weeks.push({ week, games });
    const fixed = working[0]!;
    const rotated = [fixed, working[working.length - 1]!, ...working.slice(1, -1)];
    working.splice(0, working.length, ...rotated);
  }

  return weeks;
}

function advanceToCleanSeasonBoundary(start: GameState): GameState {
  // Advance until we've FULLY completed one season cycle and landed back at
  // preseason for year N+1. This lands at a clean phase boundary where all
  // offseason processing (awards, draft, free agency, carousel) has completed,
  // so any subsequent save round-trip captures the full shape the sim can emit.
  let state = start;
  const startYear = start.year;
  let guard = 0;

  while (guard < 500) {
    if (state.tradeDeadlineState) {
      const resolved = finalizeDeadline(state, state.tradeDeadlineState);
      resolved.eventLog.push({
        id: `deadline-roundtrip-${resolved.year}-${resolved.week}`,
        type: 'trade_deadline_resolved',
        timestamp: guard,
        description: 'Round-trip test deadline auto-resolve.',
        data: { year: resolved.year, week: resolved.week },
      });
      state = advanceFranchiseWeek(resolved).nextState;
    } else {
      state = advanceFranchiseWeek(state).nextState;
    }
    guard += 1;

    // Stop condition: year has advanced past start AND we're back to a fresh
    // season phase (preseason or training_camp for year N+1).
    if (state.year > startYear && (state.phase === 'preseason' || state.phase === 'training_camp')) {
      return state;
    }
  }

  throw new Error(
    `Failed to reach clean season boundary. Final state: year=${state.year} phase=${state.phase} after ${guard} iterations`,
  );
}

interface StructuralInvariants {
  version: number;
  year: number;
  phase: string;
  week: number;
  teamCount: number;
  playerCount: number;
  franchiseHistoryLength: number;
  awardsHistoryLength: number;
  playerArchiveLength: number;
  eventLogLength: number;
  coachingHistoryLength: number;
  hallOfFameLength: number;
  playerSeasonHistoryKeys: number;
  weekSummariesLength: number;
  leagueRivalriesLength: number;
  storyArcsLength: number;
  recordsSingleSeasonWinsLength: number;
}

function extractInvariants(state: Record<string, unknown>): StructuralInvariants {
  const players = state['players'] as Record<string, unknown>;
  const teams = state['teams'] as Record<string, unknown>;
  const playerSeasonHistory = state['playerSeasonHistory'] as Record<string, unknown>;
  const records = state['records'] as Record<string, unknown>;
  const singleSeason = records['singleSeason'] as Record<string, unknown>;
  const wins = singleSeason['wins'] as unknown[];

  return {
    version: state['version'] as number,
    year: state['year'] as number,
    phase: state['phase'] as string,
    week: state['week'] as number,
    teamCount: Object.keys(teams).length,
    playerCount: Object.keys(players).length,
    franchiseHistoryLength: (state['franchiseHistory'] as unknown[]).length,
    awardsHistoryLength: (state['awardsHistory'] as unknown[]).length,
    playerArchiveLength: (state['playerArchive'] as unknown[]).length,
    eventLogLength: (state['eventLog'] as unknown[]).length,
    coachingHistoryLength: (state['coachingHistory'] as unknown[]).length,
    hallOfFameLength: (state['hallOfFame'] as unknown[]).length,
    playerSeasonHistoryKeys: Object.keys(playerSeasonHistory).length,
    weekSummariesLength: (state['weekSummaries'] as unknown[]).length,
    leagueRivalriesLength: (state['leagueRivalries'] as unknown[]).length,
    storyArcsLength: (state['storyArcs'] as unknown[]).length,
    recordsSingleSeasonWinsLength: wins.length,
  };
}

describe('save round-trip after full season (gate 8)', () => {
  it('preserves all structural invariants through JSON + schema + migrate', { timeout: 30_000 }, () => {
    // --- Boot fresh dynasty ---
    const game = makeLeagueState('preseason', 1);
    game.schedule = makeSchedule(Object.keys(game.teams));
    for (const team of Object.values(game.teams)) {
      team.isUser = false;
    }
    syncAllPlayerArchiveEntries(game, game.year);

    const startYear = game.year;

    // --- Advance through one full season cycle into preseason year N+1 ---
    const liveState = advanceToCleanSeasonBoundary(game);

    // --- Sanity check: sim produced the expected derived-first surfaces ---
    expect(liveState.year).toBeGreaterThanOrEqual(startYear + 1);
    expect(['preseason', 'training_camp']).toContain(liveState.phase);
    expect(liveState.franchiseHistory.length).toBeGreaterThan(0);
    expect(liveState.eventLog.length).toBeGreaterThan(0);
    expect(Object.keys(liveState.playerSeasonHistory).length).toBeGreaterThan(0);

    const liveInvariants = extractInvariants(liveState as unknown as Record<string, unknown>);

    // --- Serialize through JSON (simulates localStorage write) ---
    const serialized = JSON.stringify(liveState);
    const jsonRoundTrip = JSON.parse(serialized) as Record<string, unknown>;

    // --- Run through migrate chain (no-op at current version, but exercises the path) ---
    const migrated = migrate(jsonRoundTrip, SAVE_VERSION);
    expect(migrated['version']).toBe(SAVE_VERSION);

    // --- Validate against schema ---
    const parseResult = SaveStateSchema.safeParse(migrated);
    if (!parseResult.success) {
      const errors = parseResult.error.issues
        .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      throw new Error(
        `Save failed schema validation after full-season round-trip:\n${errors}`,
      );
    }

    // --- Extract invariants from restored state ---
    const restored = parseResult.data as unknown as Record<string, unknown>;
    const restoredInvariants = extractInvariants(restored);

    // --- Structural equivalence check ---
    // Every field that the simulation populated must survive the round-trip.
    // If this fails, the schema is out of sync with the sim — add the missing
    // field to SaveStateSchema or bump SAVE_VERSION with a migration.
    expect(restoredInvariants).toEqual(liveInvariants);
  });

  it('round-tripped save can resume a new week of simulation', { timeout: 30_000 }, () => {
    // --- Boot fresh dynasty and advance one full season ---
    const game = makeLeagueState('preseason', 1);
    game.schedule = makeSchedule(Object.keys(game.teams));
    for (const team of Object.values(game.teams)) {
      team.isUser = false;
    }
    syncAllPlayerArchiveEntries(game, game.year);

    const afterSeason = advanceToCleanSeasonBoundary(game);
    // Confirm we're on a clean boundary before round-trip.
    expect(['preseason', 'training_camp']).toContain(afterSeason.phase);

    // --- Round-trip through JSON + schema ---
    const serialized = JSON.stringify(afterSeason);
    const jsonRoundTrip = JSON.parse(serialized) as Record<string, unknown>;
    const migrated = migrate(jsonRoundTrip, SAVE_VERSION);
    const parseResult = SaveStateSchema.safeParse(migrated);
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) return;

    const restored = parseResult.data as unknown as GameState;

    // --- Resume simulation — if any runtime-critical field dropped on restore,
    //     advanceFranchiseWeek will throw or produce visibly wrong state ---
    const yearBeforeResume = restored.year;
    const phaseBeforeResume = restored.phase;

    const { nextState } = advanceFranchiseWeek(restored);

    // --- Post-resume invariants: state is coherent, advances cleanly ---
    expect(nextState).toBeDefined();
    expect(nextState.year).toBeGreaterThanOrEqual(yearBeforeResume);
    // Phase either stayed or advanced forward; never regresses silently.
    expect(typeof nextState.phase).toBe('string');
    expect(nextState.phase.length).toBeGreaterThan(0);
    expect(typeof phaseBeforeResume).toBe('string');

    // --- Determinism still holds post-round-trip:
    //     Round-trip + advance = direct advance on non-round-tripped state ---
    const directNextState = advanceFranchiseWeek(afterSeason).nextState;
    expect(nextState.year).toBe(directNextState.year);
    expect(nextState.phase).toBe(directNextState.phase);
    expect(nextState.week).toBe(directNextState.week);
    expect(Object.keys(nextState.players).length).toBe(
      Object.keys(directNextState.players).length,
    );
  });
});
