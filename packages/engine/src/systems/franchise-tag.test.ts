import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { applyRuleChange, initLeagueRules } from './league-rules';
import { applyFranchiseTag } from './franchise-tag';
import { makeTeam } from './test-helpers';

describe('franchise tag league rule overrides', () => {
  it('honors an increased franchise tag limit when the rule is active', () => {
    const team = makeTeam('usr', 'AFC', 'East', true, 82);
    const peer = makeTeam('opp', 'AFC', 'North', false, 78);
    const rules = applyRuleChange(initLeagueRules(2030), {
      key: 'franchise_tag_limit',
      newValue: 2,
      source: 'cba',
      proposedBy: 'players',
      effectiveYear: 2030,
      rationale: 'Allow two tags.',
    });
    const game = { year: 2030, leagueRules: rules } as unknown as GameState;

    const first = applyFranchiseTag(team, team.roster[0]!, [team, peer], 2030, 'non-exclusive', game);
    const second = applyFranchiseTag(team, team.roster[1]!, [team, peer], 2030, 'non-exclusive', game);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(team.franchiseTags).toHaveLength(2);
  });

  it('keeps future tag-type changes from affecting the current year', () => {
    const team = makeTeam('usr', 'AFC', 'East', true, 82);
    const peer = makeTeam('opp', 'AFC', 'North', false, 78);
    const rules = applyRuleChange(initLeagueRules(2030), {
      key: 'tag_types_allowed',
      newValue: ['exclusive', 'non-exclusive'],
      source: 'commissioner_vote',
      proposedBy: 'commissioner',
      effectiveYear: 2032,
      rationale: 'Phase out transition tags later.',
    });
    const game = { year: 2030, leagueRules: rules } as unknown as GameState;

    const result = applyFranchiseTag(team, team.roster[0]!, [team, peer], 2030, 'transition', game);

    expect(result.ok).toBe(true);
    expect(team.roster[0]?.contract?.franchiseTag).toBe('transition');
  });
});
