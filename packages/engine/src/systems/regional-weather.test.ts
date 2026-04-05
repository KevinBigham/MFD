import { describe, it, expect } from 'vitest';
import { getWeatherRegion, getRegionWeatherOdds, generateRegionalWeather } from './regional-weather';

describe('regional weather system', () => {
  it('returns correct region for known teams', () => {
    expect(getWeatherRegion('buf')).toBe('cold');
    expect(getWeatherRegion('mia')).toBe('warm');
    expect(getWeatherRegion('atl')).toBe('dome');
    expect(getWeatherRegion('sf')).toBe('coastal');
    expect(getWeatherRegion('car')).toBe('temperate');
  });

  it('returns temperate for unknown teams', () => {
    expect(getWeatherRegion('zzz')).toBe('temperate');
    expect(getWeatherRegion('')).toBe('temperate');
  });

  it('returns all-clear odds for dome region', () => {
    const odds = getRegionWeatherOdds('dome', 1);
    expect(odds).toEqual({ clear: 1, rain: 0, snow: 0, wind: 0 });

    const lateOdds = getRegionWeatherOdds('dome', 18);
    expect(lateOdds).toEqual({ clear: 1, rain: 0, snow: 0, wind: 0 });
  });

  it('has snow odds for cold region in late season (week 15+)', () => {
    const odds = getRegionWeatherOdds('cold', 15);
    expect(odds.snow).toBeGreaterThan(0);
    expect(odds.snow).toBe(0.35);
  });

  it('returns dome for dome stadiumType', () => {
    const homeTeam = { id: 'atl', stadiumType: 'dome' } as any;
    const result = generateRegionalWeather(homeTeam, 10, () => 0.5);
    expect(result).toBe('dome');
  });

  it('returns valid WeatherCondition for outdoor teams', () => {
    const validConditions = ['clear', 'rain', 'snow', 'wind'];
    const homeTeam = { id: 'buf', stadiumType: 'outdoor' } as any;

    // Test with several fixed rng values
    for (const rngValue of [0.0, 0.25, 0.5, 0.75, 0.99]) {
      const result = generateRegionalWeather(homeTeam, 10, () => rngValue);
      expect(validConditions).toContain(result);
    }
  });

  it('produces snow for cold outdoor teams when rng rolls low in winter', () => {
    // Week 15+ cold: snow odds = 0.35 (cumulative 0 to 0.35)
    const homeTeam = { id: 'buf', stadiumType: 'outdoor' } as any;
    const result = generateRegionalWeather(homeTeam, 17, () => 0.1);
    expect(result).toBe('snow');
  });
});
