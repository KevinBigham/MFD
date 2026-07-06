import { describe, expect, it } from 'vitest';
import { makeLeagueState } from './test-helpers';
import { buildTradeDecisionForecast } from './trade-decision-forecast';
import type { DraftPick, TradeOfferAsset } from '../types';

function pickAsset(teamId: string, year: number, round: number, pick: number, originalTeamId = teamId): TradeOfferAsset {
  return {
    type: 'pick',
    teamId,
    playerId: null,
    pickId: `${teamId}-${year}-${round}-${pick}-${originalTeamId}`,
    description: `Round ${round} pick`,
  };
}

function playerAsset(teamId: string, playerId: string, description = playerId): TradeOfferAsset {
  return {
    type: 'player',
    teamId,
    playerId,
    pickId: null,
    description,
  };
}

function draftPick(teamId: string, year: number, round: number, pick: number): DraftPick {
  return {
    round,
    pick,
    originalTeamId: teamId,
    currentTeamId: teamId,
    year,
    isCompPick: false,
  };
}

describe('buildTradeDecisionForecast', () => {
  it('frames a partner-acceptable user proposal with market and consequence reads', () => {
    const game = makeLeagueState('offseason');
    const seller = game.teams.afce2;
    const qb = seller.roster.find((player) => player.pos === 'QB')!;
    qb.age = 30;
    qb.ovr = 81;
    qb.devTrait = 'normal';
    seller.gmStrategy = 'rebuild';

    const forecast = buildTradeDecisionForecast({
      game,
      userTeamId: 'afce1',
      partnerTeamId: 'afce2',
      offering: [
        pickAsset('afce1', game.year, 1, 28),
        pickAsset('afce1', game.year, 3, 5),
      ],
      requesting: [playerAsset('afce2', qb.id, qb.name)],
    });

    expect(forecast).not.toBeNull();
    expect(forecast?.partnerAccepted).toBe(true);
    expect(forecast?.acceptanceLabel).toBe('Partner accepts');
    expect(forecast?.consequenceItems.map((item) => item.label)).toEqual([
      'Immediate',
      'Partner response',
      'This season',
      'Future',
      'Uncertainty',
    ]);
    expect(forecast?.consequenceItems[1]?.delta).toContain('clears');
    expect(forecast?.warnings).toContain('Open Depth Chart and Cap Lab after commit; roster movement changes backup order and cap space.');
    expect(forecast?.consequenceItems[2]?.delta).toBe('Depth-chart help arrives now, but assign roles and practice snaps before Advance Week.');
    expect(JSON.stringify(forecast)).not.toMatch(/follow-up check|optionality|Check depth\/cap|Verify depth|AI should accept|AI likely accepts|No AI read|Market read|threshold read|roster window/i);
  });

  it('calls out a light package before the user submits it', () => {
    const game = makeLeagueState('offseason');
    const partner = game.teams.afce2;
    const qb = partner.roster.find((player) => player.pos === 'QB')!;
    qb.age = 24;
    qb.ovr = 91;
    qb.devTrait = 'x-factor';

    const forecast = buildTradeDecisionForecast({
      game,
      userTeamId: 'afce1',
      partnerTeamId: 'afce2',
      offering: [pickAsset('afce1', game.year, 7, 32)],
      requesting: [playerAsset('afce2', qb.id, qb.name)],
    });

    expect(forecast?.partnerAccepted).toBe(false);
    expect(forecast?.acceptanceAccent).toBe('red');
    expect(forecast?.acceptanceLabel).toBe('Likely rejected');
    expect(forecast?.consequenceItems[1]?.delta).toContain('below');
  });

  it('surfaces conditional pick uncertainty without mutating state', () => {
    const game = makeLeagueState('offseason');
    const userTeam = game.teams.afce1;
    const partnerTeam = game.teams.afce2;
    const userWr = userTeam.roster.find((player) => player.pos === 'WR')!;
    const basePick = draftPick(partnerTeam.id, game.year, 3, 18);
    partnerTeam.draftPicks.push(basePick);
    game.conditionalPicks.push({
      id: 'cond-1',
      fromTeamId: partnerTeam.id,
      toTeamId: partnerTeam.id,
      playerId: userWr.id,
      basePick,
      condition: {
        type: 'starts',
        playerId: userWr.id,
        threshold: 12,
        upgradeRound: 2,
      },
      resolvedPick: null,
      resolved: false,
      description: 'Conditional third that can become a second',
    });

    const forecast = buildTradeDecisionForecast({
      game,
      userTeamId: userTeam.id,
      partnerTeamId: partnerTeam.id,
      offering: [playerAsset(userTeam.id, userWr.id, userWr.name)],
      requesting: [{
        type: 'conditional_pick',
        teamId: partnerTeam.id,
        playerId: null,
        pickId: null,
        conditionalPickId: 'cond-1',
        description: 'Conditional third that can become a second',
      }],
    });

    expect(forecast?.warnings).toContain('Read conditional-pick terms before accepting; the final pick changes when the condition resolves.');
    expect(forecast?.warnings.join(' ')).not.toContain('Conditional pick can change');
    expect(forecast?.consequenceItems[4]?.delta).toContain('Conditional pick value is projected');
    expect(JSON.stringify(forecast)).not.toMatch(/expected-value read|Conditional pick EV/i);
    expect(game.conditionalPicks[0]?.resolved).toBe(false);
  });

  it('returns null when either team cannot be resolved', () => {
    const game = makeLeagueState('offseason');

    expect(buildTradeDecisionForecast({
      game,
      userTeamId: 'missing',
      partnerTeamId: 'afce2',
      offering: [],
      requesting: [],
    })).toBeNull();
  });
});
