import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Settings } from './Settings';

const gameState = {
  difficulty: 'allpro',
};

const uiState = {
  autosaveEnabled: true,
  simSpeed: 'detailed',
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: { game: typeof gameState; actions: { setDifficulty: () => Promise<void> } }) => unknown) => selector({
    game: gameState,
    actions: {
      setDifficulty: async () => undefined,
    },
  }),
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
  });
});
