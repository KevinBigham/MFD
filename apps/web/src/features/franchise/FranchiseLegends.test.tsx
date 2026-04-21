import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FranchiseLegends } from './FranchiseLegends';

const { teamThemeVarsMock } = vi.hoisted(() => ({
  teamThemeVarsMock: vi.fn(() => ({
    '--mfd-team-primary': '#cc2200',
    '--mfd-team-secondary': '#22cc00',
    '--mfd-team-tertiary': '#0022cc',
  })),
}));

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
  retiredJerseys: [
    { id: 'jr-1', playerId: 'p1', playerName: 'Cole Stone', pos: 'QB', jerseyNumber: 12, teamId: 'team-1', year: 2030, peakOvr: 94, seasonsWithTeam: 9, championships: 3, headline: 'Chicago retires #12', ceremony: 'A banner night.', legacyScore: 98 },
  ],
});

let mockState = baseState();

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectAllDecadeTeams: (state: typeof mockState) => state.allDecadeTeams,
  selectFranchiseLegends: (state: typeof mockState) => state.legends,
  selectRetiredJerseys: (state: typeof mockState) => state.retiredJerseys,
  selectUserTeam: (state: typeof mockState) => state.team,
}));

vi.mock('../shared/pixelUi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../shared/pixelUi')>();
  return {
    ...actual,
    teamThemeVars: teamThemeVarsMock,
  };
});

describe('FranchiseLegends', () => {
  beforeEach(() => {
    mockState = baseState();
  });

  it('renders the legends header and legend count badges', () => {
    const markup = renderToStaticMarkup(<FranchiseLegends />);
    expect(markup).toContain('FRANCHISE LEGENDS');
    expect(markup).toContain('2 LEGENDS');
    expect(markup).toContain('1 RETIRED JERSEYS');
  });

  it('shows the focused legend panel for the top legend', () => {
    const markup = renderToStaticMarkup(<FranchiseLegends />);
    expect(markup).toContain('COLE STONE');
    expect(markup).toContain('HOF');
  });

  it('renders the tab controls for legends, decades, and retired jerseys', () => {
    const markup = renderToStaticMarkup(<FranchiseLegends />);
    expect(markup).toContain('Legends');
    expect(markup).toContain('All-Decade');
    expect(markup).toContain('Retired Jerseys');
  });

  it('keeps the legends board visible by default after adding tabs', () => {
    const markup = renderToStaticMarkup(<FranchiseLegends />);
    expect(markup).toContain('LEGEND BOARD');
    expect(markup).toContain('FOCUSED LEGEND');
  });

  it('shows retired jersey totals in the header badges', () => {
    const markup = renderToStaticMarkup(<FranchiseLegends />);
    expect(markup).toContain('1 RETIRED JERSEYS');
  });

  it('applies team theme vars to the franchise legends root container', () => {
    teamThemeVarsMock.mockClear();

    const markup = renderToStaticMarkup(<FranchiseLegends />);

    expect(teamThemeVarsMock).toHaveBeenCalledWith('team-1');
    expect(markup).toContain('--mfd-team-primary:#cc2200');
  });
});
