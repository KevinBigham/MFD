import { describe, expect, it } from 'vitest';
import {
  calculateAdvancedStats,
  calculatePlayerEfficiency,
  getPlayerComparison,
  getStatLeaders,
  getTeamRankings,
} from './analytics';
import { makeLeagueState } from './test-helpers';

describe('analytics', () => {
  it('QBR calculation produces reasonable values', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1;
    team.seasonStats.gamesPlayed = 4;
    team.seasonStats.pointsFor = 108;
    team.seasonStats.pointsAgainst = 84;
    team.seasonStats.turnoversLost = 3;
    team.seasonStats.yacYards = 210;
    team.seasonStats.thirdDownConversions = 24;
    team.seasonStats.thirdDownAttempts = 48;
    team.seasonStats.redZoneScores = 10;
    team.seasonStats.redZoneTrips = 14;

    const qb = team.roster.find((player) => player.pos === 'QB')!;
    qb.stats.passAtt = 140;
    qb.stats.passComp = 96;
    qb.stats.passTD = 11;
    qb.stats.passINT = 3;

    const stats = calculateAdvancedStats(team, team.seasonStats);

    expect(stats.qbr).toBeGreaterThan(30);
    expect(stats.qbr).toBeLessThan(90);
  });

  it('stat leaders returns correct top players', () => {
    const game = makeLeagueState();
    game.teams.afce1.roster[0]!.stats.passYds = 4100;
    game.teams.afce2.roster[0]!.stats.passYds = 3900;

    const leaders = getStatLeaders(game, 'passYds', 2);

    expect(leaders[0]?.value).toBe(4100);
    expect(leaders[1]?.value).toBe(3900);
  });

  it('team rankings are sorted correctly', () => {
    const game = makeLeagueState();
    game.teams.afce1.seasonStats.gamesPlayed = 5;
    game.teams.afce1.seasonStats.pointsFor = 150;
    game.teams.afce1.seasonStats.pointsAgainst = 90;
    game.teams.afce2.seasonStats.gamesPlayed = 5;
    game.teams.afce2.seasonStats.pointsFor = 80;
    game.teams.afce2.seasonStats.pointsAgainst = 130;

    const rankings = getTeamRankings(game);

    expect(rankings.offense[0]?.teamId).toBe('afce1');
    expect(rankings.defense[0]?.teamId).toBe('afce1');
  });

  it('player efficiency varies by position', () => {
    const game = makeLeagueState();
    const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    qb.stats.passTD = 28;
    qb.stats.passINT = 8;
    qb.stats.passAtt = 420;

    const rb = game.teams.afce1.roster.find((player) => player.pos === 'RB')!;
    rb.stats.rushYds = 1100;
    rb.stats.rushAtt = 220;

    expect(calculatePlayerEfficiency(qb)).not.toBe(calculatePlayerEfficiency(rb));
  });

  it('player comparison returns both stat profiles', () => {
    const game = makeLeagueState();
    const qbA = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    const qbB = game.teams.afce2.roster.find((player) => player.pos === 'QB')!;
    qbA.stats.passYds = 3800;
    qbB.stats.passYds = 3600;

    const comparison = getPlayerComparison(game, qbA.id, qbB.id);

    expect(comparison?.playerA.value).toBe(3800);
    expect(comparison?.playerB.value).toBe(3600);
  });
});
