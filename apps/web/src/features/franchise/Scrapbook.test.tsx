import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { StoredScrapbookEntry } from '../../lib/scrapbook-store';

const {
  mockEntries,
  mockState,
  exportRecapAsPngMock,
  teamThemeVarsMock,
} = vi.hoisted(() => ({
  mockEntries: [] as StoredScrapbookEntry[],
  mockState: {
    game: {
      seed: 7,
      year: 2028,
    },
    team: {
      id: 'team-1',
      city: 'Chicago',
      name: 'Blaze',
      abbr: 'CHI',
    },
  },
  exportRecapAsPngMock: vi.fn(async () => 'data:image/png;base64,full'),
  teamThemeVarsMock: vi.fn(() => ({
    '--mfd-team-primary': '#991111',
    '--mfd-team-secondary': '#119911',
    '--mfd-team-tertiary': '#111199',
  })),
}));

vi.mock('../../lib/scrapbook-store', () => ({
  readScrapbookForDynasty: () => mockEntries,
}));

vi.mock('../../lib/career-meta', () => ({
  deriveDynastyId: () => 'dynasty-a',
}));

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.team,
}));

vi.mock('../season/recap-share', () => ({
  exportRecapAsPng: exportRecapAsPngMock,
}));

vi.mock('@mfd/design-system/components', () => ({
  PixelBadge: ({ children }: any) => <span>{children}</span>,
  PixelButton: ({ children, disabled }: any) => <button disabled={disabled}>{children}</button>,
  PixelPanel: ({ title, children }: any) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock('../shared/pixelUi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../shared/pixelUi')>();
  return {
    ...actual,
    PixelScreenHeader: ({ title, subtitle, badges }: any) => (
      <div data-mock="screen-header">
        {title}
        {subtitle}
        {badges}
      </div>
    ),
    PixelMetricCard: ({ label, value, detail }: any) => (
      <div data-mock="metric-card">
        {label}
        {value}
        {detail}
      </div>
    ),
    autoGrid: () => ({}),
    teamThemeVars: teamThemeVarsMock,
  };
});

function makeEntry(
  year: number,
  playoffResult: StoredScrapbookEntry['recap']['playoffResult'] = 'wild-card-loss',
): StoredScrapbookEntry {
  return {
    year,
    eraTag: `Era ${year}`,
    seasonHighlightLine: `Highlight ${year}`,
    notableMoments: [{
      headline: `Moment ${year}`,
      detail: 'A notable season detail.',
      week: 8,
      importance: 'major',
    }],
    recap: {
      teamId: 'team-1',
      teamName: 'Blaze',
      teamCity: 'Chicago',
      teamAbbr: 'CHI',
      seasonYear: year,
      record: playoffResult === 'champion' ? '13-4' : '10-7',
      wins: playoffResult === 'champion' ? 13 : 10,
      losses: playoffResult === 'champion' ? 4 : 7,
      ties: 0,
      division: 'North',
      conference: 'AFC',
      divisionFinish: 1,
      conferenceFinish: playoffResult === 'champion' ? 1 : 4,
      playoffResult,
      teamAwards: [],
      topPerformers: {
        passingLeader: {
          playerId: `qb-${year}`,
          playerName: `QB ${year}`,
          pos: 'QB',
          value: 4100,
          gamesPlayed: 17,
          perGame: 241.2,
        },
        rushingLeader: {
          playerId: `rb-${year}`,
          playerName: `RB ${year}`,
          pos: 'RB',
          value: 1200,
          gamesPlayed: 17,
          perGame: 70.6,
        },
      },
      seasonStory: `Season story ${year}`,
      teamMotto: 'Keep climbing.',
      breakoutCandidates: [{
        playerId: `breakout-${year}`,
        playerName: `Breakout ${year}`,
        pos: 'WR',
        age: 24,
        ovr: 82,
        ovrDelta: 4,
        reason: 'Strong offseason leap.',
      }],
    },
    playoffLoreCards: [],
  };
}

import { Scrapbook, exportFullScrapbookAsPng } from './Scrapbook';

describe('Scrapbook', () => {
  it('renders the empty state without crashing', () => {
    mockEntries.length = 0;

    const markup = renderToStaticMarkup(<Scrapbook />);

    expect(markup).toContain('No seasons recorded yet. Complete a season to start your scrapbook.');
    expect(markup).toContain('Scrapbook Sources');
  });

  it('renders entries in reverse chronological order', () => {
    mockEntries.splice(0, mockEntries.length, makeEntry(2024), makeEntry(2026), makeEntry(2025));

    const markup = renderToStaticMarkup(<Scrapbook />);

    expect(markup.indexOf('2026')).toBeLessThan(markup.indexOf('2025'));
    expect(markup.indexOf('2025')).toBeLessThan(markup.indexOf('2024'));
  });

  it('shows summary metrics sourced from summarizeScrapbook', () => {
    mockEntries.splice(0, mockEntries.length, makeEntry(2026, 'champion'), makeEntry(2025), makeEntry(2024));

    const markup = renderToStaticMarkup(<Scrapbook />);

    expect(markup).toContain('Total Seasons');
    expect(markup).toContain('3');
    expect(markup).toContain('Championships');
    expect(markup).toContain('1');
  });

  it('uses PixelScreenHeader instead of a custom header', () => {
    mockEntries.splice(0, mockEntries.length, makeEntry(2026));

    const markup = renderToStaticMarkup(<Scrapbook />);

    expect(markup).toContain('data-mock="screen-header"');
  });

  it('applies team theme vars to the scrapbook root container', () => {
    mockEntries.splice(0, mockEntries.length, makeEntry(2026));
    teamThemeVarsMock.mockClear();

    const markup = renderToStaticMarkup(<Scrapbook />);

    expect(teamThemeVarsMock).toHaveBeenCalledWith('team-1');
    expect(markup).toContain('--mfd-team-primary:#991111');
  });

  it('renders without emoji characters', () => {
    mockEntries.splice(0, mockEntries.length, makeEntry(2026));

    const markup = renderToStaticMarkup(<Scrapbook />);

    expect(markup).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('labels scrapbook sources without implying route writes', () => {
    mockEntries.splice(0, mockEntries.length, makeEntry(2026, 'champion'));

    const markup = renderToStaticMarkup(<Scrapbook />);

    expect(markup).toContain('Scrapbook Sources');
    expect(markup).toContain('mfd.scrapbook.v1');
    expect(markup).toContain('year-rollover writer');
    expect(markup).toContain('browser export only');
    expect(markup).toContain('deriveDynastyId');
    expect(markup).toContain('readScrapbookForDynasty');
    expect(markup).toContain('summarizeScrapbook');
    expect(markup).toContain('syncScrapbookAtYearRollover');
    expect(markup).toContain('buildSeasonRecap');
    expect(markup).toContain('buildScrapbookEntry');
    expect(markup).toContain('appendScrapbookEntry');
    expect(markup).toContain('pending playoff-lore cards merge');
    expect(markup).toContain('Opening this route does not write the scrapbook sidecar');
    expect(markup).toContain('clear pending playoff lore');
    expect(markup).toContain('create new game outcomes');
    expect(markup).toContain('browser PNG download');
  });

  it('uses the recap-share PNG helper for full scrapbook export', async () => {
    exportRecapAsPngMock.mockClear();
    const exportNode = {} as HTMLElement;

    await exportFullScrapbookAsPng(exportNode, 'Chicago Blaze');

    expect(exportRecapAsPngMock).toHaveBeenCalledWith(exportNode);
  });
});
