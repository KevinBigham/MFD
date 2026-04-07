import { describe, expect, it } from 'vitest';

import { checkOwnerPersonality } from '../src/systems/owner-personality.js';

describe('owner-personality.js', () => {
  it('returns null when required context is missing', () => {
    expect(checkOwnerPersonality(null, {}, {}, () => 0.9)).toBeNull();
    expect(checkOwnerPersonality({}, null, {}, () => 0.9)).toBeNull();
    expect(checkOwnerPersonality({}, {}, null, () => 0.9)).toBeNull();
  });

  it('returns null outside regular season', () => {
    const result = checkOwnerPersonality(
      { archetype: 'win_now' },
      { wins: 10, losses: 1, roster: [] },
      { phase: 'offseason', week: 10, year: 2026 },
      () => 0.9
    );

    expect(result).toBeNull();
  });

  it('honors weekly random gate (60% no-event threshold)', () => {
    const result = checkOwnerPersonality(
      { archetype: 'win_now' },
      { wins: 10, losses: 1, roster: [] },
      { phase: 'regular', week: 10, year: 2026 },
      () => 0.5
    );

    expect(result).toBeNull();
  });

  it('emits pressure event for win-now owner during losing season', () => {
    const result = checkOwnerPersonality(
      { archetype: 'win_now' },
      { wins: 1, losses: 5, roster: [] },
      { phase: 'regular', week: 7, year: 2026 },
      () => 0.9
    );

    expect(result).toMatchObject({
      tag: 'PRESSURE',
      mood: -5,
      week: 7,
      year: 2026,
    });
    expect(result.msg).toContain('miss the playoffs');
  });

  it('emits praise for patient builder with strong youth core', () => {
    const team = {
      wins: 4,
      losses: 4,
      roster: [
        { age: 22, ovr: 72 },
        { age: 23, ovr: 74 },
        { age: 24, ovr: 70 },
      ],
      capUsed: 110,
      deadCap: 2,
    };

    const result = checkOwnerPersonality(
      { archetype: 'patient_builder' },
      team,
      { phase: 'regular', week: 9, year: 2026 },
      () => 0.9
    );

    expect(result?.tag).toBe('PRAISE');
    expect(result?.mood).toBe(4);
    expect(result?.msg).toContain('youth movement');
  });

  it('defaults to win-now archetype when owner archetype is missing', () => {
    const result = checkOwnerPersonality(
      {},
      { wins: 11, losses: 2, roster: [] },
      { phase: 'regular', week: 13, year: 2026 },
      () => 0.9
    );

    expect(result?.tag).toBe('PRAISE');
    expect(result?.mood).toBe(3);
  });
});
