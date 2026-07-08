import { describe, expect, it } from 'vitest';
import type { GameState, Player, Team } from '../types';
import { rehydrateGameStateReferences } from './game-state-references';

describe('franchise week helpers', () => {
  it('rehydrates roster players as canonical player-map references', () => {
    const rosterPlayer = { id: 'p-1', name: 'Test QB' } as Player;
    const staleMapPlayer = { id: 'p-1', name: 'Detached QB' } as Player;
    const team = {
      id: 't-1',
      wins: 0,
      losses: 0,
      ties: 0,
      roster: [rosterPlayer],
    } as Team;
    const game = {
      teams: { [team.id]: team },
      players: { [rosterPlayer.id]: staleMapPlayer },
    } as GameState;

    const rehydrated = rehydrateGameStateReferences(game);

    expect(rehydrated).toBe(game);
    expect(rehydrated.teams[team.id]?.roster[0]).toBe(rosterPlayer);
    expect(rehydrated.players[rosterPlayer.id]).toBe(rosterPlayer);
    expect(rehydrated.players[rosterPlayer.id]).not.toBe(staleMapPlayer);
  });
});
