import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FranchiseHub } from './FranchiseHub';

const { navigateToMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
}));

const baseState = () => ({
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
    topLegends: [
      { playerId: 'p1', playerName: 'Cole Stone', pos: 'QB', legacyScore: 96.2, tenureYears: 9, peakOvr: 94, championships: 3, mvps: 2, allPros: 5, proBowls: 6, hallOfFame: true, careerHighlights: ['2x League MVP', 'Franchise all-time passYds leader (52,340)'] },
    ],
    currentDecadeTeam: null,
    stadiumDealStatus: 'active',
    fanbaseTrend: [63, 68, 73, 79, 82],
    prestigeTrend: [59, 64, 69, 74, 77],
    currentEra: { name: 'Dynasty Era', startYear: 2029, description: 'A sustained title window is defining the club.' },
    earnedDoctrines: [
      {
        id: 'cap_wizardry',
        name: 'Cap Wizardry',
        description: 'The franchise has mastered salary cap management.',
        origin: 'Maintained 15%+ cap space for 3 consecutive years',
        bonus: 'Restructure savings +10%.',
        category: 'strategy',
        earnedYear: 2028,
        earnedWeek: 18,
      },
      {
        id: 'championship_dna',
        name: 'Championship DNA',
        description: 'Multiple championships have created a winning culture that attracts talent.',
        origin: 'Won 2+ Super Bowls',
        bonus: 'Free agent signing bonus: +5 desirability rating.',
        category: 'reputation',
        earnedYear: 2029,
        earnedWeek: 22,
      },
    ],
    doctrineGroups: {
      culture: [],
      strategy: [
        {
          id: 'cap_wizardry',
          name: 'Cap Wizardry',
          description: 'The franchise has mastered salary cap management.',
          origin: 'Maintained 15%+ cap space for 3 consecutive years',
          bonus: 'Restructure savings +10%.',
          category: 'strategy',
          earnedYear: 2028,
          earnedWeek: 18,
        },
      ],
      reputation: [
        {
          id: 'championship_dna',
          name: 'Championship DNA',
          description: 'Multiple championships have created a winning culture that attracts talent.',
          origin: 'Won 2+ Super Bowls',
          bonus: 'Free agent signing bonus: +5 desirability rating.',
          category: 'reputation',
          earnedYear: 2029,
          earnedWeek: 22,
        },
      ],
      personnel: [],
    },
  },
  eras: [
    { name: 'Dark Ages', startYear: 2024, endYear: 2026, description: 'Lean years.' },
    { name: 'Dynasty Era', startYear: 2029, endYear: null, description: 'A sustained title window is defining the club.' },
  ],
  offers: [
    { sponsorName: 'TechNova Field', revenuePerYear: 8.4, yearsTotal: 5, yearsRemaining: 5, prestigeBonus: 3 },
    { sponsorName: 'Velocity Park', revenuePerYear: 10.2, yearsTotal: 4, yearsRemaining: 4, prestigeBonus: 5 },
  ],
  canRelocate: true,
  actions: {
    acceptNamingRights: () => Promise.resolve(),
    upgradeStadium: () => Promise.resolve(),
  },
});

let mockState = baseState();

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectCanRelocate: (state: typeof mockState) => state.canRelocate,
  selectFranchiseDashboard: (state: typeof mockState) => state.dashboard,
  selectFranchiseEras: (state: typeof mockState) => state.eras,
  selectStadiumDealOffers: (state: typeof mockState) => state.offers,
  selectUserTeam: (state: typeof mockState) => state.team,
}));

vi.mock('../shared/pixelUi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../shared/pixelUi')>();
  return {
    ...actual,
    navigateTo: navigateToMock,
  };
});

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

describe('FranchiseHub', () => {
  beforeEach(() => {
    mockState = baseState();
    navigateToMock.mockReset();
  });

  it('renders the franchise header with current stadium identity', () => {
    const markup = renderToStaticMarkup(<FranchiseHub />);
    expect(markup).toContain('YOUR FRANCHISE');
    expect(markup).toContain('Nexus Dome');
    expect(markup).toContain('LARGE MARKET');
  });

  it('shows fanbase, prestige, and attendance gauges', () => {
    const markup = renderToStaticMarkup(<FranchiseHub />);
    expect(markup).toContain('Fanbase');
    expect(markup).toContain('Prestige');
    expect(markup).toContain('Attendance');
  });

  it('renders the era timeline and top legend card', () => {
    const markup = renderToStaticMarkup(<FranchiseHub />);
    expect(markup).toContain('DYNASTY ERA');
    expect(markup).toContain('COLE STONE');
    expect(markup).toContain('96.2');
  });

  it('lists naming rights offers when they are available', () => {
    const markup = renderToStaticMarkup(<FranchiseHub />);
    expect(markup).toContain('TECHNOVA FIELD');
    expect(markup).toContain('VELOCITY PARK');
    expect(markup).toContain('Accept');
  });

  it('renders earned doctrines with origin and bonus details', () => {
    const markup = renderToStaticMarkup(<FranchiseHub />);
    expect(markup).toContain('FRANCHISE DOCTRINES');
    expect(markup).toContain('Cap Wizardry');
    expect(markup).toContain('Championship DNA');
    expect(markup).toContain('Restructure savings +10%.');
    expect(markup).toContain('Earned Y2029 // W22');
  });

  it('shows the empty naming rights state when there are no offers', () => {
    mockState.offers = [];
    const markup = renderToStaticMarkup(<FranchiseHub />);
    expect(markup).toContain('No fresh offers are on the desk');
  });

  it('shows a stable empty state when no doctrines are unlocked', () => {
    mockState.dashboard.earnedDoctrines = [];
    mockState.dashboard.doctrineGroups = {
      culture: [],
      strategy: [],
      reputation: [],
      personnel: [],
    };
    const markup = renderToStaticMarkup(<FranchiseHub />);
    expect(markup).toContain('FRANCHISE DOCTRINES');
    expect(markup).toContain('No doctrines unlocked yet');
  });

  it('renders the Dynasty Scrapbook tile after GM Career', () => {
    const markup = renderToStaticMarkup(<FranchiseHub />);

    expect(markup.indexOf('GM Career')).toBeLessThan(markup.indexOf('Dynasty Scrapbook'));
  });

  it('renders the Playoff Lore tile between Hall of Fame and Dynasty Scrapbook', () => {
    const markup = renderToStaticMarkup(<FranchiseHub />);

    expect(markup).toContain('Playoff Lore');
    expect(markup.indexOf('Hall of Fame')).toBeLessThan(markup.indexOf('Playoff Lore'));
    expect(markup.indexOf('Playoff Lore')).toBeLessThan(markup.indexOf('Dynasty Scrapbook'));
  });

  it('navigates to the scrapbook route from the Dynasty Scrapbook tile', () => {
    const button = findButtonByText(<FranchiseHub />, 'View Dynasty Scrapbook');

    expect(button).not.toBeNull();
    button?.props?.onClick?.();

    expect(navigateToMock).toHaveBeenCalledWith('/franchise/scrapbook');
  });

  it('navigates to the playoff lore route from the Playoff Lore tile', () => {
    const button = findButtonByText(<FranchiseHub />, 'Open Playoff Lore');

    expect(button).not.toBeNull();
    button?.props?.onClick?.();

    expect(navigateToMock).toHaveBeenCalledWith('/franchise/playoff-lore');
  });
});
