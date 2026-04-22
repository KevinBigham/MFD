import { describe, expect, it } from 'vitest';
import type { RivalryScoreInput } from './types';
import { intensityScore } from './scoring';

function makeInput(overrides: Partial<RivalryScoreInput> = {}): RivalryScoreInput {
  return {
    relationship: 'division',
    currentSeason: 2026,
    lastMeetingSeason: 2026,
    closeGamesInLastFive: 0,
    hasPlayoffHistory: false,
    activeStreakLength: 0,
    ...overrides,
  };
}

describe('intensityScore', () => {
  it('ranks divisional matchups above conference and inter-conference matchups', () => {
    const division = intensityScore(makeInput({ relationship: 'division' }));
    const conference = intensityScore(makeInput({ relationship: 'conference' }));
    const interConference = intensityScore(makeInput({ relationship: 'interconference' }));

    expect(division).toBeGreaterThan(conference);
    expect(conference).toBeGreaterThan(interConference);
  });

  it('increases monotonically as more close games accumulate in the recent sample', () => {
    const none = intensityScore(makeInput({ closeGamesInLastFive: 0 }));
    const one = intensityScore(makeInput({ closeGamesInLastFive: 1 }));
    const three = intensityScore(makeInput({ closeGamesInLastFive: 3 }));

    expect(one).toBeGreaterThan(none);
    expect(three).toBeGreaterThan(one);
  });

  it('uses exclusive recency buckets for the last three and last five seasons', () => {
    const withinThree = intensityScore(makeInput({ currentSeason: 2026, lastMeetingSeason: 2024 }));
    const withinFive = intensityScore(makeInput({ currentSeason: 2026, lastMeetingSeason: 2022 }));
    const stale = intensityScore(makeInput({ currentSeason: 2026, lastMeetingSeason: 2020 }));

    expect(withinThree).toBe(35);
    expect(withinFive).toBe(28);
    expect(stale).toBe(20);
  });

  it('applies the streak drama bonus only when the active streak reaches three games', () => {
    const twoGameStreak = intensityScore(makeInput({ activeStreakLength: 2 }));
    const threeGameStreak = intensityScore(makeInput({ activeStreakLength: 3 }));

    expect(twoGameStreak).toBe(35);
    expect(threeGameStreak).toBe(43);
  });

  it('clamps scores at the low end', () => {
    expect(intensityScore(makeInput({
      relationship: 'interconference',
      lastMeetingSeason: null,
      closeGamesInLastFive: -4,
      activeStreakLength: -2,
    }))).toBe(5);
  });

  it('clamps scores at the high end', () => {
    expect(intensityScore(makeInput({
      closeGamesInLastFive: 20,
      hasPlayoffHistory: true,
      activeStreakLength: 12,
    }))).toBe(100);
  });
});
