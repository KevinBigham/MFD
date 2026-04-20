import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const mockState = {
  actions: {
    newGame: vi.fn(),
    loadGame: vi.fn(),
  },
};

vi.mock('./store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('./store/persistence', () => ({
  loadLatestAutosaveGame: vi.fn().mockResolvedValue(null),
}));

vi.mock('./store/seed', () => ({
  createSeedGameState: vi.fn(),
  getTeamOptions: () => [
    { index: 0, city: 'Buffalo', name: 'Bills', abbr: 'BUF', fullName: 'Buffalo Bills', conference: 'AFC', division: 'East' },
    { index: 1, city: 'Miami', name: 'Dolphins', abbr: 'MIA', fullName: 'Miami Dolphins', conference: 'AFC', division: 'East' },
    { index: 2, city: 'Dallas', name: 'Cowboys', abbr: 'DAL', fullName: 'Dallas Cowboys', conference: 'NFC', division: 'East' },
    { index: 3, city: 'Philadelphia', name: 'Eagles', abbr: 'PHI', fullName: 'Philadelphia Eagles', conference: 'NFC', division: 'East' },
  ],
}));

vi.mock('@mfd/engine', () => ({
  getAvailableScenarios: () => [{ id: 'rebuild', name: 'Rebuild', tagline: 'Start over', description: 'Rebuild a franchise', difficulty: 'pro', seasonLimit: 5 }],
  // Sprint 53: returns a deterministic prng function so AttractMode's
  // `mulberry32(seed)()` calls work without test-mock guards in production code.
  mulberry32: vi.fn(() => () => 0.42),
  startScenario: vi.fn(),
  generateConventionSave: vi.fn(),
  CONVENTION_SAVE_METADATA: { headline: 'Test headline', week: 14, description: 'Test', team: 'Test' },
}));

import { NewGameScreen } from './NewGameScreen';

describe('NewGameScreen', () => {
  it('renders all 4 difficulty options', () => {
    const markup = renderToStaticMarkup(<NewGameScreen />);

    expect(markup).toContain('Rookie');
    expect(markup).toContain('Pro');
    expect(markup).toContain('All-Pro');
    expect(markup).toContain('Legend');
  });

  it('renders team selection with AFC and NFC conferences', () => {
    const markup = renderToStaticMarkup(<NewGameScreen />);

    expect(markup).toContain('AFC');
    expect(markup).toContain('NFC');
    expect(markup).toContain('BUF');
    expect(markup).toContain('DAL');
  });

  it('renders the Start Dynasty button', () => {
    const markup = renderToStaticMarkup(<NewGameScreen />);

    expect(markup).toContain('Start Dynasty');
  });
});
