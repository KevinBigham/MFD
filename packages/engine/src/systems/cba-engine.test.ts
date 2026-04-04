import { describe, expect, it } from 'vitest';
import {
  checkCBAStatus,
  generateCBAProposal,
  getLockoutRisk,
  initCBA,
  negotiateCBA,
  ratifyCBA,
  resolveLockout,
} from './cba-engine';
import { makeLeagueState } from './test-helpers';

describe('cba engine', () => {
  it('initializes a default active agreement', () => {
    const cba = initCBA(2026);

    expect(cba.status).toBe('active');
    expect(cba.currentDeal).not.toBeNull();
    expect(cba.currentDeal?.startYear).toBe(2026);
    expect(cba.currentDeal?.endYear).toBeGreaterThanOrEqual(2033);
  });

  it('marks the final year of a deal as expiring', () => {
    const cba = initCBA(2026);
    const expiringYear = cba.currentDeal!.endYear;

    expect(checkCBAStatus(cba, expiringYear)).toBe('expiring');
  });

  it('generates player-side proposals that push for higher revenue share', () => {
    const game = makeLeagueState('offseason', 1);
    const cba = initCBA(game.year);

    const proposal = generateCBAProposal(cba, 'players', game);

    expect(proposal.side).toBe('players');
    expect(proposal.terms.revenueSplit).toBeGreaterThanOrEqual(cba.currentDeal!.terms.revenueSplit);
  });

  it('generates owner-side proposals that protect cap growth and tag control', () => {
    const game = makeLeagueState('offseason', 1);
    const cba = initCBA(game.year);

    const proposal = generateCBAProposal(cba, 'owners', game);

    expect(proposal.side).toBe('owners');
    expect(proposal.terms.franchiseTagLimit).toBeGreaterThanOrEqual(1);
  });

  it('narrows the negotiation gap each round deterministically', () => {
    const game = makeLeagueState('offseason', 1);
    let cba = initCBA(game.year);
    cba.status = 'negotiating';
    cba.negotiationState = {
      round: 0,
      ownersProposal: null,
      playersProposal: null,
      currentProposal: null,
      gap: 60,
      mediator: false,
      publicPressure: 10,
      ownerVotes: {},
      userVote: null,
    };

    const next = negotiateCBA(cba, game);

    expect(next.cba.negotiationState?.round).toBe(1);
    expect(next.cba.negotiationState?.gap).toBeLessThan(60);
  });

  it('moves to owner vote when the gap is close enough', () => {
    const game = makeLeagueState('offseason', 1);
    const cba = initCBA(game.year);
    cba.status = 'negotiating';
    cba.negotiationState = {
      round: 2,
      ownersProposal: null,
      playersProposal: null,
      currentProposal: null,
      gap: 12,
      mediator: false,
      publicPressure: 55,
      ownerVotes: {},
      userVote: null,
    };

    const result = negotiateCBA(cba, game);

    expect(result.cba.status).toBe('awaiting_owner_vote');
    expect(result.proposal).not.toBeNull();
  });

  it('ratifies a new deal from the accepted proposal', () => {
    const cba = initCBA(2026);
    const proposal = {
      id: 'proposal-1',
      side: 'owners' as const,
      year: 2027,
      round: 3,
      rationale: 'Balanced compromise',
      terms: {
        ...cba.currentDeal!.terms,
        playoffSeeds: 8,
      },
    };

    const ratified = ratifyCBA(cba, proposal, 2027);

    expect(ratified.status).toBe('active');
    expect(ratified.currentDeal?.startYear).toBe(2027);
    expect(ratified.currentDeal?.terms.playoffSeeds).toBe(8);
    expect(ratified.history).toHaveLength(2);
  });

  it('raises lockout risk after the deal expires', () => {
    const cba = initCBA(2026);

    expect(getLockoutRisk(cba, cba.currentDeal!.endYear + 1)).toBeGreaterThan(0);
  });

  it('enters lockout after five failed rounds', () => {
    const game = makeLeagueState('offseason', 1);
    const cba = initCBA(game.year);
    cba.status = 'negotiating';
    cba.negotiationState = {
      round: 4,
      ownersProposal: null,
      playersProposal: null,
      currentProposal: null,
      gap: 80,
      mediator: false,
      publicPressure: 90,
      ownerVotes: {},
      userVote: null,
    };

    const result = negotiateCBA(cba, game);

    expect(result.lockout).toBe(true);
    expect(result.cba.status).toBe('lockout');
  });

  it('can resolve a lockout back to an active deal', () => {
    const game = makeLeagueState('offseason', 1);
    const cba = initCBA(game.year);
    cba.status = 'lockout';
    cba.lockoutRisk = 70;

    const result = resolveLockout(cba, game);

    expect(result.resolved).toBe(true);
    expect(result.cba.status).toBe('active');
  });
});
