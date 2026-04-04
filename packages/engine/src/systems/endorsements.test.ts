import { describe, expect, it } from 'vitest';
import {
  acceptEndorsement,
  generateEndorsementOffers,
  getEndorsementRevenue,
  tickEndorsements,
} from './endorsements';
import { makeTeam } from './test-helpers';

describe('endorsement system', () => {
  it('only generates offers for players meeting brand thresholds', () => {
    const team = makeTeam('endorse', 'AFC', 'East', true, 78);
    team.roster[0]!.ovr = 92;
    team.roster[1]!.ovr = 68;

    const offers = generateEndorsementOffers(team, team.roster, () => 0.2);

    expect(offers.every((offer) => offer.playerId === team.roster[0]!.id)).toBe(true);
  });

  it('applies market size multipliers to offer revenue', () => {
    const small = makeTeam('small', 'AFC', 'East', true, 84);
    const mega = makeTeam('mega', 'AFC', 'East', true, 84);
    const playerSmall = small.roster[0]!;
    const playerMega = mega.roster[0]!;
    playerSmall.ovr = 92;
    playerMega.ovr = 92;
    small.franchiseIdentity.marketSize = 'small';
    mega.franchiseIdentity.marketSize = 'mega';

    const smallOffers = generateEndorsementOffers(small, [playerSmall], () => 0.2);
    const megaOffers = generateEndorsementOffers(mega, [playerMega], () => 0.2);
    const smallApex = smallOffers.find((offer) => offer.brandName === 'Apex Athletics')!;
    const megaApex = megaOffers.find((offer) => offer.brandName === 'Apex Athletics')!;

    expect(megaApex.revenuePerYear).toBeGreaterThan(smallApex.revenuePerYear);
  });

  it('drops deals when players fail the requirement', () => {
    const team = makeTeam('loss', 'AFC', 'East', true, 84);
    const player = team.roster[0]!;
    player.ovr = 85;
    player.endorsements = [{
      id: 'deal-1',
      playerId: player.id,
      brandName: 'Apex Athletics',
      revenuePerYear: 8,
      yearsTotal: 3,
      yearsRemaining: 2,
      tier: 'global',
      moraleBonus: 6,
      requirement: { type: 'min_ovr', value: 90 },
      active: true,
    }];

    const summary = tickEndorsements(team, { wins: 7, losses: 10 }, () => 0.8);

    expect(summary.lostDeals).toHaveLength(1);
    expect(player.endorsements).toHaveLength(0);
  });

  it('renews expired deals deterministically when the RNG hits', () => {
    const team = makeTeam('renew', 'AFC', 'East', true, 84);
    const player = team.roster[0]!;
    player.ovr = 91;
    player.endorsements = [{
      id: 'deal-1',
      playerId: player.id,
      brandName: 'Apex Athletics',
      revenuePerYear: 8,
      yearsTotal: 3,
      yearsRemaining: 1,
      tier: 'global',
      moraleBonus: 6,
      requirement: { type: 'min_ovr', value: 90 },
      active: true,
    }];

    const summary = tickEndorsements(team, { wins: 11, losses: 6 }, () => 0.4);

    expect(summary.expiredDeals).toHaveLength(1);
    expect(summary.renewedDeals).toHaveLength(1);
    expect(player.endorsements[0]?.yearsRemaining).toBe(3);
  });

  it('enforces the two-deal maximum when accepting endorsements', () => {
    const team = makeTeam('cap', 'AFC', 'East', true, 84);
    const player = team.roster[0]!;
    player.endorsements = [
      {
        id: 'deal-1',
        playerId: player.id,
        brandName: 'Shield Insurance',
        revenuePerYear: 3,
        yearsTotal: 3,
        yearsRemaining: 2,
        tier: 'national',
        moraleBonus: 4,
        requirement: { type: 'min_ovr', value: 80 },
        active: true,
      },
      {
        id: 'deal-2',
        playerId: player.id,
        brandName: 'Metro Health',
        revenuePerYear: 1,
        yearsTotal: 3,
        yearsRemaining: 2,
        tier: 'regional',
        moraleBonus: 3,
        requirement: { type: 'team_wins', value: 8 },
        active: true,
      },
    ];

    acceptEndorsement(player, {
      id: 'deal-3',
      playerId: player.id,
      brandName: 'Corner Deli',
      revenuePerYear: 0.5,
      yearsTotal: 2,
      yearsRemaining: 2,
      tier: 'local',
      moraleBonus: 2,
      requirement: { type: 'team_wins', value: 8 },
      active: false,
    });

    expect(player.endorsements).toHaveLength(2);
  });

  it('sums endorsement revenue across active deals', () => {
    const total = getEndorsementRevenue([
      { id: 'd1', playerId: 'p1', brandName: 'A', revenuePerYear: 1.2, yearsTotal: 1, yearsRemaining: 1, tier: 'regional', moraleBonus: 3, requirement: { type: 'team_wins', value: 8 }, active: true },
      { id: 'd2', playerId: 'p2', brandName: 'B', revenuePerYear: 4.8, yearsTotal: 1, yearsRemaining: 1, tier: 'national', moraleBonus: 4, requirement: { type: 'min_ovr', value: 82 }, active: true },
      { id: 'd3', playerId: 'p3', brandName: 'C', revenuePerYear: 2.5, yearsTotal: 1, yearsRemaining: 1, tier: 'global', moraleBonus: 6, requirement: { type: 'min_ovr', value: 90 }, active: false },
    ]);

    expect(total).toBe(6);
  });
});
