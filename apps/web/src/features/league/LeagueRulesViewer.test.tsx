import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { applyRuleChange, initLeagueRules } from '@mfd/engine';
import { LeagueRulesViewer } from './LeagueRulesViewer';

const baseState = () => {
  let rules = initLeagueRules(2031);
  rules = applyRuleChange(rules, {
    key: 'salary_cap_growth',
    newValue: 0.06,
    source: 'cba',
    proposedBy: 'owners',
    effectiveYear: 2031,
    rationale: 'Revenue growth supports a bigger cap.',
  });
  rules = applyRuleChange(rules, {
    key: 'playoff_seeds_per_conf',
    newValue: 8,
    source: 'commissioner_vote',
    proposedBy: 'commissioner',
    effectiveYear: 2032,
    rationale: 'Expand the bracket.',
  });

  return {
    groupedRules: {
      financial: [
        { key: 'salary_cap_growth', label: 'Salary Cap Growth', category: 'financial', value: '6%', source: 'cba', effectiveYear: 2031, changedFromDefault: true },
      ],
      competition: [
        { key: 'playoff_seeds_per_conf', label: 'Playoff Seeds / Conference', category: 'competition', value: '8', source: 'commissioner_vote', effectiveYear: 2032, changedFromDefault: true },
      ],
    },
    history: [
      {
        key: 'salary_cap_growth',
        label: 'Salary Cap Growth',
        changes: rules.history.filter((entry) => entry.key === 'salary_cap_growth'),
      },
      {
        key: 'playoff_seeds_per_conf',
        label: 'Playoff Seeds / Conference',
        changes: rules.history.filter((entry) => entry.key === 'playoff_seeds_per_conf'),
      },
    ],
    diffs: [
      { key: 'salary_cap_growth', label: 'Salary Cap Growth', category: 'financial', before: '5%', after: '6%', changed: true, source: 'cba', effectiveYear: 2031 },
      { key: 'playoff_seeds_per_conf', label: 'Playoff Seeds / Conference', category: 'competition', before: '7', after: '8', changed: true, source: 'commissioner_vote', effectiveYear: 2032 },
    ],
  };
};

let mockState = baseState();

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectLeagueRuleDiffs: (state: typeof mockState) => state.diffs,
  selectLeagueRuleHistory: (state: typeof mockState) => state.history,
  selectLeagueRulesByCategory: (state: typeof mockState) => state.groupedRules,
}));

describe('LeagueRulesViewer', () => {
  beforeEach(() => {
    mockState = baseState();
  });

  it('renders the screen header and changed-count badge', () => {
    const markup = renderToStaticMarkup(<LeagueRulesViewer />);
    expect(markup).toContain('LEAGUE RULES');
    expect(markup).toContain('2 CHANGED FROM DEFAULT');
  });

  it('groups current rules by category', () => {
    const markup = renderToStaticMarkup(<LeagueRulesViewer />);
    expect(markup).toContain('FINANCIAL');
    expect(markup).toContain('COMPETITION');
    expect(markup).toContain('SALARY CAP GROWTH');
    expect(markup).toContain('PLAYOFF SEEDS / CONFERENCE');
  });

  it('shows changed rules with source and effective year badges', () => {
    const markup = renderToStaticMarkup(<LeagueRulesViewer />);
    expect(markup).toContain('CHANGED');
    expect(markup).toContain('COMMISSIONER VOTE');
    expect(markup).toContain('EFFECTIVE 2032');
  });

  it('renders the rule change timeline with before and after values', () => {
    const markup = renderToStaticMarkup(<LeagueRulesViewer />);
    expect(markup).toContain('RULE CHANGE TIMELINE');
    expect(markup).toContain('0.05 -&gt; 0.06');
    expect(markup).toContain('7 -&gt; 8');
  });

  it('renders the empty timeline state when no rules have changed', () => {
    mockState.history = [];
    mockState.diffs = [];
    const markup = renderToStaticMarkup(<LeagueRulesViewer />);
    expect(markup).toContain('No league rules have changed from the original setup yet');
  });
});
