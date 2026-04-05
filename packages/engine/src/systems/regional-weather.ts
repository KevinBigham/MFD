/**
 * MFD Regional Weather System
 *
 * Location-based weather generation replacing generic week-based probabilities.
 * Each team maps to a climate region with seasonal weather odds.
 */

import type { Team, WeatherCondition } from '../types';

// ── Types ──────────────────────────────────────────────

export type WeatherRegion = 'dome' | 'warm' | 'temperate' | 'cold' | 'coastal';

export interface WeatherOdds {
  clear: number;
  rain: number;
  snow: number;
  wind: number;
}

// ── Team → Region Mapping ──────────────────────────────

const TEAM_REGION_MAP: Record<string, WeatherRegion> = {
  // Dome teams
  atl: 'dome', ari: 'dome', dal: 'dome', det: 'dome', hou: 'dome',
  ind: 'dome', lac: 'dome', lar: 'dome', lv: 'dome', min: 'dome', no: 'dome',

  // Warm
  jax: 'warm', mia: 'warm', tb: 'warm',

  // Cold
  buf: 'cold', chi: 'cold', cin: 'cold', cle: 'cold', den: 'cold',
  gb: 'cold', kc: 'cold', ne: 'cold', nyg: 'cold', nyj: 'cold',
  phi: 'cold', pit: 'cold',

  // Coastal
  sf: 'coastal', sea: 'coastal', bal: 'coastal',

  // Temperate
  car: 'temperate', ten: 'temperate', was: 'temperate',
};

// ── Season-based Weather Odds ──────────────────────────

export function getRegionWeatherOdds(region: WeatherRegion, week: number): WeatherOdds {
  if (region === 'dome') return { clear: 1, rain: 0, snow: 0, wind: 0 };

  // Early season (weeks 1-4)
  if (week <= 4) {
    if (region === 'warm') return { clear: 0.85, rain: 0.12, snow: 0, wind: 0.03 };
    if (region === 'cold') return { clear: 0.70, rain: 0.15, snow: 0, wind: 0.15 };
    if (region === 'coastal') return { clear: 0.60, rain: 0.25, snow: 0, wind: 0.15 };
    /* temperate */ return { clear: 0.75, rain: 0.15, snow: 0, wind: 0.10 };
  }

  // Mid season (weeks 5-9)
  if (week <= 9) {
    if (region === 'warm') return { clear: 0.80, rain: 0.15, snow: 0, wind: 0.05 };
    if (region === 'cold') return { clear: 0.50, rain: 0.22, snow: 0.08, wind: 0.20 };
    if (region === 'coastal') return { clear: 0.45, rain: 0.32, snow: 0, wind: 0.23 };
    /* temperate */ return { clear: 0.60, rain: 0.22, snow: 0.03, wind: 0.15 };
  }

  // Late season (weeks 10-14)
  if (week <= 14) {
    if (region === 'warm') return { clear: 0.75, rain: 0.18, snow: 0, wind: 0.07 };
    if (region === 'cold') return { clear: 0.30, rain: 0.20, snow: 0.25, wind: 0.25 };
    if (region === 'coastal') return { clear: 0.35, rain: 0.35, snow: 0.05, wind: 0.25 };
    /* temperate */ return { clear: 0.45, rain: 0.25, snow: 0.10, wind: 0.20 };
  }

  // Playoffs / late late season (weeks 15+)
  if (region === 'warm') return { clear: 0.70, rain: 0.20, snow: 0, wind: 0.10 };
  if (region === 'cold') return { clear: 0.20, rain: 0.15, snow: 0.35, wind: 0.30 };
  if (region === 'coastal') return { clear: 0.30, rain: 0.35, snow: 0.08, wind: 0.27 };
  /* temperate */ return { clear: 0.40, rain: 0.25, snow: 0.15, wind: 0.20 };
}

// ── Region Lookup ──────────────────────────────────────

export function getWeatherRegion(teamId: string): WeatherRegion {
  return TEAM_REGION_MAP[teamId] ?? 'temperate';
}

// ── Weather Generation ─────────────────────────────────

export function generateRegionalWeather(
  homeTeam: Team,
  week: number,
  rng: () => number,
): WeatherCondition {
  // Dome teams always dome
  if (homeTeam.stadiumType === 'dome') return 'dome';

  const region = getWeatherRegion(homeTeam.id);
  if (region === 'dome') return 'dome';

  const odds = getRegionWeatherOdds(region, week);
  const roll = rng();

  let cumulative = 0;
  cumulative += odds.snow;
  if (roll < cumulative) return 'snow';

  cumulative += odds.wind;
  if (roll < cumulative) return 'wind';

  cumulative += odds.rain;
  if (roll < cumulative) return 'rain';

  return 'clear';
}
