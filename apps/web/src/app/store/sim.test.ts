import { describe, expect, it, vi } from 'vitest';
import {
  advanceFranchiseWeek,
  previewHalftimeDecision,
  type AdvanceFranchiseWeekOptions,
  type EngineOutput,
  type GameState,
  type PendingHalftimeDecision,
} from '@mfd/engine';
import { runAdvanceWeek, runPreviewHalftimeDecision } from './sim';

vi.mock('@mfd/engine', () => ({
  advanceFranchiseWeek: vi.fn(),
  previewHalftimeDecision: vi.fn(),
}));

const mockedAdvanceFranchiseWeek = vi.mocked(advanceFranchiseWeek);
const mockedPreviewHalftimeDecision = vi.mocked(previewHalftimeDecision);

describe('web store simulation boundary', () => {
  it('keeps week advance behind a Promise-returning wrapper', async () => {
    const game = { id: 'game-state' } as unknown as GameState;
    const options = { halftimeDecision: 'stay' } as unknown as AdvanceFranchiseWeekOptions;
    const output = { nextState: game, events: [], consequences: [] } as unknown as EngineOutput;
    mockedAdvanceFranchiseWeek.mockReturnValueOnce(output);

    const result = runAdvanceWeek(game, options);

    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toBe(output);
    expect(mockedAdvanceFranchiseWeek).toHaveBeenCalledWith(game, options);
  });

  it('keeps halftime preview behind a Promise-returning wrapper', async () => {
    const game = { id: 'game-state' } as unknown as GameState;
    const decision = { gameId: 'game-1' } as unknown as PendingHalftimeDecision;
    mockedPreviewHalftimeDecision.mockReturnValueOnce(decision);

    const result = runPreviewHalftimeDecision(game);

    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toBe(decision);
    expect(mockedPreviewHalftimeDecision).toHaveBeenCalledWith(game);
  });
});
