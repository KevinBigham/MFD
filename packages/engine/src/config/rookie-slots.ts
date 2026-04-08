/**
 * MFD Rookie Slot Table
 *
 * Per-pick salary/bonus/years based on draft position.
 * Replaces the old formula-based rookieContract() with a realistic
 * 10-tier slot system inspired by NFL rookie wage scale.
 */

import type { RookieSlot } from '../types';

// ── Slot Table ────────────────────────────────────────────

const ROOKIE_SLOTS: readonly RookieSlot[] = [
  // Tier 1: #1-3 — franchise QB money
  { tier: 1, salary: 8.0, signingBonus: 18.0, years: 4, guaranteed: 32.0, optionYear: true },
  // Tier 2: #4-8 — premium picks
  { tier: 2, salary: 7.0, signingBonus: 14.0, years: 4, guaranteed: 25.0, optionYear: true },
  // Tier 3: #9-16 — solid first rounders
  { tier: 3, salary: 5.5, signingBonus: 10.0, years: 4, guaranteed: 18.0, optionYear: true },
  // Tier 4: #17-24 — late first round
  { tier: 4, salary: 4.0, signingBonus: 7.0, years: 4, guaranteed: 12.0, optionYear: false },
  // Tier 5: #25-32 — end of first round
  { tier: 5, salary: 3.0, signingBonus: 5.0, years: 4, guaranteed: 8.0, optionYear: false },
  // Tier 6: Round 2
  { tier: 6, salary: 2.2, signingBonus: 3.0, years: 4, guaranteed: 5.5, optionYear: false },
  // Tier 7: Round 3
  { tier: 7, salary: 1.5, signingBonus: 1.5, years: 4, guaranteed: 3.0, optionYear: false },
  // Tier 8: Round 4
  { tier: 8, salary: 1.1, signingBonus: 0.8, years: 3, guaranteed: 1.5, optionYear: false },
  // Tier 9: Rounds 5-6
  { tier: 9, salary: 0.9, signingBonus: 0.5, years: 3, guaranteed: 1.0, optionYear: false },
  // Tier 10: Round 7
  { tier: 10, salary: 0.8, signingBonus: 0.3, years: 3, guaranteed: 0.8, optionYear: false },
] as const;

// ── Tier Lookup ───────────────────────────────────────────

function tierForPick(round: number, pick: number): number {
  if (round === 1) {
    if (pick <= 3) return 1;
    if (pick <= 8) return 2;
    if (pick <= 16) return 3;
    if (pick <= 24) return 4;
    return 5;
  }
  if (round === 2) return 6;
  if (round === 3) return 7;
  if (round === 4) return 8;
  if (round <= 6) return 9;
  return 10;
}

// ── Public API ────────────────────────────────────────────

export function getRookieSlot(round: number, pick: number): RookieSlot {
  const tier = tierForPick(round, pick);
  return ROOKIE_SLOTS[tier - 1]!;
}

export function rookieSlotContract(
  round: number,
  pick: number,
): { salary: number; years: number; signingBonus: number; guaranteed: number } {
  const slot = getRookieSlot(round, pick);
  return {
    salary: slot.salary,
    years: slot.years,
    signingBonus: slot.signingBonus,
    guaranteed: slot.guaranteed,
  };
}
