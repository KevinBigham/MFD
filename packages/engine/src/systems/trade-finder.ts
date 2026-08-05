import { calcCapHit } from './contracts';
import { conditionalPickExpectedValue } from './conditional-picks';
import { getTradeableAssets, getTradeTargets } from './trade-negotiation';
import { playerDisplayName } from '../utils';
import { calcPickValue, calcPlayerValue, evaluateTradeOffer } from './trade-value';
import { analyzeTeamNeeds, buildLeagueAverageByGroup } from './team-needs';
import type { LeagueAverageByGroup } from './team-needs';
import type { GameState, Position, Team, TradeOfferAsset, TradeSuggestion } from '../types';

const POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S'];

function weakestPositions(team: Team, leagueAverage: LeagueAverageByGroup): Position[] {
  const report = analyzeTeamNeeds(team, leagueAverage);
  return [...POSITIONS].sort((a, b) => {
    const aNeed = report.positionGrades.find((entry) => entry.group === a)?.needScore ?? 0;
    const bNeed = report.positionGrades.find((entry) => entry.group === b)?.needScore ?? 0;
    return bNeed - aNeed || a.localeCompare(b);
  });
}

function assetValue(game: GameState, valuationTeam: Team, asset: TradeOfferAsset): number {
  if (asset.type === 'player' && asset.playerId) {
    const player = game.players[asset.playerId];
    return player ? calcPlayerValue(game, player, valuationTeam) : 0;
  }
  if (asset.type === 'pick' && asset.pickId) {
    const [, , roundText, pickText] = asset.pickId.split('-');
    return calcPickValue({
      round: Number(roundText),
      pick: Number(pickText),
    });
  }
  if (asset.type === 'conditional_pick' && asset.conditionalPickId) {
    const conditionalPick = game.conditionalPicks.find((entry) => entry.id === asset.conditionalPickId);
    return conditionalPick ? conditionalPickExpectedValue(conditionalPick) : 0;
  }
  return 0;
}

function capCompatible(game: GameState, userTeam: Team, offering: TradeOfferAsset[], requesting: TradeOfferAsset[]): boolean {
  const outgoingRelief = offering.reduce((sum, asset) => {
    if (asset.type !== 'player' || !asset.playerId) return sum;
    const player = game.players[asset.playerId];
    return sum + (player?.contract ? calcCapHit(player.contract) : 0);
  }, 0);
  const incomingHit = requesting.reduce((sum, asset) => {
    if (asset.type !== 'player' || !asset.playerId) return sum;
    const player = game.players[asset.playerId];
    return sum + (player?.contract ? calcCapHit(player.contract) : 0);
  }, 0);
  return userTeam.capSpace + outgoingRelief >= incomingHit;
}

function suggestionType(offering: TradeOfferAsset[], requesting: TradeOfferAsset[]): TradeSuggestion['offer']['type'] {
  const assetTypes = new Set([...offering, ...requesting].map((asset) => asset.type));
  if (assetTypes.size === 1 && assetTypes.has('player')) return 'player_for_player';
  if ((assetTypes.has('pick') || assetTypes.has('conditional_pick')) && !assetTypes.has('player')) return 'pick_for_player';
  return 'mixed';
}

function buildSuggestion(
  game: GameState,
  userTeam: Team,
  partner: Team,
  target: { type: 'player'; teamId: string; playerId: string; pickId: null; description: string; need: Position },
  offering: TradeOfferAsset[],
  leagueAverage: LeagueAverageByGroup,
): TradeSuggestion | null {
  if (!capCompatible(game, userTeam, offering, [target])) return null;
  const evaluation = evaluateTradeOffer(game, partner, offering, [target]);
  const acceptanceLikelihood = Math.min(1, evaluation.incomingValue / Math.max(1, evaluation.outgoingValue * evaluation.threshold));
  if (!evaluation.accepted || acceptanceLikelihood < 0.8) return null;

  const valueGap = Math.round((assetValue(game, userTeam, target) - offering.reduce((sum, asset) => sum + assetValue(game, userTeam, asset), 0)) * 10) / 10;
  const partnerNeeds = weakestPositions(partner, leagueAverage);

  return {
    partner: partner.id,
    offer: {
      offering,
      requesting: [target],
      type: suggestionType(offering, [target]),
    },
    reasoning: `${target.description} addresses your ${target.need} need while ${partner.city} can use help at ${partnerNeeds[0]}.`,
    valueGap,
    acceptanceLikelihood,
    need: target.need,
  };
}

export function findTradeTargets(game: GameState, teamId: string): TradeSuggestion[] {
  const userTeam = game.teams[teamId];
  if (!userTeam) return [];

  const leagueAverage = buildLeagueAverageByGroup(Object.values(game.teams));
  const userNeeds = weakestPositions(userTeam, leagueAverage);
  const partnerTargets = getTradeTargets(game, teamId);
  const userAssets = getTradeableAssets(game, teamId);
  const suggestions: TradeSuggestion[] = [];

  for (const partnerTarget of partnerTargets) {
    const partner = game.teams[partnerTarget.teamId];
    if (!partner) continue;
    const partnerNeeds = weakestPositions(partner, leagueAverage);
    const targetAssets = partnerTarget.tradeBlock
      .map((player) => ({
        type: 'player' as const,
        teamId: partner.id,
        playerId: player.id,
        pickId: null,
        description: playerDisplayName(player),
        need: player.pos,
      }));

    for (const target of targetAssets) {
      const viableOutgoing = [...userAssets].sort((a, b) =>
        assetValue(game, partner, b) - assetValue(game, partner, a) ||
        a.description.localeCompare(b.description));

      let suggestion: TradeSuggestion | null = null;
      for (const offerAsset of viableOutgoing) {
        suggestion = buildSuggestion(game, userTeam, partner, target, [offerAsset], leagueAverage);
        if (suggestion) break;
      }
      if (!suggestion && viableOutgoing.length >= 2) {
        for (let index = 0; index < Math.min(3, viableOutgoing.length - 1); index += 1) {
          suggestion = buildSuggestion(game, userTeam, partner, target, [viableOutgoing[index]!, viableOutgoing[index + 1]!], leagueAverage);
          if (suggestion) break;
        }
      }

      if (suggestion) {
        suggestions.push(suggestion);
      }
    }
  }

  return suggestions
    .sort((a, b) =>
      Number(userNeeds.slice(0, 4).includes(b.need ?? 'QB')) - Number(userNeeds.slice(0, 4).includes(a.need ?? 'QB'))
      || Math.abs(a.valueGap) - Math.abs(b.valueGap)
      || b.acceptanceLikelihood - a.acceptanceLikelihood
      || a.partner.localeCompare(b.partner))
    .slice(0, 5);
}
