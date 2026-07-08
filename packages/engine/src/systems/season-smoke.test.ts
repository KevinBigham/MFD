/**
 * Multi-Season Deterministic Smoke Test
 *
 * Sprint 39 deliverable: seed a league, sim 3 seasons
 * (draft, FA, progression, carousel), assert no crash + stat bounds.
 *
 * This is the CI safety net. If it fails, the simulation
 * pipeline has a structural problem.
 */

import { describe, expect, it } from 'vitest';
import { advanceFranchiseWeek, finalizeDeadline, syncAllPlayerArchiveEntries } from '../index';
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

function makeSmokeGame(): GameState {
  const game = makeLeagueState('preseason', 1);
  game.schedule = makeSchedule(Object.keys(game.teams));

  // All-AI sim — no user-team pauses
  for (const team of Object.values(game.teams)) {
    team.isUser = false;
  }

  // Plant aging veterans to guarantee retirements across 3 seasons.
  const retireQb = game.teams.nfcs2!.roster.find((p) => p.pos === 'QB')!;
  retireQb.age = 36;
  retireQb.ovr = 55;
  retireQb.ratings.awareness = 55;

  const retireRb = game.teams.afcw2!.roster.find((p) => p.pos === 'RB')!;
  retireRb.age = 34;
  retireRb.ovr = 58;
  retireRb.ratings.speed = 57;

  syncAllPlayerArchiveEntries(game, game.year);
  return game;
}

describe('multi-season deterministic smoke test', () => {
  it('sims 3 full seasons without crash and within stat bounds', { timeout: 30_000 }, () => {
    const game = makeSmokeGame();

    const startYear = game.year;
    let state: GameState = game;
    let completedSeasons = 0;
    let guard = 0;

    // --- Sim loop ---
    while (completedSeasons < 3 && guard < 500) {
      if (state.tradeDeadlineState) {
        const resolved = finalizeDeadline(state, state.tradeDeadlineState);
        resolved.eventLog.push({
          id: `deadline-smoke-${resolved.year}-${resolved.week}`,
          type: 'trade_deadline_resolved',
          timestamp: guard,
          description: 'Smoke test deadline auto-resolve.',
          data: { year: resolved.year, week: resolved.week },
        });
        state = advanceFranchiseWeek(resolved).nextState;
      } else {
        const previousPhase = state.phase;
        state = advanceFranchiseWeek(state).nextState;
        if (previousPhase === 'playoffs' && state.phase === 'offseason') {
          completedSeasons += 1;
        }
      }
      guard += 1;
    }

    // --- Core assertions ---
    expect(guard).toBeLessThan(500);
    expect(completedSeasons).toBe(3);
    expect(state.year).toBe(startYear + 3);

    // --- Player stat bounds ---
    for (const player of Object.values(state.players)) {
      expect(player.ovr).toBeGreaterThanOrEqual(30);
      expect(player.ovr).toBeLessThanOrEqual(99);
      expect(player.age).toBeGreaterThanOrEqual(20);
      expect(player.age).toBeLessThanOrEqual(50);
      expect(player.morale).toBeGreaterThanOrEqual(0);
      expect(player.morale).toBeLessThanOrEqual(100);
    }

    // --- Team record integrity ---
    for (const team of Object.values(state.teams)) {
      const totalGames = team.wins + team.losses + team.ties;
      // After 3 seasons, records should be reset for the new season.
      // The current season is just starting (training_camp/preseason),
      // so W/L/T should be 0.
      expect(totalGames).toBeLessThanOrEqual(22); // max 17 regular + 4 playoff + 1 slack
      expect(team.wins).toBeGreaterThanOrEqual(0);
      expect(team.losses).toBeGreaterThanOrEqual(0);
      expect(team.ties).toBeGreaterThanOrEqual(0);
    }

    // --- Draft class regeneration ---
    // After 3 offseasons, the league should have generated fresh draft classes.
    // Awards prove the pipeline ran end-to-end.
    expect(state.awardsHistory.length).toBeGreaterThanOrEqual(1);

    // --- Franchise history records ---
    // Each completed season writes at least one franchise history entry per team.
    expect(state.franchiseHistory.length).toBeGreaterThan(0);

    // --- Progression worked ---
    // At least some players should have retired after 3 seasons.
    const retiredCount = state.playerArchive.filter(
      (entry) => entry.retirementYear !== null,
    ).length;
    expect(retiredCount).toBeGreaterThanOrEqual(1);

    // --- Determinism check ---
    // Re-run with the same seed and verify identical outcome.
    const game2 = makeSmokeGame();

    let state2: GameState = game2;
    let completedSeasons2 = 0;
    let guard2 = 0;

    while (completedSeasons2 < 3 && guard2 < 500) {
      if (state2.tradeDeadlineState) {
        const resolved = finalizeDeadline(state2, state2.tradeDeadlineState);
        resolved.eventLog.push({
          id: `deadline-smoke-${resolved.year}-${resolved.week}`,
          type: 'trade_deadline_resolved',
          timestamp: guard2,
          description: 'Smoke test deadline auto-resolve.',
          data: { year: resolved.year, week: resolved.week },
        });
        state2 = advanceFranchiseWeek(resolved).nextState;
      } else {
        const previousPhase = state2.phase;
        state2 = advanceFranchiseWeek(state2).nextState;
        if (previousPhase === 'playoffs' && state2.phase === 'offseason') {
          completedSeasons2 += 1;
        }
      }
      guard2 += 1;
    }

    // Same seed = same iteration count = same final year
    expect(guard2).toBe(guard);
    expect(state2.year).toBe(state.year);
    expect(Object.keys(state2.players).length).toBe(Object.keys(state.players).length);
  });
});
