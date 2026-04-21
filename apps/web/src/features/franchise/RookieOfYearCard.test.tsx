import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RookieOfYearCard } from './RookieOfYearCard';

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
  display: {},
  monoSm: {},
}));

function makeEntry(overrides: Partial<Parameters<typeof RookieOfYearCard>[0]['entry']> = {}) {
  return {
    playerId: 'rookie-1',
    playerName: 'Jalen Banks',
    teamId: 'team-1',
    teamAbbr: 'CHI',
    position: 'WR' as const,
    compositeScore: 127.36,
    headline: 'Jalen Banks: CHI rookie WR takes ROY honors',
    highlights: ['1,203 rec yds // 10 rec TD', '17 GP // CHI rookie WR'],
    season: 2026,
    ...overrides,
  };
}

describe('RookieOfYearCard', () => {
  it('renders the season title, headline, and player name', () => {
    const markup = renderToStaticMarkup(<RookieOfYearCard entry={makeEntry()} />);

    expect(markup).toContain('2026 Rookie of the Year');
    expect(markup).toContain('Jalen Banks: CHI rookie WR takes ROY honors');
    expect(markup).toContain('JALEN BANKS');
  });

  it('renders the team and position badges', () => {
    const markup = renderToStaticMarkup(<RookieOfYearCard entry={makeEntry()} />);

    expect(markup).toContain('CHI');
    expect(markup).toContain('WR');
  });

  it('formats the composite score to one decimal place', () => {
    const markup = renderToStaticMarkup(<RookieOfYearCard entry={makeEntry()} />);

    expect(markup).toContain('127.4');
  });

  it('renders every highlight line when highlights are present', () => {
    const markup = renderToStaticMarkup(<RookieOfYearCard entry={makeEntry()} />);

    expect(markup).toContain('1,203 rec yds // 10 rec TD');
    expect(markup).toContain('17 GP // CHI rookie WR');
  });

  it('renders a graceful fallback when no highlights are available', () => {
    const markup = renderToStaticMarkup(<RookieOfYearCard entry={makeEntry({ highlights: [] })} />);

    expect(markup).toContain('No season highlights archived for this winner.');
  });
});
