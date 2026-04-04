import { describe, expect, it } from 'vitest';
import { createSeedGameState } from './seed';

describe('seed game state', () => {
  it('initializes player archive entries for the seeded league', () => {
    const game = createSeedGameState(42, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const player = userTeam.roster[0]!;
    const archiveEntry = game.playerArchive.find((entry) => entry.playerId === player.id);

    expect(game.playerArchive.length).toBeGreaterThanOrEqual(Object.keys(game.players).length);
    expect(archiveEntry).toMatchObject({
      playerId: player.id,
      peakOvr: player.ovr,
      retirementYear: null,
    });
    expect(archiveEntry?.teamHistory).toEqual([
      { teamId: userTeam.id, firstYear: game.year, lastYear: game.year },
    ]);
  });

  it('seeds sprint 18 franchise defaults for every team', () => {
    const game = createSeedGameState(7, 0, 'pro');
    const teams = Object.values(game.teams);

    expect(game.allDecadeTeams).toEqual([]);
    expect(game.stadiumDealOffers).toEqual([]);
    expect(game.expansionDraftState).toBeUndefined();
    expect(teams.every((team) => team.franchiseIdentity)).toBe(true);

    const userTeam = teams.find((team) => team.isUser)!;
    expect(userTeam.franchiseIdentity.stadiumName).toContain(userTeam.city);
    expect(userTeam.franchiseIdentity.stadiumLevel).toBe(1);
    expect(userTeam.franchiseIdentity.relocationHistory).toEqual([]);
  });
});
