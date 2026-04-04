import { CAP_MATH, PS_CAP, ROSTER_CAP } from '../config';
import type {
  FranchiseTagType,
  LeagueRule,
  LeagueRuleDefinition,
  LeagueRuleKey,
  LeagueRuleValue,
  LeagueRules,
  RuleChange,
  RuleChangeRecord,
  RuleDiff,
} from '../types';

type RuleDefaults = Record<LeagueRuleKey, LeagueRuleValue>;

const DEFAULT_TAG_TYPES: FranchiseTagType[] = ['exclusive', 'non-exclusive', 'transition'];

export const LEAGUE_RULE_DEFINITIONS: Record<LeagueRuleKey, LeagueRuleDefinition> = {
  salary_cap_growth: {
    key: 'salary_cap_growth',
    label: 'Salary Cap Growth',
    category: 'financial',
    inputKind: 'number',
    min: 0.03,
    max: 0.08,
    step: 0.005,
    petitionable: true,
  },
  cap_floor_pct: {
    key: 'cap_floor_pct',
    label: 'Cap Floor',
    category: 'financial',
    inputKind: 'number',
    min: 0.85,
    max: 0.95,
    step: 0.01,
    petitionable: true,
  },
  franchise_tag_limit: {
    key: 'franchise_tag_limit',
    label: 'Franchise Tag Limit',
    category: 'tags',
    inputKind: 'number',
    min: 1,
    max: 3,
    step: 1,
    petitionable: true,
  },
  roster_limit: {
    key: 'roster_limit',
    label: 'Roster Limit',
    category: 'roster',
    inputKind: 'number',
    min: 48,
    max: 56,
    step: 1,
    petitionable: true,
  },
  practice_squad_size: {
    key: 'practice_squad_size',
    label: 'Practice Squad Size',
    category: 'roster',
    inputKind: 'number',
    min: 8,
    max: 16,
    step: 1,
    petitionable: true,
  },
  playoff_seeds_per_conf: {
    key: 'playoff_seeds_per_conf',
    label: 'Playoff Seeds / Conference',
    category: 'competition',
    inputKind: 'enum',
    options: [{ value: 6, label: '6 seeds' }, { value: 7, label: '7 seeds' }, { value: 8, label: '8 seeds' }],
    petitionable: true,
  },
  schedule_weeks: {
    key: 'schedule_weeks',
    label: 'Schedule Weeks',
    category: 'competition',
    inputKind: 'enum',
    options: [{ value: 17, label: '17 weeks' }, { value: 18, label: '18 weeks' }, { value: 19, label: '19 weeks' }],
    petitionable: true,
  },
  trade_deadline_week: {
    key: 'trade_deadline_week',
    label: 'Trade Deadline Week',
    category: 'competition',
    inputKind: 'number',
    min: 7,
    max: 12,
    step: 1,
    petitionable: true,
  },
  ir_return_limit: {
    key: 'ir_return_limit',
    label: 'IR Return Limit',
    category: 'roster',
    inputKind: 'number',
    min: 2,
    max: 8,
    step: 1,
    petitionable: true,
  },
  overtime_format: {
    key: 'overtime_format',
    label: 'Overtime Format',
    category: 'competition',
    inputKind: 'enum',
    options: [{ value: 'standard', label: 'Standard' }],
    petitionable: false,
  },
  min_salary_scale: {
    key: 'min_salary_scale',
    label: 'Minimum Salary Scale',
    category: 'financial',
    inputKind: 'number_array',
    petitionable: false,
  },
  revenue_split: {
    key: 'revenue_split',
    label: 'Revenue Split',
    category: 'financial',
    inputKind: 'number',
    min: 0.45,
    max: 0.55,
    step: 0.01,
    petitionable: true,
  },
  draft_rounds: {
    key: 'draft_rounds',
    label: 'Draft Rounds',
    category: 'competition',
    inputKind: 'number',
    min: 5,
    max: 9,
    step: 1,
    petitionable: true,
  },
  comp_pick_limit: {
    key: 'comp_pick_limit',
    label: 'Comp Pick Limit',
    category: 'competition',
    inputKind: 'number',
    min: 1,
    max: 4,
    step: 1,
    petitionable: true,
  },
  tag_types_allowed: {
    key: 'tag_types_allowed',
    label: 'Allowed Tag Types',
    category: 'tags',
    inputKind: 'multi_enum',
    options: DEFAULT_TAG_TYPES.map((value) => ({ value, label: value })),
    petitionable: true,
  },
};

export const LEAGUE_RULE_DEFAULTS: RuleDefaults = {
  salary_cap_growth: CAP_MATH.GROWTH_RATE,
  cap_floor_pct: CAP_MATH.CAP_FLOOR,
  franchise_tag_limit: 1,
  roster_limit: ROSTER_CAP,
  practice_squad_size: PS_CAP,
  playoff_seeds_per_conf: 7,
  schedule_weeks: 18,
  trade_deadline_week: 9,
  ir_return_limit: 4,
  overtime_format: 'standard',
  min_salary_scale: [CAP_MATH.MIN_SAL.ROOKIE, CAP_MATH.MIN_SAL.VET_MIN, CAP_MATH.MIN_SAL.VET_MAX],
  revenue_split: 0.5,
  draft_rounds: 7,
  comp_pick_limit: 4,
  tag_types_allowed: DEFAULT_TAG_TYPES,
};

function cloneValue<T extends LeagueRuleValue>(value: T): T {
  if (Array.isArray(value)) {
    return [...value] as T;
  }
  return value;
}

function equalRuleValue(left: LeagueRuleValue, right: LeagueRuleValue): boolean {
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }
  return left === right;
}

function stringifyRuleValue(value: LeagueRuleValue): string {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'number') {
    if (value > 0 && value < 1) {
      return Number.isInteger(value * 100) ? `${Math.round(value * 100)}%` : `${(value * 100).toFixed(1)}%`;
    }
    return `${value}`;
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return value;
}

function buildRule(key: LeagueRuleKey, value: LeagueRuleValue, year: number): LeagueRule {
  return {
    key,
    value: cloneValue(value),
    effectiveYear: year,
    source: 'initial',
    previousValue: cloneValue(value),
  };
}

export function initLeagueRules(year: number): LeagueRules {
  const entries = Object.keys(LEAGUE_RULE_DEFAULTS).reduce<LeagueRules['entries']>((map, rawKey) => {
    const key = rawKey as LeagueRuleKey;
    map[key] = buildRule(key, LEAGUE_RULE_DEFAULTS[key], year);
    return map;
  }, {} as LeagueRules['entries']);

  return {
    initializedYear: year,
    entries,
    history: [],
  };
}

export function getRuleValueForYear(rules: LeagueRules, key: LeagueRuleKey, year: number): LeagueRuleValue {
  const entry = rules.entries[key];
  const changes = getRuleHistory(rules, key)
    .filter((entry) => entry.effectiveYear <= year)
    .sort((a, b) => a.effectiveYear - b.effectiveYear);

  let value = cloneValue(
    entry && entry.effectiveYear > year
      ? entry.previousValue
      : entry?.value ?? LEAGUE_RULE_DEFAULTS[key],
  );

  if (changes.length === 0 && entry?.effectiveYear > year) {
    return value;
  }

  for (const change of changes) {
    value = cloneValue(change.newValue);
  }

  if (changes.length === 0 && entry && entry.effectiveYear <= year) {
    value = cloneValue(entry.value);
  }

  return value;
}

export function getActiveRule(rules: LeagueRules, key: LeagueRuleKey, year?: number): LeagueRuleValue {
  if (typeof year === 'number') {
    return getRuleValueForYear(rules, key, year);
  }
  return cloneValue(rules.entries[key].value);
}

export function applyRuleChange(rules: LeagueRules, change: RuleChange): LeagueRules {
  const current = rules.entries[change.key];
  if (!current || equalRuleValue(current.value, change.newValue)) {
    return rules;
  }

  const nextRecord: RuleChangeRecord = {
    ...change,
    newValue: cloneValue(change.newValue),
    previousValue: cloneValue(current.value),
  };

  return {
    ...rules,
    entries: {
      ...rules.entries,
      [change.key]: {
        key: change.key,
        value: cloneValue(change.newValue),
        effectiveYear: change.effectiveYear,
        source: change.source,
        previousValue: cloneValue(current.value),
      },
    },
    history: [...rules.history, nextRecord],
  };
}

export function getRuleHistory(rules: LeagueRules, key: LeagueRuleKey): RuleChangeRecord[] {
  return rules.history.filter((entry) => entry.key === key);
}

export function diffRules(before: LeagueRules, after: LeagueRules): RuleDiff[] {
  return (Object.keys(LEAGUE_RULE_DEFINITIONS) as LeagueRuleKey[]).map((key) => {
    const definition = LEAGUE_RULE_DEFINITIONS[key];
    const beforeValue = before.entries[key]?.value ?? LEAGUE_RULE_DEFAULTS[key];
    const afterValue = after.entries[key]?.value ?? LEAGUE_RULE_DEFAULTS[key];
    const changed = !equalRuleValue(beforeValue, afterValue);
    return {
      key,
      label: definition.label,
      category: definition.category,
      before: stringifyRuleValue(beforeValue),
      after: stringifyRuleValue(afterValue),
      changed,
      source: after.entries[key]?.source ?? 'initial',
      effectiveYear: after.entries[key]?.effectiveYear ?? after.initializedYear,
    };
  });
}
