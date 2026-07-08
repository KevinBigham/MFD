import type { GameState } from '../types';
import { ensureSeasonStats } from './season-stats';

export function syncPlayers(game: GameState): void {
  for (const team of Object.values(game.teams)) {
    ensureSeasonStats(team);
    for (const player of team.roster) game.players[player.id] = player;
  }
}

export function rehydrateGameStateReferences(game: GameState): GameState {
  syncPlayers(game);
  return game;
}
