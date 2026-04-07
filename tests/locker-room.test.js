import { describe, expect, it } from 'vitest';

import { LOCKER_ROOM_994 } from '../src/data/locker-room.js';

describe('locker-room.js', () => {
  it('contains arrival, trade, chemistry, and coach-clash narrative sections', () => {
    expect(LOCKER_ROOM_994.newArrival.veteranWelcome.length).toBeGreaterThan(5);
    expect(LOCKER_ROOM_994.tradeAway.lockerRoomReact.length).toBeGreaterThan(5);
    expect(LOCKER_ROOM_994.chemistry.highChemBonus.length).toBeGreaterThan(5);
    expect(LOCKER_ROOM_994.coachClash.hotheadTension.length).toBeGreaterThan(5);
  });
});
