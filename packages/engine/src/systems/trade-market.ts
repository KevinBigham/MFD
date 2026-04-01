import type { EngineOutput, GameState, Player, TradeOffer, TradeOfferAsset } from '../types';

function cloneGame(game: GameState): GameState {
  return JSON.parse(JSON.stringify(game)) as GameState;
}

function transferPlayer(game: GameState, asset: TradeOfferAsset, toTeamId: string): void {
  if (!asset.playerId) return;
  const fromTeam = game.teams[asset.teamId];
  const toTeam = game.teams[toTeamId];
  if (!fromTeam || !toTeam) return;

  const index = fromTeam.roster.findIndex((player) => player.id === asset.playerId);
  if (index === -1) return;

  const [player] = fromTeam.roster.splice(index, 1);
  if (!player) return;

  player.teamId = toTeamId;
  toTeam.roster.push(player as Player);
  game.players[player.id] = player as Player;
}

function transferPick(game: GameState, asset: TradeOfferAsset, toTeamId: string): void {
  if (!asset.pickId) return;
  const fromTeam = game.teams[asset.teamId];
  const toTeam = game.teams[toTeamId];
  if (!fromTeam || !toTeam) return;

  const index = fromTeam.draftPicks.findIndex((pick) => `${pick.currentTeamId}-${pick.year}-${pick.round}-${pick.pick}-${pick.originalTeamId}` === asset.pickId);
  if (index === -1) return;

  const [pick] = fromTeam.draftPicks.splice(index, 1);
  if (!pick) return;

  pick.currentTeamId = toTeamId;
  toTeam.draftPicks.push(pick);
}

function applyAsset(game: GameState, asset: TradeOfferAsset, toTeamId: string): void {
  if (asset.type === 'player') {
    transferPlayer(game, asset, toTeamId);
    return;
  }
  transferPick(game, asset, toTeamId);
}

function findUserTeam(game: GameState) {
  return Object.values(game.teams).find((team) => team.isUser) ?? null;
}

function pickId(teamId: string, year: number, round: number, pick: number, originalTeamId: string): string {
  return `${teamId}-${year}-${round}-${pick}-${originalTeamId}`;
}

export function generateTradeOffers(game: GameState): TradeOffer[] {
  const userTeam = findUserTeam(game);
  if (!userTeam) return [];

  const aiTeams = Object.values(game.teams)
    .filter((team) => !team.isUser)
    .sort((a, b) => b.capSpace - a.capSpace || a.id.localeCompare(b.id));
  const tradeBlock = userTeam.roster
    .filter((player) => player.tradeBlock)
    .sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id));

  const offers: TradeOffer[] = [];

  for (let index = 0; index < Math.min(2, tradeBlock.length, aiTeams.length); index++) {
    const player = tradeBlock[index]!;
    const aiTeam = aiTeams[index]!;
    const aiPlayer = [...aiTeam.roster]
      .filter((candidate) => candidate.pos !== 'QB' && candidate.ovr >= player.ovr - 8)
      .sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id))[0];
    const aiPick = aiTeam.draftPicks
      .filter((pick) => pick.year === game.year && pick.round >= 2)
      .sort((a, b) => a.round - b.round || a.pick - b.pick)[0];

    if (!aiPlayer || !aiPick) continue;

    offers.push({
      id: `trade-offer-${aiTeam.id}-${player.id}`,
      fromTeamId: aiTeam.id,
      toTeamId: userTeam.id,
      direction: 'inbound',
      summary: `${aiTeam.city} offers ${aiPlayer.name} and a Day 2 pick for ${player.name}.`,
      status: 'pending',
      send: [{
        type: 'player',
        teamId: userTeam.id,
        playerId: player.id,
        pickId: null,
        description: player.name,
      }],
      receive: [
        {
          type: 'player',
          teamId: aiTeam.id,
          playerId: aiPlayer.id,
          pickId: null,
          description: aiPlayer.name,
        },
        {
          type: 'pick',
          teamId: aiTeam.id,
          playerId: null,
          pickId: pickId(aiTeam.id, aiPick.year, aiPick.round, aiPick.pick, aiPick.originalTeamId),
          description: `Round ${aiPick.round} pick`,
        },
      ],
    });
  }

  if (offers.length > 0) return offers;

  const aiTarget = aiTeams[0];
  const userPick = userTeam.draftPicks
    .filter((pick) => pick.year === game.year)
    .sort((a, b) => a.round - b.round || a.pick - b.pick)[0];
  const aiPlayer = aiTarget?.roster
    .filter((player) => player.ovr >= 76)
    .sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id))[0];

  if (!aiTarget || !userPick || !aiPlayer) return [];

  return [{
    id: `trade-offer-${userTeam.id}-${aiPlayer.id}`,
    fromTeamId: aiTarget.id,
    toTeamId: userTeam.id,
    direction: 'outbound',
    summary: `Pay a premium pick for ${aiPlayer.name}.`,
    status: 'pending',
    send: [{
      type: 'pick',
      teamId: userTeam.id,
      playerId: null,
      pickId: pickId(userTeam.id, userPick.year, userPick.round, userPick.pick, userPick.originalTeamId),
      description: `Round ${userPick.round} pick`,
    }],
    receive: [{
      type: 'player',
      teamId: aiTarget.id,
      playerId: aiPlayer.id,
      pickId: null,
      description: aiPlayer.name,
    }],
  }];
}

export function acceptTradeOffer(game: GameState, offerId: string): EngineOutput {
  const nextState = cloneGame(game);
  const offer = nextState.offseasonState?.tradeOffers.find((entry) => entry.id === offerId);
  if (!offer) return { nextState, events: [], consequences: [] };

  for (const asset of offer.send) applyAsset(nextState, asset, offer.fromTeamId);
  for (const asset of offer.receive) applyAsset(nextState, asset, offer.toTeamId);
  offer.status = 'accepted';

  return { nextState, events: [], consequences: [] };
}

export function rejectTradeOffer(game: GameState, offerId: string): EngineOutput {
  const nextState = cloneGame(game);
  const offer = nextState.offseasonState?.tradeOffers.find((entry) => entry.id === offerId);
  if (offer) {
    offer.status = 'rejected';
  }

  return { nextState, events: [], consequences: [] };
}
