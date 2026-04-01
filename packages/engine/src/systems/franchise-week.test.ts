import { describe, expect, it } from 'vitest';
import { advanceFranchiseWeek, seedPlayoffBracket } from '../index';
import { makeLeagueState } from './test-helpers';

describe('franchise week simulation', () => {
  it('moves preseason into regular season without consuming week 1', () => {
    const game = makeLeagueState('preseason', 1);
    const result = advanceFranchiseWeek(game);

    expect(result.nextState.phase).toBe('regular_season');
    expect(result.nextState.week).toBe(1);
    expect(result.nextState.schedule[0]!.games[0]!.result).toBeNull();
    expect(result.nextState.weekSummaries).toHaveLength(0);
  });

  it('simulates a deterministic league week and records one game-day package for the user team', () => {
    const game = makeLeagueState('regular_season', 1);

    const first = advanceFranchiseWeek(game);
    const second = advanceFranchiseWeek(structuredClone(game));

    expect(first.nextState.schedule[0]!.games.every((entry) => entry.result !== null)).toBe(true);
    expect(first.nextState.week).toBe(2);
    expect(first.nextState.weekSummaries).toHaveLength(1);
    expect(first.nextState.gameDayState.recentPackages).toHaveLength(1);
    expect(first.nextState.gameDayState.latestPackageId).toBe(first.nextState.gameDayState.recentPackages[0]!.id);
    expect(first.nextState.weekSummaries).toEqual(second.nextState.weekSummaries);
    expect(first.nextState.gameDayState).toEqual(second.nextState.gameDayState);
    expect(first.nextState.narrativeState.hooks.length).toBeGreaterThan(0);
  });

  it('seeds seven playoff teams per conference using standings tiebreakers', () => {
    const game = makeLeagueState('regular_season', 19);
    const records: Record<string, [number, number, number]> = {
      afce1: [13, 4, 120],
      afce2: [10, 7, 40],
      afcn1: [12, 5, 80],
      afcn2: [10, 7, 30],
      afcs1: [11, 6, 55],
      afcs2: [8, 9, -20],
      afcw1: [11, 6, 60],
      afcw2: [10, 7, 30],
      nfce1: [14, 3, 110],
      nfce2: [9, 8, 10],
      nfcn1: [12, 5, 70],
      nfcn2: [10, 7, 25],
      nfcs1: [11, 6, 50],
      nfcs2: [8, 9, -25],
      nfcw1: [11, 6, 50],
      nfcw2: [10, 7, 25],
    };

    for (const [teamId, [wins, losses, pointDifferential]] of Object.entries(records)) {
      game.teams[teamId]!.wins = wins;
      game.teams[teamId]!.losses = losses;
      game.teams[teamId]!.seasonStats.pointDifferential = pointDifferential;
    }

    const bracket = seedPlayoffBracket(game);

    expect(bracket.afc).toHaveLength(7);
    expect(bracket.nfc).toHaveLength(7);
    expect(bracket.afc[0]!.teamId).toBe('afce1');
    expect(bracket.afc[6]!.teamId).toBe('afcw2');
    expect(bracket.nfc[3]!.teamId).toBe('nfcw1');
    expect(bracket.nfc[5]!.teamId).toBe('nfcw2');
    expect(bracket.nfc[6]!.teamId).toBe('nfce2');
  });

  it('enters offseason with a populated re-sign window after the championship', () => {
    const game = makeLeagueState('playoffs', 22);
    game.playoffBracket = {
      season: 2026,
      afc: [],
      nfc: [],
      matchups: [],
      championTeamId: 'afce1',
    };
    game.teams.afce1.roster[0]!.contract!.years = 1;
    game.teams.afce1.roster[0]!.contract!.yearlyBreakdown = [
      game.teams.afce1.roster[0]!.contract!.yearlyBreakdown[0]!,
    ];

    const result = advanceFranchiseWeek(game);

    expect(result.nextState.phase).toBe('offseason');
    expect(result.nextState.year).toBe(2027);
    expect(result.nextState.week).toBe(1);
    expect(result.nextState.offseasonState).not.toBeNull();
    expect(result.nextState.offseasonState?.expiringPlayerIds).toContain(game.teams.afce1.roster[0]!.id);
    expect(result.nextState.freeAgents).not.toContain(game.teams.afce1.roster[0]!.id);
  });
});
