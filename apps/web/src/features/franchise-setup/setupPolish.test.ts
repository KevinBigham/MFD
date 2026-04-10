import { describe, expect, it } from 'vitest';
import { buildTransitionOverlayData, deriveGoalReactionSentiment, deriveSchemeReactionSentiment, getTeachingTipTopicForPhase } from './setupPolish';

describe('setupPolish helpers', () => {
  it('maps teaching topics by phase', () => {
    expect(getTeachingTipTopicForPhase('meet_roster')).toBe('roster_screen');
    expect(getTeachingTipTopicForPhase('set_scheme')).toBe('game_plan_screen');
    expect(getTeachingTipTopicForPhase('set_goals')).toBeNull();
  });

  it('builds deterministic transition overlay data', () => {
    const first = buildTransitionOverlayData(99, 'marcus_webb', 'meet_roster', 'hire_coach');
    const second = buildTransitionOverlayData(99, 'marcus_webb', 'meet_roster', 'hire_coach');

    expect(first).toEqual(second);
    expect(first.flavorText.length).toBeGreaterThan(10);
    expect(first.loadingTip.length).toBeGreaterThan(10);
  });

  it('derives sentiments from live option status', () => {
    expect(deriveSchemeReactionSentiment({ recommended: true, fitScore: 82, recommendationScore: 88 })).toBe('love_it');
    expect(deriveSchemeReactionSentiment({ recommended: false, fitScore: 42, recommendationScore: 38 })).toBe('disagree');
    expect(deriveGoalReactionSentiment({ recommended: true, difficulty: 'moderate' })).toBe('love_it');
    expect(deriveGoalReactionSentiment({ recommended: false, difficulty: 'hard' })).toBe('disagree');
  });
});
