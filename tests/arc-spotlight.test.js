import { afterEach, describe, expect, it } from 'vitest';

import { ARC_SPOTLIGHT } from '../src/systems/arc-spotlight.js';
import { RNG } from '../src/utils/rng.js';

describe('arc-spotlight.js', () => {
  const originalUi = RNG.ui;

  afterEach(() => {
    RNG.ui = originalUi;
  });

  it('contains exactly 8 arc types', () => {
    expect(Object.keys(ARC_SPOTLIGHT.lines)).toHaveLength(8);
  });

  it('generate returns at most 3 spotlight entries', () => {
    RNG.ui = () => 0;
    const roster = [
      { id: '1', name: 'A', pos: 'QB', ovr: 85, age: 25, isStarter: true, _arcState: 'BREAKOUT' },
      { id: '2', name: 'B', pos: 'WR', ovr: 80, age: 24, isStarter: true, _arcState: 'SLUMP' },
      { id: '3', name: 'C', pos: 'DL', ovr: 88, age: 27, isStarter: true, _arcState: 'ELITE' },
      { id: '4', name: 'D', pos: 'RB', ovr: 79, age: 26, isStarter: true, _arcState: 'COMEBACK' },
      { id: '5', name: 'E', pos: 'TE', ovr: 78, age: 34, isStarter: true, _arcState: 'SWAN_SONG' },
      { id: '6', name: 'F', pos: 'CB', ovr: 76, age: 29, isStarter: true, _arcState: 'HOLDOUT' },
      { id: '7', name: 'G', pos: 'LB', ovr: 74, age: 31, isStarter: true, _arcState: 'DECLINE' },
      { id: '8', name: 'H', pos: 'S', ovr: 73, age: 30, isStarter: true, _arcState: 'MENTOR' },
    ];

    const spots = ARC_SPOTLIGHT.generate(roster, true, 12, {});
    expect(spots).toHaveLength(3);
    expect(spots.map((s) => s.arcKey)).toEqual(['BREAKOUT', 'SLUMP', 'ELITE']);
  });
});
