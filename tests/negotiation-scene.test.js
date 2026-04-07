import { describe, expect, it } from 'vitest';

import { NEGOTIATION_SCENE } from '../src/systems/negotiation-scene.js';

describe('negotiation-scene.js', () => {
  it('getOpeningLine routes high_greed personalities', () => {
    const line = NEGOTIATION_SCENE.getOpeningLine(
      { id: 'a1', name: 'Max Money', pos: 'WR', personality: { greed: 9 } },
      28,
      4
    );
    expect(line).toContain('outside interest');
    expect(line).toContain('$28M/yr');
  });

  it('getOpeningLine routes high_loyalty personalities', () => {
    const line = NEGOTIATION_SCENE.getOpeningLine(
      { id: 'b1', name: 'City Hero', pos: 'QB', personality: { loyalty: 9 } },
      22,
      3
    );
    expect(line.toLowerCase()).toContain('hometown deal');
    expect(line).toContain('$22M/yr');
  });

  it('getOpeningLine falls back to normal personality routing', () => {
    const line = NEGOTIATION_SCENE.getOpeningLine(
      { id: 'c1', name: 'Steady Vet', pos: 'LB', personality: { greed: 3, loyalty: 3 } },
      12,
      2
    );
    expect(line.toLowerCase()).toContain('fair market value');
    expect(line).toContain('$12M/yr');
  });

  it('getCounterLine routes accepted responses for tiny gaps', () => {
    const line = NEGOTIATION_SCENE.getCounterLine(
      { id: 'x1', name: 'Closer', personality: {} },
      18,
      1.5
    );
    expect(line.toLowerCase()).toMatch(/deal|signed/);
  });

  it('getCounterLine routes gap-based responses for medium gaps', () => {
    const line = NEGOTIATION_SCENE.getCounterLine(
      { id: 'y1', name: 'Needs More', personality: { loyalty: 2, greed: 2 } },
      20,
      5
    );
    expect(line).toContain('$20M');
    expect(line.toLowerCase()).toMatch(/not there|worth more|came down/);
  });

  it('getCounterLine routes walkout responses for large non-loyal non-greedy gaps', () => {
    const line = NEGOTIATION_SCENE.getCounterLine(
      { id: 'z1', name: 'Hard Case', personality: { greed: 2, loyalty: 1 } },
      30,
      10
    );
    expect(line.toLowerCase()).toMatch(/talks are over|stepping back|other teams|other doors/);
  });
});
