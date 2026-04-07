import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { LOCKER_ROOM_994 } from '../src/data/locker-room.js';

const lockerRoomJson = JSON.parse(
  readFileSync(new URL('../src/data/locker-room.json', import.meta.url), 'utf8')
);

describe('locker-room data', () => {
  it('exposes expected narrative buckets in JS and JSON', () => {
    ['newArrival', 'tradeAway', 'chemistry', 'coachClash'].forEach((k) => {
      expect(LOCKER_ROOM_994).toHaveProperty(k);
      expect(lockerRoomJson).toHaveProperty(k);
    });
  });

  it('keeps key substructures aligned between JS and JSON', () => {
    expect(Object.keys(lockerRoomJson.newArrival).sort()).toEqual(
      Object.keys(LOCKER_ROOM_994.newArrival).sort()
    );
    expect(lockerRoomJson.newArrival.veteranWelcome.length).toBeGreaterThan(10);
    expect(lockerRoomJson.coachClash.mutualDisdain.length).toBeGreaterThan(5);
  });
});
