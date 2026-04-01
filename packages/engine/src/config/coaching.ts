/**
 * MFD Coaching System
 *
 * Archetypes, boosts, traits, trait pools, and clique types.
 */

export type CoachRole = 'HC' | 'OC' | 'DC';

export const ARCHETYPES: Record<CoachRole, readonly string[]> = {
  HC: ['Strategist', 'Motivator', 'Disciplinarian'],
  OC: ['QB Guru', 'Run Coordinator', 'Air Attack'],
  DC: ['Blitz Master', 'DB Whisperer', 'Run Stuffer'],
};

export const ARCH_BOOST: Record<string, Record<string, number>> = {
  'QB Guru': { arm: 3, accuracy: 3 },
  'Run Coordinator': { runBlock: 3, power: 3 },
  'Air Attack': { routeRunning: 3, catching: 3 },
  'Blitz Master': { passRush: 3 },
  'DB Whisperer': { coverage: 3, ballSkills: 2 },
  'Run Stuffer': { runStop: 3, tackle: 2 },
  'Strategist': { awareness: 2 },
  'Motivator': { speed: 1, toughness: 1 },
  'Disciplinarian': { toughness: 2, awareness: 1 },
};

export interface CoachTraitDef {
  label: string;
  desc: string;
  effects: Record<string, number>;
}

export const COACH_TRAITS: Record<string, CoachTraitDef> = {
  AGGRESSIVE_4TH: {
    label: 'Aggressive 4th',
    desc: 'Goes for it on 4th down more often',
    effects: { stallReduction: 0.03, bigPlayBoost: 0.02 },
  },
  REDZONE_SCRIPT: {
    label: 'Red Zone Script',
    desc: 'Deadly inside the 20',
    effects: { rzTdBoost: 4 },
  },
  PASS_PRO_TECH: {
    label: 'Pass Pro Tech',
    desc: 'O-line plays above their rating',
    effects: { pocketBoost: 0.04 },
  },
  BLITZ_PACKAGES: {
    label: 'Blitz Packages',
    desc: 'Creative pressure schemes',
    effects: { pressureBoost: 0.05, bigPlayAllowed: 0.02 },
  },
  BALL_HAWKS: {
    label: 'Ball Hawks',
    desc: 'Secondary creates turnovers',
    effects: { intBoost: 0.015 },
  },
  DISCIPLINE: {
    label: 'Discipline',
    desc: 'Fewer mistakes, stable morale',
    effects: { stallReduction: 0.02, moraleStability: 0.08, intReduction: 0.01 },
  },
  DEV_FACTORY: {
    label: 'Dev Factory',
    desc: 'Young players develop faster',
    effects: { devRate: 0.12 },
  },
  QB_WHISPERER: {
    label: 'QB Whisperer',
    desc: 'QBs play above their level',
    effects: { qbBoost: 3 },
  },
  FILM_JUNKIE: {
    label: 'Film Junkie',
    desc: 'Better preparation = fewer surprises',
    effects: { stallReduction: 0.02, counterBoost: 1 },
  },
  PLAYER_COACH: {
    label: "Player's Coach",
    desc: 'Players love playing for this guy',
    effects: { moraleBoost: 5, devRate: 0.06 },
  },
};

export const ARCH_TRAIT_POOLS: Record<string, readonly string[]> = {
  'Strategist': ['FILM_JUNKIE', 'AGGRESSIVE_4TH', 'REDZONE_SCRIPT', 'DISCIPLINE'],
  'Motivator': ['PLAYER_COACH', 'DEV_FACTORY', 'DISCIPLINE'],
  'Disciplinarian': ['DISCIPLINE', 'FILM_JUNKIE', 'PASS_PRO_TECH'],
  'QB Guru': ['QB_WHISPERER', 'PASS_PRO_TECH', 'REDZONE_SCRIPT'],
  'Run Coordinator': ['AGGRESSIVE_4TH', 'PASS_PRO_TECH', 'FILM_JUNKIE'],
  'Air Attack': ['REDZONE_SCRIPT', 'AGGRESSIVE_4TH', 'QB_WHISPERER'],
  'Blitz Master': ['BLITZ_PACKAGES', 'AGGRESSIVE_4TH', 'BALL_HAWKS'],
  'DB Whisperer': ['BALL_HAWKS', 'DISCIPLINE', 'FILM_JUNKIE'],
  'Run Stuffer': ['DISCIPLINE', 'BLITZ_PACKAGES', 'FILM_JUNKIE'],
};

export interface CliqueType {
  id: number;
  label: string;
  desc: string;
}

export const CLIQUE_TYPES: readonly CliqueType[] = [
  { id: 0, label: 'Vets', desc: 'Experienced players who set the culture' },
  { id: 1, label: 'Young Core', desc: 'Hungry rookies and sophomores building chemistry' },
  { id: 2, label: 'Stars', desc: 'Top talent who expect to be the focal point' },
];
