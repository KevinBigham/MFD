import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FranchiseLegends } from './FranchiseLegends';

const baseState = () => ({
  game: {
    franchiseHistory: [
      { year: 2029, teamId: 'team-1', wins: 12, losses: 5, ties: 0, record: '12-5', pointDifferential: 88, playoffFinish: 'champion', majorEvents: [], awardsWon: [], recordsBroken: [] },
    ],
  },
  team: { id: 'team-1', city: 'Chicago', name: 'Blaze' },
  legends: [
    { playerId: 'p1', playerName: 'Cole Stone', pos: 'QB', legacyScore: 96.2, tenureYears: 9, peakOvr: 94, championships: 3, mvps: 2, allPros: 5, proBowls: 6, hallOfFame: true, careerHighlights: ['2x League MVP', 'Franchise all-time passYds leader (52,340)'] },
    { playerId: 'p2', playerName: 'Mace Ford', pos: 'WR', legacyScore: 84.1, tenureYears: 6, peakOvr: 90, championships: 1, mvps: 0, allPros: 3, proBowls: 4, hallOfFame: false, careerHighlights: ['3x All-Pro'] },
  ],
  allDecadeTeams: [
    {
      id: 'decade-1',
      decade: '2020-2029',
      startYear: 2020,
      endYear: 2029,
      teamId: 'team-1',
      roster: [
        { playerId: 'p1', playerName: 'Cole Stone', pos: 'QB', peakOvr: 94, seasonsWithTeam: 9, highlights: ['2x League MVP'] },
        { playerId: 'p2', playerName: 'Mace Ford', pos: 'WR', peakOvr: 90, seasonsWithTeam: 6, highlights: ['3x All-Pro'] },
      ],
      headline: 'The Dynasty Era',
    },
  ],
});

let mockState = baseState();

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectAllDecadeTeams: (state: typeof mockState) => state.allDecadeTeams,
  selectFranchiseLegends: (state: typeof mockState) => state.legends,
  selectUserTeam: (state: typeof mockState) => state.team,
}));

describe('FranchiseLegends', () => {
  beforeEach(() => {
    mockState = baseState();
  });

  it('renders the legends header and legend count badges', () => {
    const markup = renderToStaticMarkup(<FranchiseLegends />);
    expect(markup).toContain('FRANCHISE LEGENDS');
    expect(markup).toContain('2 LEGENDS');
  });

  it('shows the focused legend panel for the top legend', () => {
    const markup = renderToStaticMarkup(<FranchiseLegends />);
    expect(markup).toContain('COLE STONE');
    expect(markup).toContain('HOF');
  });

  it('shows the unlock message when no all-decade team exists yet', () => {
    mockState.allDecadeTeams = [];
    const markup = renderToStaticMarkup(<FranchiseLegends />);
    expect(markup).toContain('Play 10 seasons to unlock your first All-Decade Team');
  });

  it('renders the decade selector and roster cards when decade teams exist', () => {
    const markup = renderToStaticMarkup(<FranchiseLegends />);
    expect(markup).toContain('2020-2029');
    expect(markup).toContain('STARTER');
    expect(markup).toContain('2x League MVP');
  });

  it('renders the generated narrative for the selected decade', () => {
    const markup = renderToStaticMarkup(<FranchiseLegends />);
    expect(markup).toContain('Championship seasons arrived in 2029');
  });
});
