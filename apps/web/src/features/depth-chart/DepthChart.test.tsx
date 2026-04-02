import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DepthChart } from './DepthChart';

const mockState = {
  roster: [
    {
      id: 'qb-1',
      name: 'Jay Stone',
      firstName: 'Jay',
      lastName: 'Stone',
      pos: 'QB',
      ovr: 88,
      pot: 92,
      age: 25,
      systemFit: 81,
      isStarter: true,
      injury: null,
    },
    {
      id: 'qb-2',
      name: 'Rick Mason',
      firstName: 'Rick',
      lastName: 'Mason',
      pos: 'QB',
      ovr: 77,
      pot: 80,
      age: 28,
      systemFit: 67,
      isStarter: false,
      injury: null,
    },
    {
      id: 'dl-1',
      name: 'Ace Bolt',
      firstName: 'Ace',
      lastName: 'Bolt',
      pos: 'DL',
      ovr: 82,
      pot: 84,
      age: 26,
      systemFit: 75,
      isStarter: true,
      injury: null,
    },
  ],
  actions: {
    setStarter: () => undefined,
  },
};

vi.mock('@mfd/engine', async () => {
  const actual = await vi.importActual<typeof import('@mfd/engine')>('@mfd/engine');
  return {
    ...actual,
    detectPositionBattles: () => [],
  };
});

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState & { teamId: string | null }) => unknown) => selector({
    ...mockState,
    teamId: 'user-team',
  }),
  selectRoster: (state: typeof mockState) => state.roster,
  selectUserTeamId: (state: typeof mockState & { teamId: string | null }) => state.teamId,
}));

describe('DepthChart accessibility', () => {
  it('renders position cards as native buttons for keyboard accessibility', () => {
    const markup = renderToStaticMarkup(<DepthChart />);

    expect(markup).toContain('DEPTH CHART');
    expect(markup).toContain('type="button"');
  });
});
