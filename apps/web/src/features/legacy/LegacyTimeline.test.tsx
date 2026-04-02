import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LegacyTimeline } from './LegacyTimeline';

const mockState = {
  game: {
    year: 2031,
    teams: {
      user: { id: 'user', city: 'Chicago', name: 'Blaze', isUser: true },
    },
    franchiseHistory: [
      {
        year: 2030,
        teamId: 'user',
        wins: 12,
        losses: 5,
        ties: 0,
        record: '12-5',
        pointDifferential: 84,
        playoffFinish: 'champion',
        majorEvents: ['Won the championship.', 'Shifted to contend.'],
      },
    ],
    playerArchive: [
      {
        playerId: 'p1',
        firstName: 'Jay',
        lastName: 'Stone',
        name: 'Jay Stone',
        positions: ['QB'],
        peakOvr: 91,
        peakYear: 2029,
        firstYear: 2026,
        lastYear: 2030,
        retirementYear: null,
        teamHistory: [{ teamId: 'user', firstYear: 2026, lastYear: 2030 }],
      },
    ],
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => Object.values(state.game.teams)[0],
}));

describe('LegacyTimeline', () => {
  it('renders season history, major events, and the all-time roster', () => {
    const markup = renderToStaticMarkup(<LegacyTimeline />);

    expect(markup).toContain('DYNASTY LEGACY');
    expect(markup).toContain('12-5');
    expect(markup).toContain('Won the championship.');
    expect(markup).toContain('Jay Stone');
  });
});
