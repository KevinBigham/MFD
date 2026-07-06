/**
 * Dynasty Window Meter — Calculates where a franchise is in its competitive window.
 *
 * Phases: Opening → Peaking → Closing → Rebuilding
 * Based on team OVR distribution, cap space, draft capital, and age curve.
 */
import type { GameState, Player, Team } from '../types';
import { getSalaryCap } from '../config';

// ── Types ──────────────────────────────────────────────

export type WindowPhase = 'opening' | 'peaking' | 'closing' | 'rebuilding';

export interface DynastyWindowResult {
  phase: WindowPhase;
  /** Overall window score 0-100 (higher = better competitive position) */
  score: number;
  /** Breakdown of contributing factors */
  factors: {
    rosterStrength: number;
    youthFactor: number;
    capHealth: number;
    draftCapital: number;
  };
  /** Human-readable description */
  description: string;
  /** Trend: how the window is shifting */
  trend: 'improving' | 'stable' | 'declining';
}

// ── Constants ──────────────────────────────────────────

const PRIME_AGE_MIN = 24;
const PRIME_AGE_MAX = 29;
const YOUNG_AGE_MAX = 25;
const VETERAN_AGE_MIN = 30;

// ── Calculation ────────────────────────────────────────

function rosterStrengthScore(roster: Player[]): number {
  if (roster.length === 0) return 30;
  const starters = roster.filter((p) => p.isStarter);
  const group = starters.length > 0 ? starters : roster.slice(0, 22);
  const avgOvr = group.reduce((sum, p) => sum + p.ovr, 0) / group.length;
  // Scale: 60 OVR = 0, 85 OVR = 100
  return Math.max(0, Math.min(100, (avgOvr - 60) * 4));
}

function youthScore(roster: Player[]): number {
  if (roster.length === 0) return 50;
  const starters = roster.filter((p) => p.isStarter);
  const group = starters.length > 0 ? starters : roster.slice(0, 22);

  let score = 0;
  for (const p of group) {
    if (p.age <= YOUNG_AGE_MAX) score += 6;
    else if (p.age <= PRIME_AGE_MAX) score += 4;
    else if (p.age >= VETERAN_AGE_MIN) score -= 2;
  }

  // Normalize to 0-100
  const maxPossible = group.length * 6;
  return Math.max(0, Math.min(100, (score / maxPossible) * 100));
}

function capHealthScore(team: Team, year: number, gameState?: GameState | null): number {
  const cap = getSalaryCap(year, gameState);
  const totalSalary = team.roster.reduce((sum, p) => {
    if (!p.contract) return sum;
    return sum + (p.contract.baseSalary ?? 0);
  }, 0);

  const capUsage = totalSalary / cap;
  // 60% usage = great (100 score), 95%+ = terrible (0 score)
  if (capUsage <= 0.6) return 100;
  if (capUsage >= 0.95) return 0;
  return Math.round((0.95 - capUsage) / 0.35 * 100);
}

function draftCapitalScore(draftPicks: number): number {
  // 7 picks = normal, 10+ = great, 4 or less = bad
  if (draftPicks >= 10) return 100;
  if (draftPicks <= 3) return 10;
  return Math.round(((draftPicks - 3) / 7) * 90 + 10);
}

function determinePhase(score: number, youth: number, rosterStr: number): WindowPhase {
  // Need strong roster AND youth to be peaking
  if (score >= 65 && rosterStr >= 60 && youth >= 40) return 'peaking';
  if (score >= 45 && youth >= 55) return 'opening';
  if (score >= 35 && youth < 40) return 'closing';
  if (score < 35 || rosterStr < 20) return 'rebuilding';
  if (youth >= 55) return 'opening';
  return 'closing';
}

function determineTrend(
  rosterStr: number,
  youth: number,
): DynastyWindowResult['trend'] {
  if (youth >= 60 && rosterStr >= 50) return 'improving';
  if (youth <= 35 || rosterStr <= 30) return 'declining';
  return 'stable';
}

const PHASE_DESCRIPTIONS: Record<WindowPhase, string> = {
  opening: 'Your window is OPENING — young talent is developing and the future is bright.',
  peaking: 'You are in your CHAMPIONSHIP WINDOW — this roster is built to win NOW.',
  closing: 'Your window is CLOSING — aging stars and cap pressure are mounting.',
  rebuilding: 'REBUILD MODE — time to accumulate draft capital and develop young players.',
};

// ── Public API ─────────────────────────────────────────

/**
 * Calculate the dynasty window for a team.
 */
export function calculateDynastyWindow(
  team: Team,
  year: number,
  draftPicks?: number,
  gameState?: GameState | null,
): DynastyWindowResult {
  const rosterStr = rosterStrengthScore(team.roster);
  const youth = youthScore(team.roster);
  const cap = capHealthScore(team, year, gameState);
  const draft = draftCapitalScore(draftPicks ?? 7);

  // Weighted composite score
  const score = Math.round(
    rosterStr * 0.35 + youth * 0.25 + cap * 0.20 + draft * 0.20,
  );

  const phase = determinePhase(score, youth, rosterStr);
  const trend = determineTrend(rosterStr, youth);
  const description = PHASE_DESCRIPTIONS[phase];

  return {
    phase,
    score,
    factors: {
      rosterStrength: Math.round(rosterStr),
      youthFactor: Math.round(youth),
      capHealth: Math.round(cap),
      draftCapital: Math.round(draft),
    },
    description,
    trend,
  };
}

/**
 * Get a short label for display in the UI.
 */
export function windowPhaseLabel(phase: WindowPhase): string {
  switch (phase) {
    case 'opening': return 'WINDOW OPENING';
    case 'peaking': return 'WIN NOW';
    case 'closing': return 'WINDOW CLOSING';
    case 'rebuilding': return 'REBUILD';
  }
}

/**
 * Get the accent color for a window phase.
 */
export function windowPhaseColor(phase: WindowPhase): string {
  switch (phase) {
    case 'opening': return 'var(--mfd-cyan)';
    case 'peaking': return 'var(--mfd-gold)';
    case 'closing': return 'var(--mfd-red)';
    case 'rebuilding': return 'var(--mfd-text-dim, #666)';
  }
}
