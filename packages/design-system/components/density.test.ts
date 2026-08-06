import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DENSITY_MODE,
  DENSITY_ATTRIBUTE,
  densityProps,
  normalizeDensityMode,
} from './density';

describe('density mode', () => {
  it('defaults to comfortable', () => {
    expect(DEFAULT_DENSITY_MODE).toBe('comfortable');
    expect(normalizeDensityMode(undefined)).toBe('comfortable');
  });

  it('falls back to comfortable for anything it does not recognise', () => {
    for (const value of [null, '', 'Compact', 'dense', 0, 1, true, {}, []]) {
      expect(normalizeDensityMode(value), String(value)).toBe('comfortable');
    }
  });

  it('emits the attribute only for compact, since comfortable is the token default', () => {
    expect(densityProps('compact')).toEqual({ [DENSITY_ATTRIBUTE]: 'compact' });
    expect(densityProps('comfortable')).toEqual({});
  });

  it('matches the attribute the stylesheet actually selects on', () => {
    expect(DENSITY_ATTRIBUTE).toBe('data-mfd-density');
  });
});
