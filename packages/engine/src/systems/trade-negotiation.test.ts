import { describe, expect, it } from 'vitest';
import { getSalaryCap } from '../config';
import type { GameState, Team, TradeOfferAsset } from '../types';
import { calcCapHit } from './contracts';
import {
  acceptCounterProposal,
  createTradeProposal,
  generateCounterOffer,
  getTradeTargets,
  getTradeableAssets,
  rejectCounterProposal,
  submitProposal,
} from './trade-negotiation';
import { applyRuleChange, initLeagueRules } from './league-rules';
import { makeLeagueState } from './test-helpers';
import { mulberry32 } from '../rng';
import { startScenario } from './scenario-challenge';
import { SaveStateSchema } from '../save';

function playerAsset(teamId: string, playerId: string, description = playerId): TradeOfferAsset {
  return {
    type: 'player',
    teamId,
    playerId,
    pickId: null,
    description,
  };
}

function pickAsset(game: GameState, teamId: string, year: number, round: number, pick: number): TradeOfferAsset {
  const team = game.teams[teamId];
  if (team) {
    const existing = team.draftPicks.find((p) => p.year === year && p.round === round && p.pick === pick && p.currentTeamId === teamId);
    if (!existing) {
      team.draftPicks.push({
        currentTeamId: teamId,
        originalTeamId: teamId,
        year,
        round,
        pick,
        isCompPick: false,
      });
    }
  }
  return {
    type: 'pick',
    teamId,
    playerId: null,
    pickId: `${teamId}-${year}-${round}-${pick}-${teamId}`,
    description: `Round ${round} pick`,
  };
}

function conditionalPickAsset(teamId: string, conditionalPickId: string, description = conditionalPickId): TradeOfferAsset {
  return {
    type: 'conditional_pick',
    teamId,
    playerId: null,
    pickId: null,
    conditionalPickId,
    description,
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 10) / 10;
}

function expectedCapUsed(team: Team): number {
  return roundMoney(team.roster.reduce((sum, player) => sum + calcCapHit(player.contract ?? null), 0) + team.deadCap);
}

function expectCapTotalsSynced(game: GameState, teamId: string): void {
  const team = game.teams[teamId];
  expect(team.capUsed).toBe(expectedCapUsed(team));
  expect(team.capSpace).toBe(roundMoney(getSalaryCap(game.year, game) - team.capUsed));
}

describe('trade negotiation', () => {
  it('accepts a fair proposal', () => {
    const game = makeLeagueState('offseason');
    const fairPlayer = game.teams.afce2.roster.find((player) => player.pos === 'WR')!;
    const proposal = createTradeProposal(
      game,
      'afce1',
      'afce2',
      [pickAsset(game, 'afce1', game.year, 1, 3)],
      [playerAsset('afce2', fairPlayer.id, fairPlayer.name)],
    );

    const result = submitProposal(game, proposal.id, () => 0.3);

    expect(result.proposal.status).toBe('accepted');
  });

  it('rejects a lopsided proposal', () => {
    const game = makeLeagueState('offseason');
    const elitePlayer = game.teams.afce2.roster.find((player) => player.pos === 'QB')!;
    elitePlayer.ovr = 92;
    const proposal = createTradeProposal(
      game,
      'afce1',
      'afce2',
      [pickAsset(game, 'afce1', game.year, 7, 32)],
      [playerAsset('afce2', elitePlayer.id, elitePlayer.name)],
    );

    const result = submitProposal(game, proposal.id, () => 0.2);

    expect(result.proposal.status).toBe('rejected');
  });

  it('creates a counter-offer that improves the value differential', () => {
    const game = makeLeagueState('offseason');
    game.teams.afce2.gmStrategy = 'rebuild';
    game.teams.afce1.draftPicks = [
      { round: 2, pick: 20, originalTeamId: 'afce1', currentTeamId: 'afce1', year: game.year, isCompPick: false },
      { round: 3, pick: 12, originalTeamId: 'afce1', currentTeamId: 'afce1', year: game.year, isCompPick: false },
    ];
    const target = game.teams.afce2.roster.find((player) => player.pos === 'WR')!;
    target.ovr = 86;
    const proposal = createTradeProposal(
      game,
      'afce1',
      'afce2',
      [pickAsset(game, 'afce1', game.year, 3, 12)],
      [playerAsset('afce2', target.id, target.name)],
    );

    const counter = generateCounterOffer(game, proposal, () => 0.1)!;

    expect(counter.valueDiff).toBeGreaterThan(proposal.valueDiff);
    expect(counter.status).toBe('countered');
  });

  it('keeps a rejected counter proposal save-schema compatible', () => {
    const game = makeLeagueState('regular_season', 1);
    game.teams.afce2.gmStrategy = 'rebuild';
    game.teams.afce2.philosophy = 'rebuild';
    game.teams.afce1.draftPicks = [
      { round: 2, pick: 20, originalTeamId: 'afce1', currentTeamId: 'afce1', year: game.year, isCompPick: false },
      { round: 3, pick: 12, originalTeamId: 'afce1', currentTeamId: 'afce1', year: game.year, isCompPick: false },
    ];
    const target = game.teams.afce2.roster.find((player) => player.pos === 'WR')!;
    target.ovr = 86;
    target.age = 28;
    target.devTrait = 'normal';
    target.tradeBlock = true;
    game.players[target.id] = target;

    const normalizedResult = SaveStateSchema.safeParse(JSON.parse(JSON.stringify(game)));
    expect(normalizedResult.success).toBe(true);
    if (!normalizedResult.success) return;
    const normalized = normalizedResult.data as unknown as GameState;
    const normalizedTarget = normalized.teams.afce2.roster.find((player) => player.id === target.id)!;
    expect((normalized.players[target.id] as typeof target & { name?: string }).name).toBeUndefined();

    const proposal = createTradeProposal(
      normalized,
      'afce1',
      'afce2',
      [pickAsset(normalized, 'afce1', game.year, 3, 12)],
      [playerAsset('afce2', normalizedTarget.id, normalizedTarget.name)],
    );

    const result = submitProposal(normalized, proposal.id, () => 0.1);
    expect(result.proposal.status).toBe('countered');

    const rejected = rejectCounterProposal(normalized, proposal.id);
    expect(rejected.status).toBe('rejected');
    expect(normalized.nearMissTracker?.declinedTrades).toHaveLength(1);
    expect(normalized.nearMissTracker?.declinedTrades[0]?.playerName).toBe(normalizedTarget.name);

    const parsed = SaveStateSchema.safeParse(JSON.parse(JSON.stringify(normalized)));
    if (!parsed.success) {
      throw new Error(parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('\n'));
    }
  });

  it('exposes unresolved owned conditional picks as direct trade assets', () => {
    const game = makeLeagueState('offseason');
    const userTeam = game.teams.afce1;
    const partner = game.teams.afce2;
    const trackedPlayer = userTeam.roster.find((player) => player.pos === 'WR')!;
    const basePick = {
      round: 3,
      pick: 18,
      originalTeamId: partner.id,
      currentTeamId: userTeam.id,
      year: game.year + 1,
      isCompPick: false,
    };
    game.conditionalPicks = [
      {
        id: 'cond-owned',
        fromTeamId: partner.id,
        toTeamId: userTeam.id,
        playerId: trackedPlayer.id,
        basePick,
        condition: {
          type: 'starts',
          playerId: trackedPlayer.id,
          threshold: 10,
          upgradeRound: 2,
        },
        resolvedPick: null,
        resolved: false,
        description: 'Austin conditional third',
      },
      {
        id: 'cond-resolved',
        fromTeamId: partner.id,
        toTeamId: userTeam.id,
        playerId: trackedPlayer.id,
        basePick: { ...basePick, pick: 19 },
        condition: {
          type: 'starts',
          playerId: trackedPlayer.id,
          threshold: 10,
          upgradeRound: 2,
        },
        resolvedPick: { ...basePick, round: 2, pick: 19 },
        resolved: true,
        description: 'Resolved conditional third',
      },
    ];

    const assets = getTradeableAssets(game, userTeam.id);
    const targets = getTradeTargets(game, partner.id);

    expect(assets.some((asset) => asset.type === 'conditional_pick' && asset.conditionalPickId === 'cond-owned')).toBe(true);
    expect(assets.some((asset) => asset.conditionalPickId === 'cond-resolved')).toBe(false);
    expect(targets.find((target) => target.teamId === userTeam.id)?.conditionalPicks.map((pick) => pick.id)).toContain('cond-owned');
  });

  it('transfers conditional picks accepted through direct proposals', () => {
    const game = makeLeagueState('offseason');
    const userTeam = game.teams.afce1;
    const partner = game.teams.afce2;
    const trackedPlayer = userTeam.roster.find((player) => player.pos === 'WR')!;
    const userPick = { round: 1, pick: 4, originalTeamId: userTeam.id, currentTeamId: userTeam.id, year: game.year, isCompPick: false };
    const conditionalBasePick = {
      round: 3,
      pick: 18,
      originalTeamId: partner.id,
      currentTeamId: partner.id,
      year: game.year + 1,
      isCompPick: false,
    };
    userTeam.draftPicks = [userPick];
    partner.draftPicks = [conditionalBasePick];
    game.conditionalPicks = [{
      id: 'cond-accepted',
      fromTeamId: partner.id,
      toTeamId: partner.id,
      playerId: trackedPlayer.id,
      basePick: conditionalBasePick,
      condition: {
        type: 'starts',
        playerId: trackedPlayer.id,
        threshold: 10,
        upgradeRound: 2,
      },
      resolvedPick: null,
      resolved: false,
      description: 'Austin conditional third',
    }];

    const proposal = createTradeProposal(
      game,
      userTeam.id,
      partner.id,
      [pickAsset(game, userTeam.id, game.year, 1, 4)],
      [conditionalPickAsset(partner.id, 'cond-accepted', 'Austin conditional third')],
    );

    const result = submitProposal(game, proposal.id, () => 0.1);

    expect(result.proposal.status).toBe('accepted');
    expect(game.conditionalPicks[0]?.toTeamId).toBe(userTeam.id);
    expect(game.conditionalPicks[0]?.basePick.currentTeamId).toBe(userTeam.id);
    expect(userTeam.draftPicks.some((pick) => pick.originalTeamId === partner.id && pick.year === game.year + 1 && pick.round === 3)).toBe(true);
    expect(partner.draftPicks.some((pick) => pick.originalTeamId === partner.id && pick.year === game.year + 1 && pick.round === 3)).toBe(false);
    expect(partner.draftPicks.some((pick) => pick.originalTeamId === userTeam.id && pick.year === game.year && pick.round === 1)).toBe(true);
  });

  it('synchronizes cap totals from post-trade rosters when direct proposals are accepted', () => {
    const game = makeLeagueState('offseason');
    const userTeam = game.teams.afce1;
    const partner = game.teams.afce2;
    const userPlayer = userTeam.roster.find((player) => player.pos === 'WR')!;
    const partnerPlayer = partner.roster.find((player) => player.pos === 'WR')!;
    userPlayer.ovr = 90;
    partnerPlayer.ovr = 75;
    userPlayer.contract!.baseSalary = 2;
    userPlayer.contract!.prorated = 1;
    partnerPlayer.contract!.baseSalary = 15;
    partnerPlayer.contract!.prorated = 2;
    userTeam.deadCap = 2.5;
    partner.deadCap = 4;
    userTeam.capUsed = 777;
    userTeam.capSpace = -777;
    partner.capUsed = 666;
    partner.capSpace = -666;
    const proposal = createTradeProposal(
      game,
      userTeam.id,
      partner.id,
      [playerAsset(userTeam.id, userPlayer.id, userPlayer.name)],
      [playerAsset(partner.id, partnerPlayer.id, partnerPlayer.name)],
    );

    const result = submitProposal(game, proposal.id, () => 0.1);

    expect(result.proposal.status).toBe('accepted');
    expect(userTeam.roster.some((player) => player.id === partnerPlayer.id)).toBe(true);
    expect(partner.roster.some((player) => player.id === userPlayer.id)).toBe(true);
    expectCapTotalsSynced(game, userTeam.id);
    expectCapTotalsSynced(game, partner.id);
  });

  it('rebuild teams counter for picks and contenders counter for players', () => {
    const game = makeLeagueState('offseason');
    const target = game.teams.afce2.roster.find((player) => player.pos === 'WR')!;
    const base = createTradeProposal(
      game,
      'afce1',
      'afce2',
      [pickAsset(game, 'afce1', game.year, 2, 20)],
      [playerAsset('afce2', target.id, target.name)],
    );

    game.teams.afce2.gmStrategy = 'rebuild';
    const rebuildCounter = generateCounterOffer(game, base, () => 0.2)!;
    game.teams.afce2.gmStrategy = 'contend';
    const contendCounter = generateCounterOffer(game, base, () => 0.2)!;

    expect(rebuildCounter.offering.some((asset) => asset.type !== 'player')).toBe(true);
    expect(contendCounter.offering.some((asset) => asset.type === 'player')).toBe(true);
  });

  it('blocks submissions after the configured trade deadline week', () => {
    const game = makeLeagueState('regular_season', 10);
    const assets = getTradeableAssets(game, 'afce1');
    const target = game.teams.afce2.roster.find((player) => player.pos === 'WR')!;
    const proposal = createTradeProposal(
      game,
      'afce1',
      'afce2',
      assets.filter((asset) => asset.type === 'pick').slice(0, 1),
      [playerAsset('afce2', target.id, target.name)],
    );

    expect(() => submitProposal(game, proposal.id, () => 0.3)).toThrow(/deadline/i);
  });

  it('honors a custom week 12 trade deadline rule', () => {
    const game = makeLeagueState('regular_season', 10);
    game.leagueRules = applyRuleChange(initLeagueRules(game.year), {
      key: 'trade_deadline_week',
      newValue: 12,
      source: 'owners_vote',
      proposedBy: 'owners',
      effectiveYear: game.year,
      rationale: 'Late-season trade window.',
    });
    const assets = getTradeableAssets(game, 'afce1');
    const target = game.teams.afce2.roster.find((player) => player.pos === 'WR')!;
    const proposal = createTradeProposal(
      game,
      'afce1',
      'afce2',
      assets.filter((asset) => asset.type === 'pick').slice(0, 1),
      [playerAsset('afce2', target.id, target.name)],
    );

    expect(() => submitProposal(game, proposal.id, () => 0.3)).not.toThrow();
  });

  it('blocks direct proposals and counters when scenario constraints disable trades', () => {
    const base = makeLeagueState('offseason');
    const target = base.teams.afce2.roster.find((player) => player.pos === 'WR')!;
    const proposal = createTradeProposal(
      base,
      'afce1',
      'afce2',
      [pickAsset(base, 'afce1', base.year, 2, 20)],
      [playerAsset('afce2', target.id, target.name)],
    );
    proposal.counterOffer = {
      ...proposal,
      offering: [pickAsset(base, 'afce1', base.year, 1, 3)],
      status: 'countered',
      aiResponse: 'We need another premium pick.',
      valueDiff: 0.8,
      counterOffer: null,
    };
    const game = startScenario('the_savant', base, mulberry32(11));

    expect(() => createTradeProposal(
      game,
      'afce1',
      'afce2',
      [pickAsset(game, 'afce1', game.year, 3, 12)],
      [playerAsset('afce2', target.id, target.name)],
    )).toThrow(/scenario constraints/i);
    expect(() => submitProposal(game, proposal.id, () => 0.3)).toThrow(/scenario constraints/i);
    expect(() => acceptCounterProposal(game, proposal.id)).toThrow(/scenario constraints/i);
    expect(game.activeProposals).toHaveLength(1);
    expect(game.activeProposals[0]?.status).toBe('draft');
  });
});
