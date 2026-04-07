import { describe, expect, it } from 'vitest';

import {
  DEF_PLANS,
  DEF_SCHEMES,
  GAMEPLANS,
  GP_COUNTERS,
  HOME_FIELD_ADV,
  OFF_PLANS,
  OFF_SCHEMES,
  RIVALRY_NAMES,
  SCHEME_COUNTERS,
  SCHEME_FX,
  getSchemeFlavorLine,
} from '../src/config/schemes.js';

describe('schemes.js', () => {
  it('defines offense/defense schemes and game plans', () => {
    expect(OFF_SCHEMES.length).toBeGreaterThanOrEqual(6);
    expect(DEF_SCHEMES.length).toBeGreaterThanOrEqual(4);
    expect(OFF_PLANS.some((p) => p.id === 'air_raid')).toBe(true);
    expect(DEF_PLANS.some((p) => p.id === 'blitz_heavy')).toBe(true);
    expect(GAMEPLANS.some((p) => p.id === 'balanced')).toBe(true);
  });

  it('exposes counter matrices and matchup FX objects', () => {
    expect(SCHEME_COUNTERS.air_raid.run_stuff).toBeTypeOf('number');
    expect(SCHEME_COUNTERS.ground_pound.run_stuff).toBeTypeOf('number');
    expect(SCHEME_FX.air_raid.blitz_heavy.passMod).toBeTypeOf('number');
    expect(GP_COUNTERS.air_raid.prevent).toBeTypeOf('number');
  });

  it('returns flavor lines for known scheme ids and blank for unknown', () => {
    expect(getSchemeFlavorLine('spread', 'offense').length).toBeGreaterThan(0);
    expect(getSchemeFlavorLine('spread', 'defense').length).toBeGreaterThan(0);
    expect(getSchemeFlavorLine('not_real', 'offense')).toBe('');
  });

  it('keeps home field and rivalry naming data available', () => {
    expect(HOME_FIELD_ADV).toBeGreaterThan(0);
    expect(RIVALRY_NAMES.length).toBeGreaterThan(5);
    expect(RIVALRY_NAMES.some((n) => n.includes('{city1}'))).toBe(true);
  });
});
