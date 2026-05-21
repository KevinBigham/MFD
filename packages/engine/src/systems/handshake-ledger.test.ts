import { describe, expect, it } from 'vitest';
import type { Handshake } from '../types';
import { makeLeagueState } from './test-helpers';
import {
  evaluateHandshakes,
  generateOwnerDemands,
} from './handshake-ledger';

function makeHandshake(overrides: Partial<Handshake> = {}): Handshake {
  return {
    id: overrides.id ?? 'handshake-1',
    type: overrides.type ?? 'player',
    promiseText: overrides.promiseText ?? 'You will be the starter by Week 8',
    targetId: overrides.targetId ?? 'afce1-qb',
    teamId: overrides.teamId ?? 'afce1',
    madeYear: overrides.madeYear ?? 2026,
    madeWeek: overrides.madeWeek ?? 1,
    deadline: overrides.deadline ?? { year: 2026, week: 8 },
    condition: overrides.condition ?? { metric: 'starter', target: true },
    status: overrides.status ?? 'active',
    consequence: overrides.consequence ?? 'Player morale drops if broken',
  };
}

describe('handshake ledger', () => {
  it('rewards fulfilled promises with approval and morale', () => {
    const game = makeLeagueState('regular_season', 5);
    const player = game.teams.afce1.roster[0]!;
    player.isStarter = true;
    const approvalBefore = game.teams.afce1.owner.approval;
    const moraleBefore = player.morale;
    game.handshakes = [makeHandshake({ targetId: player.id, teamId: 'afce1' })];

    evaluateHandshakes(game);

    expect(game.handshakes[0]!.status).toBe('fulfilled');
    expect(game.teams.afce1.owner.approval).toBe(approvalBefore + 5);
    expect(player.morale).toBe(moraleBefore + 10);
  });

  it('penalizes broken promises with approval, morale, and chemistry loss', () => {
    const game = makeLeagueState('regular_season', 9);
    const player = game.teams.afce1.roster[0]!;
    player.isStarter = false;
    const approvalBefore = game.teams.afce1.owner.approval;
    const moraleBefore = player.morale;
    const chemistryBefore = player.chemistry;
    game.handshakes = [makeHandshake({ targetId: player.id, teamId: 'afce1', deadline: { year: game.year, week: 8 } })];

    evaluateHandshakes(game);

    expect(game.handshakes[0]!.status).toBe('broken');
    expect(game.teams.afce1.owner.approval).toBe(approvalBefore - 10);
    expect(player.morale).toBe(moraleBefore - 15);
    expect(player.chemistry).toBe(chemistryBefore - 5);
  });

  it('makes Sandra Chen accountable for broken player promises', () => {
    const game = makeLeagueState('regular_season', 9);
    game.frontOffice.agmProfileId = 'sandra_chen';
    const player = game.teams.afce1.roster[0]!;
    player.isStarter = false;
    const playerRepBefore = game.frontOffice.reputation.players;
    game.handshakes = [makeHandshake({ targetId: player.id, teamId: 'afce1', deadline: { year: game.year, week: 8 } })];

    evaluateHandshakes(game);

    expect(game.handshakes[0]!.status).toBe('broken');
    expect(game.frontOffice.reputation.players).toBe(playerRepBefore - 12);
    expect(game.frontOffice.agmImpactLog?.[0]?.summary).toContain('Sandra Chen');
  });

  it('generates owner-appropriate demands by archetype', () => {
    const game = makeLeagueState('preseason', 1);
    game.teams.afce1.owner.archetypeId = 'win_now';
    game.teams.afcn1.owner.archetypeId = 'profit_first';

    const winNow = generateOwnerDemands(game, 'afce1');
    const profitFirst = generateOwnerDemands(game, 'afcn1');

    expect(winNow.some((handshake) => handshake.condition.metric === 'playoff')).toBe(true);
    expect(profitFirst.some((handshake) => handshake.condition.metric === 'spending')).toBe(true);
  });

  it('supports weekly mid-season checks before the final deadline', () => {
    const game = makeLeagueState('regular_season', 6);
    const player = game.teams.afce1.roster[0]!;
    player.isStarter = true;
    game.handshakes = [makeHandshake({ targetId: player.id, deadline: { year: game.year, week: 10 } })];

    evaluateHandshakes(game);

    expect(game.handshakes[0]!.status).toBe('fulfilled');
  });

  it('applies the lesser expired penalty when a promise ages out without being broken early', () => {
    const game = makeLeagueState('regular_season', 11);
    const ownerApproval = game.teams.afce1.owner.approval;
    game.handshakes = [makeHandshake({
      id: 'owner-expired',
      type: 'owner',
      teamId: 'afce1',
      targetId: 'afce1',
      promiseText: 'Draft a quarterback in round 1',
      deadline: { year: game.year, week: 10 },
      condition: { metric: 'draft_position', target: 'QB:1' },
    })];

    evaluateHandshakes(game);

    expect(game.handshakes[0]!.status).toBe('expired');
    expect(game.teams.afce1.owner.approval).toBe(ownerApproval - 3);
  });
});
