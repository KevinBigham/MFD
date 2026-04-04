import { describe, expect, it } from 'vitest';
import {
  buildStatSnapshot,
  comparePlayerCareers,
  getLeagueAverages,
  getPlayerCareerTimeline,
  getPositionRankings,
  getStatLeaderboard,
  getTeamSeasonHistory,
} from '../index';
import { makeLeagueState } from './test-helpers';

describe('stat central', () => {
  it('builds current-season stat leaderboards from live player stats', () => {
    const game = makeLeagueState('regular_season', 8);
    const qb1 = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    const qb2 = game.teams.afce2.roster.find((player) => player.pos === 'QB')!;
    qb1.stats.passYds = 2900;
    qb1.stats.gamesPlayed = 8;
    qb2.stats.passYds = 2600;
    qb2.stats.gamesPlayed = 8;

    const leaders = getStatLeaderboard(game, 'passYds', undefined, 'QB');

    expect(leaders[0]?.playerId).toBe(qb1.id);
    expect(leaders[1]?.playerId).toBe(qb2.id);
    expect(leaders[0]?.perGame).toBeGreaterThan(leaders[1]!.perGame);
  });

  it('builds historical leaderboards from player season history', () => {
    const game = makeLeagueState('regular_season', 8);
    const qb1 = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    const qb2 = game.teams.afce2.roster.find((player) => player.pos === 'QB')!;
    game.playerSeasonHistory[qb1.id] = [{
      playerId: qb1.id,
      season: 2024,
      age: 25,
      ovr: 84,
      teamId: 'afce1',
      gamesPlayed: 17,
      gamesStarted: 17,
      keyStats: { passYds: 4700, passTD: 36 },
    }];
    game.playerSeasonHistory[qb2.id] = [{
      playerId: qb2.id,
      season: 2024,
      age: 25,
      ovr: 82,
      teamId: 'afce2',
      gamesPlayed: 17,
      gamesStarted: 17,
      keyStats: { passYds: 4300, passTD: 28 },
    }];

    const leaders = getStatLeaderboard(game, 'passYds', 2024, 'QB');

    expect(leaders.map((entry) => entry.playerId)).toEqual([qb1.id, qb2.id]);
    expect(leaders[0]?.value).toBe(4700);
  });

  it('builds player career timelines with awards and record highlights', () => {
    const game = makeLeagueState('regular_season', 10);
    const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    game.playerSeasonHistory[qb.id] = [{
      playerId: qb.id,
      season: 2025,
      age: 25,
      ovr: 86,
      teamId: 'afce1',
      gamesPlayed: 17,
      gamesStarted: 17,
      keyStats: { passYds: 4800, passTD: 39, passINT: 8 },
    }];
    game.awardsHistory.push({
      year: 2025,
      awards: [{
        awardId: 'mvp',
        label: 'MVP',
        winnerId: qb.id,
        winnerName: qb.name,
        winnerTeamId: 'afce1',
        winnerTeam: 'AFCE1 Club',
        winnerPosition: 'QB',
        winnerStats: { passYds: 4800 },
        score: 98,
        runnersUp: [],
        narrative: 'Dominant season',
      }],
      ceremony: { headline: 'Awards', intro: 'Intro', blurbs: [] },
    });
    game.records.singleSeason.passYds = [{
      category: 'singleSeason',
      stat: 'passYds',
      value: 4800,
      teamId: 'afce1',
      teamName: 'AFCE1 Club',
      year: 2025,
      playerId: qb.id,
      playerName: qb.name,
    }];

    const timeline = getPlayerCareerTimeline(game, qb.id);

    expect(timeline.seasons[0]?.awards).toContain('MVP');
    expect(timeline.seasons[0]?.highlights).toContain('Single-season Pass Yards record');
  });

  it('compares multiple careers and exposes peak stat leaders', () => {
    const game = makeLeagueState('regular_season', 6);
    const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    const rb = game.teams.afce1.roster.find((player) => player.pos === 'RB')!;
    game.playerSeasonHistory[qb.id] = [{
      playerId: qb.id,
      season: 2025,
      age: 25,
      ovr: 88,
      teamId: 'afce1',
      gamesPlayed: 17,
      gamesStarted: 17,
      keyStats: { passYds: 4600, passTD: 35, passINT: 9 },
    }];
    game.playerSeasonHistory[rb.id] = [{
      playerId: rb.id,
      season: 2025,
      age: 25,
      ovr: 84,
      teamId: 'afce1',
      gamesPlayed: 17,
      gamesStarted: 17,
      keyStats: { rushYds: 1450, rushTD: 12, rec: 48 },
    }];

    const comparison = comparePlayerCareers(game, [qb.id, rb.id]);

    expect(comparison.players).toHaveLength(2);
    expect(comparison.statColumns.length).toBeGreaterThan(0);
    expect(Object.keys(comparison.peakComparison).length).toBeGreaterThan(0);
  });

  it('builds team season history from archived franchise entries and derives season mvp', () => {
    const game = makeLeagueState('regular_season', 6);
    const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    game.franchiseHistory.push({
      year: 2025,
      teamId: 'afce1',
      wins: 12,
      losses: 5,
      ties: 0,
      record: '12-5',
      pointDifferential: 84,
      playoffFinish: 'conference_final_exit',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
      keyStats: {
        totalYards: 6100,
        pointsFor: 440,
        pointsAgainst: 312,
      },
    });
    game.awardsHistory.push({
      year: 2025,
      awards: [{
        awardId: 'mvp',
        label: 'MVP',
        winnerId: qb.id,
        winnerName: qb.name,
        winnerTeamId: 'afce1',
        winnerTeam: 'AFCE1 Club',
        winnerPosition: 'QB',
        winnerStats: { passYds: 4600 },
        score: 91,
        runnersUp: [],
        narrative: 'Elite season',
      }],
      ceremony: { headline: 'Awards', intro: 'Intro', blurbs: [] },
    });

    const history = getTeamSeasonHistory(game, 'afce1');

    expect(history[0]?.keyStats.totalYards).toBe(6100);
    expect(history[0]?.mvpName).toBe(qb.name);
  });

  it('computes league averages across historical and current seasons', () => {
    const game = makeLeagueState('regular_season', 8);
    const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    const rb = game.teams.afce1.roster.find((player) => player.pos === 'RB')!;
    game.playerSeasonHistory[qb.id] = [{
      playerId: qb.id,
      season: 2024,
      age: 25,
      ovr: 85,
      teamId: 'afce1',
      gamesPlayed: 17,
      gamesStarted: 17,
      keyStats: { passYds: 4500 },
    }];
    game.playerSeasonHistory[rb.id] = [{
      playerId: rb.id,
      season: 2024,
      age: 25,
      ovr: 82,
      teamId: 'afce1',
      gamesPlayed: 17,
      gamesStarted: 17,
      keyStats: { passYds: 3500 },
    }];
    qb.stats.passYds = 2800;
    rb.stats.passYds = 120;

    const averages = getLeagueAverages(game, 'passYds');

    expect(averages.find((entry) => entry.year === 2024)?.average).toBe(4000);
    expect(averages.find((entry) => entry.year === 2026)).toBeDefined();
  });

  it('ranks players within a position by ovr and key stat output', () => {
    const game = makeLeagueState();
    const wr1 = game.teams.afce1.roster.find((player) => player.pos === 'WR')!;
    const wr2 = game.teams.afce2.roster.find((player) => player.pos === 'WR')!;
    wr1.ovr = 91;
    wr1.stats.recYds = 1200;
    wr2.ovr = 84;
    wr2.stats.recYds = 980;

    const rankings = getPositionRankings(game, 'WR');

    expect(rankings[0]?.playerId).toBe(wr1.id);
    expect(rankings[0]?.keyStats.recYds).toBe(1200);
    expect(typeof rankings[0]?.surplus).toBe('number');
  });

  it('builds a quick league stat snapshot with leaders and totals', () => {
    const game = makeLeagueState('regular_season', 5);
    const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    const rb = game.teams.afce1.roster.find((player) => player.pos === 'RB')!;
    qb.stats.passYds = 2300;
    rb.stats.rushYds = 880;

    const snapshot = buildStatSnapshot(game);

    expect(snapshot.year).toBe(2026);
    expect(snapshot.leaders.passYds.playerId).toBe(qb.id);
    expect(snapshot.totals.passYds).toBeGreaterThan(0);
    expect(snapshot.averages.rushYds).toBeGreaterThanOrEqual(0);
  });
});
