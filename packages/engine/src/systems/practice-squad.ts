import { RNG } from '../rng';
import { getMinSalary, getSalaryCap } from '../config';
import { calcCapHit, calcDeadMoney, makeContract } from './contracts';
import { assignJerseyNumber } from './jersey-retirement';
import { getActiveRule } from './league-rules';
import { recordNewsItem } from './league-news';
import { initializeLockerRoom, syncLockerRoomRoster } from './locker-room';
import { getScenarioConstraints } from './scenario-challenge';
import { syncTeamCapTotals } from './team-cap';
import type {
  EngineOutput,
  GameState,
  PracticeSquadPlayer,
  Team,
  WaiverClaim,
  WaiverResultEntry,
  WaiverWireEntry,
} from '../types';

const PRACTICE_SQUAD_MAX = 16;

export function getPracticeSquadLimit(game: GameState): number {
  if (!game.leagueRules) return PRACTICE_SQUAD_MAX;
  return Number(getActiveRule(game.leagueRules, 'practice_squad_size', game.year));
}

function refreshRosterState(team: Team): void {
  for (const player of team.roster) {
    assignJerseyNumber(team, player);
  }
  team.lockerRoom = syncLockerRoomRoster(team, team.lockerRoom ?? initializeLockerRoom(team, () => 0.42));
}

function ensureWaiverState(game: GameState): void {
  if (!game.waiverOrder) game.waiverOrder = [];
  if (!game.waiverWire) game.waiverWire = [];
  if (!game.waiverClaims) game.waiverClaims = [];
  if (!game.waiverResults) game.waiverResults = [];
  for (const team of Object.values(game.teams)) {
    if (!team.practiceSquad) {
      team.practiceSquad = [];
    }
    if (!team.txLog) {
      team.txLog = [];
    }
  }
}

function emptyResult(game: GameState): EngineOutput {
  ensureWaiverState(game);
  return { nextState: game, events: [], consequences: [] };
}

function waiverSort(game: GameState): string[] {
  return Object.values(game.teams)
    .sort((a, b) => {
      if (a.wins !== b.wins) return a.wins - b.wins;
      if (a.losses !== b.losses) return b.losses - a.losses;
      if (a.ties !== b.ties) return a.ties - b.ties;
      if (a.seasonStats.pointDifferential !== b.seasonStats.pointDifferential) {
        return a.seasonStats.pointDifferential - b.seasonStats.pointDifferential;
      }
      return a.id.localeCompare(b.id);
    })
    .map((team) => team.id);
}

function teamNeeds(team: Team, playerPos: string): boolean {
  const count = team.roster.filter((player) => player.pos === playerPos).length;
  return count < 2;
}

export function addToPracticeSquad(game: GameState, teamId: string, playerId: string): EngineOutput {
  if (getScenarioConstraints(game)?.blockFreeAgency) {
    return { nextState: game, events: [], consequences: [] };
  }

  const team = game.teams[teamId];
  const player = game.players[playerId];
  if (!team || !player || !game.freeAgents.includes(playerId) || team.practiceSquad.length >= getPracticeSquadLimit(game)) {
    return emptyResult(game);
  }

  team.practiceSquad.push({
    playerId,
    elevationsUsed: 0,
    maxElevations: 3,
  });
  game.freeAgents = game.freeAgents.filter((id) => id !== playerId);
  player.teamId = teamId;
  player.contract = null;
  team.txLog.push({
    type: 'PS_ADD',
    year: game.year,
    week: game.week,
    playerId,
    toTeamId: teamId,
  });
  return emptyResult(game);
}

export function removeFromPracticeSquad(game: GameState, teamId: string, playerId: string): EngineOutput {
  const team = game.teams[teamId];
  const player = game.players[playerId];
  if (!team || !player) return emptyResult(game);
  team.practiceSquad = team.practiceSquad.filter((entry) => entry.playerId !== playerId);
  team.roster = team.roster.filter((entry) => entry.id !== playerId);
  if (!game.freeAgents.includes(playerId)) {
    game.freeAgents.push(playerId);
  }
  player.teamId = null;
  team.txLog.push({
    type: 'PS_RELEASE',
    year: game.year,
    week: game.week,
    playerId,
    fromTeamId: teamId,
  });
  refreshRosterState(team);
  return emptyResult(game);
}

export function elevateFromPracticeSquad(game: GameState, teamId: string, playerId: string): EngineOutput {
  const team = game.teams[teamId];
  const player = game.players[playerId];
  const squadPlayer = team?.practiceSquad.find((entry) => entry.playerId === playerId);
  if (!team || !player || !squadPlayer || squadPlayer.elevationsUsed >= squadPlayer.maxElevations) {
    return emptyResult(game);
  }

  if (!team.roster.some((entry) => entry.id === playerId)) {
    team.roster.push(player);
  }
  assignJerseyNumber(team, player);
  squadPlayer.elevationsUsed += 1;
  squadPlayer.isElevated = true;
  squadPlayer.elevatedWeek = game.week;
  player.teamId = teamId;
  team.txLog.push({
    type: 'PS_ELEVATE',
    year: game.year,
    week: game.week,
    playerId,
    toTeamId: teamId,
  });
  refreshRosterState(team);
  return emptyResult(game);
}

export function cutPlayerToWaivers(game: GameState, teamId: string, playerId: string): EngineOutput {
  ensureWaiverState(game);
  const team = game.teams[teamId];
  const player = game.players[playerId];
  if (!team || !player) return emptyResult(game);

  const index = team.roster.findIndex((entry) => entry.id === playerId);
  if (index === -1) return emptyResult(game);

  if (player.contract) {
    const deadCap = calcDeadMoney(player.contract);
    team.deadCap += deadCap;
    team.capUsed -= calcCapHit(player.contract) - deadCap;
    team.capSpace = getSalaryCap(game.year, game) - team.capUsed;
  }

  team.roster.splice(index, 1);
  team.practiceSquad = team.practiceSquad.filter((entry) => entry.playerId !== playerId);
  player.teamId = null;
  player.contract = null;
  game.waiverWire.push({
    playerId,
    releasedByTeamId: teamId,
    createdYear: game.year,
    createdWeek: game.week,
    expiresYear: game.year,
    expiresWeek: game.week + 1,
  });
  team.txLog.push({
    type: 'CUT',
    year: game.year,
    week: game.week,
    playerId,
    fromTeamId: teamId,
  });
  refreshRosterState(team);
  return emptyResult(game);
}

export function submitWaiverClaim(game: GameState, teamId: string, playerId: string): EngineOutput {
  if (getScenarioConstraints(game)?.blockFreeAgency) {
    return { nextState: game, events: [], consequences: [] };
  }

  ensureWaiverState(game);
  if (!game.waiverWire.some((entry) => entry.playerId === playerId)) {
    return emptyResult(game);
  }

  const exists = game.waiverClaims.some((claim) => claim.teamId === teamId && claim.playerId === playerId);
  if (!exists) {
    game.waiverClaims.push({
      teamId,
      playerId,
      claimYear: game.year,
      claimWeek: game.week,
    });
  }
  return emptyResult(game);
}

function awardClaim(game: GameState, claim: WaiverClaim): void {
  const team = game.teams[claim.teamId];
  const player = game.players[claim.playerId];
  const waiverEntry = game.waiverWire.find((entry) => entry.playerId === claim.playerId) ?? null;
  if (!team || !player) return;
  if (!team.roster.some((entry) => entry.id === player.id)) {
    team.roster.push(player);
  }
  assignJerseyNumber(team, player);
  player.teamId = team.id;
  if (player.contract) {
    player.contract.teamId = team.id;
  } else {
    player.contract = makeContract(getMinSalary(player.yearsExp ?? 0), 1, 0, 0, player.id, team.id);
  }
  game.freeAgents = game.freeAgents.filter((playerId) => playerId !== player.id);
  game.waiverWire = game.waiverWire.filter((entry) => entry.playerId !== player.id);
  game.waiverClaims = game.waiverClaims.filter((entry) => entry.playerId !== player.id);
  team.txLog.push({
    type: 'WAIVER_CLAIM',
    year: game.year,
    week: game.week,
    playerId: player.id,
    fromTeamId: waiverEntry?.releasedByTeamId ?? undefined,
    toTeamId: team.id,
  });
  recordNewsItem(game, {
    id: `waiver-${player.id}-${team.id}-${game.year}-${game.week}`,
    year: game.year,
    week: game.week,
    type: 'waiver',
    headline: `${team.city} claims ${player.name} off waivers`,
    body: `${team.city} ${team.name} adds ${player.name} after a waiver run.`,
    teamIds: [team.id],
    playerIds: [player.id],
    importance: 'minor',
  });
  refreshRosterState(team);
  syncTeamCapTotals(game, team);
}

function expireWaivers(game: GameState): WaiverResultEntry[] {
  const expired = game.waiverWire.filter((entry) =>
    entry.expiresYear < game.year ||
    (entry.expiresYear === game.year && entry.expiresWeek <= game.week),
  );
  const results: WaiverResultEntry[] = [];
  for (const entry of expired) {
    if (!game.freeAgents.includes(entry.playerId)) {
      game.freeAgents.push(entry.playerId);
    }
    results.push({
      playerId: entry.playerId,
      releasedByTeamId: entry.releasedByTeamId,
      winningTeamId: null,
      losingTeamIds: [],
      clearedToFreeAgency: true,
    });
  }
  if (expired.length > 0) {
    const expiredIds = new Set(expired.map((entry) => entry.playerId));
    game.waiverWire = game.waiverWire.filter((entry) => !expiredIds.has(entry.playerId));
    game.waiverClaims = game.waiverClaims.filter((entry) => !expiredIds.has(entry.playerId));
  }
  return results;
}

function returnElevatedPlayers(game: GameState): void {
  for (const team of Object.values(game.teams)) {
    let returnedPlayer = false;
    for (const squadPlayer of team.practiceSquad) {
      if (!squadPlayer.isElevated) continue;
      if (squadPlayer.elevatedWeek !== game.week) continue;
      squadPlayer.isElevated = false;
      team.roster = team.roster.filter((player) => player.id !== squadPlayer.playerId);
      returnedPlayer = true;
    }
    if (returnedPlayer) {
      refreshRosterState(team);
    }
  }
}

export function processWaiverClaims(game: GameState): EngineOutput {
  ensureWaiverState(game);
  game.waiverOrder = waiverSort(game);
  const byPlayer = new Map<string, WaiverClaim[]>();
  const results: WaiverResultEntry[] = [];
  for (const claim of game.waiverClaims) {
    const claims = byPlayer.get(claim.playerId) ?? [];
    claims.push(claim);
    byPlayer.set(claim.playerId, claims);
  }

  for (const [playerId, claims] of byPlayer.entries()) {
    const waiverEntry = game.waiverWire.find((entry) => entry.playerId === playerId) ?? null;
    const winner = [...claims].sort((a, b) =>
      game.waiverOrder.indexOf(a.teamId) - game.waiverOrder.indexOf(b.teamId) ||
      a.teamId.localeCompare(b.teamId))[0];
    if (winner && game.waiverWire.some((entry) => entry.playerId === playerId)) {
      awardClaim(game, winner);
      results.push({
        playerId,
        releasedByTeamId: waiverEntry?.releasedByTeamId ?? null,
        winningTeamId: winner.teamId,
        losingTeamIds: claims.filter((entry) => entry.teamId !== winner.teamId).map((entry) => entry.teamId),
        clearedToFreeAgency: false,
      });
    }
  }

  results.push(...expireWaivers(game));
  if (results.length > 0) {
    game.waiverResults!.push({
      id: `waiver-results-${game.year}-${game.week}-${game.waiverResults!.length}`,
      year: game.year,
      week: game.week,
      entries: results,
    });
  }
  returnElevatedPlayers(game);
  return emptyResult(game);
}

export function aiWaiverLogic(game: GameState, rand: () => number = RNG.ai): EngineOutput {
  ensureWaiverState(game);
  for (const team of Object.values(game.teams).filter((entry) => !entry.isUser)) {
    const target = game.waiverWire
      .map((entry) => game.players[entry.playerId])
      .filter((player): player is NonNullable<typeof player> => !!player)
      .filter((player) => teamNeeds(team, player.pos))
      .sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id))[0];

    if (target && rand() <= 1) {
      submitWaiverClaim(game, team.id, target.id);
    }
  }

  return emptyResult(game);
}
