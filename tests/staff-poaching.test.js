import { describe, expect, it } from 'vitest';

import { STAFF_POACHING } from '../src/systems/staff-poaching.js';

describe('staff-poaching.js', () => {
  const staff = [
    { id: 'a', ovr: 75, salary: 2.0 },
    { id: 'b', ovr: 69, salary: 1.5 },
    { id: 'c', ovr: 90, salary: 4.0 },
  ];

  it('checks poach targets only for qualifying OVR and contexts', () => {
    const none = STAFF_POACHING.checkPoach(staff, false, 8, () => 0);
    expect(none).toEqual([]);

    const contenders = STAFF_POACHING.checkPoach(staff, false, 10, () => 0);
    expect(contenders.map((s) => s.id)).toEqual(['a', 'c']);
    expect(contenders[0].poachRate).toBe(25);

    const champs = STAFF_POACHING.checkPoach(staff, true, 12, () => 0.49);
    expect(champs.map((s) => s.id)).toEqual(['a', 'c']);
    expect(champs[0].poachRate).toBe(50);
  });

  it('counterOfferCost is 1.5x salary rounded to tenth', () => {
    expect(STAFF_POACHING.counterOfferCost({ salary: 2 })).toBe(3);
    expect(STAFF_POACHING.counterOfferCost({ salary: 2.33 })).toBe(3.5);
  });

  it('applyPoach removes target id from front office array', () => {
    const out = STAFF_POACHING.applyPoach(staff, { id: 'a' });
    expect(out.map((s) => s.id)).toEqual(['b', 'c']);
  });
});
