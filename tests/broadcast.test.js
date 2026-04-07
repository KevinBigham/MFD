import { describe, expect, it } from 'vitest';

import { BROADCAST_COMMENTARY, BROADCAST_COMMENTARY_EXPANDED } from '../src/data/broadcast.js';

describe('broadcast.js', () => {
  it('contains base play-by-play and drive commentary pools', () => {
    expect(BROADCAST_COMMENTARY.pbp986.passTD.length).toBeGreaterThan(5);
    expect(BROADCAST_COMMENTARY.drives.TD.length).toBeGreaterThan(5);
    expect(BROADCAST_COMMENTARY.finalScore.blowout.length).toBeGreaterThan(2);
  });

  it('fills templates and resolves get() fallback', () => {
    const line = BROADCAST_COMMENTARY.fill986('{qb} to {wr} for {yds}', { qb: 'A', wr: 'B', yds: 30 });
    expect(line).toBe('A to B for 30');
    expect(BROADCAST_COMMENTARY.get('drives', 'TD', () => 0)).toBe(BROADCAST_COMMENTARY.drives.TD[0]);
    expect(BROADCAST_COMMENTARY.get('none', 'none', () => 0)).toBe('Great play.');
  });

  it('includes expanded commentary pools', () => {
    expect(BROADCAST_COMMENTARY_EXPANDED.drives.TD.length).toBeGreaterThan(5);
    expect(BROADCAST_COMMENTARY_EXPANDED.drives.TO.length).toBeGreaterThan(5);
  });
});
