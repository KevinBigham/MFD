import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Settings } from './Settings';

const gameState = {
  difficulty: 'allpro',
  difficultyState: {
    enabled: true,
    adaptiveSlider: 58,
    recentUserResults: [],
    currentStreak: 4,
    adjustmentHistory: [],
  },
};

const uiState = {
  autosaveEnabled: true,
  simSpeed: 'detailed',
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: {
    game: typeof gameState;
    actions: {
      setDifficulty: () => Promise<void>;
      setAdaptiveDifficultyEnabled: () => Promise<void>;
    };
  }) => unknown) => selector({
    game: gameState,
    actions: {
      setDifficulty: async () => undefined,
      setAdaptiveDifficultyEnabled: async () => undefined,
    },
  }),
  selectDifficultyState: (state: { game: typeof gameState }) => state.game.difficultyState,
}));

vi.mock('../../app/store/ui-store', () => ({
  useUiStore: (selector: (state: typeof uiState & {
    setAutosaveEnabled: () => void;
    setSimSpeed: () => void;
  }) => unknown) => selector({
    ...uiState,
    setAutosaveEnabled: () => undefined,
    setSimSpeed: () => undefined,
  }),
}));

describe('Settings', () => {
  it('renders the difficulty and simulation preference controls', () => {
    const markup = renderToStaticMarkup(<Settings />);

    expect(markup).toContain('SETTINGS');
    expect(markup).toContain('Difficulty');
    expect(markup).toContain('All-Pro');
    expect(markup).toContain('Autosave');
    expect(markup).toContain('DETAILED');
    expect(markup).toContain('Adaptive Difficulty');
    expect(markup).toContain('Winning streaks get tougher');
  });
});
