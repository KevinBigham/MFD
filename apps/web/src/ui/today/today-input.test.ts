/**
 * The one impure edge of the Today stack, tested against real fixtures.
 *
 * Everything else in `ui/today` is pure and covered by unit tests; this module
 * is where a real `GameState` becomes a `TodayInput`, and it was the only file
 * in the packet without coverage.
 */

import { describe, expect, it } from 'vitest';
import type { GameState } from '@mfd/engine';
import { UI_FIXTURE_IDS, buildUiFixture } from '../test/fixtures/ui-overhaul-fixtures';
import { selectTodayInput } from './today-input';
import { presentToday } from './today-presenter';

function source(game: GameState | null) {
  return { game } as Parameters<typeof selectTodayInput>[0];
}

describe('selectTodayInput', () => {
  it('derives season, week, phase, and record from the game across the lifecycle', () => {
    for (const id of UI_FIXTURE_IDS) {
      const game = buildUiFixture(id);
      const input = selectTodayInput(source(game));

      expect(input.season, id).toBe(game.year);
      expect(input.week, id).toBe(game.week);
      expect(input.phase, id).toBe(game.phase);

      const team = Object.values(game.teams).find((entry) => entry.isUser)!;
      expect(input.team, id).toEqual({
        name: `${team.city} ${team.name}`,
        wins: team.wins,
        losses: team.losses,
        ties: team.ties,
      });
    }
  });

  it('names the opponent and which side of the field it is on', () => {
    const game = buildUiFixture('regularSeasonWeek14');
    const input = selectTodayInput(source(game));

    const team = Object.values(game.teams).find((entry) => entry.isUser)!;
    const matchup = game.schedule.find((week) => week.week === game.week)?.games
      .find((entry) => entry.homeTeamId === team.id || entry.awayTeamId === team.id);

    expect(matchup, 'week 14 fixture should have a matchup').toBeDefined();
    const isHome = matchup!.homeTeamId === team.id;
    const other = game.teams[isHome ? matchup!.awayTeamId : matchup!.homeTeamId]!;

    expect(input.opponent).toEqual({
      name: `${other.city} ${other.name}`,
      wins: other.wins,
      losses: other.losses,
      ties: other.ties,
      isHome,
    });
  });

  it('returns no opponent in phases with no schedule to read', () => {
    for (const id of ['offseason', 'freeAgency', 'draft'] as const) {
      expect(selectTodayInput(source(buildUiFixture(id))).opponent, id).toBeNull();
    }
  });

  it('produces a renderable view model for every fixture, without throwing', () => {
    for (const id of UI_FIXTURE_IDS) {
      const view = presentToday(selectTodayInput(source(buildUiFixture(id))));
      expect(view.context.phase, id).toBeTruthy();
      expect(view.opponent.headline, id).toBeTruthy();
      expect(view.opponent.detail, id).toBeTruthy();
      expect(['blocked', 'attention', 'ready'], id).toContain(view.readiness.state);
    }
  });

  it('survives an empty store rather than throwing on the route', () => {
    const input = selectTodayInput(source(null));
    expect(input.team).toBeNull();
    expect(input.opponent).toBeNull();
    expect(input.tasks).toEqual([]);
    expect(input.recommendations).toEqual([]);
    expect(presentToday(input).readiness.state).toBe('ready');
  });

  it('is deterministic and mutates nothing in the game it reads', () => {
    const game = buildUiFixture('regularSeasonWeek14');
    const before = JSON.stringify(game);

    const first = JSON.stringify(selectTodayInput(source(game)));
    const second = JSON.stringify(selectTodayInput(source(game)));

    expect(first).toBe(second);
    // The whole state, not one field: Today rendering must not be able to
    // change the simulation, and a snapshot of the entire game is the only
    // assertion that catches every way it could.
    expect(JSON.stringify(game)).toBe(before);
  });
});
