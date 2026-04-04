import { mulberry32 } from '../rng';
import { syncPlayerArchiveEntry } from './history';
import { conditionalPickExpectedValue } from './conditional-picks';
import { recordNewsItem } from './league-news';
import { createTransactionalPressConference, recordPressConference } from './press-conference';
import { getScenarioConstraints } from './scenario-challenge';
import { appendToSocialFeed, generateTransactionPosts } from './social-feed';
import { calcPickValue, calcPlayerValue, evaluateTradeOffer } from './trade-value';
import type { DraftPick, EngineOutput, GameState, Player, Team, TradeOffer, TradeOfferAsset } from '../types';

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
  syncPlayerArchiveEntry(game, player as Player, game.year);
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

function transferConditionalPick(game: GameState, asset: TradeOfferAsset, toTeamId: string): void {
  if (!asset.conditionalPickId) return;
  const conditionalPick = game.conditionalPicks.find((entry) => entry.id === asset.conditionalPickId);
  const fromTeam = game.teams[asset.teamId];
  const toTeam = game.teams[toTeamId];
  if (!conditionalPick || !fromTeam || !toTeam) return;

  const index = fromTeam.draftPicks.findIndex((pick) =>
    pick.year === conditionalPick.basePick.year &&
    pick.round === conditionalPick.basePick.round &&
    pick.pick === conditionalPick.basePick.pick &&
    pick.originalTeamId === conditionalPick.basePick.originalTeamId,
  );

  const actualPick = index === -1 ? null : fromTeam.draftPicks.splice(index, 1)[0] ?? null;
  if (actualPick) {
    actualPick.currentTeamId = toTeamId;
    toTeam.draftPicks.push(actualPick);
  }

  conditionalPick.toTeamId = toTeamId;
  conditionalPick.basePick.currentTeamId = toTeamId;
  if (conditionalPick.resolvedPick) {
    conditionalPick.resolvedPick.currentTeamId = toTeamId;
  }
}

function applyAsset(game: GameState, asset: TradeOfferAsset, toTeamId: string): void {
  if (asset.type === 'player') {
    transferPlayer(game, asset, toTeamId);
    return;
  }
  if (asset.type === 'conditional_pick') {
    transferConditionalPick(game, asset, toTeamId);
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

function pickAsset(teamId: string, pick: DraftPick): TradeOfferAsset {
  return {
    type: 'pick',
    teamId,
    playerId: null,
    pickId: pickId(teamId, pick.year, pick.round, pick.pick, pick.originalTeamId),
    description: `Round ${pick.round} pick`,
  };
}

function conditionalPickAsset(teamId: string, conditionalPickId: string, description: string): TradeOfferAsset {
  return {
    type: 'conditional_pick',
    teamId,
    playerId: null,
    pickId: null,
    conditionalPickId,
    description,
  };
}

function playerAsset(teamId: string, player: Player): TradeOfferAsset {
  return {
    type: 'player',
    teamId,
    playerId: player.id,
    pickId: null,
    description: player.name,
  };
}

function describeAssets(assets: TradeOfferAsset[]): string {
  if (assets.length === 0) return 'future assets';
  if (assets.length === 1) return assets[0]!.description;
  if (assets.length === 2) return `${assets[0]!.description} and ${assets[1]!.description}`;
  return `${assets[0]!.description}, ${assets[1]!.description}, and ${assets[2]!.description}`;
}

function positionNeed(team: Team, pos: Player['pos']): number {
  const bestAtPosition = team.roster
    .filter((player) => player.pos === pos)
    .sort((a, b) => b.ovr - a.ovr)[0];
  return 90 - (bestAtPosition?.ovr ?? 60);
}

function tradeablePlayers(team: Team, targetPos: Player['pos']): Player[] {
  return [...team.roster]
    .filter((player) => player.pos !== 'QB' || targetPos === 'QB')
    .filter((player) => !(team.gmStrategy === 'contend' && player.age <= 26 && player.ovr >= 80))
    .sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id));
}

function selectBestPick(picks: DraftPick[], remaining: number): DraftPick | null {
  if (picks.length === 0) return null;
  const valued = picks.map((pick) => ({ pick, value: calcPickValue(pick) }));
  const covering = valued
    .filter((entry) => entry.value >= remaining)
    .sort((a, b) => a.value - b.value || a.pick.round - b.pick.round || a.pick.pick - b.pick.pick)[0];
  if (covering) return covering.pick;
  return valued
    .sort((a, b) => b.value - a.value || a.pick.round - b.pick.round || a.pick.pick - b.pick.pick)[0]
    ?.pick ?? null;
}

function buildAssetsForTarget(game: GameState, aiTeam: Team, userTeam: Team, targetPlayer: Player): TradeOfferAsset[] {
  const targetValue = Math.max(1, calcPlayerValue(game, targetPlayer, aiTeam));
  const assets: TradeOfferAsset[] = [];
  let totalValue = 0;

  const candidatePlayer = tradeablePlayers(aiTeam, targetPlayer.pos)
    .map((player) => ({
      player,
      value: Math.max(1, calcPlayerValue(game, player, userTeam)),
      fitGap: Math.abs(calcPlayerValue(game, player, userTeam) - targetValue * 0.45),
    }))
    .filter((entry) => entry.player.id !== targetPlayer.id)
    .sort((a, b) => a.fitGap - b.fitGap || b.value - a.value || a.player.id.localeCompare(b.player.id))[0];

  if (candidatePlayer && aiTeam.gmStrategy !== 'rebuild' && candidatePlayer.value < targetValue * 0.8) {
    assets.push(playerAsset(aiTeam.id, candidatePlayer.player));
    totalValue += candidatePlayer.value;
  }

  const remainingPicks = aiTeam.draftPicks
    .filter((pick) => pick.year === game.year)
    .sort((a, b) => a.round - b.round || a.pick - b.pick);

  while (remainingPicks.length > 0 && assets.length < 3 && totalValue < targetValue * 0.92) {
    const pick = selectBestPick(remainingPicks, targetValue * 0.92 - totalValue);
    if (!pick) break;
    assets.push(pickAsset(aiTeam.id, pick));
    totalValue += calcPickValue(pick);
    const index = remainingPicks.findIndex((candidate) =>
      candidate.year === pick.year &&
      candidate.round === pick.round &&
      candidate.pick === pick.pick &&
      candidate.originalTeamId === pick.originalTeamId,
    );
    if (index !== -1) {
      remainingPicks.splice(index, 1);
    }
  }

  if (assets.length < 3 && totalValue < targetValue * 0.92) {
    const conditionalPick = game.conditionalPicks
      .filter((entry) => entry.toTeamId === aiTeam.id && !entry.resolved)
      .map((entry) => ({
        entry,
        value: conditionalPickExpectedValue(entry),
      }))
      .sort((a, b) => a.value - b.value || a.entry.id.localeCompare(b.entry.id))[0];

    if (conditionalPick) {
      assets.push(conditionalPickAsset(
        aiTeam.id,
        conditionalPick.entry.id,
        conditionalPick.entry.description || `Conditional round ${conditionalPick.entry.basePick.round} pick`,
      ));
      totalValue += conditionalPick.value;
    }
  }

  return assets;
}

function buildInboundOffer(game: GameState, userTeam: Team, aiTeam: Team, targetPlayer: Player): TradeOffer | null {
  const send = [playerAsset(userTeam.id, targetPlayer)];
  const receive = buildAssetsForTarget(game, aiTeam, userTeam, targetPlayer);
  if (receive.length === 0) return null;

  const evaluation = evaluateTradeOffer(game, aiTeam, send, receive);
  if (!evaluation.accepted) return null;

  return {
    id: `trade-offer-${aiTeam.id}-${targetPlayer.id}`,
    fromTeamId: aiTeam.id,
    toTeamId: userTeam.id,
    direction: 'inbound',
    summary: `${aiTeam.city} offers ${describeAssets(receive)} for ${targetPlayer.name}.`,
    status: 'pending',
    send,
    receive,
  };
}

function buildPickOnlyFallback(game: GameState, userTeam: Team, aiTeam: Team, targetPlayer: Player): TradeOffer | null {
  const picks = aiTeam.draftPicks
    .filter((pick) => pick.year === game.year)
    .sort((a, b) => a.round - b.round || a.pick - b.pick)
    .slice(0, 2);
  if (picks.length === 0) return null;

  const receive = picks.map((pick) => pickAsset(aiTeam.id, pick));
  const totalPickValue = picks.reduce((sum, pick) => sum + calcPickValue(pick), 0);
  const targetValue = Math.max(1, calcPlayerValue(game, targetPlayer, aiTeam));
  if (totalPickValue < targetValue * 0.75) return null;

  return {
    id: `trade-offer-fallback-${aiTeam.id}-${targetPlayer.id}`,
    fromTeamId: aiTeam.id,
    toTeamId: userTeam.id,
    direction: 'inbound',
    summary: `${aiTeam.city} offers ${describeAssets(receive)} for ${targetPlayer.name}.`,
    status: 'pending',
    send: [playerAsset(userTeam.id, targetPlayer)],
    receive,
  };
}

function buildOutboundOffer(game: GameState, userTeam: Team, aiTeam: Team): TradeOffer | null {
  const targetPlayer = [...aiTeam.roster]
    .filter((player) => player.tradeBlock || (aiTeam.gmStrategy === 'rebuild' && player.age >= 28 && player.ovr >= 76))
    .sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id))[0];
  if (!targetPlayer) return null;

  const userPicks = userTeam.draftPicks
    .filter((pick) => pick.year === game.year)
    .sort((a, b) => a.round - b.round || a.pick - b.pick);

  const send: TradeOfferAsset[] = [];
  let sentValue = 0;
  const targetValue = Math.max(1, calcPlayerValue(game, targetPlayer, userTeam));

  for (const pick of userPicks) {
    send.push(pickAsset(userTeam.id, pick));
    sentValue += calcPickValue(pick);
    if (sentValue >= targetValue * 0.95) break;
  }

  if (send.length === 0) return null;

  const receive = [playerAsset(aiTeam.id, targetPlayer)];
  const evaluation = evaluateTradeOffer(game, aiTeam, send, receive);
  if (!evaluation.accepted) return null;

  return {
    id: `trade-offer-${userTeam.id}-${targetPlayer.id}`,
    fromTeamId: aiTeam.id,
    toTeamId: userTeam.id,
    direction: 'outbound',
    summary: `${aiTeam.city} wants ${describeAssets(send)} for ${targetPlayer.name}.`,
    status: 'pending',
    send,
    receive,
  };
}

export function generateTradeOffers(game: GameState): TradeOffer[] {
  if (getScenarioConstraints(game)?.blockTrades) return [];
  const userTeam = findUserTeam(game);
  if (!userTeam) return [];

  const aiTeams = Object.values(game.teams)
    .filter((team) => !team.isUser)
    .sort((a, b) => a.id.localeCompare(b.id));
  const tradeBlock = userTeam.roster
    .filter((player) => player.tradeBlock)
    .sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id));

  const offers: TradeOffer[] = [];

  for (const player of tradeBlock) {
    const rankedTeams = [...aiTeams]
      .sort((a, b) => positionNeed(b, player.pos) - positionNeed(a, player.pos) || a.id.localeCompare(b.id));

    for (const aiTeam of rankedTeams) {
      const offer = buildInboundOffer(game, userTeam, aiTeam, player);
      if (offer) {
        offers.push(offer);
        break;
      }
    }

    if (!offers.some((offer) => offer.send.some((asset) => asset.playerId === player.id))) {
      const fallbackTeam = rankedTeams[0];
      const fallbackOffer = fallbackTeam ? buildPickOnlyFallback(game, userTeam, fallbackTeam, player) : null;
      if (fallbackOffer) {
        offers.push(fallbackOffer);
      }
    }
  }

  for (const aiTeam of aiTeams) {
    if (offers.length >= 6) break;
    const offer = buildOutboundOffer(game, userTeam, aiTeam);
    if (offer) {
      offers.push(offer);
    }
  }

  return offers;
}

export function acceptTradeOffer(game: GameState, offerId: string): EngineOutput {
  const nextState = cloneGame(game);
  if (getScenarioConstraints(nextState)?.blockTrades) {
    return { nextState, events: [], consequences: [] };
  }
  if (nextState.phase === 'regular_season' && nextState.week > 12) {
    return { nextState, events: [], consequences: [] };
  }
  const offer = nextState.offseasonState?.tradeOffers.find((entry) => entry.id === offerId);
  if (!offer) return { nextState, events: [], consequences: [] };

  for (const asset of offer.send) applyAsset(nextState, asset, offer.fromTeamId);
  for (const asset of offer.receive) applyAsset(nextState, asset, offer.toTeamId);
  offer.status = 'accepted';

  for (const asset of [...offer.send, ...offer.receive]) {
    if (asset.type !== 'player' || !asset.playerId) continue;
    const fromTeamId = asset.teamId;
    const toTeamId = asset.teamId === offer.toTeamId ? offer.fromTeamId : offer.toTeamId;
    nextState.teams[fromTeamId]?.txLog.push({
      type: 'TRADE',
      year: nextState.year,
      week: nextState.week,
      playerId: asset.playerId,
      fromTeamId,
      toTeamId,
    });
  }

  const userTeam = findUserTeam(nextState);
  if (userTeam) {
    const conference = createTransactionalPressConference({
      game: nextState,
      teamId: userTeam.id,
      type: 'post_trade',
      topic: `${userTeam.city} addresses the trade market after landing ${describeAssets(offer.receive)}.`,
      speaker: userTeam.staff.hc?.name ?? 'Head Coach',
    });
    recordPressConference(nextState, conference);
  }

  recordNewsItem(nextState, {
    id: `${offer.id}-news`,
    year: nextState.year,
    week: nextState.week,
    type: 'trade',
    headline: `${nextState.teams[offer.toTeamId]?.city ?? 'A team'} closes a trade with ${nextState.teams[offer.fromTeamId]?.city ?? 'a rival'}`,
    body: offer.summary,
    teamIds: [offer.fromTeamId, offer.toTeamId],
    playerIds: [...offer.send, ...offer.receive].flatMap((asset) => asset.playerId ? [asset.playerId] : []),
    importance: 'breaking',
  });

  if (userTeam && (offer.fromTeamId === userTeam.id || offer.toTeamId === userTeam.id)) {
    const socialRng = mulberry32(nextState.seed ^ nextState.year ^ nextState.week ^ offer.summary.length);
    nextState.socialFeed = appendToSocialFeed(nextState.socialFeed, generateTransactionPosts('trade', {
      playerNames: [...offer.send, ...offer.receive]
        .flatMap((asset) => asset.playerId ? [nextState.players[asset.playerId]?.name ?? asset.description] : [])
        .slice(0, 3),
      teamNames: [
        nextState.teams[offer.fromTeamId]?.name ?? offer.fromTeamId,
        nextState.teams[offer.toTeamId]?.name ?? offer.toTeamId,
      ],
      context: offer.summary,
    }, socialRng));
  }

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
