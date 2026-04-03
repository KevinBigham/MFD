import { describe, expect, it } from 'vitest';
import {
  applySchemeChange,
  projectSchemeTransition,
  snapshotTeamIdentity,
} from '../index';
import { makeLeagueState } from './test-helpers';

describe('scheme install', () => {
  it('projects high continuity when schemes do not change', () => {
    const game = makeLeagueState('regular_season', 5);

    const state = projectSchemeTransition(game.teams.afce1!, 'spread', 'cover_3');

    expect(state.offense.transitionPenalty).toBe(0);
    expect(state.defense.transitionPenalty).toBe(0);
    expect(state.overallContinuity).toBeGreaterThanOrEqual(80);
  });

  it('applies larger penalties to full identity shifts', () => {
    const game = makeLeagueState('regular_season', 5);

    const state = projectSchemeTransition(game.teams.afce1!, 'power_run', 'man_press');

    expect(state.offense.transitionPenalty).toBeGreaterThan(0);
    expect(state.defense.transitionPenalty).toBeGreaterThan(0);
    expect(state.overallContinuity).toBeLessThan(80);
  });

  it('updates live and mirrored scheme fields when a change is applied', () => {
    const game = makeLeagueState('regular_season', 5);

    applySchemeChange(game, 'afce1', 'west_coast', 'cover_2');

    expect(game.teams.afce1!.schemeOff).toBe('west_coast');
    expect(game.teams.afce1!.schemeDef).toBe('cover_2');
    expect(game.teams.afce1!.offScheme).toBe('west_coast');
    expect(game.teams.afce1!.defScheme).toBe('cover_2');
  });

  it('captures room fit in the identity snapshot', () => {
    const game = makeLeagueState('regular_season', 5);

    const snapshot = snapshotTeamIdentity(game.teams.afce1!);

    expect(snapshot.rooms.length).toBeGreaterThanOrEqual(4);
    expect(snapshot.rooms.some((room) => room.fitScore > 0)).toBe(true);
  });

  it('gives install credit when staff scheme lean matches the target identity', () => {
    const game = makeLeagueState('regular_season', 5);
    game.teams.afce1!.staff.oc = {
      id: 'oc-lean',
      name: 'Lean OC',
      role: 'OC',
      archetype: 'offensive_minded',
      traits: [],
      ratings: { gameplan: 85, development: 78, motivation: 74, strategy: 82 },
      level: 5,
      age: 46,
      schemeLean: { offense: 'west_coast', defense: 'cover_2' },
      term: 3,
      buyoutPenalty: 2,
      loyalty: 7,
      ambition: 5,
      lastHiredYear: 2026,
    };

    const state = projectSchemeTransition(game.teams.afce1!, 'west_coast', 'cover_3');

    expect(state.offense.installProgress).toBeGreaterThanOrEqual(50);
  });
});
