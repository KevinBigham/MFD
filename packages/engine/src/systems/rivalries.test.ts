import { describe, expect, it } from 'vitest';
import {
  decayLeagueRivalries,
  getRivalryGameContext,
  seedLeagueRivalries,
  updateLeagueRivalriesFromGame,
} from '../index';
import type { GameResult } from '../types';
import { makeLeagueState } from './test-helpers';

function makeCloseGame(): GameResult {
  return {
    id: 'game-2026-1-afce1-afce2',
    homeTeamId: 'afce1',
    awayTeamId: 'afce2',
    homeScore: 24,
    awayScore: 22,
    week: 1,
    year: 2026,
    overtime: false,
    mvpPlayerId: 'afce1-qb',
    stats: {
      afce1: {
        totalYards: 355,
        passingYards: 240,
        rushingYards: 115,
        turnovers: 1,
        sacks: 3,
        thirdDownConversions: 5,
        thirdDownAttempts: 12,
        timeOfPossession: 31,
        passAttempts: 28,
        passCompletions: 19,
        passTDs: 2,
        interceptions: 1,
        rushAttempts: 25,
        rushTDs: 1,
        fumbles: 0,
        penalties: 4,
        penaltyYards: 35,
        fgMade: 1,
        fgAttempted: 1,
        punts: 4,
        quarterScores: [7, 7, 3, 7],
        playerLines: [],
      },
      afce2: {
        totalYards: 348,
        passingYards: 232,
        rushingYards: 116,
        turnovers: 2,
        sacks: 2,
        thirdDownConversions: 4,
        thirdDownAttempts: 11,
        timeOfPossession: 29,
        passAttempts: 30,
        passCompletions: 20,
        passTDs: 2,
        interceptions: 2,
        rushAttempts: 23,
        rushTDs: 1,
        fumbles: 0,
        penalties: 5,
        penaltyYards: 42,
        fgMade: 0,
        fgAttempted: 1,
        punts: 5,
        quarterScores: [7, 6, 3, 6],
        playerLines: [],
      },
    },
  };
}

describe('rivalries', () => {
  it('seeds division rivalries into the canonical league model and legacy heat map', () => {
    const game = makeLeagueState('regular_season', 1);

    seedLeagueRivalries(game);

    const rivalry = game.leagueRivalries.find((entry) =>
      entry.id === 'afce1::afce2' || entry.id === 'afce2::afce1');

    expect(rivalry).toBeDefined();
    expect(rivalry?.intensity).toBe(40);
    expect(game.teams.afce1!.rivals.afce2?.heat).toBeGreaterThanOrEqual(5);
  });

  it('raises rivalry intensity after a close game and unlocks the gameplay boost when heated', () => {
    const game = makeLeagueState('regular_season', 1);
    seedLeagueRivalries(game);

    updateLeagueRivalriesFromGame(game, makeCloseGame());
    updateLeagueRivalriesFromGame(game, makeCloseGame());
    updateLeagueRivalriesFromGame(game, makeCloseGame());

    const context = getRivalryGameContext(game, 'afce1', 'afce2');

    expect(context).not.toBeNull();
    expect(context?.intensity).toBeGreaterThan(50);
    expect(context?.ovrBoost).toBe(3);
  });

  it('decays rivalries in the offseason without deleting established history', () => {
    const game = makeLeagueState('offseason', 1);
    game.leagueRivalries.push({
      id: 'afce1::nfce1',
      teamA: 'afce1',
      teamB: 'nfce1',
      intensity: 12,
      isDivision: false,
      history: ['2025: playoff grudge'],
      lastMetYear: 2025,
      lastMetWeek: 20,
    });

    decayLeagueRivalries(game);

    expect(game.leagueRivalries[0]!.intensity).toBe(10);
    expect(game.leagueRivalries[0]!.history).toContain('2025: playoff grudge');
  });
});
