import type { EngineOutput, GameState, Handshake, HandshakeCondition, Player } from '../types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function emptyResult(game: GameState): EngineOutput {
  return { nextState: game, events: [], consequences: [] };
}

function deadlineReached(game: GameState, handshake: Handshake): boolean {
  return game.year > handshake.deadline.year || (game.year === handshake.deadline.year && game.week > handshake.deadline.week);
}

function playerForHandshake(game: GameState, handshake: Handshake): Player | null {
  return game.players[handshake.targetId] ?? null;
}

function conditionMet(game: GameState, handshake: Handshake): boolean {
  const team = game.teams[handshake.teamId];
  const player = playerForHandshake(game, handshake);
  if (!team) return false;

  if (handshake.condition.metric === 'wins') {
    return team.wins >= Number(handshake.condition.target);
  }
  if (handshake.condition.metric === 'playoff') {
    return Boolean(handshake.condition.target) && team.wins > team.losses;
  }
  if (handshake.condition.metric === 'starter') {
    return !!player?.isStarter;
  }
  if (handshake.condition.metric === 'trade_block') {
    return !!player && player.tradeBlock === Boolean(handshake.condition.target);
  }
  if (handshake.condition.metric === 'on_roster') {
    return !!player && player.teamId === handshake.teamId;
  }
  if (handshake.condition.metric === 'restructure') {
    return !!player?.contract?.restructured;
  }
  if (handshake.condition.metric === 'spending') {
    if (typeof handshake.condition.target === 'string' && handshake.condition.target.startsWith('under:')) {
      return team.capUsed <= Number(handshake.condition.target.split(':')[1] ?? team.capUsed);
    }
    return team.capUsed >= Number(handshake.condition.target);
  }
  if (handshake.condition.metric === 'draft_position') {
    const target = String(handshake.condition.target);
    const [pos, roundText] = target.split(':');
    const round = Number(roundText);
    return team.roster.some((playerEntry) =>
      playerEntry.draftYear === game.year &&
      playerEntry.pos === pos &&
      playerEntry.draftRound <= round);
  }
  return false;
}

function applyFulfilledEffects(game: GameState, handshake: Handshake): void {
  const team = game.teams[handshake.teamId];
  if (!team) return;
  team.owner.approval += 5;
  team.ownerMood = team.owner.approval;
  if (team.isUser) {
    game.frontOffice.reputation.owner = clamp(game.frontOffice.reputation.owner + 5, 0, 100);
  }
  const player = playerForHandshake(game, handshake);
  if (player) {
    player.morale = clamp(player.morale + 10, 0, 100);
    if (team.isUser) {
      game.frontOffice.reputation.players = clamp(game.frontOffice.reputation.players + 4, 0, 100);
    }
  }
}

function applyBrokenEffects(game: GameState, handshake: Handshake): void {
  const team = game.teams[handshake.teamId];
  if (!team) return;
  team.owner.approval -= 10;
  team.ownerMood = team.owner.approval;
  if (team.isUser) {
    game.frontOffice.reputation.owner = clamp(game.frontOffice.reputation.owner - 10, 0, 100);
  }
  const player = playerForHandshake(game, handshake);
  if (player) {
    player.morale = clamp(player.morale - 15, 0, 100);
    player.chemistry = clamp(player.chemistry - 5, 0, 100);
    if (team.isUser) {
      game.frontOffice.reputation.players = clamp(game.frontOffice.reputation.players - 8, 0, 100);
    }
  }
}

function applyExpiredEffects(game: GameState, handshake: Handshake): void {
  const team = game.teams[handshake.teamId];
  if (!team) return;
  team.owner.approval -= 3;
  team.ownerMood = team.owner.approval;
  if (team.isUser) {
    game.frontOffice.reputation.owner = clamp(game.frontOffice.reputation.owner - 3, 0, 100);
  }
}

function ownerDemand(game: GameState, teamId: string, promiseText: string, condition: HandshakeCondition): Handshake {
  return {
    id: `owner-${teamId}-${game.year}-${game.week}-${game.handshakes.length}`,
    type: 'owner',
    promiseText,
    targetId: teamId,
    teamId,
    madeYear: game.year,
    madeWeek: game.week,
    deadline: { year: game.year, week: 18 },
    condition,
    status: 'active',
    consequence: 'Owner approval shifts based on the outcome.',
  };
}

export function generateOwnerDemands(game: GameState, teamId: string): Handshake[] {
  const team = game.teams[teamId];
  if (!team) return [];
  if (!game.handshakes) {
    game.handshakes = [];
  }

  const demands: Handshake[] = [];
  if (team.owner.archetypeId === 'win_now') {
    demands.push(ownerDemand(game, teamId, 'Make the playoffs this year.', { metric: 'playoff', target: true }));
  } else if (team.owner.archetypeId === 'profit_first') {
    demands.push(ownerDemand(game, teamId, 'Keep cap spending under control.', { metric: 'spending', target: `under:${Math.round(team.capUsed)}` }));
  } else if (team.owner.archetypeId === 'patient_builder') {
    const youngest = [...team.roster].sort((a, b) => a.age - b.age || b.pot - a.pot)[0];
    if (youngest) {
      demands.push({
        ...ownerDemand(game, teamId, `Develop ${youngest.name} into a starter.`, { metric: 'starter', target: true }),
        targetId: youngest.id,
        deadline: { year: game.year, week: 10 },
      });
    }
  } else {
    demands.push(ownerDemand(game, teamId, 'Deliver a winning season.', { metric: 'wins', target: 9 }));
  }

  game.handshakes.push(...demands);
  return demands;
}

export function makePlayerPromise(
  game: GameState,
  teamId: string,
  playerId: string,
  promiseType: 'starter' | 'no_trade' | 'restructure',
): EngineOutput {
  if (!game.handshakes) {
    game.handshakes = [];
  }
  const promise: Handshake = {
    id: `player-${teamId}-${playerId}-${game.year}-${game.week}-${game.handshakes.length}`,
    type: 'player',
    promiseText: promiseType === 'starter'
      ? 'You will be the starter.'
      : promiseType === 'no_trade'
        ? 'I will not trade you.'
        : 'I will restructure your deal.',
    targetId: playerId,
    teamId,
    madeYear: game.year,
    madeWeek: game.week,
    deadline: { year: game.year, week: Math.min(18, game.week + 4) },
    condition: promiseType === 'starter'
      ? { metric: 'starter', target: true }
      : promiseType === 'no_trade'
        ? { metric: 'on_roster', target: true }
        : { metric: 'restructure', target: true },
    status: 'active',
    consequence: 'Breaking this promise will hurt trust in the room.',
  };
  game.handshakes.push(promise);
  return emptyResult(game);
}

export function evaluateHandshakes(game: GameState): Handshake[] {
  if (!game.handshakes) {
    game.handshakes = [];
  }
  for (const handshake of game.handshakes) {
    if (handshake.status !== 'active') continue;
    if (conditionMet(game, handshake)) {
      handshake.status = 'fulfilled';
      applyFulfilledEffects(game, handshake);
      continue;
    }

    const playerPromise = handshake.type === 'player';
    const directViolation = handshake.condition.metric === 'on_roster' && !conditionMet(game, handshake);
    if (directViolation) {
      handshake.status = 'broken';
      applyBrokenEffects(game, handshake);
      continue;
    }

    if (deadlineReached(game, handshake)) {
      handshake.status = playerPromise ? 'broken' : 'expired';
      if (playerPromise) {
        applyBrokenEffects(game, handshake);
      } else {
        applyExpiredEffects(game, handshake);
      }
    }
  }

  return game.handshakes;
}
