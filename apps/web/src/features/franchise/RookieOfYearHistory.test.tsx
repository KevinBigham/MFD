import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RookieOfYearHistory } from './RookieOfYearHistory';

const { readRookieOfYearEntriesMock } = vi.hoisted(() => ({
  readRookieOfYearEntriesMock: vi.fn(),
}));

vi.mock('../../lib/rookie-of-year-store', () => ({
  readRookieOfYearEntries: readRookieOfYearEntriesMock,
}));

vi.mock('@mfd/design-system/components', () => ({
  PixelPanel: ({ title, children }: any) => (
    <section data-mock="panel">
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock('../shared/pixelUi', () => ({
  monoSm: {},
}));

vi.mock('./RookieOfYearCard', () => ({
  RookieOfYearCard: ({ entry }: any) => <article data-mock="roy-card">{entry.playerName}</article>,
}));

function makeEntry(season: number, playerName: string) {
  return {
    playerId: `rookie-${season}`,
    playerName,
    teamId: 'team-1',
    teamAbbr: 'CHI',
    position: 'WR' as const,
    compositeScore: 120 + season,
    headline: `${playerName}: CHI rookie WR takes ROY honors`,
    highlights: ['Strong season'],
    season,
  };
}

describe('RookieOfYearHistory', () => {
  it('renders the section title', () => {
    readRookieOfYearEntriesMock.mockReturnValue([makeEntry(2026, 'Jalen Banks')]);

    const markup = renderToStaticMarkup(<RookieOfYearHistory dynastyId="dynasty-a" />);

    expect(markup).toContain('Rookie of the Year — Your Dynasty');
  });

  it('renders the empty state when no dynasty id is provided', () => {
    readRookieOfYearEntriesMock.mockReturnValue([]);

    const markup = renderToStaticMarkup(<RookieOfYearHistory dynastyId={null} />);

    expect(markup).toContain('No rookie award archive yet. Finish a season to crown the first winner.');
  });

  it('renders the empty state when the dynasty has no entries', () => {
    readRookieOfYearEntriesMock.mockReturnValue([]);

    const markup = renderToStaticMarkup(<RookieOfYearHistory dynastyId="dynasty-a" />);

    expect(markup).toContain('No rookie award archive yet. Finish a season to crown the first winner.');
  });

  it('renders one rookie card per stored winner', () => {
    readRookieOfYearEntriesMock.mockReturnValue([
      makeEntry(2027, 'Tariq Moss'),
      makeEntry(2026, 'Jalen Banks'),
    ]);

    const markup = renderToStaticMarkup(<RookieOfYearHistory dynastyId="dynasty-a" />);

    expect(markup.match(/data-mock="roy-card"/g)?.length ?? 0).toBe(2);
  });

  it('renders the winners in newest-first order from the store payload', () => {
    readRookieOfYearEntriesMock.mockReturnValue([
      makeEntry(2027, 'Tariq Moss'),
      makeEntry(2026, 'Jalen Banks'),
    ]);

    const markup = renderToStaticMarkup(<RookieOfYearHistory dynastyId="dynasty-a" />);

    expect(markup.indexOf('Tariq Moss')).toBeLessThan(markup.indexOf('Jalen Banks'));
  });
});
