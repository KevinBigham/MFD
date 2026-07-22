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

  it('seeds one unique first-round slot per franchise and carries it through every round', () => {
    const game = createSeedGameState(91, 0, 'pro');
    const teams = Object.values(game.teams);
    const firstRound = teams.map((team) => team.draftPicks.find((pick) => pick.round === 1)?.pick);

    expect(new Set(firstRound).size).toBe(teams.length);
    expect([...firstRound].sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual(
      Array.from({ length: teams.length }, (_, index) => index + 1),
    );
    expect(teams.every((team) => new Set(team.draftPicks.map((pick) => pick.pick)).size === 1)).toBe(true);
  });

  it('seeds difficulty-specific facility cash and front-office scouting resources', () => {
    const rookie = createSeedGameState(12, 0, 'rookie');
    const legend = createSeedGameState(12, 0, 'legend');
    const rookieTeam = Object.values(rookie.teams).find((team) => team.isUser)!;
    const legendTeam = Object.values(legend.teams).find((team) => team.isUser)!;

    expect(rookieTeam.facilityState.budget).toBeGreaterThan(legendTeam.facilityState.budget);
    expect(rookie.scoutingDepartment.budget).toBeGreaterThan(legend.scoutingDepartment.budget);
    expect(rookie.scoutingDepartment.budget).toBe(6);
    expect(legend.scoutingDepartment.budget).toBe(4);
  });
});
