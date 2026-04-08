/**
 * Contingency Game Plans — Pre-game if/then planning.
 *
 * Players can set up to 6 contingency rules that auto-trigger during games:
 * "If trailing by 14+ at half → switch to aggressive scheme"
 */
import type { DefensiveGamePlan, GamePlan, OffensiveGamePlan } from '../types';

// ── Types ──────────────────────────────────────────────

export type ContingencyTrigger =
  | 'trailing_14_at_half'
  | 'trailing_7_at_half'
  | 'leading_14_at_half'
  | 'opponent_scores_opening'
  | 'turnover_deficit_2'
  | 'wind_over_15';

export type ContingencyAction =
  | { type: 'switch_offense'; scheme: OffensiveGamePlan }
  | { type: 'switch_defense'; scheme: DefensiveGamePlan }
  | { type: 'go_aggressive' }
  | { type: 'go_conservative' };

export interface ContingencyRule {
  id: string;
  trigger: ContingencyTrigger;
  action: ContingencyAction;
  label: string;
  description: string;
}

export interface ContingencyCheckContext {
  scoreDiff: number;
  quarter: number;
  turnovers: number;
  opponentTurnovers: number;
  opponentScoredOnOpening: boolean;
  windSpeed: number;
}

// ── Available Contingencies ────────────────────────────

export const CONTINGENCY_TRIGGERS: Record<ContingencyTrigger, { label: string; description: string }> = {
  trailing_14_at_half: {
    label: 'Trailing by 14+ at half',
    description: 'If we\'re down by two or more scores at halftime',
  },
  trailing_7_at_half: {
    label: 'Trailing by 7+ at half',
    description: 'If we\'re down by a score or more at halftime',
  },
  leading_14_at_half: {
    label: 'Leading by 14+ at half',
    description: 'If we have a comfortable lead at halftime',
  },
  opponent_scores_opening: {
    label: 'Opponent scores on opening drive',
    description: 'If the opponent scores a touchdown on their first possession',
  },
  turnover_deficit_2: {
    label: 'Turnover deficit of 2+',
    description: 'If we\'ve committed 2+ more turnovers than the opponent',
  },
  wind_over_15: {
    label: 'High wind conditions',
    description: 'If wind speed exceeds 15 mph, limiting the deep passing game',
  },
};

export const MAX_CONTINGENCIES = 6;

// ── Logic ──────────────────────────────────────────────

/** Check if a contingency trigger condition is met */
export function checkTrigger(
  trigger: ContingencyTrigger,
  ctx: ContingencyCheckContext,
): boolean {
  switch (trigger) {
    case 'trailing_14_at_half':
      return ctx.quarter >= 3 && ctx.scoreDiff <= -14;
    case 'trailing_7_at_half':
      return ctx.quarter >= 3 && ctx.scoreDiff <= -7;
    case 'leading_14_at_half':
      return ctx.quarter >= 3 && ctx.scoreDiff >= 14;
    case 'opponent_scores_opening':
      return ctx.opponentScoredOnOpening;
    case 'turnover_deficit_2':
      return (ctx.turnovers - ctx.opponentTurnovers) >= 2;
    case 'wind_over_15':
      return ctx.windSpeed > 15;
    default:
      return false;
  }
}

/** Apply a contingency action to the current game plan */
export function applyContingencyAction(
  plan: GamePlan,
  action: ContingencyAction,
): GamePlan {
  switch (action.type) {
    case 'switch_offense':
      return { ...plan, offensiveScheme: action.scheme };
    case 'switch_defense':
      return { ...plan, defensiveScheme: action.scheme };
    case 'go_aggressive':
      return { ...plan, offensiveScheme: 'pass_heavy', defensiveScheme: 'blitz_heavy' };
    case 'go_conservative':
      return { ...plan, offensiveScheme: 'run_heavy', defensiveScheme: 'coverage' };
    default:
      return plan;
  }
}

/** Check all contingencies and apply the first matching one */
export function evaluateContingencies(
  rules: ContingencyRule[],
  ctx: ContingencyCheckContext,
  currentPlan: GamePlan,
): { plan: GamePlan; firedRule: ContingencyRule | null } {
  for (const rule of rules) {
    if (checkTrigger(rule.trigger, ctx)) {
      return {
        plan: applyContingencyAction(currentPlan, rule.action),
        firedRule: rule,
      };
    }
  }
  return { plan: currentPlan, firedRule: null };
}

/** Create a contingency rule with auto-generated id and label */
export function createContingencyRule(
  trigger: ContingencyTrigger,
  action: ContingencyAction,
): ContingencyRule {
  const triggerInfo = CONTINGENCY_TRIGGERS[trigger];
  const actionLabel = action.type === 'go_aggressive' ? 'Go Aggressive'
    : action.type === 'go_conservative' ? 'Go Conservative'
    : action.type === 'switch_offense' ? `Switch offense to ${action.scheme}`
    : `Switch defense to ${action.scheme}`;

  return {
    id: `contingency-${trigger}-${Date.now()}`,
    trigger,
    action,
    label: `IF: ${triggerInfo.label} → ${actionLabel}`,
    description: triggerInfo.description,
  };
}
