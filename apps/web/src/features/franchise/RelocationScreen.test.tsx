import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RelocationScreen } from './RelocationScreen';

const baseState = () => ({
  team: {
    id: 'team-1',
    city: 'Chicago',
    name: 'Blaze',
    capSpace: 62,
  },
  year: 2033,
  canRelocate: true,
  destinations: [
    { city: 'London', teamName: 'Monarchs', abbr: 'LDN', marketSize: 'mega', marketModifier: 1.25, fanbaseStart: 40, prestigeBonus: 15, cost: 55, stadiumType: 'dome', description: 'International expansion, massive market' },
    { city: 'Berlin', teamName: 'Wanderers', abbr: 'BER', marketSize: 'large', marketModifier: 1.2, fanbaseStart: 38, prestigeBonus: 12, cost: 52, stadiumType: 'dome', description: 'European powerhouse, hungry for American football' },
  ],
  actions: {
    relocateTeam: () => Promise.resolve(),
  },
});

let mockState = baseState();

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectCanRelocate: (state: typeof mockState) => state.canRelocate,
  selectRelocationDestinations: (state: typeof mockState) => state.destinations,
  selectUserTeam: (state: typeof mockState) => state.team,
  selectYear: (state: typeof mockState) => state.year,
}));

describe('RelocationScreen', () => {
  beforeEach(() => {
    mockState = baseState();
  });

  it('renders the relocation header and cap snapshot', () => {
    const markup = renderToStaticMarkup(<RelocationScreen />);
    expect(markup).toContain('FRANCHISE RELOCATION');
    expect(markup).toContain('$62.0M CAP');
  });

  it('shows all destination cards', () => {
    const markup = renderToStaticMarkup(<RelocationScreen />);
    expect(markup).toContain('LONDON');
    expect(markup).toContain('BERLIN');
    expect(markup).toContain('International expansion, massive market');
  });

  it('renders the relocation impact preview copy', () => {
    const markup = renderToStaticMarkup(<RelocationScreen />);
    expect(markup).toContain('Chemistry Hit');
    expect(markup).toContain('Morale Hit');
    expect(markup).toContain('Fresh Fanbase');
  });

  it('shows the blocked reason when relocation is unavailable', () => {
    mockState.canRelocate = false;
    mockState.team.capSpace = 20;
    const markup = renderToStaticMarkup(<RelocationScreen />);
    expect(markup).toContain('Need at least $52M in cap space');
    expect(markup).toContain('BLOCKED');
  });

  it('renders the decision controls', () => {
    const markup = renderToStaticMarkup(<RelocationScreen />);
    expect(markup).toContain('Confirm Relocation');
    expect(markup).toContain('Cancel');
  });
});
