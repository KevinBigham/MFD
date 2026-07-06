import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DynastyEraPrompt } from './DynastyEraPrompt';

const mockState = {
  game: { seed: 123, year: 2034 },
  team: { city: 'Chicago', name: 'Blaze' },
  actions: {
    nameDynastyEra: () => Promise.resolve(),
  },
};

vi.mock('@mfd/engine', () => ({
  generateEraSuggestions: () => [
    { name: 'The Gold Standard', reason: 'Three deep playoff runs and a title window.' },
    { name: 'The Lakefront Reign', reason: 'Chicago ruled the conference.' },
  ],
  mulberry32: () => () => 0.42,
}));

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.team,
}));

describe('DynastyEraPrompt', () => {
  it('renders era naming source and commit boundary copy', () => {
    const markup = renderToStaticMarkup(<DynastyEraPrompt open onClose={() => undefined} />);

    expect(markup).toContain('NAME YOUR DYNASTY ERA');
    expect(markup).toContain('The Chicago Blaze');
    expect(markup).toContain('The Gold Standard');
    expect(markup).toContain('ERA NAMING SOURCES');
    expect(markup).toContain('App prompt gate');
    expect(markup).toContain('Seeded suggestions');
    expect(markup).toContain('generateEraSuggestions(game, mulberry32(game.seed ^ game.year ^ 0xEEEE))');
    expect(markup).toContain('actions.nameDynastyEra(finalName)');
    expect(markup).toContain('saved `userDynastyEras` and `team.era` write');
    expect(markup).toContain('Skip closes this prompt only');
    expect(markup).toContain('does not detect new eras');
    expect(markup).toContain('reroll saved outcomes');
  });
});
