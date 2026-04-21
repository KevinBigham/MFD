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

  it('renders one row per rivalry entry', () => {
    mockState = {
      game: { year: 2026 },
      team: { id: 'CHI', city: 'Chicago', name: 'Blaze' },
    };
    computeRivalryHeatMapMock.mockReturnValue([
      { rivalTeamId: 'GB', rivalAbbr: 'GB', rivalCityName: 'Green Bay', wins: 0, losses: 0, ties: 0, totalGames: 0, winPct: 0, heatLevel: 'cold' },
      { rivalTeamId: 'DET', rivalAbbr: 'DET', rivalCityName: 'Detroit', wins: 0, losses: 0, ties: 0, totalGames: 0, winPct: 0, heatLevel: 'cold' },
    ]);

    const markup = renderToStaticMarkup(<RivalryHeatMap />);

    expect(markup).toContain('Green Bay');
    expect(markup).toContain('Detroit');
  });

  it('applies rival team theme vars to each rivalry row wrapper', () => {
    computeRivalryHeatMapMock.mockReturnValue([
      { rivalTeamId: 'GB', rivalAbbr: 'GB', rivalCityName: 'Green Bay', wins: 0, losses: 0, ties: 0, totalGames: 0, winPct: 0, heatLevel: 'cold' },
    ]);
    teamThemeVarsMock.mockClear();

    const markup = renderToStaticMarkup(<RivalryHeatMap />);

    expect(teamThemeVarsMock).toHaveBeenCalledWith('GB');
    expect(markup).toContain('--mfd-team-primary:#cc0000');
  });

  it('renders the heat label, record, and win percentage for each entry', () => {
    computeRivalryHeatMapMock.mockReturnValue([
      { rivalTeamId: 'GB', rivalAbbr: 'GB', rivalCityName: 'Green Bay', wins: 0, losses: 0, ties: 0, totalGames: 0, winPct: 0, heatLevel: 'cold' },
    ]);

    const markup = renderToStaticMarkup(<RivalryHeatMap />);

    expect(markup).toContain('COLD');
    expect(markup).toContain('0-0-0');
    expect(markup).toContain('0.0%');
  });
});
