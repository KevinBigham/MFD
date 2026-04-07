import { describe, expect, it } from 'vitest';

import { DRAFT_WAR_ROOM } from '../src/systems/draft-war-room.js';

describe('draft-war-room.js', () => {
  it('schemeFitScore returns bounded values', () => {
    const qb = {
      pos: 'QB',
      ratings: { deepAccuracy: 90, throwPower: 88, shortAccuracy: 70, fieldVision: 68 },
    };
    const wr = {
      pos: 'WR',
      ratings: { deepRoute: 88, speed: 90, catching: 84 },
    };

    const qbAirRaid = DRAFT_WAR_ROOM.schemeFitScore(qb, { off: 'air_raid' });
    const qbWest = DRAFT_WAR_ROOM.schemeFitScore(qb, { off: 'west_coast' });
    const wrAirRaid = DRAFT_WAR_ROOM.schemeFitScore(wr, { off: 'air_raid' });

    expect(qbAirRaid).toBeGreaterThanOrEqual(0);
    expect(qbWest).toBeGreaterThanOrEqual(0);
    expect(wrAirRaid).toBeGreaterThanOrEqual(0);
    expect(wrAirRaid).toBeLessThanOrEqual(25);
  });

  it('getIntel builds target board and surfaces BPA alert when top gap is large', () => {
    const team = {
      roster: [
        { pos: 'QB', ovr: 65, isStarter: true },
        { pos: 'RB', ovr: 70, isStarter: true },
        { pos: 'WR', ovr: 66, isStarter: true },
        { pos: 'WR', ovr: 64, isStarter: true },
        { pos: 'OL', ovr: 60, isStarter: true },
      ],
    };
    const dc = {
      pool: [
        { id: 'p1', name: 'Elite QB', pos: 'QB', ovr: 92, ratings: { deepAccuracy: 90, throwPower: 92 } },
        { id: 'p2', name: 'Good WR', pos: 'WR', ovr: 80, ratings: { deepRoute: 82, speed: 84, catching: 80 } },
        { id: 'p3', name: 'Solid DL', pos: 'DL', ovr: 79, ratings: { powerMoves: 78 } },
        { id: 'p4', name: 'TE Value', pos: 'TE', ovr: 77, ratings: { catching: 80 } },
        { id: 'p5', name: 'OL Project', pos: 'OL', ovr: 73, ratings: { passBlock: 78, assignmentIQ: 76 } },
        { id: 'p6', name: 'CB Depth', pos: 'CB', ovr: 72, ratings: { manCoverage: 75 } },
      ],
    };

    const intel = DRAFT_WAR_ROOM.getIntel(dc, team, 1, { off: 'air_raid', def: 'man_press' });
    expect(intel.targetBoard.length).toBeLessThanOrEqual(5);
    expect(intel.targetBoard[0].name).toBe('Elite QB');
    expect(intel.bpaAlert).not.toBeNull();
    expect(intel.autoPick).not.toBeNull();
  });

  it('getIntel excludes drafted players and returns null autoPick on empty pool', () => {
    const intel = DRAFT_WAR_ROOM.getIntel(
      { pool: [{ id: 'x', name: 'Gone', pos: 'QB', ovr: 80, _drafted: true }] },
      { roster: [] },
      12,
      {}
    );
    expect(intel.targetBoard).toEqual([]);
    expect(intel.autoPick).toBeNull();
    expect(intel.bpaAlert).toBeNull();
  });
});
