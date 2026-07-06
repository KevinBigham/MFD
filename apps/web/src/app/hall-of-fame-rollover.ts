import type { GameState } from '@mfd/engine';
import { syncHallOfFameArchiveSnapshot } from '../lib/hall-of-fame-archive-sync';

export function syncHallOfFameArchiveAtYearRollover(
  previousYear: number | null,
  game: GameState | null,
  teamId: string | null,
): boolean {
  if (!game || !teamId) return false;
  if (previousYear === null || game.year <= previousYear) return false;

  return syncHallOfFameArchiveSnapshot(game, teamId);
}
