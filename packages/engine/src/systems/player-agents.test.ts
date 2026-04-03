import { describe, expect, it } from 'vitest';
import type { AgentProfile, ContractOffer } from '../types';
import {
  agentDemand,
  agentMediaLeak,
  getAgentPatienceWeeks,
  negotiateOffer,
  holdoutCheck,
} from './player-agents';
import { createDefaultTutorialState } from './tutorial';
import { makeLeagueState } from './test-helpers';

function makeOffer(salary: number): ContractOffer {
  return {
    years: 3,
    salary,
    signingBonus: Math.round(salary * 0.75 * 10) / 10,
    guaranteed: Math.round(salary * 2 * 10) / 10,
  };
}

function makeAgent(style: AgentProfile['style'], multiplier = 1): AgentProfile {
  return {
    id: `agent-${style}`,
    name: `${style} agent`,
    style,
    demandMultiplier: multiplier,
    patienceModifier: 0,
    clients: [],
  };
}

describe('player agents', () => {
  it('hardball agents demand materially more than the base ask', () => {
    const game = makeLeagueState('offseason');
    const player = game.teams.afce1.roster[0]!;
    const demand = agentDemand(player, makeAgent('hardball', 1.18), { baseOffer: makeOffer(10), topFiveAtPosition: false });

    expect(demand.salary).toBeGreaterThan(11.4);
  });

  it('collaborative agents demand less and hold out for less time than hardball agents', () => {
    const game = makeLeagueState('offseason');
    const player = game.teams.afce1.roster[0]!;
    const collaborative = makeAgent('collaborative', 0.96);
    const hardball = makeAgent('hardball', 1.18);

    const collaborativeDemand = agentDemand(player, collaborative, { baseOffer: makeOffer(10), topFiveAtPosition: false });
    const hardballDemand = agentDemand(player, hardball, { baseOffer: makeOffer(10), topFiveAtPosition: false });

    expect(collaborativeDemand.salary).toBeLessThan(hardballDemand.salary);
    expect(getAgentPatienceWeeks(collaborative)).toBeLessThan(getAgentPatienceWeeks(hardball));
  });

  it('holdout triggers once the patience window expires', () => {
    const game = makeLeagueState('regular_season', 2);
    const team = game.teams.afce1;
    const player = team.roster[0]!;
    player.contract = null;
    player.agentId = 'agent-hardball';
    game.agents = [makeAgent('hardball', 1.15)];
    game.tutorialState = createDefaultTutorialState();
    game.offseasonState = {
      round: 1,
      expiringPlayerIds: [player.id],
      reSignDecisions: {
        [player.id]: {
          playerId: player.id,
          teamId: team.id,
          askingPrice: makeOffer(12),
          agentDemand: makeOffer(14),
          lastOffer: makeOffer(8),
          counterOffer: null,
          agentResponse: '',
          patienceWeeksRemaining: 0,
          status: 'pending',
        },
      },
      freeAgencyBids: {},
      scoutingState: {},
      tradeOffers: [],
      draftOrder: [],
      currentDraftPickIndex: 0,
      completedDraftPickIds: [],
    };

    const didHoldOut = holdoutCheck(game, team.id, player.id);

    expect(didHoldOut).toBe(true);
    expect(player.holdout).toBe(true);
    expect(player.morale).toBeLessThan(70);
  });

  it('media leaks during a holdout generate a league news item', () => {
    const game = makeLeagueState('regular_season', 3);
    const player = game.teams.afce1.roster[0]!;
    player.holdout = true;
    player.agentId = 'agent-media_savvy';
    game.agents = [makeAgent('media_savvy', 1.08)];

    const leaked = agentMediaLeak(game, () => 0.1, player.id);

    expect(leaked).toBe(true);
    expect(game.leagueNews.at(-1)?.headline).toContain(player.lastName);
  });

  it('offers within ninety percent of agent demand are accepted and close offers counter', () => {
    const game = makeLeagueState('offseason');
    const team = game.teams.afce1;
    const player = team.roster[0]!;
    player.agentId = 'agent-hardball';
    game.agents = [makeAgent('hardball', 1.1)];
    game.offseasonState = {
      round: 1,
      expiringPlayerIds: [player.id],
      reSignDecisions: {
        [player.id]: {
          playerId: player.id,
          teamId: team.id,
          askingPrice: makeOffer(10),
          agentDemand: makeOffer(12),
          lastOffer: null,
          counterOffer: null,
          agentResponse: '',
          patienceWeeksRemaining: 2,
          status: 'pending',
        },
      },
      freeAgencyBids: {},
      scoutingState: {},
      tradeOffers: [],
      draftOrder: [],
      currentDraftPickIndex: 0,
      completedDraftPickIds: [],
    };

    const accepted = negotiateOffer(game, team.id, player.id, makeOffer(10.9));
    expect(accepted.status).toBe('accepted');

    const countered = negotiateOffer(game, team.id, player.id, makeOffer(10));
    expect(countered.status).toBe('countered');
    expect(countered.counterOffer).not.toBeNull();
    expect(countered.counterOffer!.salary).toBeGreaterThan(10);
    expect(countered.counterOffer!.salary).toBeLessThan(12);
  });
});
