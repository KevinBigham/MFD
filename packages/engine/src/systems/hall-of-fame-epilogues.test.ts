import { describe, expect, it } from 'vitest';
import { inductHallOfFame } from './hall-of-fame';
import { makeLeagueState } from './test-helpers';

function addArchiveEntry(game: ReturnType<typeof makeLeagueState>, playerId: string, name: string, peakOvr = 91) {
  game.playerArchive.push({
    playerId,
    firstName: name.split(' ')[0] ?? name,
    lastName: name.split(' ').slice(1).join(' ') || 'Player',
    name,
    positions: ['QB'],
    jerseyNumber: 12,
    peakOvr,
    peakYear: 2026,
    firstYear: 2021,
    lastYear: 2030,
    retirementYear: 2030,
    teamHistory: [{ teamId: 'afce1', firstYear: 2021, lastYear: 2030 }],
    careerStats: { seasons: 10, gp: 170, mvps: 1, allPros: 3, proBowls: 6, championships: 1 },
  });
}

describe('hall of fame epilogues', () => {
  it('attaches an epilogue for an inducted epilogue-worthy player', () => {
    const game = makeLeagueState('offseason');
    game.seed = 77;
    game.year = 2032;
    const qb = game.teams.afce1.roster[0]!;
    qb.id = 'hof-qb';
    qb.name = 'Miles Archive';
    qb.firstName = 'Miles';
    qb.lastName = 'Archive';
    qb.traits = ['film_junkie'];
    qb.ovr = 92;
    qb.yearsExp = 11;
    game.players[qb.id] = qb;
    addArchiveEntry(game, qb.id, qb.name);

    const inducted = inductHallOfFame(game, 2031);

    expect(inducted[0]?.epilogue).toBeDefined();
    expect(inducted[0]?.epilogue?.playerId).toBe(qb.id);
  });

  it('does not attach an epilogue when the inducted player is not epilogue-worthy', () => {
    const game = makeLeagueState('offseason');
    game.seed = 91;
    game.year = 2032;
    const qb = game.teams.afce1.roster[0]!;
    qb.id = 'hof-borderline';
    qb.name = 'Cal Frost';
    qb.firstName = 'Cal';
    qb.lastName = 'Frost';
    qb.ovr = 79;
    qb.yearsExp = 6;
    game.players[qb.id] = qb;
    addArchiveEntry(game, qb.id, qb.name, 90);

    const inducted = inductHallOfFame(game, 2031);

    expect(inducted[0]?.epilogue).toBeUndefined();
  });

  it('uses the player traits to produce the expected epilogue category', () => {
    const game = makeLeagueState('offseason');
    game.seed = 15;
    game.year = 2032;
    const qb = game.teams.afce1.roster[0]!;
    qb.id = 'hof-broadcast';
    qb.name = 'Darren Lens';
    qb.firstName = 'Darren';
    qb.lastName = 'Lens';
    qb.traits = ['film_junkie'];
    qb.ovr = 90;
    qb.yearsExp = 10;
    game.players[qb.id] = qb;
    addArchiveEntry(game, qb.id, qb.name);

    const inducted = inductHallOfFame(game, 2031);

    expect(inducted[0]?.epilogue?.category).toBe('broadcasting');
  });

  it('builds a non-empty epilogue from archive data when the active player record is missing', () => {
    const game = makeLeagueState('offseason');
    game.seed = 31;
    game.year = 2032;
    addArchiveEntry(game, 'archive-only', 'Reggie Legacy');

    const inducted = inductHallOfFame(game, 2031);

    expect(inducted[0]?.epilogue?.headline.length).toBeGreaterThan(0);
    expect(inducted[0]?.epilogue?.story.length).toBeGreaterThan(0);
  });

  it('generates the same epilogue for the same seed and archive inputs', () => {
    const buildGame = () => {
      const game = makeLeagueState('offseason');
      game.seed = 63;
      game.year = 2032;
      const qb = game.teams.afce1.roster[0]!;
      qb.id = 'hof-repeatable';
      qb.name = 'Repeat Able';
      qb.firstName = 'Repeat';
      qb.lastName = 'Able';
      qb.traits = ['film_junkie'];
      qb.ovr = 92;
      qb.yearsExp = 12;
      game.players[qb.id] = qb;
      addArchiveEntry(game, qb.id, qb.name);
      return game;
    };

    const first = inductHallOfFame(buildGame(), 2031)[0]?.epilogue;
    const second = inductHallOfFame(buildGame(), 2031)[0]?.epilogue;

    expect(first).toEqual(second);
  });

  it('generates unique epilogues across multiple inducted players', () => {
    const game = makeLeagueState('offseason');
    game.seed = 52;
    game.year = 2032;

    const qb = game.teams.afce1.roster[0]!;
    qb.id = 'hof-1';
    qb.name = 'Victor Tape';
    qb.firstName = 'Victor';
    qb.lastName = 'Tape';
    qb.traits = ['film_junkie'];
    qb.ovr = 92;
    qb.yearsExp = 12;
    game.players[qb.id] = qb;

    const rb = game.teams.afce1.roster[1]!;
    rb.id = 'hof-2';
    rb.name = 'Marcus Spark';
    rb.firstName = 'Marcus';
    rb.lastName = 'Spark';
    rb.traits = ['showtime', 'ego'];
    rb.ovr = 91;
    rb.yearsExp = 11;
    game.players[rb.id] = rb;

    addArchiveEntry(game, qb.id, qb.name);
    addArchiveEntry(game, rb.id, rb.name, 90);

    const inducted = inductHallOfFame(game, 2031);
    const epilogues = inducted.map((entry) => entry.epilogue?.headline).filter((headline): headline is string => Boolean(headline));

    expect(new Set(epilogues).size).toBe(epilogues.length);
  });
});
