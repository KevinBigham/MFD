import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../rng';
import {
  createNearMissTracker,
  recordDeclinedTrade,
  recordPassedPick,
  recordMissedFA,
  generateNearMissReceipts,
  hasNotableNearMisses,
} from './near-miss-receipts';

function seededRng(seed = 42) {
  return mulberry32(seed);
}

describe('Near-Miss Receipts', () => {
  it('creates an empty tracker', () => {
    const tracker = createNearMissTracker();
    expect(tracker.declinedTrades).toHaveLength(0);
    expect(tracker.passedPicks).toHaveLength(0);
    expect(tracker.missedFAs).toHaveLength(0);
  });

  it('records and generates declined trade receipts', () => {
    const tracker = createNearMissTracker();
    recordDeclinedTrade(tracker, {
      playerName: 'Star QB',
      playerOvr: 88,
      partnerTeamName: 'KC BBQ Fountains',
      week: 6,
    });
    const receipts = generateNearMissReceipts(seededRng(), tracker);
    expect(receipts.length).toBe(1);
    expect(receipts[0]!.type).toBe('declined_trade');
    expect(receipts[0]!.description).toContain('Star QB');
  });

  it('records and generates passed pick receipts', () => {
    const tracker = createNearMissTracker();
    recordPassedPick(tracker, {
      playerName: 'Rookie Stud',
      playerOvr: 78,
      round: 1,
      pickNumber: 15,
      draftedByTeam: 'CHI Deep-Dish',
    });
    const receipts = generateNearMissReceipts(seededRng(), tracker);
    expect(receipts.length).toBe(1);
    expect(receipts[0]!.outcome).toContain('CHI Deep-Dish');
  });

  it('records and generates missed FA receipts', () => {
    const tracker = createNearMissTracker();
    recordMissedFA(tracker, {
      playerName: 'Free Agent Star',
      playerOvr: 85,
      signedWithTeam: 'LA Traffic Jams',
      position: 'DE',
    });
    const receipts = generateNearMissReceipts(seededRng(), tracker);
    expect(receipts.length).toBe(1);
    expect(receipts[0]!.type).toBe('missed_fa');
    expect(receipts[0]!.description).toContain('missed out on Free Agent Star');
    expect(receipts[0]!.outcome).toContain('after the market closed');
  });

  it('filters out low-OVR near misses', () => {
    const tracker = createNearMissTracker();
    recordDeclinedTrade(tracker, {
      playerName: 'Mediocre Player',
      playerOvr: 65,
      partnerTeamName: 'Test Team',
      week: 3,
    });
    const receipts = generateNearMissReceipts(seededRng(), tracker);
    expect(receipts.length).toBe(0);
  });

  it('limits to 5 receipts max', () => {
    const tracker = createNearMissTracker();
    for (let i = 0; i < 10; i++) {
      recordDeclinedTrade(tracker, {
        playerName: `Star ${i}`,
        playerOvr: 85 + i,
        partnerTeamName: 'Test Team',
        week: i + 1,
      });
    }
    const receipts = generateNearMissReceipts(seededRng(), tracker);
    expect(receipts.length).toBe(5);
  });

  it('sorts by OVR (most impactful first)', () => {
    const tracker = createNearMissTracker();
    recordDeclinedTrade(tracker, { playerName: 'Low', playerOvr: 82, partnerTeamName: 'A', week: 1 });
    recordDeclinedTrade(tracker, { playerName: 'High', playerOvr: 95, partnerTeamName: 'B', week: 2 });
    const receipts = generateNearMissReceipts(seededRng(), tracker);
    expect(receipts[0]!.playerName).toBe('High');
  });

  it('hasNotableNearMisses detects significant misses', () => {
    const empty = createNearMissTracker();
    expect(hasNotableNearMisses(empty)).toBe(false);

    const withTrade = createNearMissTracker();
    recordDeclinedTrade(withTrade, { playerName: 'Star', playerOvr: 88, partnerTeamName: 'X', week: 1 });
    expect(hasNotableNearMisses(withTrade)).toBe(true);
  });
});
