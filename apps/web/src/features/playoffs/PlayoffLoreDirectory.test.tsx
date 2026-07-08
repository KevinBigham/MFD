import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PlayoffLoreCard } from '../../lib/playoff-lore';

const { teamThemeVarsMock } = vi.hoisted(() => ({
  teamThemeVarsMock: vi.fn(() => ({
    '--mfd-team-primary': '#dd4400',
    '--mfd-team-secondary': '#44dd00',
    '--mfd-team-tertiary': '#0044dd',
  })),
}));

type AggregateEntry = {
  dynastyId: string;
  seasonYear: number;
  card: PlayoffLoreCard;
  source: 'archived' | 'pending';
};

const gameState = {
  game: {
    seed: 123,
    year: 2045,
    teams: {
      'team-1': { id: 'team-1', isUser: true, city: 'Chicago', name: 'Blaze', abbr: 'CHI' },
    },
    franchiseHistory: [{ teamId: 'team-1', year: 2030 }],
  },
  team: {
    id: 'team-1',
    isUser: true,
    city: 'Chicago',
    name: 'Blaze',
    abbr: 'CHI',
  },
};

let aggregateCards: AggregateEntry[] = [];

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof gameState) => unknown) => selector(gameState),
  selectUserTeam: (state: typeof gameState) => state.team,
}));

vi.mock('../../lib/scrapbook-store', () => ({
  listAllPlayoffLoreCards: () => aggregateCards,
}));

vi.mock('@mfd/design-system/components', () => ({
  PixelBadge: ({ children }: any) => <span data-mock="badge">{children}</span>,
  PixelButton: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  PixelPanel: ({ title, children }: any) => (
    <section data-mock="panel">
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
        <span>{label}</span>
        <span>{String(value)}</span>
        {detail}
      </div>
    ),
    autoGrid: () => ({}),
    teamThemeVars: teamThemeVarsMock,
  };
});

vi.mock('./PlayoffLoreCard', () => ({
  PlayoffLoreCardView: ({ card }: { card: PlayoffLoreCard }) => (
    <article data-mock="playoff-lore-card">
      <span>{card.headline}</span>
      <span>{card.finalScore}</span>
    </article>
  ),
}));

function makeCard(overrides: Partial<PlayoffLoreCard> = {}): PlayoffLoreCard {
  return {
    gameId: 'playoff-2026-19',
    seasonYear: 2026,
    week: 19,
    round: 'wild_card',
    outcome: 'win',
    headline: 'Chicago survives and advances',
    finalScore: '27-24',
    opponentTeamId: 'opp',
    loreHook: 'A late takeaway ended the panic.',
    heroBlocks: [
      { label: 'Spotlight', value: 'Cole Stone // 288 yds, 2 TD' },
      { label: 'Swing', value: 'Turnover edge swung the leverage battle.' },
      { label: 'Arc', value: 'The season kept its pulse.' },
    ],
    tags: ['Cinderella'],
    ...overrides,
  };
}

import { PlayoffLoreDirectory } from './PlayoffLoreDirectory';

describe('PlayoffLoreDirectory', () => {
  it('renders the empty state when no cards are archived', () => {
    aggregateCards = [];

    const markup = renderToStaticMarkup(<PlayoffLoreDirectory />);

    expect(markup).toContain('No playoff lore cards archived yet. Win a playoff game to start filling the vault.');
  });

  it('renders the total cards metric when cards exist', () => {
    aggregateCards = [
      { dynastyId: '123:team-1:2030', seasonYear: 2026, card: makeCard(), source: 'archived' },
      { dynastyId: 'other-dynasty', seasonYear: 2027, card: makeCard({ gameId: 'playoff-2027-20', seasonYear: 2027, week: 20 }), source: 'pending' },
    ];

    const markup = renderToStaticMarkup(<PlayoffLoreDirectory />);

    expect(markup).toMatch(/Total Cards[\s\S]*?2/);
  });

  it('counts only super bowl wins in the summary metric', () => {
    aggregateCards = [
      { dynastyId: '123:team-1:2030', seasonYear: 2026, card: makeCard({ round: 'super_bowl', week: 22, outcome: 'win', gameId: 'sb-win' }), source: 'archived' },
      { dynastyId: '123:team-1:2030', seasonYear: 2025, card: makeCard({ round: 'conference', week: 21, outcome: 'win', gameId: 'conf-win' }), source: 'archived' },
      { dynastyId: 'other-dynasty', seasonYear: 2024, card: makeCard({ round: 'super_bowl', week: 22, outcome: 'loss', gameId: 'sb-loss' }), source: 'pending' },
    ];

    const markup = renderToStaticMarkup(<PlayoffLoreDirectory />);

    expect(markup).toMatch(/Super Bowl Wins[\s\S]*?1/);
  });

  it('renders the sort and filter controls', () => {
    aggregateCards = [
      { dynastyId: '123:team-1:2030', seasonYear: 2026, card: makeCard(), source: 'archived' },
    ];

    const markup = renderToStaticMarkup(<PlayoffLoreDirectory />);

    expect(markup).toContain('Sort:');
    expect(markup).toContain('Year ↓');
    expect(markup).toContain('Round ↓');
    expect(markup).toContain('Outcome');
    expect(markup).toContain('Filter:');
    expect(markup).toContain('Current Dynasty');
    expect(markup).toContain('Wins Only');
    expect(markup).toContain('Super Bowl Only');
  });

  it('links archived playoff lore back into the live playoff push', () => {
    aggregateCards = [
      { dynastyId: '123:team-1:2030', seasonYear: 2026, card: makeCard(), source: 'archived' },
    ];

    const markup = renderToStaticMarkup(<PlayoffLoreDirectory />);

    expect(markup).toContain('Next Playoff Push');
    expect(markup).toContain('see the race');
    expect(markup).toContain('Standings');
    expect(markup).toContain('Schedule');
    expect(markup).toContain('Game Plan');
  });

  it('renders source boundaries for sidecar playoff lore reads', () => {
    aggregateCards = [
      { dynastyId: '123:team-1:2030', seasonYear: 2026, card: makeCard({ headline: 'Archived dynasty win' }), source: 'archived' },
      {
        dynastyId: 'other-dynasty',
        seasonYear: 2027,
        card: makeCard({ gameId: 'pending-card', seasonYear: 2027, week: 20, headline: 'Pending road upset' }),
        source: 'pending',
      },
    ];

    const markup = renderToStaticMarkup(<PlayoffLoreDirectory />);

    expect(markup).toContain('Playoff Lore Sources');
    expect(markup).toContain('deriveDynastyId(game)');
    expect(markup).toContain('mfd.scrapbook.v1');
    expect(markup).toContain('listAllPlayoffLoreCards');
    expect(markup).toContain('1 archived');
    expect(markup).toContain('1 pending');
    expect(markup).toContain('stagePendingPlayoffLoreCard');
    expect(markup).toContain('pendingPlayoffLoreReveal');
    expect(markup).toContain('Opening /franchise/playoff-lore does not write GameState');
  });

  it('shows only current dynasty cards when the current filter is selected', () => {
    aggregateCards = [
      { dynastyId: '123:team-1:2030', seasonYear: 2026, card: makeCard({ headline: 'Current dynasty win' }), source: 'archived' },
      { dynastyId: 'other-dynasty', seasonYear: 2025, card: makeCard({ headline: 'Other dynasty win', gameId: 'other-card' }), source: 'pending' },
    ];

    const markup = renderToStaticMarkup(<PlayoffLoreDirectory initialFilterMode="current" />);

    expect(markup).toContain('Current dynasty win');
    expect(markup).not.toContain('Other dynasty win');
  });

  it('applies team theme vars to each dynasty group wrapper', () => {
    aggregateCards = [
      { dynastyId: '123:team-1:2030', seasonYear: 2026, card: makeCard({ headline: 'Current dynasty win' }), source: 'archived' },
    ];
    teamThemeVarsMock.mockClear();

    const markup = renderToStaticMarkup(<PlayoffLoreDirectory />);

    expect(teamThemeVarsMock).toHaveBeenCalledWith('team-1');
    expect(markup).toContain('--mfd-team-primary:#dd4400');
  });
});
