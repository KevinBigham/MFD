import { afterEach, describe, expect, it } from 'vitest';

import { RNG } from '../src/utils/index.js';
import { DC_SPECIALTIES, OC_SPECIALTIES, assignCoordSpecialty } from '../src/systems/coordinator-specialties.js';

describe('coordinator-specialties.js', () => {
  const originalAi = RNG.ai;

  afterEach(() => {
    RNG.ai = originalAi;
  });

  it('defines expected OC/DC specialty pools', () => {
    expect(OC_SPECIALTIES).toHaveLength(5);
    expect(DC_SPECIALTIES).toHaveLength(5);
    expect(new Set(OC_SPECIALTIES.map((s) => s.id)).size).toBe(5);
    expect(new Set(DC_SPECIALTIES.map((s) => s.id)).size).toBe(5);
  });

  it('assignCoordSpecialty assigns from correct role pool and reuses existing specialty', () => {
    RNG.ai = () => 0;
    const oc = {};
    const dc = {};
    const ocSpec = assignCoordSpecialty(oc, 'OC');
    const dcSpec = assignCoordSpecialty(dc, 'DC');

    expect(ocSpec.id).toBe(OC_SPECIALTIES[0].id);
    expect(dcSpec.id).toBe(DC_SPECIALTIES[0].id);

    const again = assignCoordSpecialty(oc, 'OC');
    expect(again).toBe(ocSpec);
  });

  it('returns null for missing staff member', () => {
    expect(assignCoordSpecialty(null, 'OC')).toBeNull();
  });
});
