import { describe, expect, it } from 'vitest';
import type { GameResult, GameState, LeagueRivalry, Rivalry } from '../types';
import { makeLeagueState } from '../systems/test-helpers';
import { deriveRivalries } from './compute';

function makeResult(
  overrides: Partial<GameResult> & {
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number;
    awayScore: number;
    week: number;
  },
): GameResult {
  const homeScore = overrides.homeScore;
  const awayScore = overrides.awayScore;

  return {
    id: overrides.id ?? `${overrides.homeTeamId}-${overrides.awayTeamId}-${overrides.week}-${homeScore}-${awayScore}`,
    homeTeamId: overrides.homeTeamId,
    awayTeamId: overrides.awayTeamId,
    homeScore,
    awayScore,
    week: overrides.week,
    year: overrides.year ?? 2026,
    overtime: overrides.overtime ?? false,
    mvpPlayerId: overrides.mvpPlayerId ?? null,
    stats: overrides.stats ?? {
      [overrides.homeTeamId]: {} as never,
      [overrides.awayTeamId]: {} as never,
    },
    playerMatchupEvents: overrides.playerMatchupEvents ?? [],
    namedGame: overrides.namedGame,
  };
}

function setScheduledResult(game: GameState, week: number, homeTeamId: string, awayTeamId: string, result: GameResult): void {
  const scheduleWeek = game.schedule.find((entry) => entry.week === week);
  if (!scheduleWeek) {
    game.schedule.push({
      week,
      games: [{ homeTeamId, awayTeamId, result }],
    });
    return;
  }

  const scheduledGame = scheduleWeek.games.find((entry) => entry.homeTeamId === homeTeamId && entry.awayTeamId === awayTeamId);
  if (!scheduledGame) {
    scheduleWeek.games.push({ homeTeamId, awayTeamId, result });
    return;
  }

  scheduledGame.result = result;
}

function setLeagueHint(game: GameState, hint: LeagueRivalry): void {
  game.leagueRivalries.push(hint);
}

function setLegacyRivalries(game: GameState, teamId: string, rivalry: Rivalry): void {
  game.teams[teamId]!.rivalries.push(rivalry);
}

describe('deriveRivalries', () => {
  it('returns an empty payload when the league has no results or rivalry hints', () => {
    const game = makeLeagueState();

    expect(deriveRivalries(game)).toEqual({
      schemaVersion: 1,
      generatedAt: 0,
      teams: {},
    });
  });

  it('mirrors rivalry records for both teams with owner-oriented last matchup and head-to-head totals', () => {
    const game = makeLeagueState();
    setScheduledResult(
      game,
      1,
      'afce1',
      'afce2',
      makeResult({
        homeTeamId: 'afce1',
        awayTeamId: 'afce2',
        homeScore: 24,
        awayScore: 17,
        week: 1,
      }),
    );

    const payload = deriveRivalries(game);

    expect(payload.teams.afce1).toEqual([{
      opponentId: 'afce2',
      intensity: 40,
      dramaTags: [],
      lastMatchup: {
        season: 2026,
        week: 1,
        result: 'win',
        margin: 7,
      },
      headToHeadRecent: {
        wins: 1,
        losses: 0,
        ties: 0,
      },
    }]);

    expect(payload.teams.afce2).toEqual([{
      opponentId: 'afce1',
      intensity: 40,
      dramaTags: [],
      lastMatchup: {
        season: 2026,
        week: 1,
        result: 'loss',
        margin: -7,
      },
      headToHeadRecent: {
        wins: 0,
        losses: 1,
        ties: 0,
      },
    }]);
  });

  it('sorts divisional rivalries above non-divisional peers when other factors are comparable', () => {
    const game = makeLeagueState();
    setScheduledResult(
      game,
      1,
      'afce1',
      'afce2',
      makeResult({
        homeTeamId: 'afce1',
        awayTeamId: 'afce2',
        homeScore: 24,
        awayScore: 20,
        week: 1,
      }),
    );
    setScheduledResult(
      game,
      18,
      'afce1',
      'afcn1',
      makeResult({
        homeTeamId: 'afce1',
        awayTeamId: 'afcn1',
        homeScore: 24,
        awayScore: 20,
        week: 18,
      }),
    );

    const records = deriveRivalries(game).teams.afce1 ?? [];

    expect(records.map((record) => record.opponentId)).toEqual(['afce2', 'afcn1']);
    expect(records[0]?.intensity).toBeGreaterThan(records[1]?.intensity ?? 0);
  });

  it('uses parseable multi-season legacy history as matchup evidence and dedupes mirrored team entries', () => {
    const game = makeLeagueState();
    const history: Rivalry['history'] = [
      { year: 2025, week: 18, winner: 'afce1', score: '31-24' },
      { year: 2025, week: 9, winner: 'afce2', score: '21-17' },
      { year: 2024, week: 17, winner: 'afce1', score: '27-24' },
      { year: 2024, week: 6, winner: 'afce1', score: '30-27' },
      { year: 2023, week: 11, winner: 'afce1', score: '20-17' },
      { year: 2022, week: 8, winner: 'afce2', score: '17-14' },
    ];

    setLegacyRivalries(game, 'afce1', {
      teamId: 'afce2',
      heat: 72,
      trophyName: null,
      history,
    });
    setLegacyRivalries(game, 'afce2', {
      teamId: 'afce1',
      heat: 72,
      trophyName: null,
      history,
    });

    const payload = deriveRivalries(game);
    const record = payload.teams.afce1?.[0];

    expect(record).toMatchObject({
      opponentId: 'afce2',
      lastMatchup: {
        season: 2025,
        week: 18,
        result: 'win',
        margin: 7,
      },
      headToHeadRecent: {
        wins: 4,
        losses: 1,
        ties: 0,
      },
    });
  });

  it('classifies legacy week 18 rivalry rows as playoff history after generated 17-week seasons', () => {
    const game = makeLeagueState();
    game.schedule = Array.from({ length: 17 }, (_, index) => ({ week: index + 1, games: [] }));

    setLegacyRivalries(game, 'afce1', {
      teamId: 'afce2',
      heat: 72,
      trophyName: null,
      history: [
        { year: 2025, week: 18, winner: 'afce1', score: '31-17' },
      ],
    });

    const record = deriveRivalries(game).teams.afce1?.[0];

    expect(record).toMatchObject({
      opponentId: 'afce2',
      intensity: 45,
      lastMatchup: {
        season: 2025,
        week: 18,
        result: 'win',
        margin: 14,
      },
    });
  });

  it('ignores malformed legacy history rows instead of inventing matchup detail', () => {
    const game = makeLeagueState();

    setLegacyRivalries(game, 'afce1', {
      teamId: 'afce2',
      heat: 80,
      trophyName: null,
      history: [
        { year: 2025, week: 18, winner: 'unknown-team', score: '31-24' },
        { year: 2024, week: 5, winner: 'afce1', score: 'not-a-score' },
      ],
    });

    expect(deriveRivalries(game)).toEqual({
      schemaVersion: 1,
      generatedAt: 0,
      teams: {},
    });
  });

  it('uses playoff hints for intensity without inventing head-to-head totals or a last matchup', () => {
    const game = makeLeagueState();

    setLeagueHint(game, {
      id: 'afce1::nfce1',
      teamA: 'afce1',
      teamB: 'nfce1',
      intensity: 55,
      isDivision: false,
      history: ['2024: playoff elimination added fuel'],
      lastMetYear: 2024,
      lastMetWeek: 20,
    });

    const record = deriveRivalries(game).teams.afce1?.[0];

    expect(record).toEqual({
      opponentId: 'nfce1',
      intensity: 30,
      dramaTags: [],
      lastMatchup: null,
      headToHeadRecent: {
        wins: 0,
        losses: 0,
        ties: 0,
      },
    });
  });

  it('is deterministic for the same league input', () => {
    const game = makeLeagueState();
    setScheduledResult(
      game,
      1,
      'afce1',
      'afce2',
      makeResult({
        homeTeamId: 'afce1',
        awayTeamId: 'afce2',
        homeScore: 27,
        awayScore: 24,
        week: 1,
        overtime: true,
      }),
    );
    setLeagueHint(game, {
      id: 'afce1::nfce1',
      teamA: 'afce1',
      teamB: 'nfce1',
      intensity: 48,
      isDivision: false,
      history: ['2023: playoff elimination added fuel'],
      lastMetYear: 2023,
      lastMetWeek: 20,
    });

    const first = deriveRivalries(game);
    const second = deriveRivalries(game);

    expect(second).toEqual(first);
  });
});
