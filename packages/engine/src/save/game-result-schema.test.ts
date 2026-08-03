import { describe, it, expect } from 'vitest';
import {
  GameResultSchema,
  ScheduledGameSchema,
  TeamGameStatsSchema,
  PlayerGameLineSchema,
} from './schema';

/**
 * Schema hardening island 1: ScheduledGame.result is typed against the real
 * GameResult shape (types/sim.ts) instead of z.any(). These tests lock the
 * contract in both directions:
 *
 * - modern engine-written results (snap ledger, broadcast, matchup events,
 *   contingency activations) round-trip without data loss;
 * - legacy-era results written before later GameResult fields existed still
 *   parse, gaining defaults instead of failing old saves;
 * - malformed payloads are rejected loudly instead of flowing downstream.
 */

const modernResult = {
  id: 'game-2026-1-alpha-beta',
  homeTeamId: 'alpha',
  awayTeamId: 'beta',
  homeScore: 27,
  awayScore: 20,
  week: 1,
  year: 2026,
  overtime: false,
  mvpPlayerId: 'alpha-qb-1',
  stats: {
    alpha: {
      totalYards: 410,
      passingYards: 288,
      rushingYards: 122,
      turnovers: 1,
      sacks: 2,
      pressuresAllowed: 5,
      thirdDownConversions: 7,
      thirdDownAttempts: 13,
      timeOfPossession: 31.5,
      passAttempts: 34,
      passCompletions: 24,
      passTDs: 3,
      interceptions: 1,
      rushAttempts: 28,
      rushTDs: 1,
      fumbles: 0,
      penalties: 4,
      penaltyYards: 35,
      fgMade: 2,
      fgAttempted: 2,
      punts: 3,
      drives: 11,
      yacYards: 96,
      redZoneTrips: 4,
      redZoneScores: 3,
      quarterScores: [7, 10, 3, 7],
      playerLines: [
        {
          playerId: 'alpha-qb-1',
          name: 'Armstrong Thrower',
          pos: 'QB',
          passAtt: 34,
          passComp: 24,
          passYds: 288,
          passTD: 3,
          passINT: 1,
          snaps: 62,
        },
      ],
    },
    beta: {
      totalYards: 305,
      passingYards: 210,
      rushingYards: 95,
      turnovers: 2,
      sacks: 3,
      pressuresAllowed: 8,
      thirdDownConversions: 4,
      thirdDownAttempts: 12,
      timeOfPossession: 28.5,
      passAttempts: 30,
      passCompletions: 19,
      passTDs: 2,
      interceptions: 2,
      rushAttempts: 22,
      rushTDs: 0,
      fumbles: 1,
      penalties: 6,
      penaltyYards: 51,
      fgMade: 2,
      fgAttempted: 3,
      punts: 5,
      drives: 11,
      yacYards: 71,
      redZoneTrips: 3,
      redZoneScores: 2,
      quarterScores: [3, 7, 7, 3],
      playerLines: [],
    },
  },
  weather: 'rain',
  matchupHighlight: {
    label: 'Trenches',
    detail: 'Alpha DL owned the line',
    teamId: 'alpha',
    playerId: 'alpha-dl-1',
    opponentPlayerId: 'beta-ol-1',
    advantage: 12,
  },
  broadcastNetwork: 'MFN',
  broadcast: { gameId: 'game-2026-1-alpha-beta', finalNarrative: 'Alpha pulls away late.' },
  primetime: true,
  flexed: false,
  specialTeams: {
    alpha: {
      kickReturnYards: 66,
      puntReturnYards: 12,
      returnTouchdowns: 0,
      returnFumbles: 0,
      touchbacks: 3,
      netPuntAverage: 44.2,
      highlights: ['55-yard punt flipped field position'],
    },
  },
  playerMatchupEvents: [
    { type: 'interception', offensePlayerId: 'beta-qb-1', defensePlayerId: 'alpha-cb-1', quarter: 4 },
  ],
  snapEvents: [{ snapId: 'snap-1', type: 'pass', yards: 12 }],
  snapLedgerMode: 'canonical',
  healthyStarterShortages: {},
  healthyStarterShortagesByTeam: {},
  callYourShotResult: { shotId: 'shot-1', hit: true },
  namedGame: { name: 'The Rain Game', year: 2026 },
  contingencyActivations: [
    {
      teamId: 'alpha',
      ruleId: 'rule-1',
      label: 'Two-Minute Drill',
      triggerLabel: 'Trailing under 2:00',
      responseLabel: 'Spread offense',
      quarter: 4,
      callout: 'Alpha goes hurry-up',
    },
  ],
};

describe('GameResultSchema (island 1: typed ScheduledGame.result)', () => {
  it('round-trips a modern engine-written result without data loss', () => {
    const parsed = GameResultSchema.safeParse(modernResult);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(modernResult);
    }
  });

  it('parses a legacy-era result missing later GameResult fields and applies defaults', () => {
    const legacyResult = {
      id: 'game-2024-7-alpha-beta',
      homeTeamId: 'alpha',
      awayTeamId: 'beta',
      homeScore: 17,
      awayScore: 14,
      week: 7,
      year: 2024,
      stats: {
        alpha: {
          totalYards: 300,
          passingYards: 200,
          rushingYards: 100,
          turnovers: 0,
          sacks: 1,
          pressuresAllowed: 3,
          thirdDownConversions: 5,
          thirdDownAttempts: 11,
          timeOfPossession: 30,
        },
      },
    };

    const parsed = GameResultSchema.safeParse(legacyResult);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.overtime).toBe(false);
      expect(parsed.data.mvpPlayerId).toBeNull();
      expect(parsed.data.playerMatchupEvents).toEqual([]);
      expect(parsed.data.stats.alpha.yacYards).toBe(0);
      expect(parsed.data.stats.alpha.quarterScores).toEqual([]);
      expect(parsed.data.stats.alpha.playerLines).toEqual([]);
    }
  });

  it('accepts unplayed scheduled games with a null result', () => {
    const parsed = ScheduledGameSchema.safeParse({
      homeTeamId: 'alpha',
      awayTeamId: 'beta',
      result: null,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.result).toBeNull();
      expect(parsed.data.flexed).toBe(false);
      expect(parsed.data.broadcastNetwork).toBeNull();
    }
  });

  it('parses a scheduled game carrying a legacy result', () => {
    const parsed = ScheduledGameSchema.safeParse({
      homeTeamId: 'alpha',
      awayTeamId: 'beta',
      result: {
        id: 'g1',
        homeTeamId: 'alpha',
        awayTeamId: 'beta',
        homeScore: 10,
        awayScore: 9,
        week: 2,
        year: 2025,
        stats: {},
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects malformed results instead of passing them downstream', () => {
    const missingId = { ...modernResult };
    delete (missingId as Record<string, unknown>).id;
    expect(GameResultSchema.safeParse(missingId).success).toBe(false);

    expect(
      GameResultSchema.safeParse({ ...modernResult, homeScore: 'twenty-seven' }).success,
    ).toBe(false);

    expect(
      GameResultSchema.safeParse({ ...modernResult, stats: 'not-a-record' }).success,
    ).toBe(false);

    expect(
      GameResultSchema.safeParse({ ...modernResult, weather: 'hurricane' }).success,
    ).toBe(false);

    expect(
      TeamGameStatsSchema.safeParse({ totalYards: 'lots' }).success,
    ).toBe(false);

    expect(
      PlayerGameLineSchema.safeParse({ playerId: 'p1', name: 'Player One', pos: 'XYZ' }).success,
    ).toBe(false);
  });
});
