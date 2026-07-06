import { describe, expect, it } from 'vitest';
import { makeLeagueState } from './test-helpers';
import { progressPlayers } from './progression';

function setCoachDevelopment(game: ReturnType<typeof makeLeagueState>, teamId: string, development: number) {
  game.teams[teamId].staff.hc = {
    id: `${teamId}-hc`,
    name: `${teamId} Coach`,
    role: 'HC',
    archetype: 'Strategist',
    traits: [],
    ratings: { development, gameplan: 75, motivation: 75 },
    level: 5,
    specialty75: null,
  };
}

describe('progression system', () => {
  it('grows a young star quarterback by 3-5 OVR in a strong environment', () => {
    const game = makeLeagueState('offseason');
    const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    qb.age = 23;
    qb.ovr = 82;
    qb.devTrait = 'superstar';
    qb.isStarter = true;
    qb.stats.passAtt = 560;
    qb.stats.passComp = 392;
    qb.stats.passYds = 4625;
    qb.stats.passTD = 37;
    qb.stats.passINT = 9;
    setCoachDevelopment(game, 'afce1', 92);

    progressPlayers(game);

    expect(qb.ovr).toBeGreaterThanOrEqual(85);
    expect(qb.ovr).toBeLessThanOrEqual(87);
  });

  it('declines an older running back', () => {
    const game = makeLeagueState('offseason');
    const rb = game.teams.afce1.roster.find((player) => player.pos === 'RB')!;
    rb.age = 34;
    rb.ovr = 76;
    rb.devTrait = 'normal';
    rb.stats.rushAtt = 180;
    rb.stats.rushYds = 710;
    rb.stats.rushTD = 5;
    setCoachDevelopment(game, 'afce1', 72);

    progressPlayers(game);

    expect(rb.ovr).toBeLessThanOrEqual(73);
  });

  it('scales growth with coaching quality', () => {
    const goodGame = makeLeagueState('offseason');
    const badGame = makeLeagueState('offseason');
    const goodWr = goodGame.teams.afce1.roster.find((player) => player.pos === 'WR')!;
    const badWr = badGame.teams.afce1.roster.find((player) => player.pos === 'WR')!;

    for (const receiver of [goodWr, badWr]) {
      receiver.age = 24;
      receiver.ovr = 78;
      receiver.devTrait = 'star';
      receiver.stats.rec = 82;
      receiver.stats.recYds = 1095;
      receiver.stats.recTD = 8;
      receiver.stats.targets = 118;
    }

    setCoachDevelopment(goodGame, 'afce1', 90);
    setCoachDevelopment(badGame, 'afce1', 55);

    progressPlayers(goodGame);
    progressPlayers(badGame);

    expect(goodWr.ovr).toBeGreaterThan(badWr.ovr);
  });

  it('applies dev-trait scaling proportionally', () => {
    const normalGame = makeLeagueState('offseason');
    const starGame = makeLeagueState('offseason');
    const xFactorGame = makeLeagueState('offseason');

    const normal = normalGame.teams.afce1.roster.find((player) => player.pos === 'CB')!;
    const star = starGame.teams.afce1.roster.find((player) => player.pos === 'CB')!;
    const xFactor = xFactorGame.teams.afce1.roster.find((player) => player.pos === 'CB')!;

    for (const player of [normal, star, xFactor]) {
      player.age = 23;
      player.ovr = 79;
      player.isStarter = true;
      player.stats.defINT = 4;
      player.stats.tackles = 58;
    }

    normal.devTrait = 'normal';
    star.devTrait = 'star';
    xFactor.devTrait = 'x-factor';

    setCoachDevelopment(normalGame, 'afce1', 85);
    setCoachDevelopment(starGame, 'afce1', 85);
    setCoachDevelopment(xFactorGame, 'afce1', 85);

    progressPlayers(normalGame);
    progressPlayers(starGame);
    progressPlayers(xFactorGame);

    expect(star.ovr - 79).toBeGreaterThanOrEqual(normal.ovr - 79);
    expect(xFactor.ovr - 79).toBeGreaterThan(star.ovr - 79);
  });

  it('retires players whose OVR falls below the position threshold', () => {
    const game = makeLeagueState('offseason');
    const rb = game.teams.afce1.roster.find((player) => player.pos === 'RB')!;
    rb.age = 35;
    rb.ovr = 58;
    rb.devTrait = 'normal';
    rb.stats.rushAtt = 70;
    rb.stats.rushYds = 210;
    setCoachDevelopment(game, 'afce1', 60);

    const result = progressPlayers(game);

    expect(result.retiredPlayerIds).toContain(rb.id);
    expect(game.teams.afce1.roster.some((player) => player.id === rb.id)).toBe(false);
    expect(game.playerArchive.find((entry) => entry.playerId === rb.id)?.retirementYear).toBe(game.year);
  });

  it('retires high-OVR specialists before they exceed the active age bound', () => {
    const game = makeLeagueState('offseason');
    const kicker = game.teams.afce1.roster.find((player) => player.pos === 'K')!;
    kicker.age = 55;
    kicker.ovr = 88;

    const result = progressPlayers(game);

    expect(result.retiredPlayerIds).toContain(kicker.id);
    expect(game.teams.afce1.roster.some((player) => player.id === kicker.id)).toBe(false);
    expect(game.players[kicker.id]?.teamId).toBeNull();
  });
});
