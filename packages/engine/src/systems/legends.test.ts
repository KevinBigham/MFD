import { describe, expect, it } from 'vitest';
import { getAlumniUpdates } from './legends';
import { makeLeagueState } from './test-helpers';

function retiredAlumnus(
  playerId: string,
  teamId: string,
  retirementYear: number,
  peakOvr = 90,
) {
  return {
    playerId,
    firstName: 'Retired',
    lastName: playerId,
    name: `Retired ${playerId}`,
    positions: ['QB'],
    jerseyNumber: 12,
    peakOvr,
    peakYear: retirementYear - 2,
    firstYear: retirementYear - 10,
    lastYear: retirementYear,
    retirementYear,
    teamHistory: [{ teamId, firstYear: retirementYear - 10, lastYear: retirementYear }],
    careerStats: {
      gp: 160,
      seasons: 11,
      mvps: peakOvr >= 95 ? 1 : 0,
      allPros: peakOvr >= 90 ? 3 : 1,
      proBowls: 5,
      championships: peakOvr >= 92 ? 1 : 0,
    },
  };
}

describe('getAlumniUpdates', () => {
  it('returns an empty list when there are no retired alumni for the user team', () => {
    const game = makeLeagueState('offseason');

    expect(getAlumniUpdates(game, 2030)).toEqual([]);
  });

  it('surfaces a broadcasting beat in year two of retirement', () => {
    const game = makeLeagueState('offseason');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    game.playerArchive = [retiredAlumnus('legend-qb', userTeam.id, 2028)];

    const updates = getAlumniUpdates(game, 2030);

    expect(updates[0]).toMatchObject({
      subjectId: 'legend-qb',
      category: 'broadcasting',
      year: 2030,
    });
  });

  it('marks year-five retirees as hall-of-fame eligible', () => {
    const game = makeLeagueState('offseason');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    game.playerArchive = [retiredAlumnus('legend-qb', userTeam.id, 2025)];

    const updates = getAlumniUpdates(game, 2030);

    expect(updates[0]).toMatchObject({
      subjectId: 'legend-qb',
      category: 'hof',
      year: 2030,
    });
  });

  it('prefers inducted hall-of-fame alumni when available', () => {
    const game = makeLeagueState('offseason');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    game.playerArchive = [retiredAlumnus('legend-qb', userTeam.id, 2024, 96)];
    game.hallOfFame = [{
      playerId: 'legend-qb',
      name: 'Retired legend-qb',
      positions: ['QB'],
      peakOvr: 96,
      inductionYear: 2029,
      teams: [userTeam.id],
      awards: { mvps: 1, allPros: 4, proBowls: 6, championships: 2 },
    }];

    const updates = getAlumniUpdates(game, 2030);

    expect(updates[0]?.category).toBe('hof');
    expect(updates[0]?.text).toMatch(/Hall|HOF/i);
  });

  it('orders updates stably by category priority and subject name', () => {
    const game = makeLeagueState('offseason');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    game.playerArchive = [
      retiredAlumnus('bravo', userTeam.id, 2028),
      retiredAlumnus('alpha', userTeam.id, 2025),
      retiredAlumnus('charlie', userTeam.id, 2020),
    ];

    const updates = getAlumniUpdates(game, 2030);

    expect(updates.map((entry) => entry.subjectId)).toEqual(['alpha', 'bravo', 'charlie']);
  });
});
