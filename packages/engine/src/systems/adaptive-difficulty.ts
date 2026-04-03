import type { DifficultyState, GameState } from '../types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createDefaultDifficultyState(): DifficultyState {
  return {
    enabled: true,
    adaptiveSlider: 50,
    recentUserResults: [],
    currentStreak: 0,
    adjustmentHistory: [],
  };
}

export function updateAdaptiveDifficulty(
  game: GameState,
  result: 'win' | 'loss',
  week: number = game.week,
): DifficultyState {
  const state = game.difficultyState ?? createDefaultDifficultyState();
  const nextStreak = result === 'win'
    ? Math.max(1, state.currentStreak + 1)
    : Math.min(-1, state.currentStreak - 1);

  state.currentStreak = nextStreak;
  state.recentUserResults = [...state.recentUserResults, { week, result }].slice(-8);

  if (!state.enabled) {
    state.adaptiveSlider = 50;
    game.difficultyState = state;
    return state;
  }

  let delta = 0;
  let reason = '';
  if (result === 'win' && nextStreak >= 4) {
    delta = 3;
    reason = `Win streak reached ${nextStreak}`;
  } else if (result === 'loss' && nextStreak <= -3) {
    delta = -2;
    reason = `Losing streak reached ${Math.abs(nextStreak)}`;
  }

  if (delta !== 0) {
    state.adaptiveSlider = clamp(state.adaptiveSlider + delta, 0, 100);
    state.adjustmentHistory = [...state.adjustmentHistory, { week, delta, reason }].slice(-12);
  }

  game.difficultyState = state;
  return state;
}

export function getAdaptiveModifier(game: GameState): number {
  const state = game.difficultyState ?? createDefaultDifficultyState();
  if (!state.enabled) return 0;
  return clamp((state.adaptiveSlider - 50) / 10, -5, 5);
}
