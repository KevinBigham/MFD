import { describe, expect, it } from 'vitest';
import {
  LEAGUE_RULE_DEFINITIONS,
  applyRuleChange,
  diffRules,
  getActiveRule,
  getRuleHistory,
  initLeagueRules,
} from './league-rules';

describe('league rules', () => {
  it('initializes the registry with current hardcoded defaults', () => {
    const rules = initLeagueRules(2026);

    expect(getActiveRule(rules, 'salary_cap_growth')).toBe(0.05);
    expect(getActiveRule(rules, 'cap_floor_pct')).toBe(0.9);
    expect(getActiveRule(rules, 'practice_squad_size')).toBe(8);
    expect(getActiveRule(rules, 'playoff_seeds_per_conf')).toBe(7);
    expect(getActiveRule(rules, 'schedule_weeks')).toBe(18);
  });

  it('applies a rule change and stores the previous value', () => {
    const rules = initLeagueRules(2026);

    const updated = applyRuleChange(rules, {
      key: 'playoff_seeds_per_conf',
      newValue: 8,
      source: 'commissioner_vote',
      proposedBy: 'comm-1',
      effectiveYear: 2027,
      rationale: 'Expand the bracket.',
    });

    expect(getActiveRule(updated, 'playoff_seeds_per_conf')).toBe(8);
    expect(updated.entries.playoff_seeds_per_conf.previousValue).toBe(7);
    expect(updated.history).toHaveLength(1);
  });

  it('returns per-rule history in chronological order', () => {
    let rules = initLeagueRules(2026);
    rules = applyRuleChange(rules, {
      key: 'schedule_weeks',
      newValue: 19,
      source: 'commissioner_vote',
      proposedBy: 'comm-1',
      effectiveYear: 2027,
      rationale: 'Longer season.',
    });
    rules = applyRuleChange(rules, {
      key: 'schedule_weeks',
      newValue: 18,
      source: 'owners_vote',
      proposedBy: 'owners',
      effectiveYear: 2029,
      rationale: 'Revert the expansion.',
    });

    const history = getRuleHistory(rules, 'schedule_weeks');

    expect(history.map((entry) => entry.newValue)).toEqual([19, 18]);
    expect(history[0]?.previousValue).toBe(18);
    expect(history[1]?.previousValue).toBe(19);
  });

  it('produces ui-friendly diffs between rule sets', () => {
    const before = initLeagueRules(2026);
    const after = applyRuleChange(before, {
      key: 'franchise_tag_limit',
      newValue: 2,
      source: 'cba',
      proposedBy: 'players',
      effectiveYear: 2028,
      rationale: 'More flexibility.',
    });

    const diff = diffRules(before, after).find((entry) => entry.key === 'franchise_tag_limit');

    expect(diff).toMatchObject({
      key: 'franchise_tag_limit',
      changed: true,
      before: '1',
      after: '2',
      source: 'cba',
      effectiveYear: 2028,
    });
  });

  it('keeps unchanged rule updates as no-ops', () => {
    const rules = initLeagueRules(2026);

    const updated = applyRuleChange(rules, {
      key: 'trade_deadline_week',
      newValue: 9,
      source: 'owners_vote',
      proposedBy: 'owners',
      effectiveYear: 2027,
      rationale: 'No change.',
    });

    expect(updated).toBe(rules);
    expect(updated.history).toHaveLength(0);
  });

  it('stores effective year metadata on changed entries', () => {
    const rules = initLeagueRules(2026);
    const updated = applyRuleChange(rules, {
      key: 'salary_cap_growth',
      newValue: 0.06,
      source: 'cba',
      proposedBy: 'owners',
      effectiveYear: 2030,
      rationale: 'Higher cap growth.',
    });

    expect(updated.entries.salary_cap_growth.effectiveYear).toBe(2030);
  });

  it('keeps future-effective changes out of current-year reads', () => {
    const rules = applyRuleChange(initLeagueRules(2026), {
      key: 'practice_squad_size',
      newValue: 12,
      source: 'commissioner_vote',
      proposedBy: 'comm-1',
      effectiveYear: 2028,
      rationale: 'Expand the squad later.',
    });

    expect(getActiveRule(rules, 'practice_squad_size', 2026)).toBe(8);
    expect(getActiveRule(rules, 'practice_squad_size', 2028)).toBe(12);
  });

  it('defines petition metadata for supported rules', () => {
    expect(LEAGUE_RULE_DEFINITIONS.playoff_seeds_per_conf.category).toBe('competition');
    expect(LEAGUE_RULE_DEFINITIONS.playoff_seeds_per_conf.inputKind).toBe('enum');
    expect(LEAGUE_RULE_DEFINITIONS.min_salary_scale.petitionable).toBe(false);
  });

  it('tracks multi-value rule changes for allowed tag types', () => {
    const rules = initLeagueRules(2026);
    const updated = applyRuleChange(rules, {
      key: 'tag_types_allowed',
      newValue: ['exclusive', 'non-exclusive'],
      source: 'cba',
      proposedBy: 'players',
      effectiveYear: 2027,
      rationale: 'Remove transition tags.',
    });

    expect(getActiveRule(updated, 'tag_types_allowed')).toEqual(['exclusive', 'non-exclusive']);
    expect(updated.entries.tag_types_allowed.previousValue).toEqual(['exclusive', 'non-exclusive', 'transition']);
  });
});
