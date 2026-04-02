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
});
