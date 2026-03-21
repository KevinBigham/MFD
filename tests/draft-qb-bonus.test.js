import { describe, expect, it } from 'vitest';
import { DRAFT_WAR_ROOM } from '../src/systems/draft-war-room.js';

describe('draft QB positional bonus', () => {
  it('QB prospect ranked higher than equal-OVR non-QB', () => {
    var draftClass = {
      pool: [
        { id: 'wr1', name: 'WR Prospect', pos: 'WR', ovr: 78, pot: 84, ratings: {} },
        { id: 'qb1', name: 'QB Prospect', pos: 'QB', ovr: 78, pot: 84, ratings: {} },
      ]
    };
    var team = { roster: [], scheme: {} };
    var intel = DRAFT_WAR_ROOM.getIntel(draftClass, team, 1, {});
    expect(intel.targetBoard).toBeTruthy();
    expect(intel.targetBoard.length).toBeGreaterThan(0);
    // QB should be first due to +12 bonus
    expect(intel.targetBoard[0].pos).toBe('QB');
  });

  it('QB bonus is meaningful — QB at lower OVR still beats higher OVR WR', () => {
    var draftClass = {
      pool: [
        { id: 'wr1', name: 'WR Star', pos: 'WR', ovr: 82, pot: 88, ratings: {} },
        { id: 'qb1', name: 'QB Prospect', pos: 'QB', ovr: 75, pot: 82, ratings: {} },
      ]
    };
    var team = { roster: [], scheme: {} };
    var intel = DRAFT_WAR_ROOM.getIntel(draftClass, team, 1, {});
    // QB at 75 + 12 bonus = 87 effective vs WR at 82 = 82 effective
    // QB should still rank higher
    expect(intel.targetBoard[0].pos).toBe('QB');
  });
});
