/**
 * MFD Player Archetypes & Aging System
 *
 * Position-specific archetype classification and archetype-modified aging curves.
 */

import type { Position, PlayerRatings, PlayerArchetype } from '../types';

export interface AgeCurve {
  prime: [number, number];
  cliff: number;
  decayRate: number;
}

export const AGE_CURVES: Record<Position, AgeCurve> = {
  QB: { prime: [26, 33], cliff: 36, decayRate: 0.9 },
  RB: { prime: [23, 27], cliff: 29, decayRate: 2.4 },
  WR: { prime: [24, 30], cliff: 32, decayRate: 1.5 },
  TE: { prime: [25, 31], cliff: 32, decayRate: 1.3 },
  OL: { prime: [25, 32], cliff: 34, decayRate: 1.0 },
  DL: { prime: [24, 30], cliff: 32, decayRate: 1.6 },
  LB: { prime: [24, 29], cliff: 31, decayRate: 1.7 },
  CB: { prime: [23, 28], cliff: 30, decayRate: 2.0 },
  S:  { prime: [24, 30], cliff: 31, decayRate: 1.5 },
  K:  { prime: [24, 38], cliff: 42, decayRate: 0.4 },
  P:  { prime: [24, 38], cliff: 42, decayRate: 0.4 },
};

interface ArchetypeDef {
  id: string;
  label: string;
  desc: string;
  keys: string[];
}

const QB_ARCHETYPES: ArchetypeDef[] = [
  { id: 'pocket_passer', label: 'Pocket Passer', desc: 'Wins from the pocket with accuracy, poise, and vision.', keys: ['pocketPresence', 'accuracy', 'fieldVision', 'decisionSpeed'] },
  { id: 'dual_threat', label: 'Dual Threat', desc: 'Creates pressure with legs and breaks the pocket.', keys: ['speed', 'scramble', 'acceleration', 'agility'] },
  { id: 'game_manager', label: 'Game Manager', desc: 'Protects the ball and keeps the offense on schedule.', keys: ['awareness', 'shortAccuracy', 'decisionSpeed', 'leadership'] },
  { id: 'gunslinger', label: 'Gunslinger', desc: 'Attacks downfield with big arm and aggressive throws.', keys: ['arm', 'deepAccuracy', 'throwOnRun', 'release'] },
];

const RB_ARCHETYPES: ArchetypeDef[] = [
  { id: 'power_back', label: 'Power Back', desc: 'Runs through contact and finishes falling forward.', keys: ['power', 'truckPower', 'breakTackle', 'strength'] },
  { id: 'speed_back', label: 'Speed Back', desc: 'Threatens the edge with burst and change of direction.', keys: ['speed', 'acceleration', 'changeOfDirection', 'elusiveness'] },
  { id: 'receiving_back', label: 'Receiving Back', desc: 'A mismatch in space as a route runner and pass catcher.', keys: ['catching', 'routeRunning', 'ballCarrierVision', 'passProtection'] },
  { id: 'all_purpose', label: 'All-Purpose', desc: 'Does a bit of everything: vision, elusiveness, and hands.', keys: ['ballCarrierVision', 'elusiveness', 'catching', 'speed'] },
];

const WR_ARCHETYPES: ArchetypeDef[] = [
  { id: 'deep_threat', label: 'Deep Threat', desc: 'Stretches the field and wins vertically.', keys: ['speed', 'deepRoute', 'separation', 'spectacularCatch'] },
  { id: 'possession', label: 'Possession', desc: 'Moves the chains with reliable hands and routes.', keys: ['catching', 'catchInTraffic', 'shortRoute', 'awareness'] },
  { id: 'slot', label: 'Slot', desc: 'Quick separator underneath with YAC potential.', keys: ['agility', 'shortRoute', 'release', 'yacAbility'] },
  { id: 'red_zone', label: 'Red Zone Target', desc: 'Wins contested catches near the goal line.', keys: ['jumping', 'catchInTraffic', 'spectacularCatch', 'strength'] },
];

const TE_ARCHETYPES: ArchetypeDef[] = [
  { id: 'blocking_te', label: 'Blocking TE', desc: 'Sets edges, moves bodies, and protects the pocket.', keys: ['blocking', 'runBlocking', 'impactBlocking', 'passProtection'] },
  { id: 'receiving_te', label: 'Receiving TE', desc: 'Primary receiving threat who attacks seams.', keys: ['catching', 'routeRunning', 'speed', 'catchInTraffic'] },
  { id: 'hybrid_te', label: 'Hybrid', desc: 'Balanced two-way TE: reliable hands + functional blocking.', keys: ['catching', 'blocking', 'routeRunning', 'impactBlocking'] },
];

const OL_ARCHETYPES: ArchetypeDef[] = [
  { id: 'pass_protector', label: 'Pass Protector', desc: 'Anchors vs rush and keeps the QB clean.', keys: ['passBlock', 'passBlockFinesse', 'anchorStrength', 'footwork'] },
  { id: 'road_grader', label: 'Road Grader', desc: 'Creates movement in the run game and finishes blocks.', keys: ['runBlock', 'impactBlocking', 'strength', 'pullBlock'] },
  { id: 'technician', label: 'Technician', desc: 'Wins with technique, IQ, and assignment consistency.', keys: ['handTechnique', 'footwork', 'assignmentIQ', 'awareness'] },
];

const DL_ARCHETYPES: ArchetypeDef[] = [
  { id: 'power_rusher', label: 'Power Rusher', desc: 'Collapses pockets with strength and power moves.', keys: ['strength', 'powerMoves', 'bullRush', 'blockShedding'] },
  { id: 'speed_rusher', label: 'Speed Rusher', desc: 'Wins with get-off, bend, and pursuit.', keys: ['speed', 'acceleration', 'finesseMoves', 'pursuit'] },
  { id: 'run_stuffer', label: 'Run Stuffer', desc: 'Holds gaps and erases inside runs.', keys: ['runStop', 'blockShedding', 'strength', 'toughness'] },
];

const LB_ARCHETYPES: ArchetypeDef[] = [
  { id: 'coverage_lb', label: 'Coverage LB', desc: 'Range + instincts to handle backs and TEs.', keys: ['coverage', 'zoneCoverage', 'speed', 'awareness'] },
  { id: 'pass_rush_lb', label: 'Pass Rush LB', desc: 'Pressure specialist with burst and pursuit.', keys: ['passRush', 'acceleration', 'blockShedding', 'pursuit'] },
  { id: 'thumper', label: 'Thumper', desc: 'Physical downhill tackler who sets the tone.', keys: ['tackle', 'hitPower', 'strength', 'toughness'] },
];

const CB_ARCHETYPES: ArchetypeDef[] = [
  { id: 'lockdown', label: 'Lockdown', desc: 'Sticks in coverage and limits separation.', keys: ['manCoverage', 'coverage', 'speed', 'agility'] },
  { id: 'ball_hawk', label: 'Ball Hawk', desc: 'Plays the ball and creates turnovers.', keys: ['ballSkills', 'zoneCoverage', 'awareness', 'jumping'] },
  { id: 'physical_cb', label: 'Physical', desc: 'Disrupts routes and tackles aggressively.', keys: ['pressAbility', 'hitPower', 'tackling', 'strength'] },
];

const S_ARCHETYPES: ArchetypeDef[] = [
  { id: 'free_safety', label: 'Free Safety', desc: 'Deep range and instincts as the last line.', keys: ['zoneCoverage', 'ballSkills', 'speed', 'awareness'] },
  { id: 'strong_safety', label: 'Strong Safety', desc: 'Box defender who tackles and hits.', keys: ['hitPower', 'tackling', 'strength', 'toughness'] },
  { id: 'hybrid_s', label: 'Hybrid', desc: 'Can cover and support the run without being a liability.', keys: ['coverage', 'zoneCoverage', 'tackling', 'speed'] },
];

const POS_ARCHETYPES: Partial<Record<Position, ArchetypeDef[]>> = {
  QB: QB_ARCHETYPES, RB: RB_ARCHETYPES, WR: WR_ARCHETYPES,
  TE: TE_ARCHETYPES, OL: OL_ARCHETYPES, DL: DL_ARCHETYPES,
  LB: LB_ARCHETYPES, CB: CB_ARCHETYPES, S: S_ARCHETYPES,
};

function scoreKeys(ratings: PlayerRatings, keys: string[]): number {
  let s = 0;
  for (const k of keys) {
    s += ((ratings[k] ?? 50) - 50);
  }
  return s;
}

/** Classify a player into their best-fit archetype. */
export function classifyArchetype(pos: Position, ratings: PlayerRatings): PlayerArchetype | null {
  const archetypes = POS_ARCHETYPES[pos];
  if (!archetypes) return null;

  let best: ArchetypeDef | null = null;
  let bestScore = -Infinity;

  for (const a of archetypes) {
    const s = scoreKeys(ratings, a.keys);
    if (s > bestScore) {
      bestScore = s;
      best = a;
    }
  }

  if (!best) return null;
  return { archetype: best.id, label: best.label, description: best.desc };
}

// ── Archetype Aging Mods ────────────────────────────────

interface AgingMod {
  cliffShift: number;
  decayMult: number;
}

const ARCHETYPE_AGING_MODS: Record<string, AgingMod> = {
  pocket_passer: { cliffShift: 1, decayMult: 0.85 },
  dual_threat: { cliffShift: -2, decayMult: 1.4 },
  game_manager: { cliffShift: 2, decayMult: 0.7 },
  gunslinger: { cliffShift: 0, decayMult: 1.0 },
  power_back: { cliffShift: 1, decayMult: 0.8 },
  speed_back: { cliffShift: -1, decayMult: 1.5 },
  receiving_back: { cliffShift: 1, decayMult: 0.85 },
  all_purpose: { cliffShift: 0, decayMult: 1.1 },
  deep_threat: { cliffShift: -1, decayMult: 1.4 },
  possession: { cliffShift: 2, decayMult: 0.75 },
  slot: { cliffShift: 0, decayMult: 1.1 },
  red_zone: { cliffShift: 1, decayMult: 0.9 },
  blocking_te: { cliffShift: 1, decayMult: 0.8 },
  receiving_te: { cliffShift: 0, decayMult: 1.1 },
  hybrid_te: { cliffShift: 0, decayMult: 1.0 },
  pass_protector: { cliffShift: 1, decayMult: 0.85 },
  road_grader: { cliffShift: 0, decayMult: 1.0 },
  technician: { cliffShift: 2, decayMult: 0.7 },
  power_rusher: { cliffShift: 0, decayMult: 0.9 },
  speed_rusher: { cliffShift: -1, decayMult: 1.35 },
  run_stuffer: { cliffShift: 1, decayMult: 0.8 },
  coverage_lb: { cliffShift: -1, decayMult: 1.2 },
  pass_rush_lb: { cliffShift: 0, decayMult: 1.15 },
  thumper: { cliffShift: 1, decayMult: 0.85 },
  lockdown: { cliffShift: -1, decayMult: 1.3 },
  ball_hawk: { cliffShift: 1, decayMult: 0.85 },
  physical_cb: { cliffShift: 0, decayMult: 1.0 },
  free_safety: { cliffShift: 0, decayMult: 1.15 },
  strong_safety: { cliffShift: 1, decayMult: 0.85 },
  hybrid_s: { cliffShift: 0, decayMult: 1.0 },
};

/** Get the aging curve for a player, modified by their archetype. */
export function getAgeCurve(pos: Position, archetypeId: string | null): AgeCurve {
  const base = AGE_CURVES[pos] ?? AGE_CURVES.WR;
  if (!archetypeId || !ARCHETYPE_AGING_MODS[archetypeId]) return base;
  const mod = ARCHETYPE_AGING_MODS[archetypeId];
  return {
    prime: [base.prime[0], base.prime[1] + Math.round(mod.cliffShift * 0.5)],
    cliff: base.cliff + mod.cliffShift,
    decayRate: Math.round(base.decayRate * mod.decayMult * 100) / 100,
  };
}
