import { describe, expect, it } from 'vitest';
import { createRngState } from '../rng';
import type { WeatherCondition } from '../types';
import {
  cloneGame,
  ensureWeeklyWeather,
  findUserTeam,
  generateWeatherForGame,
  makeEvent,
  refreshNarrative,
  syncPlayers,
  updateOwner,
} from './franchise-week-helpers';
import { makeLeagueState } from './test-helpers';

const WEATHER_VALUES: WeatherCondition[] = ['dome', 'clear', 'rain', 'snow', 'wind'];

describe('franchise-week helpers weather wiring', () => {
  it('assigns regional weather only to scheduled games that are missing weather', () => {
    const rng = createRngState(11);
    const game = makeLeagueState('regular_season', 1);
    game.schedule.unshift({
      week: 7,
      games: [
        { homeTeamId: 'afce1', awayTeamId: 'afce2', result: null, weather: null },
        { homeTeamId: 'missing-home', awayTeamId: 'afcn1', result: null },
        { homeTeamId: 'afcn2', awayTeamId: 'afcs1', result: null, weather: 'rain' },
      ],
    });

    ensureWeeklyWeather(game, 7, rng.play);

    expect(WEATHER_VALUES).toContain(game.schedule[0]!.games[0]!.weather);
    expect(game.schedule[0]!.games[1]!.weather).toBeUndefined();
    expect(game.schedule[0]!.games[2]!.weather).toBe('rain');
  });

  it('leaves the schedule untouched when the requested week is absent', () => {
    const game = makeLeagueState('regular_season', 1);
    const before = structuredClone(game.schedule);

    ensureWeeklyWeather(game, 99, createRngState(1).play);

    expect(game.schedule).toEqual(before);
  });

  it('keeps the legacy generic weather helper deterministic and dome-aware', () => {
    const game = makeLeagueState('regular_season', 1);
    const outdoor = game.teams.afce1;
    const dome = game.teams.afce2;
    dome.stadiumType = 'dome';

    const first = generateWeatherForGame(outdoor, 15, createRngState(1).play);
    const second = generateWeatherForGame(outdoor, 15, createRngState(1).play);

    expect(second).toBe(first);
    expect(WEATHER_VALUES).toContain(first);
    expect(generateWeatherForGame(dome, 15, createRngState(1).play)).toBe('dome');
  });
});

describe('franchise-week helpers owner, events, and state sync', () => {
  it('updates owner approval, owner mood, and patience from the current team record context', () => {
    const game = makeLeagueState('regular_season', 9);
    const team = game.teams.afce1;
    team.wins = 0;
    team.losses = 0;
    team.ties = 0;
    team.streak = 0;
    team.owner.approval = 28;
    team.ownerMood = 28;
    team.ownerPatience80 = 24;

    const delta = updateOwner(team, game);

    expect(delta).toBe(5);
    expect(team.owner.approval).toBe(33);
    expect(team.ownerMood).toBe(33);
    expect(team.ownerPatience80).toBe(26);
    expect(team.owner.history.at(-1)).toMatchObject({
      year: 2026,
      week: 9,
      approval: 33,
      delta: 5,
    });
  });

  it('builds deterministic event ids and timestamps from current log length', () => {
    const game = makeLeagueState('regular_season', 4);
    game.eventLog.push(
      { id: 'existing-1', type: 'a', timestamp: 1, description: 'A', data: {} },
      { id: 'existing-2', type: 'b', timestamp: 2, description: 'B', data: {} },
    );

    expect(makeEvent(game, 'weekly_result', 'Test result', { gameId: 'game-1' })).toEqual({
      id: 'weekly_result-2026-4-2',
      type: 'weekly_result',
      timestamp: 2026042,
      description: 'Test result',
      data: { gameId: 'game-1' },
    });
  });

  it('syncs team roster players into the flat player index and preserves object identity', () => {
    const game = makeLeagueState('regular_season', 1);
    const player = game.teams.afce1.roster[0]!;
    player.ovr = 99;
    delete (player as Partial<typeof player>).stats;
    delete (player as Partial<typeof player>).careerStats;
    delete game.players[player.id];

    syncPlayers(game);

    expect(game.players[player.id]).toBe(player);
    expect(game.players[player.id]!.ovr).toBe(99);
    expect(game.players[player.id]!.stats.passYds).toBe(0);
    expect(game.players[player.id]!.stats.gamesPlayed).toBe(0);
    expect(game.players[player.id]!.careerStats).toMatchObject({ seasons: 0, gp: 0, snaps: 0 });
  });

  it('clones game state without sharing nested team/player objects', () => {
    const game = makeLeagueState('regular_season', 1);
    const copy = cloneGame(game);

    copy.teams.afce1.roster[0]!.ovr = 10;

    expect(copy).not.toBe(game);
    expect(copy.teams.afce1).not.toBe(game.teams.afce1);
    expect(game.teams.afce1.roster[0]!.ovr).not.toBe(10);
  });

  it('finds the user team and returns null when no team is marked as user-controlled', () => {
    const game = makeLeagueState('regular_season', 1);

    expect(findUserTeam(game)?.id).toBe('afce1');

    for (const team of Object.values(game.teams)) {
      team.isUser = false;
    }

    expect(findUserTeam(game)).toBeNull();
  });
});

describe('franchise-week helpers narrative refresh', () => {
  it('persists generated hooks with deterministic ids and two-week deadlines', () => {
    const game = makeLeagueState('regular_season', 10);
    const userTeam = game.teams.afce1;
    userTeam.ownerMood = 20;
    userTeam.ownerPatience80 = 80;

    refreshNarrative(game);

    expect(game.narrativeState.hooks[0]).toMatchObject({
      id: 'hook-2026-10-0',
      type: 'owner',
      resolved: false,
      deadline: 12,
    });
    expect(game.narrativeState.hooks[0]!.description).toContain('Owner mood');
  });

  it('writes a fallback hook when no generator condition is met', () => {
    const game = makeLeagueState('preseason', 3);
    const userTeam = game.teams.afce1;
    userTeam.ownerMood = 80;
    userTeam.ownerPatience80 = 80;
    userTeam.wins = 1;
    userTeam.losses = 1;
    userTeam.streak = 0;
    userTeam.rivals = {};
    userTeam.draftPicks = [];
    userTeam.roster.forEach((player) => {
      player.age = 26;
      player.ovr = 70;
      player.pot = 70;
      player.holdout = false;
      player.injury = null;
      if (player.contract) player.contract.years = 3;
    });

    refreshNarrative(game);

    expect(game.narrativeState.hooks).toEqual([{
      id: 'hook-2026-3-fallback',
      type: 'streak',
      description: 'AFCE1 Club sit at 1-1. Keep momentum into the next week.',
      resolved: false,
      deadline: 5,
    }]);
  });
});
