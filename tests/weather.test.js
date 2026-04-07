import { describe, expect, it } from 'vitest';

import {
  CLIMATE_PROFILES,
  HT_CONDITIONS,
  HT_STRATEGIES,
  TEAM_CLIMATES,
  WEATHER,
} from '../src/systems/weather.js';

describe('weather.js', () => {
  it('exports team climates and climate profiles', () => {
    expect(TEAM_CLIMATES.hawks).toBe('dome');
    expect(CLIMATE_PROFILES.cold.dropPerWeek).toBe(3);
    expect(CLIMATE_PROFILES.warm.base).toBe(82);
  });

  it('getConditions is deterministic for same input tuple', () => {
    const a = WEATHER.getConditions('titan', 8, 777);
    const b = WEATHER.getConditions('titan', 8, 777);
    expect(b).toEqual(a);
  });

  it('dome teams always return dome conditions', () => {
    const c = WEATHER.getConditions('hawks', 12, 100);
    expect(c.climate).toBe('dome');
    expect(c.precip).toBe('DOME');
    expect(c.temp).toBe(72);
    expect(c.wind).toBe(0);
  });

  it('non-dome conditions include expected shape', () => {
    const c = WEATHER.getConditions('titan', 10, 100);
    expect(typeof c.temp).toBe('number');
    expect(typeof c.wind).toBe('number');
    expect(['CLEAR', 'RAIN', 'SNOW', 'FOG', 'DOME']).toContain(c.precip);
    expect(typeof c.label).toBe('string');
    expect(typeof c.emoji).toBe('string');
  });

  it('getImpact applies precip/wind/temp effects', () => {
    const snow = WEATHER.getImpact({ precip: 'SNOW', wind: 10, temp: 30 });
    expect(snow.passAccMod).toBe(-0.1);
    expect(snow.fumbleMod).toBe(0.05);
    expect(snow.kickMod).toBe(-0.08);

    const wind = WEATHER.getImpact({ precip: 'CLEAR', wind: 20, temp: 70 });
    expect(wind.passAccMod).toBeCloseTo(-0.05, 5);
    expect(wind.kickMod).toBeCloseTo(-0.05, 5);

    const extreme = WEATHER.getImpact({ precip: 'RAIN', wind: 0, temp: 95 });
    expect(extreme.catchMod).toBe(-0.05);
    expect(extreme.fatigueMod).toBe(0.05);
  });

  it('exports halftime condition and strategy packs', () => {
    expect(HT_CONDITIONS).toHaveLength(5);
    expect(HT_STRATEGIES.length).toBeGreaterThanOrEqual(6);
    expect(HT_STRATEGIES.find((s) => s.id === 'balanced_adj')).toBeTruthy();
    expect(HT_STRATEGIES.find((s) => s.id === 'go_for_broke')?.effect.bigPlayBoost).toBe(0.06);
  });
});
