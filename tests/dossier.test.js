import { describe, expect, it } from 'vitest';

import { DOSSIER } from '../src/systems/dossier.js';

describe('dossier.js', () => {
  it('getEntry returns default dossier shape when missing', () => {
    const entry = DOSSIER.getEntry({}, 'opp-1', 2026);
    expect(entry.oppId).toBe('opp-1');
    expect(entry.year).toBe(2026);
    expect(entry.conf).toBe(0);
    expect(entry.tells).toEqual([]);
    expect(entry.weakSpots).toEqual([]);
  });

  it('scout accumulates confidence and scouting notes', () => {
    const db = {};
    const scoutData = {
      offPlan: { id: 'air_raid', name: 'Air Raid', desc: 'Vertical shots and spacing. Extra detail.' },
      defPlan: { id: 'blitz_heavy', name: 'Blitz Heavy', desc: 'Pressure from every angle. Extra detail.' },
      weaknesses: [{ pos: 'CB', avg: 64 }, { pos: 'LB', avg: 67 }],
      stars: [{ name: 'Ace QB', pos: 'QB', ovr: 91 }, { name: 'Top WR', pos: 'WR', ovr: 88 }],
      injuredStarters: [{ id: 'i1' }, { id: 'i2' }],
      schemeNote: 'Attack the flats early',
    };

    const first = DOSSIER.scout(db, 'opp-1', 2026, 3, scoutData, 80, 3);
    expect(first.conf).toBe(38);
    const second = DOSSIER.scout(db, 'opp-1', 2026, 4, scoutData, 80, 3);

    expect(second.conf).toBe(86);
    expect(second.scoutCount).toBe(2);
    expect(second.lastWeek).toBe(4);
    expect(second.scheme).toBe('Air Raid / Blitz Heavy');
    expect(second.counterTip).toBe('Attack the flats early');
    expect(second.stars).toHaveLength(2);
    expect(second.weakSpots).toHaveLength(2);
    expect(second.tells.length).toBeGreaterThan(0);
    expect(second.tells.length).toBeLessThanOrEqual(5);
  });

  it('decay lowers stale confidence and clears intel at zero', () => {
    const db = {
      '2026-opp-1': { year: 2026, lastWeek: 1, conf: 6, tells: ['t'], weakSpots: ['w'], stars: ['s'] },
      '2026-opp-2': { year: 2026, lastWeek: 2, conf: 30, tells: ['a'], weakSpots: ['b'], stars: [] },
      '2025-opp-3': { year: 2025, lastWeek: 1, conf: 20, tells: ['old'], weakSpots: [], stars: [] },
    };

    DOSSIER.decay(db, 2026, 7);

    expect(db['2026-opp-1'].conf).toBe(0);
    expect(db['2026-opp-1'].tells).toEqual([]);
    expect(db['2026-opp-1'].weakSpots).toEqual([]);
    expect(db['2026-opp-1'].stars).toEqual([]);
    expect(db['2026-opp-2'].conf).toBe(22);
    expect(db['2025-opp-3'].conf).toBe(20);
  });

  it('verify returns confirmed, wrong_read, and null paths', () => {
    const db = {
      '2026-opp-1': { oppId: 'opp-1', year: 2026, conf: 40 },
      '2026-opp-2': { oppId: 'opp-2', year: 2026, conf: 40 },
      '2026-opp-3': { oppId: 'opp-3', year: 2026, conf: 0 },
    };

    const confirmed = DOSSIER.verify(db, 'opp-1', 2026, { home: 28, away: 14 }, true);
    const wrongRead = DOSSIER.verify(db, 'opp-2', 2026, { home: 17, away: 24 }, true);
    const noIntel = DOSSIER.verify(db, 'opp-3', 2026, { home: 10, away: 7 }, true);

    expect(confirmed).toEqual({ status: 'confirmed', delta: 5 });
    expect(db['2026-opp-1'].conf).toBe(45);
    expect(wrongRead).toEqual({ status: 'wrong_read', delta: -10 });
    expect(db['2026-opp-2'].conf).toBe(30);
    expect(noIntel).toBe(null);
  });
});
