import { syncPlayerArchiveEntry } from './history';
import { assignJerseyNumber } from './jersey-retirement';
import { recordNewsItem } from './league-news';
import { initializeLockerRoom, syncLockerRoomRoster } from './locker-room';
import { createNearMissTracker, recordDeclinedTrade } from './near-miss-receipts';
import { getActiveRule } from './league-rules';
import { getScenarioConstraints } from './scenario-challenge';
import { conditionalPickExpectedValue } from './conditional-picks';
import { syncTeamCapTotals } from './team-cap';
import { calcPickValue, calcPlayerValue, evaluateTradeOffer } from './trade-value';
import type { ConditionalPick, DraftPick, GameState, Player, Team, TradeOfferAsset, TradeProposal } from '../types';

function proposalId(game: GameState): string {
  return `proposal-${game.year}-${game.week}-${game.activeProposals.length}`;
}

function findUserValue(game: GameState, teamId: string, assets: TradeOfferAsset[]): number {
  const team = game.teams[teamId];
  if (!team) return 0;

  return assets.reduce((sum, asset) => {
    if (asset.type === 'player' && asset.playerId) {
      const player = game.players[asset.playerId];
      return sum + (player ? calcPlayerValue(game, player, team) : 0);
    }
    if (asset.pickId) {
      const pick = findPick(game, asset.teamId, asset.pickId);
      return sum + (pick ? calcPickValue(pick) : parsePickValue(asset));
    }
    if (asset.type === 'conditional_pick' && asset.conditionalPickId) {
      const conditionalPick = game.conditionalPicks.find((entry) => entry.id === asset.conditionalPickId);
      return sum + (conditionalPick ? conditionalPickExpectedValue(conditionalPick) : 0);
    }
    return sum;
  }, 0);
}

function fairnessScore(offeringValue: number, requestingValue: number): number {
  const high = Math.max(offeringValue, requestingValue, 1);
  const low = Math.max(0, Math.min(offeringValue, requestingValue));
  return Number((low / high).toFixed(3));
}

function parsePickValue(asset: TradeOfferAsset): number {
  if (!asset.pickId) return 0;
  const parts = asset.pickId.split('-');
  if (parts.length < 5) return 0;
  const round = Number(parts[parts.length - 3]);
  const pick = Number(parts[parts.length - 2]);
  if (!Number.isFinite(round) || !Number.isFinite(pick)) return 0;
  return calcPickValue({ round, pick });
}

function isTradeWindowClosed(game: GameState): boolean {
  const deadlineWeek = game.leagueRules
    ? Number(getActiveRule(game.leagueRules, 'trade_deadline_week', game.year))
    : 9;
  return game.phase === 'regular_season' && game.week > deadlineWeek;
}

function assertScenarioAllowsDirectTrades(game: GameState): void {
  if (getScenarioConstraints(game)?.blockTrades) {
    throw new Error('Scenario constraints block direct trade proposals and counters.');
  }
}

function findPick(game: GameState, teamId: string, pickId: string): DraftPick | null {
  return game.teams[teamId]?.draftPicks.find((pick) =>
    `${pick.currentTeamId}-${pick.year}-${pick.round}-${pick.pick}-${pick.originalTeamId}` === pickId
  ) ?? null;
}

function pickAsset(teamId: string, pick: DraftPick): TradeOfferAsset {
  return {
    type: 'pick',
    teamId,
    playerId: null,
    pickId: `${pick.currentTeamId}-${pick.year}-${pick.round}-${pick.pick}-${pick.originalTeamId}`,
    description: `Round ${pick.round} pick`,
  };
}

function conditionalPickAsset(teamId: string, conditionalPick: ConditionalPick): TradeOfferAsset {
  const ceilingRound = Math.min(conditionalPick.basePick.round, conditionalPick.condition.upgradeRound);
  return {
    type: 'conditional_pick',
    teamId,
    playerId: null,
    pickId: null,
    conditionalPickId: conditionalPick.id,
    description: conditionalPick.description || `Conditional round ${conditionalPick.basePick.round}/ceiling ${ceilingRound} pick`,
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

function refreshRosterState(team: Team): void {
  for (const player of team.roster) {
    assignJerseyNumber(team, player);
  }
  team.lockerRoom = syncLockerRoomRoster(team, team.lockerRoom ?? initializeLockerRoom(team, () => 0.42));
}

function ensureNearMissTracker(game: GameState) {
  game.nearMissTracker ??= createNearMissTracker();
  return game.nearMissTracker;
}

function playerDisplayName(player: Player): string {
  const legacyName = (player as Player & { name?: string }).name;
  if (legacyName) return legacyName;
  const composed = [player.firstName, player.lastName].filter(Boolean).join(' ').trim();
  return composed || player.id;
}

function recordRejectedTradeNearMiss(game: GameState, proposal: TradeProposal): void {
  const fromTeam = game.teams[proposal.fromTeamId];
  const toTeam = game.teams[proposal.toTeamId];
  if (!fromTeam?.isUser || !toTeam) return;

  const requestedPlayer = proposal.requesting
    .map((asset) => asset.playerId ? game.players[asset.playerId] : null)
    .filter((player): player is Player => Boolean(player))
    .sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id))[0] ?? null;

  if (!requestedPlayer) return;

  recordDeclinedTrade(ensureNearMissTracker(game), {
    playerName: playerDisplayName(requestedPlayer),
    playerOvr: requestedPlayer.ovr,
    partnerTeamName: `${toTeam.city} ${toTeam.name}`,
    week: game.week,
  });
}

function availableExtraPicks(game: GameState, teamId: string, usedPickIds: Set<string>): TradeOfferAsset[] {
  return [...(game.teams[teamId]?.draftPicks ?? [])]
    .filter((pick) => pick.year === game.year)
    .map((pick) => pickAsset(teamId, pick))
    .filter((asset) => asset.pickId && !usedPickIds.has(asset.pickId))
    .sort((a, b) => (findPick(game, teamId, b.pickId!)?.round ?? 9) - (findPick(game, teamId, a.pickId!)?.round ?? 9));
}

function availableExtraConditionalPicks(
  game: GameState,
  teamId: string,
  usedConditionalPickIds: Set<string>,
): TradeOfferAsset[] {
  return [...(game.conditionalPicks ?? [])]
    .filter((pick) => pick.toTeamId === teamId && !pick.resolved && !usedConditionalPickIds.has(pick.id))
    .map((pick) => ({
      asset: conditionalPickAsset(teamId, pick),
      value: conditionalPickExpectedValue(pick),
    }))
    .sort((a, b) => b.value - a.value || a.asset.description.localeCompare(b.asset.description))
    .map((entry) => entry.asset);
}

function availableExtraPlayers(game: GameState, teamId: string, usedPlayerIds: Set<string>): TradeOfferAsset[] {
  const players = [...(game.teams[teamId]?.roster ?? [])]
    .filter((player) => player.pos !== 'QB' || player.age >= 28)
    .filter((player) => !usedPlayerIds.has(player.id))
    .sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id));
  return players.map((player) => playerAsset(teamId, player));
}

function selectBestCounterAsset(
  game: GameState,
  baseProposal: TradeProposal,
  candidates: TradeOfferAsset[],
): TradeOfferAsset | null {
  const baseOfferingValue = findUserValue(game, baseProposal.fromTeamId, baseProposal.offering);
  const requestingValue = findUserValue(game, baseProposal.toTeamId, baseProposal.requesting);
  const baseScore = fairnessScore(baseOfferingValue, requestingValue);

  const scored = candidates
    .map((asset) => ({
      asset,
      score: fairnessScore(findUserValue(game, baseProposal.fromTeamId, [...baseProposal.offering, asset]), requestingValue),
    }))
    .filter((entry) => entry.score > baseScore)
    .sort((a, b) => b.score - a.score || a.asset.description.localeCompare(b.asset.description));

  return scored[0]?.asset ?? candidates[0] ?? null;
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
  toTeam.roster.push(player);
  game.players[player.id] = player;
  syncPlayerArchiveEntry(game, player, game.year);
}

function transferPick(game: GameState, asset: TradeOfferAsset, toTeamId: string): void {
  if (!asset.pickId) return;
  const fromTeam = game.teams[asset.teamId];
  const toTeam = game.teams[toTeamId];
  if (!fromTeam || !toTeam) return;
  const index = fromTeam.draftPicks.findIndex((pick) =>
    `${pick.currentTeamId}-${pick.year}-${pick.round}-${pick.pick}-${pick.originalTeamId}` === asset.pickId
  );
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
    pick.year === conditionalPick.basePick.year
    && pick.round === conditionalPick.basePick.round
    && pick.pick === conditionalPick.basePick.pick
    && pick.originalTeamId === conditionalPick.basePick.originalTeamId
  );

  const movedPick = index === -1 ? null : fromTeam.draftPicks.splice(index, 1)[0] ?? null;
  if (movedPick) {
    movedPick.currentTeamId = toTeamId;
    toTeam.draftPicks.push(movedPick);
  }

  conditionalPick.toTeamId = toTeamId;
  conditionalPick.basePick.currentTeamId = toTeamId;
  if (conditionalPick.resolvedPick) {
    conditionalPick.resolvedPick.currentTeamId = toTeamId;
  }
}

function applyAsset(game: GameState, asset: TradeOfferAsset, toTeamId: string): void {
  if (asset.type === 'player') transferPlayer(game, asset, toTeamId);
  else if (asset.type === 'conditional_pick') transferConditionalPick(game, asset, toTeamId);
  else transferPick(game, asset, toTeamId);
}

function executeProposal(game: GameState, proposal: TradeProposal): void {
  for (const asset of proposal.offering) applyAsset(game, asset, proposal.toTeamId);
  for (const asset of proposal.requesting) applyAsset(game, asset, proposal.fromTeamId);

  const fromTeam = game.teams[proposal.fromTeamId];
  const toTeam = game.teams[proposal.toTeamId];
  if (fromTeam) {
    refreshRosterState(fromTeam);
    syncTeamCapTotals(game, fromTeam);
  }
  if (toTeam) {
    refreshRosterState(toTeam);
    syncTeamCapTotals(game, toTeam);
  }
  const notable = proposal.requesting.find((asset) => asset.playerId)?.description ?? 'new pieces';
  recordNewsItem(game, {
    id: `${proposal.id}-accepted`,
    year: game.year,
    week: game.week,
    type: 'trade',
    headline: `${fromTeam?.city ?? 'A team'} swings a deal with ${toTeam?.city ?? 'a rival'}`,
    body: `${fromTeam?.city ?? 'A team'} lands ${notable} after a direct negotiation.`,
    teamIds: [proposal.fromTeamId, proposal.toTeamId],
    playerIds: [...proposal.offering, ...proposal.requesting].flatMap((asset) => asset.playerId ? [asset.playerId] : []),
    importance: 'breaking',
  });
}

export function getTradeableAssets(game: GameState, teamId: string): TradeOfferAsset[] {
  const team = game.teams[teamId];
  if (!team) return [];

  const playerAssets = team.roster
    .map((player) => ({
      asset: playerAsset(teamId, player),
      value: calcPlayerValue(game, player, team),
    }))
    .sort((a, b) => b.value - a.value || a.asset.description.localeCompare(b.asset.description))
    .map((entry) => entry.asset);
  const pickAssets = team.draftPicks
    .filter((pick) => pick.year === game.year)
    .map((pick) => ({
      asset: pickAsset(teamId, pick),
      value: calcPickValue(pick),
    }))
    .sort((a, b) => b.value - a.value || a.asset.description.localeCompare(b.asset.description))
    .map((entry) => entry.asset);
  const conditionalPickAssets = availableExtraConditionalPicks(game, teamId, new Set());

  return [...playerAssets, ...pickAssets, ...conditionalPickAssets];
}

export function getTradeTargets(game: GameState, teamId: string): Array<{
  teamId: string;
  teamName: string;
  tradeBlock: Player[];
  picks: DraftPick[];
  conditionalPicks: ConditionalPick[];
}> {
  return Object.values(game.teams)
    .filter((team) => team.id !== teamId)
    .map((team) => ({
      teamId: team.id,
      teamName: `${team.city} ${team.name}`,
      tradeBlock: team.roster.filter((player) => player.tradeBlock),
      picks: team.draftPicks.filter((pick) => pick.year === game.year),
      conditionalPicks: (game.conditionalPicks ?? []).filter((pick) => pick.toTeamId === team.id && !pick.resolved),
    }))
    .filter((entry) => entry.tradeBlock.length > 0 || entry.picks.length > 0 || entry.conditionalPicks.length > 0)
    .sort((a, b) => a.teamName.localeCompare(b.teamName));
}

export function createTradeProposal(
  game: GameState,
  fromTeamId: string,
  toTeamId: string,
  offering: TradeOfferAsset[],
  requesting: TradeOfferAsset[],
): TradeProposal {
  assertScenarioAllowsDirectTrades(game);
  const offeringValue = findUserValue(game, fromTeamId, offering);
  const requestingValue = findUserValue(game, toTeamId, requesting);
  const proposal: TradeProposal = {
    id: proposalId(game),
    fromTeamId,
    toTeamId,
    offering,
    requesting,
    status: 'draft',
    counterOffer: null,
    aiResponse: '',
    valueDiff: fairnessScore(offeringValue, requestingValue),
  };
  game.activeProposals = [...(game.activeProposals ?? []), proposal].slice(-20);
  return proposal;
}

export function generateCounterOffer(
  game: GameState,
  proposal: TradeProposal,
  _rand: () => number = () => 0.5,
): TradeProposal | null {
  const aiTeam = game.teams[proposal.toTeamId];
  const userTeam = game.teams[proposal.fromTeamId];
  if (!aiTeam || !userTeam) return null;

  const nextOffering = [...proposal.offering];
  const usedPlayerIds = new Set(nextOffering.flatMap((asset) => asset.playerId ? [asset.playerId] : []));
  const usedPickIds = new Set(nextOffering.flatMap((asset) => asset.pickId ? [asset.pickId] : []));
  const usedConditionalPickIds = new Set(nextOffering.flatMap((asset) => asset.conditionalPickId ? [asset.conditionalPickId] : []));

  if (aiTeam.gmStrategy === 'rebuild') {
    const extraPick = selectBestCounterAsset(game, proposal, [
      ...availableExtraPicks(game, userTeam.id, usedPickIds),
      ...availableExtraConditionalPicks(game, userTeam.id, usedConditionalPickIds),
    ]);
    if (extraPick) nextOffering.push(extraPick);
  } else {
    const extraPlayer = selectBestCounterAsset(game, proposal, availableExtraPlayers(game, userTeam.id, usedPlayerIds));
    if (extraPlayer) nextOffering.push(extraPlayer);
  }

  const offeringValue = findUserValue(game, proposal.fromTeamId, nextOffering);
  const requestingValue = findUserValue(game, proposal.toTeamId, proposal.requesting);
  return {
    ...proposal,
    offering: nextOffering,
    status: 'countered',
    counterOffer: null,
    aiResponse: aiTeam.gmStrategy === 'rebuild'
      ? 'We need another pick to make this worth the move.'
      : 'We need a ready-now player in the package.',
    valueDiff: fairnessScore(offeringValue, requestingValue),
  };
}

export function submitProposal(
  game: GameState,
  proposalIdValue: string,
  rand: () => number = () => 0.5,
): { proposal: TradeProposal; nextState: GameState } {
  assertScenarioAllowsDirectTrades(game);
  if (isTradeWindowClosed(game)) {
    throw new Error('Trade deadline has passed.');
  }

  const proposal = game.activeProposals.find((entry) => entry.id === proposalIdValue);
  if (!proposal) {
    throw new Error(`Trade proposal ${proposalIdValue} not found.`);
  }

  const aiTeam = game.teams[proposal.toTeamId];
  if (!aiTeam) {
    throw new Error(`Trade partner ${proposal.toTeamId} not found.`);
  }
  const evaluation = evaluateTradeOffer(game, aiTeam, proposal.offering, proposal.requesting);
  if (evaluation.accepted) {
    proposal.status = 'accepted';
    proposal.aiResponse = 'Accepted. We can get this through the league office.';
    proposal.counterOffer = null;
    executeProposal(game, proposal);
    return { proposal, nextState: game };
  }

  if (proposal.valueDiff >= 0.45) {
    const counter = generateCounterOffer(game, proposal, rand);
    if (counter) {
      proposal.status = 'countered';
      proposal.counterOffer = counter;
      proposal.aiResponse = counter.aiResponse;
      proposal.valueDiff = counter.valueDiff;
      return { proposal, nextState: game };
    }
  }

  proposal.status = 'rejected';
  proposal.aiResponse = 'Rejected. This package is too light for us.';
  recordRejectedTradeNearMiss(game, proposal);
  return { proposal, nextState: game };
}

export function acceptCounterProposal(game: GameState, proposalIdValue: string): TradeProposal {
  assertScenarioAllowsDirectTrades(game);
  if (isTradeWindowClosed(game)) {
    throw new Error('Trade deadline has passed.');
  }
  const proposal = game.activeProposals.find((entry) => entry.id === proposalIdValue);
  if (!proposal?.counterOffer) {
    throw new Error(`Trade proposal ${proposalIdValue} has no counter offer.`);
  }
  proposal.status = 'accepted';
  proposal.aiResponse = proposal.counterOffer.aiResponse;
  proposal.offering = proposal.counterOffer.offering;
  proposal.requesting = proposal.counterOffer.requesting;
  proposal.valueDiff = proposal.counterOffer.valueDiff;
  executeProposal(game, proposal);
  return proposal;
}

export function rejectCounterProposal(game: GameState, proposalIdValue: string): TradeProposal {
  const proposal = game.activeProposals.find((entry) => entry.id === proposalIdValue);
  if (!proposal) {
    throw new Error(`Trade proposal ${proposalIdValue} not found.`);
  }
  proposal.status = 'rejected';
  proposal.aiResponse = 'Counter declined.';
  recordRejectedTradeNearMiss(game, proposal);
  return proposal;
}
