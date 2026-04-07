import { describe, expect, it } from 'vitest';

import { PROSPECT_DOSSIER } from '../src/systems/prospect-dossier.js';

describe('prospect-dossier.js', () => {
  it('getEntry returns default dossier shape when missing', () => {
    const entry = PROSPECT_DOSSIER.getEntry({}, 'p1', 2026);
    expect(entry.prospectId).toBe('p1');
    expect(entry.conf).toBe(0);
    expect(entry.source).toEqual({ combine: false, interview: false, film: false });
  });

  it('scout updates confidence, sources, tells/flags and caps confidence at 90', () => {
    const db = {};
    const prospect = {
      id: 'p1',
      name: 'Fast WR',
      pos: 'WR',
      age: 23,
      trait: 'captain',
      devTrait: 'superstar',
      ovr: 75,
      pot: 90,
      combine: { forty: 4.33 },
      ratings: { speed: 90, catching: 86, awareness: 74 },
    };

    const e1 = PROSPECT_DOSSIER.scout(db, 'p1', 2026, 2, prospect, 'combine', 90, 3);
    const e2 = PROSPECT_DOSSIER.scout(db, 'p1', 2026, 3, prospect, 'interview', 90, 3);
    const e3 = PROSPECT_DOSSIER.scout(db, 'p1', 2026, 4, prospect, 'film', 90, 3);

    expect(e3.conf).toBeLessThanOrEqual(90);
    expect(e3.source.combine).toBe(true);
    expect(e3.source.interview).toBe(true);
    expect(e3.source.film).toBe(true);
    expect(e3.tells.length).toBeGreaterThan(0);
    expect(e3.schemeFit).toContain('Best fit');
    expect(e3.claims.length).toBeGreaterThan(0);
    expect(e2.lastWeek).toBe(4);
    expect(e1.scoutCount).toBe(3);
  });

  it('decay reduces stale confidence and clears notes when confidence hits zero', () => {
    const db = {
      '2026-p1': { year: 2026, lastWeek: 1, conf: 5, tells: ['x'], redFlags: ['y'] },
      '2026-p2': { year: 2026, lastWeek: 2, conf: 40, tells: ['a'], redFlags: [] },
    };
    PROSPECT_DOSSIER.decay(db, 2026, 7);
    expect(db['2026-p1'].conf).toBe(0);
    expect(db['2026-p1'].tells).toEqual([]);
    expect(db['2026-p1'].redFlags).toEqual([]);
    expect(db['2026-p2'].conf).toBe(34);
  });

  it('verify handles legacy no-claims path for verified/misread outcomes', () => {
    const db = {
      '2026-p1': { prospectId: 'p1', year: 2026, conf: 40, claims: [] },
      '2026-p2': { prospectId: 'p2', year: 2026, conf: 40, claims: [] },
    };

    const verified = PROSPECT_DOSSIER.verify(
      db,
      'p1',
      2026,
      { ovr: 75, pot: 79, ratings: {}, stats: {}, pos: 'QB' },
      10
    );
    const misread = PROSPECT_DOSSIER.verify(
      db,
      'p2',
      2026,
      { ovr: 62, pot: 80, ratings: {}, stats: {}, pos: 'QB' },
      10
    );

    expect(verified.status).toBe('VERIFIED');
    expect(misread.status).toBe('MISREAD');
    expect(db['2026-p2'].conf).toBe(32);
  });
});
