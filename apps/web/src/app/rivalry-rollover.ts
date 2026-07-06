import { deriveRivalries, type GameState } from '@mfd/engine';
import { saveRivalries } from '../lib/rivalry-storage';

export function syncRivalriesForGame(game: GameState | null): boolean {
  if (!game) return false;
  saveRivalries(deriveRivalries(game));
  return true;
}

export function syncRivalriesAtYearRollover(
  previousYear: number | null,
  game: GameState | null,
): boolean {
  if (!game) return false;
  if (previousYear === null || game.year <= previousYear) return false;

  return syncRivalriesForGame(game);
}
