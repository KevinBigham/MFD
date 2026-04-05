/**
 * MFD Atmosphere Engine
 *
 * Calculates crowd energy, hostility, and noise for each game.
 * Feeds bonuses/penalties into SimGameContext via teamOvrBonus.
 */

import type { GameState, Team, WeatherCondition } from '../types';
import { cl } from '../utils';

// ── Constants ──────────────────────────────────────────

const PLAYOFF_ENERGY_BONUS: Record<string, number> = {
  wild_card: 15,
  divisional: 25,
  conference: 35,
  super_bowl: 50,
};

const INTENSITY_MAP: Record<string, AtmosphereIntensity> = {
  wild_card: 'playoff',
  divisional: 'playoff',
  conference: 'conference_championship',
  super_bowl: 'super_bowl',
};

// ── Types ──────────────────────────────────────────────

export type AtmosphereIntensity =
  | 'regular'
  | 'rivalry'
  | 'playoff'
  | 'conference_championship'
  | 'super_bowl';

export interface AtmosphereContext {
  crowdEnergy: number;
  hostility: number;
  noise: number;
  intensity: AtmosphereIntensity;
  factors: string[];
}

export interface AtmosphereBonus {
  homeOvrBonus: number;
  awayOvrPenalty: number;
}

// ── Crowd Energy ───────────────────────────────────────

export function getCrowdEnergy(
  team: Team,
  week: number,
  record: { wins: number; losses: number },
): number {
  const gamesPlayed = record.wins + record.losses;
  const winPct = gamesPlayed > 0 ? record.wins / gamesPlayed : 0.5;

  // Base energy from winning (30-70 range)
  let energy = 30 + Math.round(winPct * 40);

  // Fanbase boost from franchise identity (0-15)
  const fanbase = team.franchiseIdentity?.fanbase ?? 50;
  energy += Math.round(fanbase / 7);

  // Dome baseline boost (+5 — enclosed = louder)
  if (team.stadiumType === 'dome') energy += 5;

  // Undefeated bonus
  if (record.wins > 0 && record.losses === 0 && gamesPlayed >= 3) energy += 10;

  // Late-season momentum (weeks 14+)
  if (week >= 14 && winPct >= 0.6) energy += 8;

  // Elimination-feel game (losing record late)
  if (week >= 12 && record.losses > record.wins) energy += 5;

  return cl(energy, 10, 100);
}

// ── Calculate Atmosphere ───────────────────────────────

export function calculateAtmosphere(
  game: GameState,
  homeTeam: Team,
  awayTeam: Team,
  week: number,
  isPlayoff: boolean,
  playoffRound?: string,
): AtmosphereContext {
  const factors: string[] = [];
  let energy = getCrowdEnergy(homeTeam, week, { wins: homeTeam.wins, losses: homeTeam.losses });

  // Playoff scaling
  if (isPlayoff && playoffRound) {
    const bonus = PLAYOFF_ENERGY_BONUS[playoffRound] ?? 15;
    energy = cl(energy + bonus, 0, 100);
    factors.push('playoff atmosphere');
    if (playoffRound === 'super_bowl') factors.push('Super Bowl');
    if (playoffRound === 'conference') factors.push('conference championship');
  }

  // Rivalry boost
  const rivalryHeat = homeTeam.rivals?.[awayTeam.id]?.heat ?? 0;
  const isRivalry = rivalryHeat >= 6;
  if (isRivalry) {
    energy = cl(energy + Math.min(rivalryHeat, 15), 0, 100);
    factors.push('rivalry game');
  }

  // Sold out check
  const attendance = homeTeam.franchiseIdentity?.attendance ?? 0.7;
  if (attendance >= 0.95) factors.push('sold out');
  if (attendance < 0.5) factors.push('sparse crowd');

  // Weather factors
  if (homeTeam.stadiumType === 'dome') {
    factors.push('dome');
  }

  // High-energy factors
  if (energy >= 90) factors.push('electric atmosphere');
  if (homeTeam.wins >= 10 && homeTeam.losses <= 2) factors.push('dominant home team');

  // Calculate hostility (how hard for away team)
  let hostility = Math.round(energy * 0.8);
  if (isRivalry) hostility = cl(hostility + Math.min(rivalryHeat * 2, 20), 0, 100);
  if (isPlayoff) hostility = cl(hostility + 10, 0, 100);

  // Noise level (affects away passing)
  let noise = Math.round(energy * 0.7);
  if (homeTeam.stadiumType === 'dome') noise = cl(noise + 10, 0, 100);

  // Determine intensity
  let intensity: AtmosphereIntensity = 'regular';
  if (isPlayoff && playoffRound) {
    intensity = INTENSITY_MAP[playoffRound] ?? 'playoff';
  } else if (isRivalry) {
    intensity = 'rivalry';
  }

  return {
    crowdEnergy: energy,
    hostility,
    noise,
    intensity,
    factors,
  };
}

// ── Bonus Calculation ──────────────────────────────────

export function getAtmosphereBonus(atmosphere: AtmosphereContext): AtmosphereBonus {
  // Home bonus tiers
  let homeOvrBonus = 0;
  if (atmosphere.crowdEnergy >= 90) homeOvrBonus = 3;
  else if (atmosphere.crowdEnergy >= 75) homeOvrBonus = 2;
  else if (atmosphere.crowdEnergy >= 50) homeOvrBonus = 1;

  // Away penalty tiers
  let awayOvrPenalty = 0;
  if (atmosphere.hostility >= 80) awayOvrPenalty = -3;
  else if (atmosphere.hostility >= 60) awayOvrPenalty = -2;
  else if (atmosphere.hostility >= 30) awayOvrPenalty = -1;

  return { homeOvrBonus, awayOvrPenalty };
}
