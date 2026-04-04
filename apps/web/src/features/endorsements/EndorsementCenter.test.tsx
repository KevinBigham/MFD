import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EndorsementCenter } from './EndorsementCenter';

const activeDeal = {
  id: 'deal-1',
  playerId: 'p1',
  brandName: 'Apex Athletics',
  revenuePerYear: 6.4,
  yearsTotal: 3,
  yearsRemaining: 2,
  tier: 'global' as const,
  moraleBonus: 6,
  requirement: { type: 'min_ovr' as const, value: 90 },
  active: true,
};

const offerDeal = {
  id: 'offer-1',
  playerId: 'p2',
  brandName: 'Metro Health',
  revenuePerYear: 1.2,
  yearsTotal: 3,
  yearsRemaining: 3,
  tier: 'regional' as const,
  moraleBonus: 3,
  requirement: { type: 'team_wins' as const, value: 8 },
  active: false,
};

const baseState = () => ({
  team: {
    id: 'team-1',
    city: 'Chicago',
    name: 'Blaze',
    wins: 10,
    franchiseIdentity: { marketSize: 'large' },
    roster: [
      { id: 'p1', name: 'Marcus Cole', ovr: 92 },
      { id: 'p2', name: 'Rico Hale', ovr: 78 },
    ],
  },
  activeDeals: [activeDeal],
  offers: [offerDeal],
  revenue: 6.4,
  phase: 'offseason',
  actions: {
    acceptEndorsement: () => Promise.resolve(),
    declineEndorsement: () => Promise.resolve(),
  },
});

let mockState = baseState();

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.team,
  selectActiveEndorsements: (state: typeof mockState) => state.activeDeals,
  selectEndorsementOffers: (state: typeof mockState) => state.offers,
  selectEndorsementRevenue: (state: typeof mockState) => state.revenue,
  selectPhase: (state: typeof mockState) => state.phase,
}));

describe('EndorsementCenter', () => {
  beforeEach(() => {
    mockState = baseState();
  });

  it('renders the header and total revenue block', () => {
    const markup = renderToStaticMarkup(<EndorsementCenter />);
    expect(markup).toContain('ENDORSEMENT CENTER');
    expect(markup).toContain('$6.4M');
  });

  it('renders active deals in the table', () => {
    const markup = renderToStaticMarkup(<EndorsementCenter />);
    expect(markup).toContain('Apex Athletics');
    expect(markup).toContain('Marcus Cole');
    expect(markup).toContain('OVR 92/90');
  });

  it('renders offseason pending offers', () => {
    const markup = renderToStaticMarkup(<EndorsementCenter />);
    expect(markup).toContain('PENDING OFFERS');
    expect(markup).toContain('METRO HEALTH');
    expect(markup).toContain('Accept');
  });

  it('shows the empty state when no active deals exist', () => {
    mockState.activeDeals = [];
    const markup = renderToStaticMarkup(<EndorsementCenter />);
    expect(markup).toContain('Your players need to shine brighter');
  });

  it('hides pending offers outside the offseason', () => {
    mockState.phase = 'regular_season';
    const markup = renderToStaticMarkup(<EndorsementCenter />);
    expect(markup).not.toContain('Pending Offers');
  });
});
