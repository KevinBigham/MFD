/**
 * Contingency Game Plans — Pre-game if/then planning.
 *
 * Sprint 37 keeps legacy v27 rules readable while shifting authoring to the
 * new trigger/response model that fires during live simulation checkpoints.
 */
import { getContingencyCallouts, type ContingencyCalloutKey } from '../content-loader';
import { RNG, type PrngFn } from '../rng';
import type { DefensiveGamePlan, GamePlan, OffensiveGamePlan } from '../types';

export type LegacyContingencyTrigger =
  | 'trailing_14_at_half'
  | 'trailing_7_at_half'
  | 'leading_14_at_half'
  | 'opponent_scores_opening'
  | 'turnover_deficit_2'
  | 'wind_over_15';

export type ContingencyTrigger =
  | LegacyContingencyTrigger
  | 'down_by'
  | 'up_by'
  | 'end_of_q2_losing'
  | 'two_minute_warning_one_score'
  | 'opponent_td_lead_after_halftime';

export type LegacyContingencyAction =
  | { type: 'switch_offense'; scheme: OffensiveGamePlan }
  | { type: 'switch_defense'; scheme: DefensiveGamePlan }
  | { type: 'go_aggressive' }
  | { type: 'go_conservative' };

export type ContingencyResponse =
  | 'go_air_raid'
  | 'kill_clock'
  | 'go_for_it_on_4th'
  | 'run_heavy'
  | 'pressure_every_down'
  | 'prevent_defense_off';

export interface ContingencyRule {
  id: string;
  trigger: ContingencyTrigger;
  threshold?: 7 | 14 | 21;
  response?: ContingencyResponse;
  action?: LegacyContingencyAction;
  label: string;
  description: string;
  legacy?: boolean;
}

export interface ContingencyCheckContext {
  scoreDiff: number;
  quarter: number;
  turnovers: number;
  opponentTurnovers: number;
  opponentScoredOnOpening: boolean;
  windSpeed: number;
  lateGameWindow?: boolean;
}

export interface SimAdjustments {
  offensiveScheme?: OffensiveGamePlan;
  defensiveScheme?: DefensiveGamePlan;
  gamePlanBonus?: number;
  responseLabel?: string;
  responseKey?: ContingencyCalloutKey | null;
}

export const CONTINGENCY_TRIGGERS: Record<
  Exclude<ContingencyTrigger, LegacyContingencyTrigger>,
  { label: string; description: string }
> = {
  down_by: {
    label: 'Down by X+',
    description: 'Fire when the scoreboard deficit reaches the selected threshold.',
  },
  up_by: {
    label: 'Up by X+',
    description: 'Fire when the lead reaches the selected threshold.',
  },
  end_of_q2_losing: {
    label: 'End of Q2 and losing',
    description: 'Fire at halftime if we head into the break behind.',
  },
  two_minute_warning_one_score: {
    label: '2-minute warning and within 1 score',
    description: 'Fire in the late-game window when the margin is one score or less.',
  },
  opponent_td_lead_after_halftime: {
    label: 'Opponent has TD+ lead after halftime',
    description: 'Fire once the opponent holds a touchdown lead in the second half.',
  },
};

export const CONTINGENCY_RESPONSES: Record<ContingencyResponse, { label: string; description: string }> = {
  go_air_raid: {
    label: 'Go Air Raid',
    description: 'Call deeper passes for fast points; misses stop the clock and raise turnover risk.',
  },
  kill_clock: {
    label: 'Kill the clock',
    description: 'Shrink possessions, keep the clock moving, and reduce turnover chances.',
  },
  go_for_it_on_4th: {
    label: 'Go for it on 4th',
    description: 'Tilt toward aggressive math and keep the offense on the field.',
  },
  run_heavy: {
    label: 'Run-heavy',
    description: 'Lean into the ground game and force the trenches to matter.',
  },
  pressure_every_down: {
    label: 'Pressure every down',
    description: 'Send extra rushers for negative plays; missed pressure leaves coverage exposed.',
  },
  prevent_defense_off: {
    label: 'Prevent defense off',
    description: 'Stay on the gas defensively instead of softening the shell.',
  },
};

const LEGACY_TRIGGER_LABELS: Record<LegacyContingencyTrigger, { label: string; description: string }> = {
  trailing_14_at_half: {
    label: 'Trailing by 14+ at half',
    description: 'Legacy rule from v27 saves.',
  },
  trailing_7_at_half: {
    label: 'Trailing by 7+ at half',
    description: 'Legacy rule from v27 saves.',
  },
  leading_14_at_half: {
    label: 'Leading by 14+ at half',
    description: 'Legacy rule from v27 saves.',
  },
  opponent_scores_opening: {
    label: 'Opponent scores on opening drive',
    description: 'Legacy rule from v27 saves.',
  },
  turnover_deficit_2: {
    label: 'Turnover deficit of 2+',
    description: 'Legacy rule from v27 saves.',
  },
  wind_over_15: {
    label: 'High wind conditions',
    description: 'Legacy rule from v27 saves.',
  },
};

export const MAX_CONTINGENCIES = 3;

export function limitContingencyRules(rules: ContingencyRule[]): ContingencyRule[] {
  return rules.slice(0, MAX_CONTINGENCIES);
}

function isLegacyTrigger(trigger: ContingencyTrigger): trigger is LegacyContingencyTrigger {
  return trigger in LEGACY_TRIGGER_LABELS;
}

function isLegacyRule(rule: ContingencyRule): rule is ContingencyRule & { action: LegacyContingencyAction } {
  return Boolean(rule.action) && isLegacyTrigger(rule.trigger);
}

function normalizeThreshold(rule: ContingencyRule): 7 | 14 | 21 {
  return rule.threshold ?? (rule.trigger === 'up_by' ? 21 : 14);
}

function responseFromLegacyAction(action: LegacyContingencyAction): ContingencyResponse | null {
  switch (action.type) {
    case 'switch_offense':
      return action.scheme === 'run_heavy' || action.scheme === 'power' ? 'run_heavy'
        : action.scheme === 'pass_heavy' || action.scheme === 'spread' ? 'go_air_raid'
          : null;
    case 'switch_defense':
      return action.scheme === 'blitz_heavy' ? 'pressure_every_down'
        : action.scheme === 'aggressive' ? 'prevent_defense_off'
          : null;
    case 'go_aggressive':
      return 'go_air_raid';
    case 'go_conservative':
      return 'kill_clock';
    default:
      return null;
  }
}

function labelFromLegacyAction(action: LegacyContingencyAction): string {
  switch (action.type) {
    case 'switch_offense':
      return `Switch offense to ${action.scheme.replaceAll('_', ' ')}`;
    case 'switch_defense':
      return `Switch defense to ${action.scheme.replaceAll('_', ' ')}`;
    case 'go_aggressive':
      return 'Go aggressive';
    case 'go_conservative':
      return 'Go conservative';
    default:
      return 'Adjust';
  }
}

function responseMeta(rule: ContingencyRule): { label: string; key: ContingencyCalloutKey | null } {
  if (rule.response) {
    return {
      label: CONTINGENCY_RESPONSES[rule.response].label,
      key: rule.response,
    };
  }

  if (rule.action) {
    const mapped = responseFromLegacyAction(rule.action);
    return {
      label: labelFromLegacyAction(rule.action),
      key: mapped,
    };
  }

  return {
    label: 'Adjust',
    key: null,
  };
}

function applyAdjustmentsToPlan(plan: GamePlan, adjustments: Partial<SimAdjustments>): GamePlan {
  return {
    ...plan,
    offensiveScheme: adjustments.offensiveScheme ?? plan.offensiveScheme,
    defensiveScheme: adjustments.defensiveScheme ?? plan.defensiveScheme,
    gamePlanBonus: plan.gamePlanBonus + (adjustments.gamePlanBonus ?? 0),
  };
}

export function shouldFireContingency(rule: ContingencyRule, ctx: ContingencyCheckContext): boolean {
  if (isLegacyTrigger(rule.trigger)) {
    switch (rule.trigger) {
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

  switch (rule.trigger) {
    case 'down_by':
      return ctx.scoreDiff <= -normalizeThreshold(rule);
    case 'up_by':
      return ctx.scoreDiff >= normalizeThreshold(rule);
    case 'end_of_q2_losing':
      return ctx.quarter === 3 && ctx.scoreDiff < 0;
    case 'two_minute_warning_one_score':
      return Boolean(ctx.lateGameWindow) && Math.abs(ctx.scoreDiff) <= 8;
    case 'opponent_td_lead_after_halftime':
      return ctx.quarter >= 3 && ctx.scoreDiff <= -7;
    default:
      return false;
  }
}

export function applyContingency(rule: ContingencyRule): Partial<SimAdjustments> {
  const { label, key } = responseMeta(rule);

  if (rule.response) {
    switch (rule.response) {
      case 'go_air_raid':
        return { offensiveScheme: 'pass_heavy', gamePlanBonus: 1.5, responseLabel: label, responseKey: key };
      case 'kill_clock':
        return { offensiveScheme: 'run_heavy', defensiveScheme: 'coverage', gamePlanBonus: 1, responseLabel: label, responseKey: key };
      case 'go_for_it_on_4th':
        return { offensiveScheme: 'spread', gamePlanBonus: 1.25, responseLabel: label, responseKey: key };
      case 'run_heavy':
        return { offensiveScheme: 'run_heavy', gamePlanBonus: 0.75, responseLabel: label, responseKey: key };
      case 'pressure_every_down':
        return { defensiveScheme: 'blitz_heavy', gamePlanBonus: 1, responseLabel: label, responseKey: key };
      case 'prevent_defense_off':
        return { defensiveScheme: 'aggressive', gamePlanBonus: 0.75, responseLabel: label, responseKey: key };
      default:
        return { responseLabel: label, responseKey: key };
    }
  }

  if (!rule.action) {
    return { responseLabel: label, responseKey: key };
  }

  switch (rule.action.type) {
    case 'switch_offense':
      return { offensiveScheme: rule.action.scheme, responseLabel: label, responseKey: key };
    case 'switch_defense':
      return { defensiveScheme: rule.action.scheme, responseLabel: label, responseKey: key };
    case 'go_aggressive':
      return { offensiveScheme: 'pass_heavy', defensiveScheme: 'blitz_heavy', gamePlanBonus: 1, responseLabel: label, responseKey: key };
    case 'go_conservative':
      return { offensiveScheme: 'run_heavy', defensiveScheme: 'coverage', gamePlanBonus: 0.5, responseLabel: label, responseKey: key };
    default:
      return { responseLabel: label, responseKey: key };
  }
}

export function getContingencyCallout(rule: ContingencyRule, teamName: string, rng: PrngFn = RNG.event): string | null {
  const { label, key } = responseMeta(rule);
  if (!key) return null;
  const templates = getContingencyCallouts(key);
  const template = templates[Math.floor(rng() * templates.length)]!;
  return template
    .replaceAll('{teamName}', teamName)
    .replaceAll('{responseLabel}', label);
}

export function evaluateContingencies(
  rules: ContingencyRule[],
  ctx: ContingencyCheckContext,
  currentPlan: GamePlan,
  options?: { teamName?: string; rng?: PrngFn },
): {
  plan: GamePlan;
  firedRule: ContingencyRule | null;
  adjustments: Partial<SimAdjustments>;
  callout: string | null;
} {
  for (const rule of rules) {
    if (!shouldFireContingency(rule, ctx)) continue;
    const adjustments = applyContingency(rule);
    return {
      plan: applyAdjustmentsToPlan(currentPlan, adjustments),
      firedRule: rule,
      adjustments,
      callout: options?.teamName ? getContingencyCallout(rule, options.teamName, options.rng) : null,
    };
  }

  return {
    plan: currentPlan,
    firedRule: null,
    adjustments: {},
    callout: null,
  };
}

export function checkTrigger(trigger: ContingencyTrigger, ctx: ContingencyCheckContext): boolean {
  return shouldFireContingency({
    id: 'check-trigger',
    trigger,
    label: 'Trigger Check',
    description: 'Trigger check helper',
    threshold: trigger === 'up_by' ? 21 : 14,
  }, ctx);
}

export function applyContingencyAction(plan: GamePlan, action: LegacyContingencyAction): GamePlan {
  return applyAdjustmentsToPlan(plan, applyContingency({
    id: 'apply-action',
    trigger: 'trailing_14_at_half',
    action,
    label: 'Action Apply',
    description: 'Legacy action helper',
    legacy: true,
  }));
}

export function createContingencyRule(
  trigger: ContingencyTrigger,
  responseOrAction: ContingencyResponse | LegacyContingencyAction,
  options?: { id?: string; threshold?: 7 | 14 | 21 },
): ContingencyRule {
  const triggerMeta = isLegacyTrigger(trigger)
    ? LEGACY_TRIGGER_LABELS[trigger]
    : CONTINGENCY_TRIGGERS[trigger];

  if (typeof responseOrAction === 'string') {
    const responseMetaEntry = CONTINGENCY_RESPONSES[responseOrAction];
    return {
      id: options?.id ?? `contingency-${trigger}-${responseOrAction}`,
      trigger,
      threshold: options?.threshold,
      response: responseOrAction,
      label: `IF ${triggerMeta.label.toUpperCase()} -> ${responseMetaEntry.label.toUpperCase()}`,
      description: `${triggerMeta.description} ${responseMetaEntry.description}`,
    };
  }

  return {
    id: options?.id ?? `contingency-${trigger}-${responseOrAction.type}`,
    trigger,
    threshold: options?.threshold,
    action: responseOrAction,
    label: `IF ${triggerMeta.label.toUpperCase()} -> ${labelFromLegacyAction(responseOrAction).toUpperCase()}`,
    description: `${triggerMeta.description} Legacy contingency preserved from an older save.`,
    legacy: true,
  };
}
