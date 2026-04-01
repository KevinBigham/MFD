/**
 * MFD Chemistry & System Fit System
 *
 * Team chemistry modifiers for game simulation and
 * weekly system fit progression/reset.
 */

import { RNG } from '../rng';
import { getPersonality, traitScalar } from './personality';
import { cl } from '../utils';
import type { Team, Player } from '../types';

// ── Chemistry Modifier ─────────────────────────────────

export function chemistryMod(team: Team): number {
  const roster = team.roster;
  if (!roster || roster.length === 0) return 0;

  let total = 0;
  for (const p of roster) total += (p.chemistry ?? 60);
  const avg = total / roster.length;

  if (avg >= 80) return 3;
  if (avg >= 70) return 1.5;
  if (avg >= 55) return 0;
  if (avg >= 40) return -1;
  return -2;
}

// ── System Fit Modifier ────────────────────────────────

export function systemFitMod(team: Team): number {
  const roster = team.roster;
  if (!roster || roster.length === 0) return 0;

  let total = 0;
  for (const p of roster) total += (p.systemFit ?? 30);
  const avg = total / roster.length;

  if (avg >= 75) return 0.02;
  if (avg >= 55) return 0.01;
  if (avg >= 35) return 0;
  return -0.01;
}

// ── Weekly System Fit Growth ───────────────────────────

export function updateSystemFit(team: Team): void {
  if (!team.roster) return;

  const hasGoodStrategist = team.staff?.hc?.ratings?.strategy
    ? team.staff.hc.ratings.strategy >= 75
    : false;

  for (const p of team.roster) {
    let growth = Math.floor(RNG.dev() * 3) + 1;
    const pers = getPersonality(p);

    if (hasGoodStrategist) growth += 1;
    growth += Math.round(cl(traitScalar(pers.workEthic) * 2, -1, 2));
    if (p.isStarter && pers.ambition >= 8) growth += 1;
    if (p.holdout && pers.greed >= 8) growth -= 2;

    growth = cl(growth, 0, 6);
    p.systemFit = cl((p.systemFit ?? 30) + growth, 0, 100);
  }
}

// ── Scheme Change Penalty ──────────────────────────────

export function resetSystemFit(team: Team, lossPct = 0.4): void {
  if (!team.roster) return;

  for (const p of team.roster) {
    const pers = getPersonality(p);
    let keepAdj = 0;

    if (pers.workEthic >= 8) keepAdj += 0.06;
    if (pers.loyalty >= 8) keepAdj += 0.04;
    if (p.holdout && pers.greed >= 8) keepAdj -= 0.08;

    const keepRate = cl(1 - lossPct + keepAdj, 0.2, 0.95);
    p.systemFit = Math.round((p.systemFit ?? 30) * keepRate);
  }
}
