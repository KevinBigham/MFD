/**
 * MFD Roster Management System
 *
 * Position battle detection and cut advisor with
 * value-based recommendations.
 */

import { v36CapHit, v36DeadIfCut } from './contract-helpers';
import { ROSTER_CAP } from '../config/cap-math';
import type { Player, Team, Position } from '../types';

// ── Position Battle Detection ──────────────────────────

export interface PositionBattle {
  pos: Position;
  incumbent: BattlePlayer;
  challenger: BattlePlayer;
  resolved: boolean;
  winner: string | null;
}

interface BattlePlayer {
  id: string;
  name: string;
  ovr: number;
  age: number;
  pot: number;
  salary: number;
}

export function detectPositionBattles(roster: readonly Player[]): PositionBattle[] {
  const battles: PositionBattle[] = [];
  const byPos: Partial<Record<Position, Player[]>> = {};

  for (const p of roster) {
    if (!byPos[p.pos]) byPos[p.pos] = [];
    byPos[p.pos]!.push(p);
  }

  for (const [pos, players] of Object.entries(byPos) as [Position, Player[]][]) {
    if (pos === 'K' || pos === 'P') continue;

    const healthy = players
      .filter((p) => !p.injury || !p.injury.gamesOut)
      .sort((a, b) => b.ovr - a.ovr);

    if (healthy.length < 2) continue;

    const starter = healthy[0]!;
    const challenger = healthy[1]!;
    const gap = starter.ovr - challenger.ovr;

    const isCompetitive = gap <= 5 || (challenger.age <= 24 && (challenger.pot ?? 0) >= starter.ovr);

    if (isCompetitive) {
      battles.push({
        pos,
        incumbent: {
          id: starter.id, name: starter.name, ovr: starter.ovr,
          age: starter.age, pot: starter.pot ?? 0, salary: v36CapHit(starter.contract),
        },
        challenger: {
          id: challenger.id, name: challenger.name, ovr: challenger.ovr,
          age: challenger.age, pot: challenger.pot ?? 0, salary: v36CapHit(challenger.contract),
        },
        resolved: false,
        winner: null,
      });
    }
  }

  return battles.slice(0, 4);
}

// ── Cut Advisor ────────────────────────────────────────

export interface CutSuggestion {
  id: string;
  name: string;
  pos: Position;
  ovr: number;
  age: number;
  salary: number;
  deadMoney: number;
  reason: string;
}

export interface CutAdvisorResult {
  overBy: number;
  suggestions: CutSuggestion[];
}

export function buildCutAdvisor(
  roster: readonly Player[],
  rosterCap = ROSTER_CAP,
): CutAdvisorResult | null {
  const overBy = roster.length - rosterCap;
  if (overBy <= 0) return null;

  const scored = roster.map((p) => {
    let score = p.ovr;
    if (p.isStarter) score += 20;
    if (p.pot > p.ovr) score += 5;
    if (p.age <= 24) score += 5;

    const salary = v36CapHit(p.contract);
    if (p.ovr < 65) score -= salary * 2;

    return { player: p, score, salary };
  });

  scored.sort((a, b) => a.score - b.score);

  const suggestions: CutSuggestion[] = scored
    .slice(0, Math.min(overBy + 3, 10))
    .map(({ player: p, salary }) => {
      const deadMoney = v36DeadIfCut(p.contract);
      const reason = p.ovr < 60 ? 'Low OVR'
        : (p.ovr < 65 && salary > 3) ? 'Overpaid backup'
        : (!p.isStarter && p.age >= 30) ? 'Aging non-starter'
        : 'Roster crunch';

      return {
        id: p.id, name: p.name, pos: p.pos,
        ovr: p.ovr, age: p.age, salary, deadMoney, reason,
      };
    });

  return { overBy, suggestions };
}
