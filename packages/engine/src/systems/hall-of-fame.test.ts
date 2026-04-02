import { describe, expect, it } from 'vitest';
import { inductHallOfFame } from './hall-of-fame';
import { makeLeagueState } from './test-helpers';

describe('hall of fame system', () => {
  it('inducts qualified retirees and caps a class at five', () => {
    const game = makeLeagueState('offseason');
    game.year = 2032;

    game.playerArchive = Array.from({ length: 6 }, (_, index) => ({
      playerId: `legend-${index}`,
      firstName: 'Legend',
      lastName: `${index}`,
      name: `Legend ${index}`,
      positions: ['QB'],
      peakOvr: 90 - index,
      peakYear: 2024 + index,
      firstYear: 2022,
      lastYear: 2030,
      retirementYear: 2030,
      teamHistory: [{ teamId: 'afce1', firstYear: 2022, lastYear: 2030 }],
      careerStats: {
        gp: 160,
        seasons: 9,
        mvps: index < 2 ? 1 : 0,
        allPros: 3,
        proBowls: 5,
        championships: 1,
      },
    }));

    const inducted = inductHallOfFame(game, 2031);

    expect(inducted).toHaveLength(5);
    expect(game.hallOfFame).toHaveLength(5);
    expect(new Set(inducted.map((entry) => entry.playerId)).size).toBe(5);
    expect(inducted.every((entry) => entry.inductionYear === 2031)).toBe(true);
  });

  it('rejects mediocre retirees below the threshold', () => {
    const game = makeLeagueState('offseason');
    game.year = 2032;
    game.playerArchive = [{
      playerId: 'just-a-guy',
      firstName: 'Just',
      lastName: 'Guy',
      name: 'Just Guy',
      positions: ['RB'],
      peakOvr: 84,
      peakYear: 2027,
      firstYear: 2024,
      lastYear: 2030,
      retirementYear: 2030,
      teamHistory: [{ teamId: 'afce1', firstYear: 2024, lastYear: 2030 }],
      careerStats: { gp: 90, seasons: 6, mvps: 0, allPros: 0, proBowls: 1, championships: 0 },
    }];

    const inducted = inductHallOfFame(game, 2031);

    expect(inducted).toEqual([]);
    expect(game.hallOfFame).toEqual([]);
  });
});
