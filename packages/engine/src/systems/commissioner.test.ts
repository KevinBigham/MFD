import { describe, expect, it } from 'vitest';
import {
  advanceCommissioner,
  castVote,
  generateRuleProposal,
  initCommissioner,
  issueRuling,
  resolveVote,
  simulateAIVotes,
} from './commissioner';
import { initLeagueRules } from './league-rules';
import { makeLeagueState } from './test-helpers';

describe('commissioner', () => {
  it('initializes a commissioner with approval and personality', () => {
    const commissioner = initCommissioner(2026);

    expect(commissioner.name.length).toBeGreaterThan(0);
    expect(['progressive', 'traditionalist', 'populist']).toContain(commissioner.personality);
    expect(commissioner.approval).toBeGreaterThan(0);
  });

  it('progressive commissioners favor playoff and roster expansion proposals', () => {
    const game = makeLeagueState('offseason', 1);
    game.leagueRules = initLeagueRules(game.year);
    const commissioner = {
      ...initCommissioner(game.year),
      personality: 'progressive' as const,
    };

    const proposal = generateRuleProposal(commissioner, game);

    expect(['playoff_seeds_per_conf', 'practice_squad_size', 'roster_limit']).toContain(proposal?.ruleKey);
  });

  it('casts a user vote on a proposal', () => {
    const proposal = {
      id: 'proposal-1',
      ruleKey: 'playoff_seeds_per_conf' as const,
      currentValue: 7,
      proposedValue: 8,
      rationale: 'Expand the field',
      source: 'commissioner' as const,
      votes: {},
      requiredMajority: 2,
      deadline: 2027,
      effectiveYear: 2027,
      proposedByTeamId: null,
    };

    const voted = castVote(proposal, 'afce1', 'yes');

    expect(voted.votes.afce1).toBe('yes');
  });

  it('simulates ai owner votes across the league', () => {
    const game = makeLeagueState('offseason', 1);
    game.leagueRules = initLeagueRules(game.year);
    const proposal = {
      id: 'proposal-1',
      ruleKey: 'revenue_split' as const,
      currentValue: 0.5,
      proposedValue: 0.55,
      rationale: 'Increase revenue sharing',
      source: 'commissioner' as const,
      votes: { afce1: 'yes' as const },
      requiredMajority: 5,
      deadline: 2027,
      effectiveYear: 2027,
      proposedByTeamId: null,
    };

    const voted = simulateAIVotes(proposal, game);

    expect(Object.keys(voted.votes).length).toBe(Object.keys(game.teams).length);
  });

  it('resolves proposals using simple majority of current teams', () => {
    const result = resolveVote({
      id: 'proposal-1',
      ruleKey: 'playoff_seeds_per_conf',
      currentValue: 7,
      proposedValue: 8,
      rationale: 'Expand',
      source: 'commissioner',
      votes: {
        a: 'yes',
        b: 'yes',
        c: 'yes',
        d: 'no',
        e: 'no',
      },
      requiredMajority: 3,
      deadline: 2027,
      effectiveYear: 2027,
      proposedByTeamId: null,
    });

    expect(result.passed).toBe(true);
    expect(result.yesVotes).toBe(3);
  });

  it('records commissioner rulings', () => {
    const commissioner = initCommissioner(2026);

    const updated = issueRuling(commissioner, {
      id: 'ruling-1',
      year: 2026,
      week: 4,
      type: 'suspension',
      playerId: 'p1',
      playerName: 'Marcus Cole',
      teamId: 'afce1',
      headline: 'Commissioner disciplines Marcus Cole',
      rationale: 'Conduct detrimental',
      moraleImpact: -6,
      chemistryImpact: -2,
      ownerApprovalImpact: -1,
    });

    expect(updated.rulings).toHaveLength(1);
    expect(updated.rulings[0]?.type).toBe('suspension');
  });

  it('replaces commissioners after three low-approval offseasons', () => {
    const game = makeLeagueState('offseason', 1);
    game.leagueRules = initLeagueRules(game.year);
    let commissioner = initCommissioner(game.year);
    commissioner.name = 'Old Guard';
    commissioner.approval = 10;
    commissioner.lowApprovalYears = 2;

    commissioner = advanceCommissioner(commissioner, game);

    expect(commissioner.name).not.toBe('Old Guard');
    expect(commissioner.lowApprovalYears).toBe(0);
  });

  it('can surface an agenda for the offseason', () => {
    const game = makeLeagueState('offseason', 1);
    game.leagueRules = initLeagueRules(game.year);
    const commissioner = {
      ...initCommissioner(game.year),
      activeProposals: [{
        id: 'proposal-1',
        ruleKey: 'schedule_weeks',
        currentValue: 18,
        proposedValue: 19,
        rationale: 'Add a week',
        source: 'commissioner' as const,
        votes: {},
        requiredMajority: 3,
        deadline: 2027,
        effectiveYear: 2027,
        proposedByTeamId: null,
      }],
    };

    expect(advanceCommissioner(commissioner, game).activeProposals.length).toBeGreaterThanOrEqual(1);
  });
});
