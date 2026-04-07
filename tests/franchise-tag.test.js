import { describe, expect, it } from 'vitest';

import { FRANCHISE_TAG_986 } from '../src/systems/franchise-tag.js';

describe('franchise-tag.js', () => {
  it('defines exactly three tag types', () => {
    expect(FRANCHISE_TAG_986.types).toHaveLength(3);
  });

  it('contains the expected ids', () => {
    const ids = FRANCHISE_TAG_986.types.map((t) => t.id).sort();
    expect(ids).toEqual(['exclusive', 'non_exclusive', 'transition']);
  });

  it('has numeric salary multipliers for each type', () => {
    FRANCHISE_TAG_986.types.forEach((type) => {
      expect(typeof type.salaryMult).toBe('number');
      expect(type.salaryMult).toBeGreaterThan(0);
    });
  });

  it('keeps multiplier ordering exclusive > non_exclusive > transition', () => {
    const byId = Object.fromEntries(FRANCHISE_TAG_986.types.map((t) => [t.id, t.salaryMult]));
    expect(byId.exclusive).toBeGreaterThan(byId.non_exclusive);
    expect(byId.non_exclusive).toBeGreaterThan(byId.transition);
  });

  it('has user-facing label and description for each tag type', () => {
    FRANCHISE_TAG_986.types.forEach((type) => {
      expect(type.label.length).toBeGreaterThan(0);
      expect(type.desc.length).toBeGreaterThan(5);
    });
  });
});
