/**
 * MFD Owner Goals System
 *
 * Defines owner goal templates and evaluation functions.
 * Goals are set at season start and checked at season end.
 */

import type { Team } from '../types';

// ── Owner Types ────────────────────────────────────────

export type OwnerType = 'patient' | 'win_now' | 'penny';

export const OWNER_TYPES: Record<OwnerType, { label: string; desc: string }> = {
  patient: { label: 'Patient', desc: 'Willing to wait for long-term results.' },
  win_now: { label: 'Win Now', desc: 'Demands immediate contention.' },
  penny: { label: 'Penny Pincher', desc: 'Obsessed with cap efficiency.' },
};

// ── Goal Definitions ───────────────────────────────────

export interface OwnerGoal {
  id: string;
  label: string;
  desc: string;
  check: (team: Team) => boolean;
  exceed: (team: Team) => boolean;
}

export const OWNER_GOALS: readonly OwnerGoal[] = [
  {
    id: 'win_division',
    label: 'Win Division',
    desc: 'Finish first in the division.',
    check: (t) => t.wins >= 10,
    exceed: (t) => t.wins >= 13,
  },
  {
    id: 'playoff_berth',
    label: 'Make Playoffs',
    desc: 'Qualify for the postseason.',
    check: (t) => t.wins >= 9,
    exceed: (t) => t.wins >= 12,
  },
  {
    id: 'winning_record',
    label: 'Winning Record',
    desc: 'Finish above .500.',
    check: (t) => t.wins > t.losses,
    exceed: (t) => t.wins >= 11,
  },
  {
    id: 'rebuild_progress',
    label: 'Rebuild Progress',
    desc: 'Develop young talent on the roster.',
    check: (t) => t.roster.filter((p) => p.age <= 25 && p.ovr >= 70).length >= 5,
    exceed: (t) => t.roster.filter((p) => p.age <= 25 && p.ovr >= 75).length >= 3,
  },
  {
    id: 'cap_health',
    label: 'Cap Health',
    desc: 'Maintain healthy salary cap position.',
    check: (t) => t.capSpace >= 20,
    exceed: (t) => t.capSpace >= 40,
  },
  {
    id: 'star_power',
    label: 'Star Power',
    desc: 'Keep marquee talent on the roster.',
    check: (t) => t.roster.filter((p) => p.ovr >= 85).length >= 3,
    exceed: (t) => t.roster.filter((p) => p.ovr >= 85).length >= 5,
  },
  {
    id: 'no_losing_streak',
    label: 'No Losing Streaks',
    desc: 'Avoid extended losing skids.',
    check: (t) => (t.streak ?? 0) >= -2,
    exceed: (t) => t.losses <= 4,
  },
  {
    id: 'draft_well',
    label: 'Draft Well',
    desc: 'Develop drafted players into contributors.',
    check: (t) => t.roster.filter((p) => p.yearsExp <= 2 && p.ovr >= 68).length >= 3,
    exceed: (t) => t.roster.filter((p) => p.yearsExp <= 2 && p.ovr >= 75).length >= 2,
  },
  {
    id: 'championship',
    label: 'Win Championship',
    desc: 'Win the league championship.',
    check: (t) => t.wins >= 13,
    exceed: (t) => t.wins >= 15,
  },
] as const;

// ── Goal Evaluation ────────────────────────────────────

export interface GoalResult {
  goal: OwnerGoal;
  met: boolean;
  exceeded: boolean;
}

export function evaluateGoals(team: Team, goalIds: readonly string[]): GoalResult[] {
  return goalIds.map((gid) => {
    const goal = OWNER_GOALS.find((g) => g.id === gid);
    if (!goal) return { goal: { id: gid, label: gid, desc: '', check: () => false, exceed: () => false }, met: false, exceeded: false };
    return {
      goal,
      met: goal.check(team),
      exceeded: goal.exceed(team),
    };
  });
}
