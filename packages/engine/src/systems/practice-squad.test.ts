import { describe, expect, it } from 'vitest';
import { getMinSalary, getSalaryCap } from '../config';
import { calcCapHit } from './contracts';
import { applyRuleChange, initLeagueRules } from './league-rules';
import { makeLeagueState, makePlayer } from './test-helpers';
import {
  addToPracticeSquad,
  aiWaiverLogic,
  cutPlayerToWaivers,
  elevateFromPracticeSquad,
  getPracticeSquadLimit,
  processWaiverClaims,
  submitWaiverClaim,
} from './practice-squad';
import type { GameState } from '../types';
import type { Team } from '../types';

function setBlockFreeAgencyScenario(game: GameState): void {
  game.scenarioState = {
    activeScenario: {
      id: 'waiver_lock',
      name: 'Waiver Lock',
      tagline: 'No external claims.',
      description: 'A test scenario that blocks waiver claim submissions.',
      difficulty: 'pro',
      seasonLimit: 1,
      objectives: [],
      bonusObjectives: [],
      constraints: {
        blockTrades: false,
        blockFreeAgency: true,
        blockDraft: false,
        forcedDifficulty: undefined,
      },
    },
    scenarioSeason: 1,
    completedScenarios: [],
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

describe('practice squad and waiver wire', () => {
  it('reports the active practice squad limit from league rules with the legacy no-rules fallback', () => {
    const game = makeLeagueState('regular_season', 1);
    game.leagueRules = applyRuleChange(initLeagueRules(game.year), {
      key: 'practice_squad_size',
      newValue: 12,
      source: 'commissioner_vote',
      proposedBy: 'commissioner',
      effectiveYear: game.year,
      rationale: 'Reduce developmental slots.',
    });

    expect(getPracticeSquadLimit(game)).toBe(12);

    game.leagueRules = null as never;

    expect(getPracticeSquadLimit(game)).toBe(16);
  });

  it('enforces the practice squad cap at 16 players', () => {
    const game = makeLeagueState('regular_season', 1);
    game.leagueRules = applyRuleChange(initLeagueRules(game.year), {
      key: 'practice_squad_size',
      newValue: 16,
      source: 'commissioner_vote',
      proposedBy: 'commissioner',
      effectiveYear: game.year,
      rationale: 'Expand the practice squad for this season.',
    });
    const team = game.teams.afce1;
    for (let index = 0; index < 16; index += 1) {
      const player = makePlayer(`ps-${index}`, null as never, 'WR', 65, false);
      player.teamId = null;
      player.contract = null;
      game.players[player.id] = player;
      game.freeAgents.push(player.id);
      addToPracticeSquad(game, team.id, player.id);
    }
    const overflow = makePlayer('ps-overflow', null as never, 'WR', 64, false);
    overflow.teamId = null;
    overflow.contract = null;
    game.players[overflow.id] = overflow;
    game.freeAgents.push(overflow.id);

    const result = addToPracticeSquad(game, team.id, overflow.id);

    expect(result.nextState.teams[team.id]!.practiceSquad).toHaveLength(16);
    expect(result.nextState.freeAgents).toContain(overflow.id);
  });

  it('blocks practice-squad acquisitions when scenario constraints disable free agency', () => {
    const game = makeLeagueState('regular_season', 1);
    const team = game.teams.afce1;
    const player = makePlayer('ps-blocked', null as never, 'WR', 66, false);
    player.teamId = null;
    player.contract = null;
    game.players[player.id] = player;
    game.freeAgents.push(player.id);
    setBlockFreeAgencyScenario(game);

    const result = addToPracticeSquad(game, team.id, player.id);

    expect(result.nextState.teams[team.id]!.practiceSquad).toEqual([]);
    expect(result.nextState.freeAgents).toContain(player.id);
    expect(result.nextState.players[player.id]?.teamId).toBeNull();
  });

  it('tracks elevations and stops after the third elevation', () => {
    const game = makeLeagueState('regular_season', 1);
    const player = makePlayer('ps-qb', null as never, 'QB', 68, false);
    player.teamId = null;
    player.contract = null;
    game.players[player.id] = player;
    game.freeAgents.push(player.id);
    addToPracticeSquad(game, 'afce1', player.id);

    elevateFromPracticeSquad(game, 'afce1', player.id);
    processWaiverClaims(game);
    elevateFromPracticeSquad(game, 'afce1', player.id);
    processWaiverClaims(game);
    elevateFromPracticeSquad(game, 'afce1', player.id);
    const fourth = elevateFromPracticeSquad(game, 'afce1', player.id);

    const squadPlayer = fourth.nextState.teams.afce1.practiceSquad.find((entry) => entry.playerId === player.id);
    expect(squadPlayer?.elevationsUsed).toBe(3);
    expect(fourth.nextState.teams.afce1.roster.filter((entry) => entry.id === player.id)).toHaveLength(1);
  });

  it('refreshes locker-room state when elevated practice-squad players return', () => {
    const game = makeLeagueState('regular_season', 1);
    const team = game.teams.afce1;
    const player = makePlayer('ps-captain', null as never, 'LB', 82, false);
    player.teamId = null;
    player.contract = null;
    game.players[player.id] = player;
    game.freeAgents.push(player.id);
    addToPracticeSquad(game, team.id, player.id);
    elevateFromPracticeSquad(game, team.id, player.id);
    team.lockerRoom.captains = [{
      playerId: player.id,
      playerName: player.name,
      captainMoments: 0,
      rallyCooldown: 0,
      perks: ['rally_cry'],
    }];
    team.lockerRoom.tensions = [{
      id: 'tension-ps',
      type: 'playing_time',
      involvedPlayerIds: [player.id],
      involvedCliqueIds: [],
      severity: 'minor',
      weekCreated: game.week,
      resolved: false,
      narrative: 'A temporary elevation wants a bigger role.',
    }];

    processWaiverClaims(game);

    expect(team.roster.some((entry) => entry.id === player.id)).toBe(false);
    expect(team.practiceSquad.find((entry) => entry.playerId === player.id)?.isElevated).toBe(false);
    expect(team.lockerRoom.captains.some((captain) => captain.playerId === player.id)).toBe(false);
    expect(team.lockerRoom.tensions.some((tension) => tension.involvedPlayerIds.includes(player.id))).toBe(false);
  });

  it('awards a claimed player to the worst-record team first', () => {
    const game = makeLeagueState('regular_season', 1);
    game.teams.afce1.wins = 2;
    game.teams.afce1.losses = 15;
    game.teams.afcn1.wins = 10;
    game.teams.afcn1.losses = 7;
    game.waiverOrder = ['afce1', 'afcn1'];
    const player = game.teams.nfce1.roster[0]!;

    cutPlayerToWaivers(game, 'nfce1', player.id);
    submitWaiverClaim(game, 'afcn1', player.id);
    submitWaiverClaim(game, 'afce1', player.id);
    processWaiverClaims(game);

    expect(game.players[player.id]!.teamId).toBe('afce1');
    expect(game.teams.afce1.roster.some((entry) => entry.id === player.id)).toBe(true);
  });

  it('awards contractless waiver claims on a one-year minimum deal and syncs claimant cap', () => {
    const game = makeLeagueState('regular_season', 1);
    const claimant = game.teams.afce1;
    const source = game.teams.nfce1;
    claimant.wins = 2;
    claimant.losses = 15;
    const player = source.roster[0]!;
    player.yearsExp = 5;
    claimant.deadCap = 1.5;
    claimant.capUsed = 999;
    claimant.capSpace = -999;

    cutPlayerToWaivers(game, source.id, player.id);
    expect(game.players[player.id]!.contract).toBeNull();
    submitWaiverClaim(game, claimant.id, player.id);
    processWaiverClaims(game);

    const awarded = game.players[player.id]!;
    expect(awarded.teamId).toBe(claimant.id);
    expect(awarded.contract).toMatchObject({
      playerId: player.id,
      teamId: claimant.id,
      years: 1,
      baseSalary: getMinSalary(player.yearsExp),
      signingBonus: 0,
      prorated: 0,
    });
    expect(game.freeAgents).not.toContain(player.id);
    expectCapTotalsSynced(game, claimant.id);
  });

  it('blocks waiver claim submissions when scenario constraints disable free agency', () => {
    const game = makeLeagueState('regular_season', 1);
    const player = game.teams.nfce1.roster[0]!;
    cutPlayerToWaivers(game, 'nfce1', player.id);
    setBlockFreeAgencyScenario(game);

    const result = submitWaiverClaim(game, 'afce1', player.id);

    expect(result.nextState.waiverClaims).toEqual([]);
    expect(result.nextState.waiverWire.some((entry) => entry.playerId === player.id)).toBe(true);
    expect(result.nextState.players[player.id]?.teamId).toBeNull();
  });

  it('sends cut players to waivers before free agency', () => {
    const game = makeLeagueState('regular_season', 1);
    const player = game.teams.afce1.roster[0]!;

    cutPlayerToWaivers(game, 'afce1', player.id);

    expect(game.waiverWire.some((entry) => entry.playerId === player.id)).toBe(true);
    expect(game.freeAgents).not.toContain(player.id);
  });

  it('lets AI waiver logic claim players that fill roster needs', () => {
    const game = makeLeagueState('regular_season', 1);
    const qbIds = game.teams.afcn1.roster.filter((player) => player.pos === 'QB').map((player) => player.id);
    game.teams.afcn1.roster = game.teams.afcn1.roster.filter((player) => !qbIds.includes(player.id));
    for (const qbId of qbIds) {
      delete game.players[qbId];
    }
    const waiverQb = makePlayer('waiver-qb', null as never, 'QB', 74, false);
    waiverQb.teamId = null;
    waiverQb.contract = null;
    game.players[waiverQb.id] = waiverQb;
    game.waiverWire.push({
      playerId: waiverQb.id,
      releasedByTeamId: 'afce1',
      createdYear: game.year,
      createdWeek: game.week,
      expiresYear: game.year,
      expiresWeek: game.week + 1,
    });

    aiWaiverLogic(game, () => 0.25);

    expect(game.waiverClaims.some((claim) => claim.teamId === 'afcn1' && claim.playerId === waiverQb.id)).toBe(true);
  });

  it('persists waiver run results with winners and losers', () => {
    const game = makeLeagueState('regular_season', 1);
    game.teams.afce1.wins = 2;
    game.teams.afce1.losses = 15;
    game.teams.afcn1.wins = 10;
    game.teams.afcn1.losses = 7;
    const player = game.teams.nfce1.roster[0]!;

    cutPlayerToWaivers(game, 'nfce1', player.id);
    submitWaiverClaim(game, 'afce1', player.id);
    submitWaiverClaim(game, 'afcn1', player.id);
    processWaiverClaims(game);

    const result = game.waiverResults?.at(-1);
    expect(result?.entries[0]?.playerId).toBe(player.id);
    expect(result?.entries[0]?.winningTeamId).toBe('afce1');
    expect(result?.entries[0]?.losingTeamIds).toContain('afcn1');
  });

  it('tracks players who clear waivers into free agency', () => {
    const game = makeLeagueState('regular_season', 1);
    const player = game.teams.nfce1.roster[0]!;

    cutPlayerToWaivers(game, 'nfce1', player.id);
    game.week += 1;
    processWaiverClaims(game);

    const result = game.waiverResults?.at(-1);
    expect(result?.entries[0]?.playerId).toBe(player.id);
    expect(result?.entries[0]?.clearedToFreeAgency).toBe(true);
    expect(game.freeAgents).toContain(player.id);
  });
});
