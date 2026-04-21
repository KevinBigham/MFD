import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { StoredScrapbookEntry } from '../../lib/scrapbook-store';

const { exportRecapAsPngMock } = vi.hoisted(() => ({
  exportRecapAsPngMock: vi.fn(async () => 'data:image/png;base64,stub'),
}));

vi.mock('@mfd/engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mfd/engine')>();
  return {
    ...actual,
    getTeamContent: vi.fn(() => ({
      primaryColor: '#112233',
      secondaryColor: '#445566',
      tertiaryColor: '#778899',
    })),
  };
});

vi.mock('@mfd/design-system/components', () => ({
  PixelBadge: ({ children }: any) => <span>{children}</span>,
  PixelButton: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
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
    autoGrid: () => ({}),
  };
});

vi.mock('../season/SeasonRecapCard', () => ({
  SeasonRecapCard: ({ recap }: any) => (
    <div data-mock="season-recap-card">
      {recap.teamCity} {recap.teamName} {recap.seasonYear}
    </div>
  ),
}));

vi.mock('../season/recap-share', () => ({
  exportRecapAsPng: exportRecapAsPngMock,
}));

function makeEntry(overrides: Partial<StoredScrapbookEntry> = {}): StoredScrapbookEntry {
  return {
    year: 2026,
    eraTag: 'Dynasty Era',
    seasonHighlightLine: 'Cole Stone turned every close finish into leverage.',
    notableMoments: [
      {
        headline: 'Statement win',
        detail: 'Closed the season with a tiebreaking division clincher.',
        week: 18,
        importance: 'breaking',
      },
    ],
    recap: {
      teamId: 'afce1',
      teamName: 'Blaze',
      teamCity: 'Chicago',
      teamAbbr: 'CHI',
      seasonYear: 2026,
      record: '12-5',
      wins: 12,
      losses: 5,
      ties: 0,
      division: 'East',
      conference: 'AFC',
      divisionFinish: 1,
      conferenceFinish: 2,
      playoffResult: 'conf-loss',
      teamAwards: ['MVP'],
      topPerformers: {
        passingLeader: {
          playerId: 'qb-1',
          playerName: 'Cole Stone',
          pos: 'QB',
          value: 4612,
          gamesPlayed: 17,
          perGame: 271.3,
        },
        rushingLeader: {
          playerId: 'rb-1',
          playerName: 'Jay Mercer',
          pos: 'RB',
          value: 1487,
          gamesPlayed: 17,
          perGame: 87.5,
        },
      },
      seasonStory: 'Your contention window widened instead of closing.',
      teamMotto: 'Fear The Burn',
      breakoutCandidates: [
        {
          playerId: 'wr-1',
          playerName: 'Mason Vale',
          pos: 'WR',
          age: 24,
          ovr: 82,
          ovrDelta: 5,
          reason: 'Strong 5-point improvement.',
        },
      ],
    },
    playoffLoreCards: [],
    ...overrides,
  };
}

import { ScrapbookEntryCard, exportScrapbookEntryAsPng } from './ScrapbookEntry';

describe('ScrapbookEntryCard', () => {
  it('renders year, record, playoff result, and era tag in compact mode', () => {
    const markup = renderToStaticMarkup(<ScrapbookEntryCard entry={makeEntry()} />);

    expect(markup).toContain('2026');
    expect(markup).toContain('12-5');
    expect(markup).toContain('Conference Loss');
    expect(markup).toContain('Dynasty Era');
  });

  it('uses team colors from getTeamContent in scrapbook css variables', () => {
    const markup = renderToStaticMarkup(<ScrapbookEntryCard entry={makeEntry()} />);

    expect(markup).toContain('--mfd-scrapbook-primary:#112233');
    expect(markup).toContain('--mfd-scrapbook-secondary:#445566');
    expect(markup).toContain('--mfd-scrapbook-tertiary:#778899');
  });

  it('renders the imported SeasonRecapCard body in expanded mode', () => {
    const markup = renderToStaticMarkup(<ScrapbookEntryCard entry={makeEntry()} defaultExpanded />);

    expect(markup).toContain('data-mock="season-recap-card"');
    expect(markup).toContain('Statement win');
  });

  it('renders the playoff lore section in expanded mode when postseason cards exist', () => {
    const markup = renderToStaticMarkup(<ScrapbookEntryCard
      entry={makeEntry({
        playoffLoreCards: [{
          gameId: 'playoff-2026-19',
          seasonYear: 2026,
          week: 19,
          round: 'wild_card',
          outcome: 'win',
          headline: 'Chicago survives the knife fight',
          finalScore: '27-24',
          opponentTeamId: 'opp',
          loreHook: 'Won after trailing by 14+ entering the fourth quarter.',
          heroBlocks: [
            { label: 'Spotlight', value: 'Cole Stone // 23/34, 288 yds, 2 TD' },
            { label: 'Swing', value: 'Turnover edge turned the quarter.' },
            { label: 'Tagline', value: 'The season stayed alive.' },
          ],
          tags: ['Cinderella', 'Named Game'],
          namedGameName: 'The Comeback',
        }],
      })}
      defaultExpanded
    />);

    expect(markup).toContain('Playoff Lore');
    expect(markup).toContain('Wild Card');
    expect(markup).toContain('27-24');
    expect(markup).toContain('The Comeback');
  });

  it('shows a postseason card-count badge in compact mode when playoff lore exists', () => {
    const markup = renderToStaticMarkup(<ScrapbookEntryCard
      entry={makeEntry({
        playoffLoreCards: [
          {
            gameId: 'playoff-2026-19',
            seasonYear: 2026,
            week: 19,
            round: 'wild_card',
            outcome: 'win',
            headline: 'Wild card survive',
            finalScore: '27-24',
            opponentTeamId: 'opp',
            loreHook: 'Stayed alive.',
            heroBlocks: [
              { label: 'Spotlight', value: 'Cole Stone // 23/34, 288 yds, 2 TD' },
              { label: 'Swing', value: 'Turnover edge turned the quarter.' },
              { label: 'Tagline', value: 'The season stayed alive.' },
            ],
            tags: ['Cinderella'],
          },
          {
            gameId: 'playoff-2026-20',
            seasonYear: 2026,
            week: 20,
            round: 'divisional',
            outcome: 'win',
            headline: 'Divisional survive',
            finalScore: '31-20',
            opponentTeamId: 'opp-2',
            loreHook: 'The defense finished it.',
            heroBlocks: [
              { label: 'Spotlight', value: 'Jay Mercer // 129 rush yds, 2 TD' },
              { label: 'Swing', value: 'Fourth-quarter stop closed the door.' },
              { label: 'Tagline', value: 'The run kept rolling.' },
            ],
            tags: ['Milestone'],
          },
        ],
      })}
    />);

    expect(markup).toContain('2 PLAYOFF CARDS');
  });

  it('invokes exportRecapAsPng for the expanded entry export path', async () => {
    exportRecapAsPngMock.mockClear();
    const exportNode = {} as HTMLElement;
    const markup = renderToStaticMarkup(<ScrapbookEntryCard entry={makeEntry()} defaultExpanded exportNode={exportNode} />);

    expect(markup).toContain('Export as PNG');
    await exportScrapbookEntryAsPng(exportNode, makeEntry());

    expect(exportRecapAsPngMock).toHaveBeenCalledWith(exportNode);
  });

  it('renders without emoji characters', () => {
    const markup = renderToStaticMarkup(<ScrapbookEntryCard entry={makeEntry()} />);

    expect(markup).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
