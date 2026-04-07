import { beforeEach, describe, expect, it } from 'vitest';

import { PLAYBOOK_986 } from '../src/systems/playbook.js';
import { setSeed } from '../src/utils/rng.js';

describe('playbook.js', () => {
  beforeEach(() => {
    setSeed(777);
  });

  it('defines offense and defense play groups with entries', () => {
    expect(PLAYBOOK_986.offense.run.length).toBeGreaterThan(0);
    expect(PLAYBOOK_986.offense.shortPass.length).toBeGreaterThan(0);
    expect(PLAYBOOK_986.offense.deepPass.length).toBeGreaterThan(0);
    expect(PLAYBOOK_986.offense.special.length).toBeGreaterThan(0);
    expect(PLAYBOOK_986.defense.coverage.length).toBeGreaterThan(0);
  });

  it('resolvePlay returns fallback when no QB is available', () => {
    const result = PLAYBOOK_986.resolvePlay(
      PLAYBOOK_986.offense.special.find((p) => p.id === 'spike'),
      PLAYBOOK_986.defense.coverage[0],
      { roster: [{ pos: 'RB', isStarter: true }] },
      { roster: [] },
      {}
    );
    expect(result.type).toBe('incomplete');
    expect(result.desc).toContain('No QB available');
  });

  it('resolvePlay handles spike path and stops the clock', () => {
    const qb = { name: 'Field General', pos: 'QB', isStarter: true, ratings: { awareness: 80 }, ovr: 80 };
    const result = PLAYBOOK_986.resolvePlay(
      PLAYBOOK_986.offense.special.find((p) => p.id === 'spike'),
      PLAYBOOK_986.defense.coverage[0],
      { roster: [qb] },
      { roster: [] },
      {}
    );

    expect(result.type).toBe('spike');
    expect(result.clock).toBe(3);
    expect(result.isSpike).toBe(true);
    expect(result.desc).toContain('spikes the football');
  });
});
