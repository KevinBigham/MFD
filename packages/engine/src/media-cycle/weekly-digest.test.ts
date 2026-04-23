import { describe, expect, it } from 'vitest';
import type { GameResult, TeamGameStats } from '../types';
import { makeLeagueState } from '../systems/test-helpers';
import { generateHeadlines } from './headlines';
import { generateHotTakes } from './hot-takes';
import { computePowerRankings } from './power-rankings';
import { generateWeeklyMediaCycle } from './weekly-digest';

function stats(quarterScores: [number, number, number, number] = [7, 7, 7, 7]): TeamGameStats {
  return {
    totalYards: 0,
    passingYards: 0,
    rushingYards: 0,
    turnovers: 0,
    sacks: 0,
    pressuresAllowed: 0,
    thirdDownConversions: 0,
    thirdDownAttempts: 0,
    timeOfPossession: 30,
    passAttempts: 0,
    passCompletions: 0,
    passTDs: 0,
    interceptions: 0,
    rushAttempts: 0,
    rushTDs: 0,
    fumbles: 0,
    penalties: 0,
    penaltyYards: 0,
    fgMade: 0,
    fgAttempted: 0,
    punts: 0,
    drives: 0,
    yacYards: 0,
    redZoneTrips: 0,
    redZoneScores: 0,
    quarterScores,
    playerLines: [],
  };
}

function addResult(
  game: ReturnType<typeof makeLeagueState>,
  weekNumber: number,
  homeTeamId: string,
  awayTeamId: string,
  homeScore = 24,
  awayScore = 17,
): GameResult {
  const result: GameResult = {
    id: `${weekNumber}-${homeTeamId}-${awayTeamId}`,
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    week: weekNumber,
    year: game.year,
    overtime: false,
    mvpPlayerId: null,
    stats: {
      [homeTeamId]: stats(),
      [awayTeamId]: stats(),
    },
    playerMatchupEvents: [],
  };
  const week = game.schedule.find((entry) => entry.week === weekNumber) ?? (() => {
    const next = { week: weekNumber, games: [] as typeof game.schedule[number]['games'] };
    game.schedule.push(next);
    return next;
  })();
  week.games.push({
    homeTeamId,
    awayTeamId,
    result,
    flexed: false,
    primetime: false,
    broadcastNetwork: null,
  });
  return result;
}

describe('weekly media digest', () => {
  it('collects rankings, headlines, and hot takes for the requested week', () => {
    const game = makeLeagueState('regular_season', 8);
    addResult(game, 8, 'afce1', 'afce2', 38, 10);

    const digest = generateWeeklyMediaCycle(game, 8);

    expect(digest.powerRankings.length).toBeGreaterThan(0);
    expect(digest.headlines.length).toBeGreaterThan(0);
    expect(digest.hotTakes.length).toBeGreaterThan(0);
  });

  it('is deterministic for the same state and week', () => {
    const game = makeLeagueState('regular_season', 8);
    addResult(game, 8, 'afce1', 'afce2');

    expect(generateWeeklyMediaCycle(game, 8)).toEqual(generateWeeklyMediaCycle(game, 8));
  });

  it('uses only game results from the requested week', () => {
    const game = makeLeagueState('regular_season', 8);
    addResult(game, 7, 'afce1', 'afce2', 17, 10);
    addResult(game, 8, 'nfce1', 'nfce2', 31, 10);

    const digest = generateWeeklyMediaCycle(game, 8);

    expect(digest.headlines.every((headline) => headline.weekNumber === 8)).toBe(true);
  });

  it('mirrors the standalone power rankings computation', () => {
    const game = makeLeagueState('regular_season', 8);
    addResult(game, 8, 'afce1', 'afce2');

    expect(generateWeeklyMediaCycle(game, 8).powerRankings).toEqual(computePowerRankings(game, 8));
  });

  it('mirrors the standalone headline generation', () => {
    const game = makeLeagueState('regular_season', 8);
    const result = addResult(game, 8, 'afce1', 'afce2');

    expect(generateWeeklyMediaCycle(game, 8).headlines).toEqual(generateHeadlines(game, 8, [result]));
  });

  it('mirrors the standalone hot take generation', () => {
    const game = makeLeagueState('regular_season', 8);
    const result = addResult(game, 8, 'afce1', 'afce2');
    const standaloneHeadlines = generateHeadlines(game, 8, [result]);

    expect(generateWeeklyMediaCycle(game, 8).hotTakes).toEqual(generateHotTakes(game, 8, standaloneHeadlines));
  });

  it('still emits rankings when the selected week has no completed games', () => {
    const game = makeLeagueState('regular_season', 8);
    const digest = generateWeeklyMediaCycle(game, 8);

    expect(digest.powerRankings.length).toBeGreaterThan(0);
    expect(digest.headlines).toEqual([]);
  });

  it('passes through milestone headlines generated from state', () => {
    const game = makeLeagueState('regular_season', 8);
    game.recentMilestones = [{
      playerId: 'afce1-qb',
      playerName: 'Milestone Player',
      stat: 'passYds',
      value: 10000,
      milestoneLabel: '10,000 career yards',
      narrative: 'Milestone narrative',
      year: game.year,
      week: 8,
    }];

    const digest = generateWeeklyMediaCycle(game, 8);
    expect(digest.headlines.some((headline) => headline.category === 'MILESTONE')).toBe(true);
  });
});
