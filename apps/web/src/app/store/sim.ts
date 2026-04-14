import {
  advanceFranchiseWeek,
  previewHalftimeDecision,
  type AdvanceFranchiseWeekOptions,
  type EngineOutput,
  type GameState,
  type PendingHalftimeDecision,
} from '@mfd/engine';

/**
 * Async simulation boundary for the web app.
 *
 * This stays Promise-based so a future Worker swap does not
 * force every caller to change its contract.
 */
export async function runAdvanceWeek(game: GameState, options?: AdvanceFranchiseWeekOptions): Promise<EngineOutput> {
  return advanceFranchiseWeek(game, options);
}

export async function runPreviewHalftimeDecision(game: GameState): Promise<PendingHalftimeDecision | null> {
  return previewHalftimeDecision(game);
}
