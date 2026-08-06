import { describe, it, expect } from 'vitest';
import { computeHubBadges, computeNavBadges } from './navBadges';
import { DEPTH_CHART_FIELD_STARTER_TARGET } from '../lib/depth-chart-starters';

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
      starterCount: DEPTH_CHART_FIELD_STARTER_TARGET - 7,
      hasGamePlan: true,
      phase: 'offseason',
      activeHandshakeCount: 0,
    });
    expect(badges['/depth-chart']).toBe(7);
  });

  it('returns game-plan badge during playable weeks when no plan exists', () => {
    const regularSeasonBadges = computeNavBadges({
      tradeOfferCount: 0,
      starterCount: 22,
      hasGamePlan: false,
      phase: 'regular_season',
      activeHandshakeCount: 0,
    });
    const playoffBadges = computeNavBadges({
      tradeOfferCount: 0,
      starterCount: 22,
      hasGamePlan: false,
      phase: 'playoffs',
      activeHandshakeCount: 0,
    });

    expect(regularSeasonBadges['/game-plan']).toBe(1);
    expect(playoffBadges['/game-plan']).toBe(1);
  });

  it('does not badge game plan outside regular season or playoffs', () => {
    const badges = computeNavBadges({
      tradeOfferCount: 0,
      starterCount: 22,
      hasGamePlan: false,
      phase: 'offseason',
      activeHandshakeCount: 0,
    });

    expect(badges['/game-plan']).toBeUndefined();
  });

  it('returns handshake badge for active promises', () => {
    const badges = computeNavBadges({
      tradeOfferCount: 0,
      starterCount: 22,
      hasGamePlan: true,
      phase: 'regular_season',
      activeHandshakeCount: 4,
    });

    expect(badges['/handshakes']).toBe(4);
  });

  it('keeps shell badges scoped to nav urgency routes', () => {
    const badges = computeNavBadges({
      tradeOfferCount: 2,
      starterCount: 20,
      hasGamePlan: false,
      phase: 'regular_season',
      activeHandshakeCount: 3,
    });

    expect(badges).toEqual({
      '/trades': 2,
      '/depth-chart': 2,
      '/game-plan': 1,
      '/handshakes': 3,
    });
    expect(badges['/inbox']).toBeUndefined();
  });

  it('returns empty object when everything is clear', () => {
    const badges = computeNavBadges({
      tradeOfferCount: 0,
      starterCount: DEPTH_CHART_FIELD_STARTER_TARGET,
      hasGamePlan: true,
      phase: 'regular_season',
      activeHandshakeCount: 0,
    });
    expect(Object.keys(badges).length).toBe(0);
  });
});

describe('computeHubBadges', () => {
  it('rolls every shell badge up to its hub', () => {
    const badges = computeNavBadges({
      tradeOfferCount: 2,
      starterCount: 20,
      hasGamePlan: false,
      phase: 'regular_season',
      activeHandshakeCount: 3,
    });

    // /trades -> Office; /depth-chart and /handshakes -> Team; /game-plan -> Game.
    expect(computeHubBadges(badges)).toEqual({ office: 2, team: 5, game: 1 });
  });

  it('sums routes that share a hub instead of overwriting them', () => {
    expect(computeHubBadges({ '/depth-chart': 2, '/handshakes': 3, '/roster': 1 }))
      .toEqual({ team: 6 });
  });

  it('drops counts it cannot attribute rather than guessing a hub', () => {
    expect(computeHubBadges({ '/not-a-route': 9 })).toEqual({});
    expect(computeHubBadges({ '/trades': 0, '/handshakes': -1 })).toEqual({});
  });

  it('returns nothing when there is nothing to badge', () => {
    expect(computeHubBadges({})).toEqual({});
  });
});
