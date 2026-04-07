import { describe, expect, it } from 'vitest';

import { SCOUT_MATH, SCOUT_SPEND_MENU95, getScoutNoteFlavor } from '../src/systems/scout-intel.js';

describe('scout-intel.js', () => {
  it('SCOUT_SPEND_MENU95 has stable shape and includes pipeline option', () => {
    expect(SCOUT_SPEND_MENU95.length).toBeGreaterThanOrEqual(12);
    expect(SCOUT_SPEND_MENU95.some((item) => item.id === 'pipeline')).toBe(true);
  });

  it('SCOUT_MATH.getErrorBand scales down with facilities/staff and floors at 1', () => {
    expect(SCOUT_MATH.getErrorBand(0, 0)).toBe(12);
    expect(SCOUT_MATH.getErrorBand(3, 0.5)).toBe(5);
    expect(SCOUT_MATH.getErrorBand(10, 2)).toBe(1);
  });

  it('SCOUT_MATH.getOvrDisplay handles confidence tiers', () => {
    expect(SCOUT_MATH.getOvrDisplay(81, 100, 4)).toBe('81');
    expect(SCOUT_MATH.getOvrDisplay(81, 30, 4)).toBe('??');
    expect(SCOUT_MATH.getOvrDisplay(81, 60, 4)).toBe('77-85');
  });

  it('getScoutNoteFlavor resolves exact and fallback mappings', () => {
    expect(getScoutNoteFlavor('QB', 'workEthic')).toContain('Film junkie');
    expect(getScoutNoteFlavor('QB', 'unknown')).toContain('arm talent');
    expect(getScoutNoteFlavor('XYZ', 'none')).toContain('Intriguing prospect');
  });
});
