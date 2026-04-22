import type { DramaTag, TaggedRivalryMatchup } from './types';

const LAST_SECOND_ARCHETYPES = new Set(['yard_miracle', 'dagger', 'coin_flip']);

export function tagMatchup(matchup: TaggedRivalryMatchup): DramaTag[] {
  const tags: DramaTag[] = [];

  if (matchup.overtime || (matchup.namedGameArchetype && LAST_SECOND_ARCHETYPES.has(matchup.namedGameArchetype))) {
    tags.push('last-second');
  }
  if (matchup.namedGameArchetype === 'comeback') {
    tags.push('comeback-win');
  }
  if (Math.abs(matchup.margin) >= 21) {
    tags.push('blowout-revenge-pending');
  }
  if (matchup.endedOpponentStreakLength >= 3) {
    tags.push('streak-breaker');
  }
  if (matchup.isDivisional && matchup.isRegularSeason && matchup.week >= 14 && matchup.week <= 18) {
    tags.push('divisional-implications');
  }

  return tags;
}
