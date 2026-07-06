import { describe, expect, it } from 'vitest';
import { assignBroadcasts, flexSchedule, getFullSchedule, getWeekSchedule } from './flex-schedule';
import { makeLeagueState } from './test-helpers';

describe('flex schedule', () => {
  it('only flexes games in week 14 or later', () => {
    const game = makeLeagueState('regular_season', 13);

    flexSchedule(game, () => 0.5);

    expect(game.schedule.flatMap((week) => week.games).some((gameEntry) => gameEntry.primetime)).toBe(false);
  });

  it('marks the most compelling matchup as primetime', () => {
    const game = makeLeagueState('regular_season', 15);
    game.teams.afce1!.wins = 12;
    game.teams.afce1!.losses = 2;
    game.teams.afcn1!.wins = 11;
    game.teams.afcn1!.losses = 3;
    game.schedule = [
      {
        week: 15,
        games: [
          { homeTeamId: 'afce1', awayTeamId: 'afcn1', result: null, flexed: false, primetime: false, broadcastNetwork: null },
          { homeTeamId: 'afce2', awayTeamId: 'afcn2', result: null, flexed: false, primetime: false, broadcastNetwork: null },
        ],
      },
    ];

    flexSchedule(game, () => 0.5);

    expect(game.schedule[0]!.games[0]).toMatchObject({ primetime: true, flexed: true });
  });

  it('assigns MFN to primetime games and broadcasts to all games', () => {
    const game = makeLeagueState('regular_season', 16);
    game.schedule = [
      {
        week: 16,
        games: [
          { homeTeamId: 'afce1', awayTeamId: 'afcn1', result: null, flexed: true, primetime: true, broadcastNetwork: null },
          { homeTeamId: 'afce2', awayTeamId: 'afcn2', result: null, flexed: false, primetime: false, broadcastNetwork: null },
        ],
      },
    ];

    assignBroadcasts(game, 16);

    expect(game.schedule[0]!.games[0]!.broadcastNetwork).toBe('MFN');
    expect(game.schedule[0]!.games.every((gameEntry) => gameEntry.broadcastNetwork !== null)).toBe(true);
  });

  it('returns a full generated-length team schedule', () => {
    const game = makeLeagueState('regular_season', 5);

    const schedule = getFullSchedule(game, 'afce1');

    expect(schedule).toHaveLength(18);
  });

  it('returns 19 team schedule rows when the generated schedule has 19 weeks', () => {
    const game = makeLeagueState('regular_season', 5);
    game.schedule = Array.from({ length: 19 }, (_, index) => ({ week: index + 1, games: [] }));

    const schedule = getFullSchedule(game, 'afce1');

    expect(schedule).toHaveLength(19);
    expect(schedule.at(-1)?.week).toBe(19);
  });

  it('returns the week schedule with broadcast metadata', () => {
    const game = makeLeagueState('regular_season', 8);
    game.schedule[0]!.games[0] = {
      homeTeamId: 'afce1',
      awayTeamId: 'afce2',
      result: null,
      flexed: false,
      primetime: false,
      broadcastNetwork: 'FOX8',
    };

    const weekSchedule = getWeekSchedule(game, 1);

    expect(weekSchedule[0]).toMatchObject({ broadcastNetwork: 'FOX8', week: 1 });
  });
});
