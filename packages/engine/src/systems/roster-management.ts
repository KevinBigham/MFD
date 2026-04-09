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

/** Number of starters per position */
export const STARTER_SLOTS: Readonly<Record<Position, number>> = {
  QB: 1, RB: 1, WR: 3, TE: 1, OL: 5,
  DL: 4, LB: 3, CB: 3, S: 2, K: 1, P: 1,
};

const MAX_BATTLE_GAP = 5;
const MAX_BATTLES = 8;

export interface PositionBattle {
  pos: Position;
  /** The slot being contested, e.g. "WR3" or "Starting OL5" */
  slotLabel: string;
  /** e.g. "Last starter spot", "Backup pushing starter" */
  battleType: 'starter_boundary' | 'backup_push' | 'starter_competition';
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
  /** 1-based depth rank at this position */
  depthRank: number;
  isStarter: boolean;
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

    const slots = STARTER_SLOTS[pos] ?? 1;
    const useStarterCompetition = pos === 'QB' && slots === 1;

    // Priority 1: Starter/backup boundary — the last starter vs first backup
    if (healthy.length > slots && !useStarterCompetition) {
      const lastStarter = healthy[slots - 1]!;
      const firstBackup = healthy[slots]!;
      const gap = lastStarter.ovr - firstBackup.ovr;
      const isCompetitive = gap <= MAX_BATTLE_GAP
        || (firstBackup.age <= 24 && (firstBackup.pot ?? 0) >= lastStarter.ovr);

      if (isCompetitive) {
        battles.push(makeBattle(pos, lastStarter, firstBackup, slots - 1, slots, slots, 'starter_boundary'));
      }
    }

    // Priority 2: Backup pushing deeper into the starter group
    // Check if backup #1 or #2 is competitive with a starter above the boundary
    for (let backupIdx = slots; backupIdx < Math.min(healthy.length, slots + 2); backupIdx++) {
      const backup = healthy[backupIdx]!;
      // Compare against starters above the boundary (skip last starter, already checked)
      for (let starterIdx = Math.max(0, slots - 3); starterIdx < slots - 1; starterIdx++) {
        const starter = healthy[starterIdx]!;
        const isCompetitive = backup.age <= 24 && (backup.pot ?? 0) >= starter.ovr && starter.ovr - backup.ovr <= 8;
        if (isCompetitive) {
          battles.push(makeBattle(pos, starter, backup, starterIdx, backupIdx, slots, 'backup_push'));
          break; // One push battle per backup
        }
      }
    }

    // Priority 3: Within-starter competition — only for positions with 1 starter (QB)
    if (useStarterCompetition && healthy.length >= 2) {
      const gap = healthy[0]!.ovr - healthy[1]!.ovr;
      const isCompetitive = gap <= MAX_BATTLE_GAP
        || (healthy[1]!.age <= 24 && (healthy[1]!.pot ?? 0) >= healthy[0]!.ovr);
      if (isCompetitive && !battles.some((b) => b.pos === pos)) {
        battles.push(makeBattle(pos, healthy[0]!, healthy[1]!, 0, 1, slots, 'starter_competition'));
      }
    }
  }

  // Boundary battles first, then push battles, then competition
  const typeOrder: Record<PositionBattle['battleType'], number> = {
    starter_boundary: 0, backup_push: 1, starter_competition: 2,
  };
  return battles
    .sort((a, b) => typeOrder[a.battleType] - typeOrder[b.battleType]
      || Math.abs(a.incumbent.ovr - a.challenger.ovr) - Math.abs(b.incumbent.ovr - b.challenger.ovr))
    .slice(0, MAX_BATTLES);
}

function makeBattle(
  pos: Position, incumbent: Player, challenger: Player,
  incumbentIdx: number, challengerIdx: number, slots: number,
  battleType: PositionBattle['battleType'],
): PositionBattle {
  const slotNum = incumbentIdx + 1;
  const slotLabel = battleType === 'starter_boundary'
    ? `${pos}${slotNum} Spot`
    : battleType === 'backup_push'
      ? `${pos}${slotNum} Starter`
      : `Starting ${pos}`;

  return {
    pos, slotLabel, battleType,
    incumbent: {
      id: incumbent.id, name: incumbent.name, ovr: incumbent.ovr,
      age: incumbent.age, pot: incumbent.pot ?? 0, salary: v36CapHit(incumbent.contract),
      depthRank: incumbentIdx + 1, isStarter: incumbentIdx < slots,
    },
    challenger: {
      id: challenger.id, name: challenger.name, ovr: challenger.ovr,
      age: challenger.age, pot: challenger.pot ?? 0, salary: v36CapHit(challenger.contract),
      depthRank: challengerIdx + 1, isStarter: challengerIdx < slots,
    },
    resolved: false,
    winner: null,
  };
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
