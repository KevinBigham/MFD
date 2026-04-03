import { describe, expect, it } from 'vitest';
import {
  buildFilmRoomReport,
  buildOpponentIntel,
  evaluateWeeklyPrep,
  gradeGamePlanExecution,
  type GameResult,
  type WeeklyPrepPlan,
} from '../index';
import { makeLeagueState } from './test-helpers';

function plan(): WeeklyPrepPlan {
  return {
    teamId: 'afce1',
    opponentTeamId: 'afce2',
    year: 2026,
    week: 1,
    offensiveFocus: 'attack_secondary',
    defensiveFocus: 'heat_qb',
    practiceIntensity: 'normal',
    keyMatchupPlayerId: null,
    snapManagement: 'normal',
    specialSituation: 'red_zone',
  };
}

function makeResult(): GameResult {
  return {
    homeTeamId: 'afce1',
    awayTeamId: 'afce2',
    homeScore: 31,
    awayScore: 17,
    quarterScores: {
      afce1: [7, 10, 7, 7],
      afce2: [3, 7, 0, 7],
    },
    possessions: 22,
    mvpPlayerId: 'afce1-qb',
    summary: 'AFCE1 wins cleanly.',
    stats: {
      afce1: {
        points: 31,
        totalYards: 402,
        passingYards: 308,
        rushingYards: 94,
        turnovers: 0,
        sacks: 3,
        pressuresAllowed: 1,
        thirdDownConversions: 7,
        thirdDownAttempts: 12,
        timeOfPossession: 31,
        passAttempts: 34,
        passCompletions: 25,
        passTDs: 3,
        interceptions: 0,
        rushAttempts: 24,
        rushTDs: 1,
        fumbles: 0,
        penalties: 4,
        penaltyYards: 35,
        fgMade: 1,
        fgAttempted: 1,
        punts: 3,
        drives: 11,
        yacYards: 81,
        redZoneTrips: 4,
        redZoneScores: 4,
        quarterScores: [7, 10, 7, 7],
        playerLines: [],
      },
      afce2: {
        points: 17,
        totalYards: 289,
        passingYards: 221,
        rushingYards: 68,
        turnovers: 2,
        sacks: 1,
        pressuresAllowed: 3,
        thirdDownConversions: 4,
        thirdDownAttempts: 13,
        timeOfPossession: 29,
        passAttempts: 32,
        passCompletions: 19,
        passTDs: 2,
        interceptions: 2,
        rushAttempts: 19,
        rushTDs: 0,
        fumbles: 0,
        penalties: 6,
        penaltyYards: 48,
        fgMade: 1,
        fgAttempted: 1,
        punts: 5,
        drives: 11,
        yacYards: 42,
        redZoneTrips: 2,
        redZoneScores: 2,
        quarterScores: [3, 7, 0, 7],
        playerLines: [],
      },
    },
    weather: 'clear',
    matchupHighlight: null,
    broadcastNetwork: 'MFN',
    primetime: false,
    flexed: false,
    specialTeams: {
      afce1: {
        kickReturnYards: 41,
        puntReturnYards: 18,
        returnTouchdowns: 0,
        returnFumbles: 0,
        touchbacks: 5,
        netPuntAverage: 42,
        highlights: [],
      },
      afce2: {
        kickReturnYards: 19,
        puntReturnYards: 10,
        returnTouchdowns: 0,
        returnFumbles: 0,
        touchbacks: 4,
        netPuntAverage: 39,
        highlights: [],
      },
    },
  };
}

describe('film room', () => {
  it('grades an aligned winning plan positively', () => {
    const game = makeLeagueState('regular_season', 1);
    const intel = buildOpponentIntel(game, 'afce1', 'afce2');
    const prep = evaluateWeeklyPrep(game.teams.afce1!, intel, plan());

    const grade = gradeGamePlanExecution(prep, makeResult(), intel);

    expect(['A', 'B']).toContain(grade.grade);
    expect(grade.alignedCalls.length).toBeGreaterThan(0);
  });

  it('grades poor execution negatively when the result misses the plan', () => {
    const game = makeLeagueState('regular_season', 1);
    const intel = buildOpponentIntel(game, 'afce1', 'afce2');
    const prep = evaluateWeeklyPrep(game.teams.afce1!, intel, { ...plan(), offensiveFocus: 'protect_qb' });
    const loss = makeResult();
    loss.homeScore = 13;
    loss.awayScore = 24;
    loss.stats.afce1.points = 13;
    loss.stats.afce1.passingYards = 144;

    const grade = gradeGamePlanExecution(prep, loss, intel);

    expect(['D', 'F']).toContain(grade.grade);
    expect(grade.missedCalls.length).toBeGreaterThan(0);
  });

  it('builds a film room report with next-step recommendations', () => {
    const game = makeLeagueState('regular_season', 1);
    const intel = buildOpponentIntel(game, 'afce1', 'afce2');
    const prep = evaluateWeeklyPrep(game.teams.afce1!, intel, plan());

    const report = buildFilmRoomReport(game, 'afce1', makeResult(), prep, intel);

    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.executionNotes.length).toBeGreaterThan(0);
  });

  it('records carry-forward recommendations for next week', () => {
    const game = makeLeagueState('regular_season', 1);
    const intel = buildOpponentIntel(game, 'afce1', 'afce2');
    const prep = evaluateWeeklyPrep(game.teams.afce1!, intel, plan());

    const report = buildFilmRoomReport(game, 'afce1', makeResult(), prep, intel);

    expect(report.carryForward.length).toBeGreaterThan(0);
  });

  it('is deterministic for the same game and prep inputs', () => {
    const game = makeLeagueState('regular_season', 1);
    const intel = buildOpponentIntel(game, 'afce1', 'afce2');
    const prep = evaluateWeeklyPrep(game.teams.afce1!, intel, plan());

    const left = buildFilmRoomReport(game, 'afce1', makeResult(), prep, intel);
    const right = buildFilmRoomReport(game, 'afce1', makeResult(), prep, intel);

    expect(left.grade).toBe(right.grade);
    expect(left.recommendations).toEqual(right.recommendations);
  });
});
