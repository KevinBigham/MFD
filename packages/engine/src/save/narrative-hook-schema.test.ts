import { describe, it, expect } from 'vitest';
import { NarrativeHookSchema } from './schema';

/**
 * Schema hardening island 4: GameState.narrativeState.hooks entries are
 * typed against the real NarrativeHook interface (types/franchise.ts)
 * instead of z.array(z.any()).
 *
 * Both writers produce exactly the typed shape: the weekly refresh in
 * franchise-week-helpers maps hooks-engine dashboard hooks into
 * { id, type, description, resolved, deadline } records, and the
 * convention save seeds one literal of the same shape. `type` is
 * intentionally a free-form string — hooks-engine cat values are an open
 * set (dev/owner/injury/draft/streak/playoff_race/...), so an enum would
 * reject valid future categories. Strict strip is safe: no writer or
 * reader touches any other key.
 */

const weeklyRefreshHook = {
  id: 'hook-2026-9-0',
  type: 'streak',
  description: '4-game win streak. The team is rolling.',
  resolved: false,
  deadline: 11,
};

const conventionSeedHook = {
  id: 'hook-2026-14-playoff-push',
  type: 'playoff_race',
  description: 'One game back in the division and the wild-card margin is a single loss.',
  resolved: false,
  deadline: 15,
};

describe('NarrativeHookSchema (island 4: typed narrativeState.hooks)', () => {
  it('round-trips the weekly-refresh writer shape without data loss', () => {
    const parsed = NarrativeHookSchema.safeParse(weeklyRefreshHook);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(weeklyRefreshHook);
    }
  });

  it('round-trips the convention-save seed hook exactly', () => {
    const parsed = NarrativeHookSchema.safeParse(conventionSeedHook);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(conventionSeedHook);
    }
  });

  it('accepts resolved hooks and any open-set category string', () => {
    const parsed = NarrativeHookSchema.safeParse({
      ...weeklyRefreshHook,
      type: 'some_future_category',
      resolved: true,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.resolved).toBe(true);
      expect(parsed.data.type).toBe('some_future_category');
    }
  });

  it('rejects malformed hooks loudly instead of passing them through as any', () => {
    expect(NarrativeHookSchema.safeParse({ id: 'hook-x' }).success).toBe(false);
    expect(NarrativeHookSchema.safeParse({ ...weeklyRefreshHook, resolved: 'yes' }).success).toBe(false);
    expect(NarrativeHookSchema.safeParse({ ...weeklyRefreshHook, deadline: 'soon' }).success).toBe(false);
    expect(NarrativeHookSchema.safeParse({ ...weeklyRefreshHook, description: 42 }).success).toBe(false);
  });

  it('strips unknown keys so the typed shape stays authoritative', () => {
    const parsed = NarrativeHookSchema.safeParse({ ...weeklyRefreshHook, mysteryFutureField: true });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect('mysteryFutureField' in parsed.data).toBe(false);
      expect(parsed.data).toEqual(weeklyRefreshHook);
    }
  });
});
