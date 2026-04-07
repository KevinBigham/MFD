import { describe, expect, it } from 'vitest';
import { reduceTeamStats, reduceDrives, reducePlayerStats } from '../src/systems/events/reducers.js';

describe('reducers (parity)', () => {
  it('reduceTeamStats returns home/away structure', () => {
    const stats = reduceTeamStats([]);
    expect(stats).toHaveProperty('home');
    expect(stats).toHaveProperty('away');
  });
  it('reduceDrives returns array', () => {
    expect(Array.isArray(reduceDrives([]))).toBe(true);
  });
  it('reducePlayerStats returns object', () => {
    expect(typeof reducePlayerStats([])).toBe('object');
  });
});
