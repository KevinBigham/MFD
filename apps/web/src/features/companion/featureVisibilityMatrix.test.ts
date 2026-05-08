import { describe, expect, it } from 'vitest';
import {
  CHIP_FEATURE_VISIBILITY_MATRIX,
  FIRST_TEN_MINUTE_FEATURES,
  REQUIRED_CHIP_FEATURES,
  getFeatureVisibilityEntry,
} from './featureVisibilityMatrix';

describe('Chip feature visibility matrix', () => {
  it('covers the required franchise systems with stable ids', () => {
    const ids = new Set(CHIP_FEATURE_VISIBILITY_MATRIX.map((entry) => entry.id));

    for (const requiredFeature of REQUIRED_CHIP_FEATURES) {
      expect(ids.has(requiredFeature)).toBe(true);
    }
    expect(ids.size).toBe(CHIP_FEATURE_VISIBILITY_MATRIX.length);
  });

  it('keeps the first ten minutes focused instead of introducing every system', () => {
    const firstTenEntries = CHIP_FEATURE_VISIBILITY_MATRIX.filter((entry) => entry.bestMoment === 'first_ten_minutes');

    expect(firstTenEntries.map((entry) => entry.id)).toEqual(FIRST_TEN_MINUTE_FEATURES);
    expect(firstTenEntries.length).toBeLessThan(8);
  });

  it('uses route entry points and player actions for every visible feature', () => {
    for (const entry of CHIP_FEATURE_VISIBILITY_MATRIX) {
      expect(entry.entryPoint.startsWith('/')).toBe(true);
      expect(entry.whatItDoes.length).toBeGreaterThan(8);
      expect(entry.whyItMatters.length).toBeGreaterThan(8);
      expect(entry.firstTimePlayerAction.length).toBeGreaterThan(8);
      expect(entry.testStatus).not.toBe('missing');
    }
  });

  it('can look up a feature entry by id', () => {
    expect(getFeatureVisibilityEntry('cap-lab')).toMatchObject({
      entryPoint: '/cap-lab',
      bestMoment: 'cap_pressure',
    });
    expect(getFeatureVisibilityEntry('unknown')).toBeNull();
  });
});
