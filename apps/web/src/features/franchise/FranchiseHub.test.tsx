import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  FranchiseActionReceiptPanel,
  FranchiseHub,
  buildFranchiseActionReceipt,
} from './FranchiseHub';
import { FRANCHISE_HUB_ROUTE_ACTIONS } from './franchiseHubRoutes';

const { navigateToMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
}));

const baseState = () => ({
  team: {
    id: 'team-1',
    city: 'Chicago',
    name: 'Blaze',
    capSpace: 74.5,
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
  selectPowerRankings: () => [],
  selectUserTeamId: (state: typeof mockState) => state.team?.id ?? null,
}));

vi.mock('../shared/pixelUi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../shared/pixelUi')>();
  return {
    ...actual,
    navigateTo: navigateToMock,
  };
});

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
    expect(markup).toContain('Protect the standard');
    expect(markup).toContain('Chronicle');
  });

  it('renders franchise source context and separates write buttons', () => {
    const markup = renderToStaticMarkup(<FranchiseHub />);

    expect(markup).toContain('FRANCHISE SOURCES');
    expect(markup).toContain('DASHBOARD READ MODEL');
    expect(markup).toContain('ACTION BUTTONS SEPARATE');
    expect(markup).toContain('selectFranchiseDashboard');
    expect(markup).toContain('selectUserTeam');
    expect(markup).toContain('selectFranchiseEras');
    expect(markup).toContain('selectStadiumDealOffers');
    expect(markup).toContain('selectCanRelocate');
    expect(markup).toContain('buildCoachingLegacy');
    expect(markup).toContain('upgradeStadium');
    expect(markup).toContain('acceptNamingRights');
    expect(markup).toContain('/relocate');
    expect(markup).toContain('Opening Franchise Hub does not upgrade the stadium');
    expect(markup).toContain('on-screen confirmation after the saved action resolves');
    expect(markup).toContain('change the live save');
    expect(markup).toContain('play scheduled games');
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

  it('renders the Playoff Lore and Dynasty Chronicle tiles before Dynasty Scrapbook', () => {
    const markup = renderToStaticMarkup(<FranchiseHub />);

    expect(markup).toContain('Playoff Lore');
    expect(markup).toContain('Dynasty Chronicle');
    expect(markup.indexOf('Hall of Fame')).toBeLessThan(markup.indexOf('Playoff Lore'));
    expect(markup.indexOf('Playoff Lore')).toBeLessThan(markup.indexOf('Dynasty Chronicle'));
    expect(markup.indexOf('Dynasty Chronicle')).toBeLessThan(markup.indexOf('Dynasty Scrapbook'));
  });

  it('renders the Rivalries panel', () => {
    const markup = renderToStaticMarkup(<FranchiseHub />);

    expect(markup).toContain('RIVALRIES');
  });

  it('wires route actions for franchise archive tiles', () => {
    FRANCHISE_HUB_ROUTE_ACTIONS.scrapbook();
    expect(navigateToMock).toHaveBeenCalledWith('/franchise/scrapbook');

    FRANCHISE_HUB_ROUTE_ACTIONS.playoffLore();
    expect(navigateToMock).toHaveBeenCalledWith('/franchise/playoff-lore');

    FRANCHISE_HUB_ROUTE_ACTIONS.chronicle();
    expect(navigateToMock).toHaveBeenCalledWith('/franchise/chronicle');
  });

  it('builds and renders route-local franchise action receipts', () => {
    const upgradeReceipt = buildFranchiseActionReceipt({
      type: 'stadium_upgrade',
      teamName: 'Chicago Blaze',
      stadiumName: 'Nexus Dome',
      levelBefore: 2,
      capSpaceBefore: 74.5,
    });

    expect(upgradeReceipt.title).toBe('Stadium Upgrade Receipt');
    expect(upgradeReceipt.result).toContain('level 2 -> 3');
    expect(upgradeReceipt.detail).toContain('$74.5M');
    expect(upgradeReceipt.detail).toContain('$150.0M');
    expect(upgradeReceipt.source).toContain('actions.upgradeStadium -> game-store upgradeStadium');
    expect(upgradeReceipt.stateTouched).toContain('team.franchiseIdentity stadium level/prestige');

    const namingReceipt = buildFranchiseActionReceipt({
      type: 'naming_rights',
      teamName: 'Chicago Blaze',
      deal: mockState.offers[0]!,
      dealIndex: 0,
    });

    expect(namingReceipt.title).toBe('Naming Rights Receipt');
    expect(namingReceipt.result).toContain('TechNova Field accepted');
    expect(namingReceipt.detail).toContain('$8.4M per year');
    expect(namingReceipt.source).toContain('actions.acceptNamingRights -> game-store acceptNamingRights');
    expect(namingReceipt.stateTouched).toContain('game.stadiumDealOffers is cleared');

    const markup = renderToStaticMarkup(<FranchiseActionReceiptPanel receipt={namingReceipt} />);

    expect(markup).toContain('NAMING RIGHTS RECEIPT');
    expect(markup).toContain('ON-SCREEN CONFIRMATION');
    expect(markup).toContain('Chicago Blaze // offer 1');
    expect(markup).toContain('actions.acceptNamingRights -&gt; game-store acceptNamingRights');
    expect(markup).toContain('not saved separately');
  });
});
