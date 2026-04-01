import { advanceFranchiseWeek, type EngineOutput, type GameState } from '@mfd/engine';

/**
 * Async simulation boundary for the web app.
 *
 * This stays Promise-based so a future Worker swap does not
 * force every caller to change its contract.
 */
export async function runAdvanceWeek(game: GameState): Promise<EngineOutput> {
  return advanceFranchiseWeek(game);
}
