import { describe, it, expect } from 'vitest';
import { computeNavBadges } from './navBadges';

describe('computeNavBadges', () => {
  it('returns trade badge when trade offers exist', () => {
    const badges = computeNavBadges({
      tradeOfferCount: 3,
      starterCount: 22,
      hasGamePlan: true,
      phase: 'offseason',
      activeHandshakeCount: 0,
    });
    expect(badges['/trades']).toBe(3);
  });

  it('returns depth-chart badge when starters < 22', () => {
    const badges = computeNavBadges({
      tradeOfferCount: 0,
      starterCount: 15,
      hasGamePlan: true,
      phase: 'offseason',
      activeHandshakeCount: 0,
    });
    expect(badges['/depth-chart']).toBe(7);
  });

  it('returns empty object when everything is clear', () => {
    const badges = computeNavBadges({
      tradeOfferCount: 0,
      starterCount: 22,
      hasGamePlan: true,
      phase: 'regular_season',
      activeHandshakeCount: 0,
    });
    expect(Object.keys(badges).length).toBe(0);
  });
});
