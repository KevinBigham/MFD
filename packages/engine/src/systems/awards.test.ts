import { describe, expect, it } from 'vitest';
import { generateAwards } from './awards';
import { makeLeagueState } from './test-helpers';

describe('awards system', () => {
  it('generates core awards, all-pro teams, and pro bowl selections for a completed season', () => {
    const game = makeLeagueState('offseason');
    game.year = 2028;

    const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    qb.ovr = 92;
    qb.age = 27;
    qb.stats.passAtt = 590;
    qb.stats.passComp = 412;
    qb.stats.passYds = 5105;
    qb.stats.passTD = 44;
    qb.stats.passINT = 8;
    qb.careerStats.gp = 51;

    const rookieWr = game.teams.afce1.roster.find((player) => player.pos === 'WR')!;
    rookieWr.age = 22;
    rookieWr.yearsExp = 0;
    rookieWr.draftYear = 2027;
    rookieWr.ovr = 83;
    rookieWr.stats.rec = 89;
    rookieWr.stats.recYds = 1188;
    rookieWr.stats.recTD = 10;

    const rookieCb = game.teams.afcn1.roster.find((player) => player.pos === 'CB')!;
    rookieCb.age = 22;
    rookieCb.yearsExp = 0;
    rookieCb.draftYear = 2027;
    rookieCb.ovr = 81;
    rookieCb.stats.defINT = 6;
    rookieCb.stats.tackles = 52;

    game.teams.afce1.wins = 14;
    game.teams.afce1.losses = 3;
    game.teams.afce1.seasonStats.pointDifferential = 122;
    game.teams.afcn1.wins = 12;
    game.teams.afcn1.losses = 5;
    game.teams.afcn1.seasonStats.pointDifferential = 88;

    const awards = generateAwards(game, 2027);

    expect(awards.year).toBe(2027);
    expect(awards.awards.some((award) => award.awardId === 'mvp')).toBe(true);
    expect(awards.awards.find((award) => award.awardId === 'mvp')?.winnerId).toBe(qb.id);
    expect(awards.awards.find((award) => award.awardId === 'oroy')?.winnerId).toBe(rookieWr.id);
    expect(awards.awards.find((award) => award.awardId === 'droy')?.winnerId).toBe(rookieCb.id);
    expect(awards.awards.find((award) => award.awardId === 'all_pro_first_team')?.runnersUp).toHaveLength(17);
    expect(awards.awards.find((award) => award.awardId === 'all_pro_second_team')?.runnersUp).toHaveLength(17);
    expect(awards.awards.find((award) => award.awardId === 'pro_bowl')?.runnersUp.length).toBeGreaterThanOrEqual(32);
    expect(awards.ceremony.headline.length).toBeGreaterThan(0);
  });

  it('selects comeback player from a previously declined or injured player', () => {
    const game = makeLeagueState('offseason');
    game.year = 2029;

    const comeback = game.teams.afce1.roster.find((player) => player.pos === 'RB')!;
    comeback.age = 26;
    comeback.ovr = 81;
    comeback.stats.rushYds = 1405;
    comeback.stats.rushTD = 14;
    comeback.injury = { type: 'knee', severity: 'out', gamesOut: 0 };
    comeback.careerStats.previousSeasonOvr = 73;

    const awards = generateAwards(game, 2028);

    expect(awards.awards.find((award) => award.awardId === 'comeback_player')?.winnerId).toBe(comeback.id);
  });
});
