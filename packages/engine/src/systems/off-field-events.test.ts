import { describe, expect, it } from 'vitest';
import {
  generateWeeklyOffFieldEvents,
  getTimedEffectDelta,
  reseedSeason,
  reseedWeek,
  setSeed,
  type TimedEffect,
} from '../index';
import { makeLeagueState } from './test-helpers';

describe('off-field events', () => {
  it('generates deterministic weekly events for the user team', () => {
    const firstState = makeLeagueState('regular_season', 5);
    const secondState = structuredClone(firstState);
    const firstTeam = firstState.teams.afce1!;
    const secondTeam = secondState.teams.afce1!;

    firstTeam.wins = 2;
    firstTeam.losses = 6;
    secondTeam.wins = 2;
    secondTeam.losses = 6;

    setSeed(firstState.seed);
    reseedSeason(firstState.year);
    reseedWeek(firstState.year, firstState.week);
    const first = generateWeeklyOffFieldEvents(firstState, firstTeam);

    setSeed(secondState.seed);
    reseedSeason(secondState.year);
    reseedWeek(secondState.year, secondState.week);
    const second = generateWeeklyOffFieldEvents(secondState, secondTeam);

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThanOrEqual(1);
    expect(first.length).toBeLessThanOrEqual(2);

    const rosterIds = new Set(firstTeam.roster.map((player) => player.id));
    expect(first.every((event) => event.teamId === firstTeam.id)).toBe(true);
    expect(first.every((event) => event.playerIds.every((id) => rosterIds.has(id)))).toBe(true);
  });

  it('tracks timed effects in the ledger without mutating stored ratings', () => {
    const game = makeLeagueState('regular_season', 8);
    const effect: TimedEffect = {
      id: 'effect-1',
      sourceType: 'off_field_event',
      sourceId: 'event-1',
      teamId: 'afce1',
      targetType: 'player',
      targetId: 'afce1-qb',
      stat: 'ovr',
      delta: 2,
      appliesToGame: true,
      startStamp: 202608,
      endStamp: 202609,
      summary: 'Breakout practice carries into kickoff.',
    };

    const originalOvr = game.teams.afce1!.roster.find((player) => player.id === 'afce1-qb')!.ovr;
    game.activeEffects.push(effect);

    expect(getTimedEffectDelta(game, 'afce1', 'ovr', 'afce1-qb')).toBe(2);
    expect(game.teams.afce1!.roster.find((player) => player.id === 'afce1-qb')!.ovr).toBe(originalOvr);
  });
});
