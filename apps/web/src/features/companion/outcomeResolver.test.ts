import { describe, expect, it } from 'vitest';
import { isLossStreak, resolveResultOutcome } from './outcomeResolver';

describe('outcomeResolver (I2)', () => {
  it('classifies wins by the shared ugly-win margin constant', () => {
    expect(resolveResultOutcome({ result: 'win', teamScore: 24, opponentScore: 21 })).toBe('uglyWin');
    expect(resolveResultOutcome({ result: 'win', teamScore: 24, opponentScore: 20 })).toBe('cleanWin');
    expect(resolveResultOutcome({ result: 'win', teamScore: 31, opponentScore: 17 })).toBe('cleanWin');
    // Missing scores never invent an ugly win.
    expect(resolveResultOutcome({ result: 'win', teamScore: null, opponentScore: null })).toBe('cleanWin');
    expect(resolveResultOutcome({ result: 'win', teamScore: 31, opponentScore: null })).toBe('cleanWin');
  });

  it('classifies losses by streak, then by the shared blowout margin constant', () => {
    expect(resolveResultOutcome({
      result: 'loss',
      teamScore: 13,
      opponentScore: 20,
      recentResults: ['loss', 'loss', 'loss'],
    })).toBe('threeLossStreak');
    expect(resolveResultOutcome({ result: 'loss', teamScore: 3, opponentScore: 31 })).toBe('blowoutLoss');
    expect(resolveResultOutcome({ result: 'loss', teamScore: 17, opponentScore: 38 })).toBe('blowoutLoss');
    expect(resolveResultOutcome({ result: 'loss', teamScore: 17, opponentScore: 20 })).toBe('loss');
    // Streak wins over blowout when both apply (matches both legacy callers).
    expect(resolveResultOutcome({
      result: 'loss',
      teamScore: 0,
      opponentScore: 41,
      recentResults: ['loss', 'loss', 'loss'],
    })).toBe('threeLossStreak');
    // Missing scores never invent a blowout.
    expect(resolveResultOutcome({ result: 'loss', teamScore: null, opponentScore: null })).toBe('loss');
  });

  it('returns null for tie, pending, and unknown results so callers keep their fallbacks', () => {
    expect(resolveResultOutcome({ result: 'tie', teamScore: 17, opponentScore: 17 })).toBeNull();
    expect(resolveResultOutcome({ result: 'pending' })).toBeNull();
    expect(resolveResultOutcome({ result: null })).toBeNull();
    expect(resolveResultOutcome({})).toBeNull();
  });

  it('counts only exact trailing streaks', () => {
    expect(isLossStreak(['loss', 'loss', 'loss'], 3)).toBe(true);
    expect(isLossStreak(['loss', 'loss'], 3)).toBe(false);
    expect(isLossStreak(['win', 'loss', 'loss'], 3)).toBe(false);
    expect(isLossStreak(['loss', 'loss', 'loss', 'loss'], 3)).toBe(true);
    expect(isLossStreak(['loss', 'win', 'loss', 'loss', 'loss'], 3)).toBe(true);
    expect(isLossStreak([], 3)).toBe(false);
  });
});
