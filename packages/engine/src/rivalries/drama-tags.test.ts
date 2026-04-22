import { describe, expect, it } from 'vitest';
import type { TaggedRivalryMatchup } from './types';
import { tagMatchup } from './drama-tags';

function makeMatchup(overrides: Partial<TaggedRivalryMatchup> = {}): TaggedRivalryMatchup {
  return {
    season: 2026,
    week: 10,
    margin: 7,
    overtime: false,
    namedGameArchetype: null,
    isDivisional: false,
    isRegularSeason: true,
    endedOpponentStreakLength: 0,
    ...overrides,
  };
}

describe('tagMatchup', () => {
  it('tags overtime finishes as last-second', () => {
    expect(tagMatchup(makeMatchup({ overtime: true }))).toEqual(['last-second']);
  });

  it('tags dagger-style named games as last-second', () => {
    expect(tagMatchup(makeMatchup({ namedGameArchetype: 'dagger' }))).toEqual(['last-second']);
  });

  it('tags named comebacks as comeback wins', () => {
    expect(tagMatchup(makeMatchup({ namedGameArchetype: 'comeback' }))).toEqual(['comeback-win']);
  });

  it('tags blowouts as revenge pending', () => {
    expect(tagMatchup(makeMatchup({ margin: 24 }))).toEqual(['blowout-revenge-pending']);
  });

  it('tags streak breakers when the newest result snapped an opponent streak of three or more', () => {
    expect(tagMatchup(makeMatchup({ endedOpponentStreakLength: 3 }))).toEqual(['streak-breaker']);
  });

  it('tags late regular-season divisional games with implications', () => {
    expect(tagMatchup(makeMatchup({
      week: 17,
      isDivisional: true,
      isRegularSeason: true,
    }))).toEqual(['divisional-implications']);
  });

  it('does not emit false positives for neutral games', () => {
    expect(tagMatchup(makeMatchup())).toEqual([]);
  });
});
