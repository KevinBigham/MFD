import { describe, expect, it } from 'vitest';
import {
  getAgingMultiplier,
  getTrustArrow,
  getTrustArrowLabel,
  leagueSnapshot,
} from './trust-aging';

describe('trust-aging direct coverage', () => {
  it('maps trust deltas onto the expected directional arrows', () => {
    expect(getTrustArrow(70, 64)).toBe('big_gain');
    expect(getTrustArrow(62, 60)).toBe('small_gain');
    expect(getTrustArrow(50, 50)).toBe('flat');
    expect(getTrustArrow(38, 40)).toBe('small_loss');
    expect(getTrustArrow(30, 36)).toBe('big_loss');
  });

  it('returns user-facing labels for each trust trend arrow', () => {
    expect(getTrustArrowLabel('big_gain')).toBe('Rising Fast');
    expect(getTrustArrowLabel('small_gain')).toBe('Trending Up');
    expect(getTrustArrowLabel('flat')).toBe('Stable');
    expect(getTrustArrowLabel('small_loss')).toBe('Trending Down');
    expect(getTrustArrowLabel('big_loss')).toBe('Falling Fast');
  });

  it('returns a neutral snapshot when no trade state is available', () => {
    expect(leagueSnapshot(null, [])).toEqual({
      avgTrust: 50,
      reputation: 'Neutral',
      tiers: { high: 0, mid: 0, low: 0 },
      friendliest: null,
      coldest: null,
      recentPattern: { fleeceCount: 0, fairCount: 0, overpayCount: 0 },
    });
  });

  it('identifies legendary trust profiles and tracks the hottest and coldest partners', () => {
    const snapshot = leagueSnapshot({
      gmTrustByTeam: { alpha: 92, beta: 78, gamma: 68 },
      recentTrades: [],
    }, []);

    expect(snapshot.avgTrust).toBe(79);
    expect(snapshot.reputation).toBe('Legendary');
    expect(snapshot.tiers).toEqual({ high: 3, mid: 0, low: 0 });
    expect(snapshot.friendliest).toBe('alpha');
    expect(snapshot.coldest).toBe('gamma');
  });

  it('marks low-trust profiles as blacklisted', () => {
    const snapshot = leagueSnapshot({
      gmTrustByTeam: { alpha: 15, beta: 20, gamma: 25 },
      recentTrades: [],
    }, []);

    expect(snapshot.reputation).toBe('Blacklisted');
    expect(snapshot.tiers.low).toBe(3);
  });

  it('elevates fleece-heavy histories into a shark reputation', () => {
    const snapshot = leagueSnapshot({
      gmTrustByTeam: { alpha: 55, beta: 53, gamma: 52 },
      recentTrades: [
        { classification: 'fleece' },
        { classification: 'fleece' },
      ],
    }, []);

    expect(snapshot.reputation).toBe('Shark');
    expect(snapshot.recentPattern.fleeceCount).toBe(2);
  });

  it('elevates fair-dealing histories once enough balanced trades accrue', () => {
    const snapshot = leagueSnapshot({
      gmTrustByTeam: { alpha: 55, beta: 52, gamma: 50 },
      recentTrades: [
        { classification: 'fair' },
        { classification: 'fair' },
        { classification: 'fair' },
      ],
    }, []);

    expect(snapshot.reputation).toBe('Fair Dealer');
    expect(snapshot.recentPattern.fairCount).toBe(3);
  });

  it('applies mental-rating aging rules across peak and late-career phases', () => {
    expect(getAgingMultiplier('awareness', 'peak')).toBe(-0.5);
    expect(getAgingMultiplier('awareness', 'prime')).toBe(0.3);
    expect(getAgingMultiplier('awareness', 'decline')).toBe(0);
    expect(getAgingMultiplier('awareness', 'twilight')).toBe(0.3);
  });

  it('scales physical decline by positional weight', () => {
    expect(getAgingMultiplier('speed', 'peak', 3)).toBe(0);
    expect(getAgingMultiplier('speed', 'prime', 6)).toBe(1.5);
    expect(getAgingMultiplier('speed', 'prime', 4)).toBe(2);
    expect(getAgingMultiplier('speed', 'twilight', 4)).toBe(2);
  });

  it('only applies technique decay in decline and twilight phases', () => {
    expect(getAgingMultiplier('routeRunning', 'peak')).toBe(0);
    expect(getAgingMultiplier('routeRunning', 'prime')).toBe(0);
    expect(getAgingMultiplier('routeRunning', 'decline')).toBe(0.5);
    expect(getAgingMultiplier('routeRunning', 'twilight')).toBe(0.5);
  });
});
