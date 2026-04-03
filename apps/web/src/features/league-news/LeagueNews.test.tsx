import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LeagueNews } from './LeagueNews';

const mockState = {
  leagueNews: [
    {
      id: 'news-1',
      headline: 'Blockbuster trade lands a new quarterback',
      body: 'Chicago adds a veteran passer in a late-night deal.',
      type: 'trade',
      importance: 'breaking',
      teamIds: ['team-1'],
      week: 11,
      year: 2029,
    },
    {
      id: 'news-2',
      headline: 'Coordinator carousel starts spinning',
      body: 'Multiple staffs are making aggressive calls before the offseason.',
      type: 'coaching',
      importance: 'major',
      teamIds: ['team-2'],
      week: 11,
      year: 2029,
    },
  ],
  teamNews: [
    {
      id: 'news-1',
      headline: 'Blockbuster trade lands a new quarterback',
      body: 'Chicago adds a veteran passer in a late-night deal.',
      type: 'trade',
      importance: 'breaking',
      teamIds: ['team-1'],
      week: 11,
      year: 2029,
    },
  ],
  teams: {
    'team-1': { city: 'Chicago', name: 'Blaze' },
    'team-2': { city: 'Austin', name: 'Armadillos' },
  },
  userTeamId: 'team-1',
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectLeagueNews: (state: typeof mockState) => state.leagueNews,
  selectTeamNews: (state: typeof mockState) => state.teamNews,
  selectTeams: (state: typeof mockState) => state.teams,
  selectUserTeamId: (state: typeof mockState) => state.userTeamId,
}));

describe('LeagueNews', () => {
  it('renders the league wire feed and filter controls', () => {
    const markup = renderToStaticMarkup(<LeagueNews />);

    expect(markup).toContain('LEAGUE NEWS');
    expect(markup).toContain('BLOCKBUSTER TRADE LANDS A NEW QUARTERBACK');
    expect(markup).toContain('COORDINATOR CAROUSEL STARTS SPINNING');
    expect(markup).toContain('MY TEAM');
    expect(markup).toContain('Expand');
  });
});
