import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const {
  computeRivalryHeatMapMock,
  teamThemeVarsMock,
} = vi.hoisted(() => ({
  computeRivalryHeatMapMock: vi.fn(),
  teamThemeVarsMock: vi.fn(() => ({
    '--mfd-team-primary': '#cc0000',
    '--mfd-team-secondary': '#00cc00',
    '--mfd-team-tertiary': '#0000cc',
  })),
}));

let mockState = {
  game: { year: 2026 },
  team: { id: 'CHI', city: 'Chicago', name: 'Blaze' },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.team,
}));

vi.mock('../../lib/rivalry-heat-map', () => ({
  computeRivalryHeatMap: computeRivalryHeatMapMock,
}));

vi.mock('@mfd/design-system/components', () => ({
  PixelBadge: ({ children }: any) => <span data-mock="badge">{children}</span>,
  PixelPanel: ({ title, children }: any) => (
    <section data-mock="panel">
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock('../shared/pixelUi', () => ({
  monoSm: {},
  teamThemeVars: teamThemeVarsMock,
}));

import { RivalryHeatMap } from './RivalryHeatMap';

describe('RivalryHeatMap', () => {
  it('renders null when no user team is loaded', () => {
    mockState = {
      game: { year: 2026 },
      team: null,
    } as unknown as typeof mockState;
    computeRivalryHeatMapMock.mockReturnValue([]);

    expect(renderToStaticMarkup(<RivalryHeatMap />)).toBe('');
  });

  it('renders the empty-state copy when no rivalries are available', () => {
    mockState = {
      game: { year: 2026 },
      team: { id: 'CHI', city: 'Chicago', name: 'Blaze' },
    };
    computeRivalryHeatMapMock.mockReturnValue([]);

    const markup = renderToStaticMarkup(<RivalryHeatMap />);

    expect(markup).toContain('No rivalries declared for this franchise.');
  });

  it('labels rivalry rows as authored content and read-only display', () => {
    computeRivalryHeatMapMock.mockReturnValue([
      { rivalTeamId: 'GB', rivalAbbr: 'GB', rivalCityName: 'Green Bay', wins: 0, losses: 0, ties: 0, totalGames: 0, winPct: 0, heatLevel: 'cold', latestMeeting: null },
    ]);

    const markup = renderToStaticMarkup(<RivalryHeatMap />);

    expect(markup).toContain('authored team rivalry content plus runtime team lookup');
    expect(markup).toContain('W-L-T, total games, and latest meeting are derived from saved completed schedule and playoff results');
    expect(markup).toContain('rendering does not write rivalry state');
  });

  it('renders one row per rivalry entry', () => {
    mockState = {
      game: { year: 2026 },
      team: { id: 'CHI', city: 'Chicago', name: 'Blaze' },
    };
    computeRivalryHeatMapMock.mockReturnValue([
      { rivalTeamId: 'GB', rivalAbbr: 'GB', rivalCityName: 'Green Bay', wins: 0, losses: 0, ties: 0, totalGames: 0, winPct: 0, heatLevel: 'cold', latestMeeting: null },
      { rivalTeamId: 'DET', rivalAbbr: 'DET', rivalCityName: 'Detroit', wins: 0, losses: 0, ties: 0, totalGames: 0, winPct: 0, heatLevel: 'cold', latestMeeting: null },
    ]);

    const markup = renderToStaticMarkup(<RivalryHeatMap />);

    expect(markup).toContain('Green Bay');
    expect(markup).toContain('Detroit');
  });

  it('applies rival team theme vars to each rivalry row wrapper', () => {
    computeRivalryHeatMapMock.mockReturnValue([
      { rivalTeamId: 'GB', rivalAbbr: 'GB', rivalCityName: 'Green Bay', wins: 0, losses: 0, ties: 0, totalGames: 0, winPct: 0, heatLevel: 'cold', latestMeeting: null },
    ]);
    teamThemeVarsMock.mockClear();

    const markup = renderToStaticMarkup(<RivalryHeatMap />);

    expect(teamThemeVarsMock).toHaveBeenCalledWith('GB');
    expect(markup).toContain('--mfd-team-primary:#cc0000');
  });

  it('renders the heat label, record, and win percentage for each entry', () => {
    computeRivalryHeatMapMock.mockReturnValue([
      {
        rivalTeamId: 'GB',
        rivalAbbr: 'GB',
        rivalCityName: 'Green Bay',
        wins: 2,
        losses: 1,
        ties: 0,
        totalGames: 3,
        winPct: 2 / 3,
        heatLevel: 'cold',
        latestMeeting: { year: 2030, week: 12, result: 'win', score: '31-24' },
      },
    ]);

    const markup = renderToStaticMarkup(<RivalryHeatMap />);

    expect(markup).toContain('COLD');
    expect(markup).toContain('2-1-0');
    expect(markup).toContain('3 games');
    expect(markup).toContain('WIN 31-24 // 2030 W12');
    expect(markup).toContain('66.7%');
  });

  it('renders a no-meetings fallback when there are no saved results yet', () => {
    computeRivalryHeatMapMock.mockReturnValue([
      { rivalTeamId: 'GB', rivalAbbr: 'GB', rivalCityName: 'Green Bay', wins: 0, losses: 0, ties: 0, totalGames: 0, winPct: 0, heatLevel: 'cold', latestMeeting: null },
    ]);

    const markup = renderToStaticMarkup(<RivalryHeatMap />);

    expect(markup).toContain('Latest: No saved meetings yet');
    expect(markup).toContain('0 games');
  });
});
