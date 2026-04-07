import { describe, expect, it } from 'vitest';

import { buildBracketTree } from '../src/systems/bracket-tree.js';

describe('bracket-tree.js', () => {
  it('returns null for empty playoff input', () => {
    expect(buildBracketTree([], [])).toBeNull();
    expect(buildBracketTree(null, [])).toBeNull();
  });

  it('builds round buckets and node winner fields from results', () => {
    const teams = [
      { id: 'a', abbr: 'PHI', icon: '🦅' },
      { id: 'b', abbr: 'DAL', icon: '⭐' },
      { id: 'c', abbr: 'BUF', icon: '🦬' },
      { id: 'd', abbr: 'KC', icon: '🏹' },
    ];
    const games = [
      { round: 'wildcard', home: 'a', away: 'b', homeSeed: 2, awaySeed: 7, played: true, result: { homeScore: 24, awayScore: 17 } },
      { round: 'divisional', home: 'c', away: 'd', homeSeed: 1, awaySeed: 4, played: false },
      { round: 'superBowl', home: 'a', away: 'c', played: true, result: { homeScore: 31, awayScore: 34 } },
    ];

    const tree = buildBracketTree(games, teams);
    expect(tree.wildcard).toHaveLength(1);
    expect(tree.divisional).toHaveLength(1);
    expect(tree.superBowl).toHaveLength(1);
    expect(tree.wildcard[0].winnerId).toBe('a');
    expect(tree.superBowl[0].winnerId).toBe('c');
    expect(tree.divisional[0].winnerId).toBeNull();
  });

  it('uses fallback metadata for unknown teams', () => {
    const tree = buildBracketTree(
      [{ round: 'wildcard', home: 'x', away: 'y', played: false }],
      []
    );
    expect(tree.wildcard[0].home.abbr).toBe('?');
    expect(tree.wildcard[0].away.icon).toBe('?');
  });
});
