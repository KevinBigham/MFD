import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { CareerMeta } from '../../lib/career-meta';

const { navigateToMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
}));

const franchiseState = {
  team: {
    id: 'team-1',
    city: 'Chicago',
    name: 'Blaze',
  },
  dashboard: {
    identity: {
      fanbase: 82,
      prestige: 77,
      marketSize: 'large',
      marketModifier: 1.1,
      stadiumName: 'Nexus Dome',
      stadiumDeal: { sponsorName: 'Nexus Dome', revenuePerYear: 11, yearsTotal: 4, yearsRemaining: 2, prestigeBonus: 4 },
      stadiumLevel: 2,
      attendance: 91,
      relocationHistory: [],
    },
    allTimeRecord: { wins: 112, losses: 58, ties: 0, winPct: 0.659 },
    championships: 3,
    playoffAppearances: 8,
    activeStreaks: { winningSeasons: 4, playoffStreak: 5, losingSeasons: 0 },
    topLegends: [],
    currentDecadeTeam: null,
    stadiumDealStatus: 'active',
    fanbaseTrend: [63, 68, 73, 79, 82],
    prestigeTrend: [59, 64, 69, 74, 77],
    currentEra: { name: 'Dynasty Era', startYear: 2029, description: 'A sustained title window is defining the club.' },
    earnedDoctrines: [],
    doctrineGroups: {
      culture: [],
      strategy: [],
      reputation: [],
      personnel: [],
    },
  },
  eras: [],
  offers: [],
  canRelocate: true,
  actions: {
    acceptNamingRights: () => Promise.resolve(),
    upgradeStadium: () => Promise.resolve(),
  },
};

let mockMeta: CareerMeta = {
  schemaVersion: 1 as const,
  dynasties: [],
  careerTotals: {
    dynasties: 0,
    seasonsCoached: 0,
    wins: 0,
    losses: 0,
    ties: 0,
    championships: 0,
    playoffAppearances: 0,
    breakoutsDeveloped: 0,
  },
};

vi.mock('../../lib/career-meta', () => ({
  readCareerMeta: () => mockMeta,
}));

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof franchiseState) => unknown) => selector(franchiseState),
  selectCanRelocate: (state: typeof franchiseState) => state.canRelocate,
  selectFranchiseDashboard: (state: typeof franchiseState) => state.dashboard,
  selectFranchiseEras: (state: typeof franchiseState) => state.eras,
  selectStadiumDealOffers: (state: typeof franchiseState) => state.offers,
  selectUserTeam: (state: typeof franchiseState) => state.team,
}));

vi.mock('@mfd/design-system/components', () => ({
  PixelBadge: ({ children }: any) => <span>{children}</span>,
  PixelPanel: ({ title, children }: any) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
  PixelButton: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('../shared/pixelUi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../shared/pixelUi')>();
  return {
    ...actual,
    navigateTo: navigateToMock,
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
  };
});

import { GmCareer } from './GmCareer';
import { FranchiseHub } from './FranchiseHub';

function flattenText(children: unknown): string {
  if (Array.isArray(children)) {
    return children.map((child) => flattenText(child)).join('');
  }
  if (children == null || typeof children === 'boolean') return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (typeof children === 'object' && children && 'props' in children) {
    return flattenText((children as { props?: { children?: unknown } }).props?.children);
  }
  return '';
}

function findButtonByText(node: unknown, text: string): { props?: { onClick?: () => void; children?: unknown } } | null {
  if (!node || typeof node !== 'object') return null;
  const element = node as { type?: unknown; props?: { children?: unknown; onClick?: () => void } };
  if (typeof element.type === 'function') {
    return findButtonByText(element.type(element.props ?? {}), text);
  }
  if (element.type === 'button' && flattenText(element.props?.children).includes(text)) {
    return element;
  }

  const children = element.props?.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findButtonByText(child, text);
      if (found) return found;
    }
    return null;
  }

  return findButtonByText(children, text);
}

describe('GmCareer', () => {
  it('renders the empty state without crashing', () => {
    mockMeta = {
      schemaVersion: 1,
      dynasties: [],
      careerTotals: {
        dynasties: 0,
        seasonsCoached: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        championships: 0,
        playoffAppearances: 0,
        breakoutsDeveloped: 0,
      },
    };

    const markup = renderToStaticMarkup(<GmCareer />);

    expect(markup).toContain('No dynasties yet');
  });

  it('lists dynasties in most-recent-first order', () => {
    mockMeta = {
      schemaVersion: 1,
      dynasties: [
        {
          dynastyId: 'first',
          teamId: 't1',
          teamCity: 'Chicago',
          teamName: 'Blaze',
          teamAbbr: 'CHI',
          startYear: 2026,
          endYear: 2027,
          seasonsCoached: 2,
          wins: 23,
          losses: 11,
          ties: 0,
          championships: 1,
          playoffAppearances: 2,
          breakoutsDeveloped: 1,
        },
        {
          dynastyId: 'second',
          teamId: 't2',
          teamCity: 'Houston',
          teamName: 'Orbit',
          teamAbbr: 'HOU',
          startYear: 2029,
          endYear: null,
          seasonsCoached: 1,
          wins: 11,
          losses: 6,
          ties: 0,
          championships: 0,
          playoffAppearances: 1,
          breakoutsDeveloped: 2,
        },
      ],
      careerTotals: {
        dynasties: 2,
        seasonsCoached: 3,
        wins: 34,
        losses: 17,
        ties: 0,
        championships: 1,
        playoffAppearances: 3,
        breakoutsDeveloped: 3,
      },
    };

    const markup = renderToStaticMarkup(<GmCareer />);

    expect(markup.indexOf('Houston Orbit')).toBeLessThan(markup.indexOf('Chicago Blaze'));
  });

  it('renders career totals from the summed dynasty entries', () => {
    mockMeta = {
      schemaVersion: 1,
      dynasties: [
        {
          dynastyId: 'first',
          teamId: 't1',
          teamCity: 'Chicago',
          teamName: 'Blaze',
          teamAbbr: 'CHI',
          startYear: 2026,
          endYear: 2027,
          seasonsCoached: 2,
          wins: 23,
          losses: 11,
          ties: 0,
          championships: 1,
          playoffAppearances: 2,
          breakoutsDeveloped: 1,
        },
      ],
      careerTotals: {
        dynasties: 1,
        seasonsCoached: 2,
        wins: 23,
        losses: 11,
        ties: 0,
        championships: 1,
        playoffAppearances: 2,
        breakoutsDeveloped: 1,
      },
    };

    const markup = renderToStaticMarkup(<GmCareer />);

    expect(markup).toContain('Career Record');
    expect(markup).toContain('23-11');
    expect(markup).toContain('1 dynasty');
  });

  it('renders HOFers Developed and Coaches Developed tallies from career totals', () => {
    mockMeta = {
      schemaVersion: 1,
      dynasties: [
        {
          dynastyId: 'first',
          teamId: 't1',
          teamCity: 'Chicago',
          teamName: 'Blaze',
          teamAbbr: 'CHI',
          startYear: 2026,
          endYear: 2030,
          seasonsCoached: 5,
          wins: 60,
          losses: 25,
          ties: 0,
          championships: 2,
          playoffAppearances: 4,
          breakoutsDeveloped: 3,
          coachesDeveloped: 2,
          hallOfFamersDeveloped: 4,
        },
      ],
      careerTotals: {
        dynasties: 1,
        seasonsCoached: 5,
        wins: 60,
        losses: 25,
        ties: 0,
        championships: 2,
        playoffAppearances: 4,
        breakoutsDeveloped: 3,
        coachesDeveloped: 2,
        hallOfFamersDeveloped: 4,
      },
    };

    const markup = renderToStaticMarkup(<GmCareer />);

    expect(markup).toContain('HOFers Developed');
    expect(markup).toContain('Coaches Developed');
    expect(markup).toContain('First team was yours at induction');
    expect(markup).toContain('Assistants promoted to HC');
  });

  it('falls back to 0 for legacy totals missing the new counters', () => {
    mockMeta = {
      schemaVersion: 1,
      dynasties: [],
      careerTotals: {
        dynasties: 0,
        seasonsCoached: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        championships: 0,
        playoffAppearances: 0,
        breakoutsDeveloped: 0,
      },
    };

    const markup = renderToStaticMarkup(<GmCareer />);

    expect(markup).toContain('No dynasties yet');
  });

  it('computes the longest dynasty legacy stat correctly', () => {
    mockMeta = {
      schemaVersion: 1,
      dynasties: [
        {
          dynastyId: 'first',
          teamId: 't1',
          teamCity: 'Chicago',
          teamName: 'Blaze',
          teamAbbr: 'CHI',
          startYear: 2026,
          endYear: 2029,
          seasonsCoached: 4,
          wins: 45,
          losses: 23,
          ties: 0,
          championships: 2,
          playoffAppearances: 3,
          breakoutsDeveloped: 2,
        },
        {
          dynastyId: 'second',
          teamId: 't2',
          teamCity: 'Houston',
          teamName: 'Orbit',
          teamAbbr: 'HOU',
          startYear: 2030,
          endYear: 2031,
          seasonsCoached: 2,
          wins: 19,
          losses: 15,
          ties: 0,
          championships: 0,
          playoffAppearances: 1,
          breakoutsDeveloped: 1,
        },
      ],
      careerTotals: {
        dynasties: 2,
        seasonsCoached: 6,
        wins: 64,
        losses: 38,
        ties: 0,
        championships: 2,
        playoffAppearances: 4,
        breakoutsDeveloped: 3,
      },
    };

    const markup = renderToStaticMarkup(<GmCareer />);

    expect(markup).toContain('Longest Dynasty');
    expect(markup).toContain('4');
  });

  it('uses PixelScreenHeader and PixelMetricCard instead of custom components', () => {
    const markup = renderToStaticMarkup(<GmCareer />);

    expect(markup).toContain('data-mock="screen-header"');
    expect(markup).toContain('data-mock="metric-card"');
  });

  it('FranchiseHub wires the GM Career tile to /franchise/career', () => {
    const tree = FranchiseHub();
    const button = findButtonByText(tree, 'View GM Career');

    expect(button).not.toBeNull();
    button?.props?.onClick?.();
    expect(navigateToMock).toHaveBeenCalledWith('/franchise/career');
  });
});
