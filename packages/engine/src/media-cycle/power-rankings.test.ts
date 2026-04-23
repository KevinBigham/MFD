import { describe, expect, it } from 'vitest';
import type { GameResult, PlayerGameLine, Team, TeamGameStats } from '../types';
import { makeLeagueState } from '../systems/test-helpers';
import { computePowerRankings } from './power-rankings';

function setRosterOvr(team: Team, ovr: number): void {
  for (const player of team.roster) {
    player.ovr = ovr;
    player.pot = ovr + 4;
  }
}

function syncRecord(team: Team, wins: number, losses: number, streak: number): void {
  team.wins = wins;
  team.losses = losses;
  team.ties = 0;
  team.streak = streak;
}

function makeTeamStats(playerLines: PlayerGameLine[] = [], quarterScores: [number, number, number, number] = [0, 0, 0, 0]): TeamGameStats {
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
    playerLines,
  };
}

function ensureWeek(game: ReturnType<typeof makeLeagueState>, weekNumber: number) {
  let week = game.schedule.find((entry) => entry.week === weekNumber);
  if (!week) {
    week = { week: weekNumber, games: [] };
    game.schedule.push(week);
  }
  return week;
}

function addResolvedGame(
  game: ReturnType<typeof makeLeagueState>,
  weekNumber: number,
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number,
  awayScore: number,
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
      [homeTeamId]: makeTeamStats(),
      [awayTeamId]: makeTeamStats(),
    },
    playerMatchupEvents: [],
  };

  ensureWeek(game, weekNumber).games.push({
    homeTeamId,
    awayTeamId,
    result,
    flexed: false,
    primetime: false,
    broadcastNetwork: null,
  });

  return result;
}

describe('media-cycle power rankings', () => {
  it('is deterministic for the same state and week', () => {
    const game = makeLeagueState('regular_season', 6);
    syncRecord(game.teams.afce1!, 5, 0, 5);
    syncRecord(game.teams.nfcw2!, 0, 5, -5);

    const first = computePowerRankings(game, 6);
    const second = computePowerRankings(game, 6);

    expect(first).toEqual(second);
  });

  it('returns a contiguous ranking for every team', () => {
    const game = makeLeagueState('regular_season', 4);
    const rankings = computePowerRankings(game, 4);

    expect(rankings).toHaveLength(Object.keys(game.teams).length);
    expect(rankings.map((entry) => entry.rank)).toEqual(Array.from({ length: rankings.length }, (_, index) => index + 1));
  });

  it('ranks stronger teams above weaker teams when records are equal', () => {
    const game = makeLeagueState('regular_season', 5);
    syncRecord(game.teams.afce1!, 4, 1, 2);
    syncRecord(game.teams.afce2!, 4, 1, 2);
    setRosterOvr(game.teams.afce1!, 92);
    setRosterOvr(game.teams.afce2!, 68);

    const rankings = computePowerRankings(game, 5);
    const afce1Rank = rankings.find((entry) => entry.teamId === 'afce1')!.rank;
    const afce2Rank = rankings.find((entry) => entry.teamId === 'afce2')!.rank;

    expect(afce1Rank).toBeLessThan(afce2Rank);
  });

  it('breaks exact ties by team id ascending', () => {
    const game = makeLeagueState('regular_season', 3);
    for (const teamId of ['afce1', 'afce2']) {
      syncRecord(game.teams[teamId]!, 2, 1, 1);
      setRosterOvr(game.teams[teamId]!, 80);
    }

    const rankings = computePowerRankings(game, 3);
    const pair = rankings.filter((entry) => entry.teamId === 'afce1' || entry.teamId === 'afce2').sort((left, right) => left.rank - right.rank);
    expect(pair[0]?.teamId).toBe('afce1');
    expect(pair[1]?.teamId).toBe('afce2');
  });

  it('uses the previous snapshot to compute rank deltas', () => {
    const game = makeLeagueState('regular_season', 7);
    game.mediaCycle.powerRankingHistory.push({
      weekNumber: 6,
      rankings: [
        { teamId: 'afce2', teamName: 'AFCE2 Club', rank: 1, rankDelta: 0, score: 0.9, blurb: 'old', record: '5-1', weekNumber: 6 },
        { teamId: 'afce1', teamName: 'AFCE1 Club', rank: 2, rankDelta: 0, score: 0.8, blurb: 'old', record: '5-1', weekNumber: 6 },
      ],
    });
    syncRecord(game.teams.afce1!, 6, 1, 4);
    syncRecord(game.teams.afce2!, 5, 2, -1);

    const rankings = computePowerRankings(game, 7);
    const afce1 = rankings.find((entry) => entry.teamId === 'afce1')!;
    const afce2 = rankings.find((entry) => entry.teamId === 'afce2')!;

    expect(afce1.rankDelta).toBeGreaterThan(0);
    expect(afce2.rankDelta).toBeLessThan(0);
  });

  it('sets week one rank deltas to zero', () => {
    const game = makeLeagueState('regular_season', 1);
    const rankings = computePowerRankings(game, 1);

    expect(rankings.every((entry) => entry.rankDelta === 0)).toBe(true);
  });

  it('rewards stronger strength of victory when teams have similar records', () => {
    const game = makeLeagueState('regular_season', 6);
    for (const teamId of ['afce1', 'afce2']) {
      syncRecord(game.teams[teamId]!, 3, 1, 1);
      setRosterOvr(game.teams[teamId]!, 80);
    }
    setRosterOvr(game.teams.nfce1!, 96);
    setRosterOvr(game.teams.nfcw2!, 60);
    addResolvedGame(game, 1, 'afce1', 'nfce1', 27, 24);
    addResolvedGame(game, 1, 'afce2', 'nfcw2', 27, 24);

    const rankings = computePowerRankings(game, 6);
    const afce1Rank = rankings.find((entry) => entry.teamId === 'afce1')!.rank;
    const afce2Rank = rankings.find((entry) => entry.teamId === 'afce2')!.rank;

    expect(afce1Rank).toBeLessThan(afce2Rank);
  });

  it('rewards positive last-five momentum', () => {
    const game = makeLeagueState('regular_season', 8);
    for (const teamId of ['afce1', 'afce2']) {
      syncRecord(game.teams[teamId]!, 4, 3, 0);
      setRosterOvr(game.teams[teamId]!, 78);
    }
    for (let week = 1; week <= 5; week += 1) {
      addResolvedGame(game, week, 'afce1', `nfce${week % 2 === 0 ? '2' : '1'}`, 24 + week, 17);
      addResolvedGame(game, week, 'afce2', `nfcw${week % 2 === 0 ? '2' : '1'}`, 17, 24 + week);
    }

    const rankings = computePowerRankings(game, 8);
    const afce1Rank = rankings.find((entry) => entry.teamId === 'afce1')!.rank;
    const afce2Rank = rankings.find((entry) => entry.teamId === 'afce2')!.rank;

    expect(afce1Rank).toBeLessThan(afce2Rank);
  });

  it('includes the requested week number on every entry', () => {
    const game = makeLeagueState('regular_season', 9);
    const rankings = computePowerRankings(game, 9);

    expect(rankings.every((entry) => entry.weekNumber === 9)).toBe(true);
  });

  it('generates deterministic blurbs that change with week context', () => {
    const game = makeLeagueState('regular_season', 5);
    const weekFive = computePowerRankings(game, 5);
    const weekSix = computePowerRankings(game, 6);

    expect(weekFive[0]?.blurb).toBe(computePowerRankings(game, 5)[0]?.blurb);
    expect(weekFive.map((entry) => entry.blurb)).not.toEqual(weekSix.map((entry) => entry.blurb));
  });
});
