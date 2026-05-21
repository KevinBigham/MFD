import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PowerRankings } from './PowerRankings';

const mockState = {
  powerRankings: [
    {
      rank: 1,
      teamId: 'team-2',
      teamName: 'Austin Armadillos',
      score: 93.2,
      previousRank: 2,
      delta: 1,
      blurb: 'Austin keeps stacking wins behind a crushing defense.',
      record: '11-1',
    },
    {
      rank: 2,
      teamId: 'team-1',
      teamName: 'Chicago Blaze',
      score: 91.4,
      previousRank: 4,
      delta: 2,
      blurb: 'Chicago is closing fast behind a streaking offense.',
      record: '10-2',
    },
    {
      rank: 3,
      teamId: 'team-3',
      teamName: 'Dallas Drifters',
      score: 86.8,
      previousRank: 1,
      delta: -2,
      blurb: 'Dallas still has talent, but the slide is getting loud.',
      record: '8-4',
    },
  ],
  userTeam: {
    id: 'team-1',
    city: 'Chicago',
    name: 'Blaze',
    isUser: true,
  },
  userPowerRanking: {
    rank: 2,
    teamId: 'team-1',
    teamName: 'Chicago Blaze',
    score: 91.4,
    previousRank: 4,
    delta: 2,
    blurb: 'Chicago is closing fast behind a streaking offense.',
    record: '10-2',
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectPowerRankings: (state: typeof mockState) => state.powerRankings,
  selectUserPowerRanking: (state: typeof mockState) => state.userPowerRanking,
  selectUserTeam: (state: typeof mockState) => state.userTeam,
}));

describe('PowerRankings', () => {
  it('renders the league ladder and highlights the user team placement', () => {
    const markup = renderToStaticMarkup(<PowerRankings />);

    expect(markup).toContain('POWER RANKINGS');
    expect(markup).toContain('NEXT CALL');
    expect(markup).toContain('Treat ranking as temperature');
    expect(markup).toContain('data-mfd-table-responsive="cards"');
    expect(markup).toContain('USER #2');
    expect(markup).toContain('LEAGUE LADDER');
    expect(markup).toContain('CHICAGO BLAZE');
    expect(markup).toContain('Chicago is closing fast behind a streaking offense.');
  });
});
