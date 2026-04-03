import { describe, expect, it } from 'vitest';
import { makeLeagueState, makePlayer } from './test-helpers';
import {
  addToPracticeSquad,
  aiWaiverLogic,
  cutPlayerToWaivers,
  elevateFromPracticeSquad,
  processWaiverClaims,
  submitWaiverClaim,
} from './practice-squad';

describe('practice squad and waiver wire', () => {
  it('enforces the practice squad cap at 16 players', () => {
    const game = makeLeagueState('regular_season', 1);
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
