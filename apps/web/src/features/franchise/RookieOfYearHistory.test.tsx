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
  PixelBadge: ({ children }: any) => <span data-mock="badge">{children}</span>,
  PixelButton: ({ children }: any) => <button type="button">{children}</button>,
  PixelPanel: ({ title, children }: any) => (
    <section data-mock="panel">
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock('../shared/pixelUi', () => ({
  monoSm: {},
  navigateTo: vi.fn(),
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
    expect(markup).toContain('No dynasty id');
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

  it('labels the browser-local sidecar and rollover source boundary', () => {
    readRookieOfYearEntriesMock.mockReturnValue([makeEntry(2027, 'Tariq Moss')]);

    const markup = renderToStaticMarkup(<RookieOfYearHistory dynastyId="dynasty-a" />);

    expect(markup).toContain('mfd.rookieOfYear.v1');
    expect(markup).toContain('Year rollover');
    expect(markup).toContain('Dynasty scoped');
    expect(markup).toContain('readRookieOfYearEntries(dynastyId)');
    expect(markup).toContain('syncRookieOfYearAtYearRollover');
    expect(markup).toContain('computeRookieOfYear');
    expect(markup).toContain('Opening this panel does not recompute winners');
    expect(markup).toContain('write GameState');
    expect(markup).toContain('change the sidecar');
    expect(markup).toContain('play games or reroll saved outcomes');
  });

  it('links rookie award history into the next rookie class workflow', () => {
    readRookieOfYearEntriesMock.mockReturnValue([makeEntry(2027, 'Tariq Moss')]);

    const markup = renderToStaticMarkup(<RookieOfYearHistory dynastyId="dynasty-a" />);

    expect(markup).toContain('next class plan');
    expect(markup).toContain('Scouting');
    expect(markup).toContain('Draft Board');
    expect(markup).toContain('Development');
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
