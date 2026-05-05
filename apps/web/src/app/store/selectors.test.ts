import { describe, expect, it } from 'vitest';
import { createSeedGameState } from './seed';
import {
  selectCurrentOpponentIntel,
  type GameStoreState,
} from './selectors';

function buildState(game = createSeedGameState(42, 0, 'pro')): GameStoreState {
  game.phase = 'regular_season';
  game.week = 1;

  return {
    game,
    initialized: true,
    undoSnapshot: null,
    undoLabel: null,
    recapPromptSeenThisSession: false,
    pendingPlayoffLoreReveal: null,
  };
}

describe('selectCurrentOpponentIntel', () => {
  it('returns the same reference for repeated reads on an unchanged game state', () => {
    const state = buildState();

    const first = selectCurrentOpponentIntel(state);
    const second = selectCurrentOpponentIntel(state);

    expect(first).not.toBeNull();
    expect(second).toBe(first);
  });

  it('recomputes the intel when the game reference changes', () => {
    const state = buildState();
    const first = selectCurrentOpponentIntel(state);
    const nextGame = structuredClone(state.game!);
    nextGame.week = 2;

    const second = selectCurrentOpponentIntel(buildState(nextGame));

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second).not.toBe(first);
  });
});
