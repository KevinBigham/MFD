import type { GameState, Team, TradeOfferAsset } from '../types';

export interface TradeTransactionInput {
  fromTeamId: string;
  toTeamId: string;
  assetsFromFromTeam: TradeOfferAsset[];
  assetsFromToTeam: TradeOfferAsset[];
}

export interface TradeValidationIssue {
  code:
    | 'INVALID_TEAMS'
    | 'SAME_TEAM'
    | 'ASSET_OWNER_MISMATCH'
    | 'MISSING_PLAYER'
    | 'PLAYER_NOT_ON_ROSTER'
    | 'PLAYER_CANONICAL_MISMATCH'
    | 'MISSING_PICK'
    | 'PICK_NOT_OWNED'
    | 'MISSING_CONDITIONAL_PICK'
    | 'CONDITIONAL_PICK_RESOLVED'
    | 'CONDITIONAL_PICK_NOT_OWNED'
    | 'DUPLICATE_ASSET_SAME_SIDE'
    | 'DUPLICATE_ASSET_CROSS_SIDE'
    | 'INVALID_ASSET_TYPE';
  assetKey?: string;
  message: string;
}

export interface TradeValidationResult {
  ok: boolean;
  issues: TradeValidationIssue[];
}

export type TradeExecutionResult =
  | {
      ok: true;
      nextState: GameState;
      events: any[];
      consequences: any[];
    }
  | {
      ok: false;
      nextState: GameState;
      events: [];
      consequences: [];
      reason: string;
      issues?: TradeValidationIssue[];
    };

export function getTradeAssetKey(asset: TradeOfferAsset): string {
  if (asset.type === 'player' && asset.playerId) {
    return `player:${asset.playerId}`;
  }
  if (asset.type === 'pick' && asset.pickId) {
    return `pick:${asset.pickId}`;
  }
  if (asset.type === 'conditional_pick' && asset.conditionalPickId) {
    return `conditional_pick:${asset.conditionalPickId}`;
  }
  return `unknown:${asset.type}:${asset.description}`;
}

export function validateTradeTransaction(
  game: GameState,
  transaction: TradeTransactionInput,
): TradeValidationResult {
  const issues: TradeValidationIssue[] = [];

  const fromTeam = game.teams[transaction.fromTeamId];
  const toTeam = game.teams[transaction.toTeamId];

  if (!fromTeam || !toTeam) {
    issues.push({
      code: 'INVALID_TEAMS',
      message: `One or both teams (${transaction.fromTeamId}, ${transaction.toTeamId}) do not exist.`,
    });
    return { ok: false, issues };
  }

  if (transaction.fromTeamId === transaction.toTeamId) {
    issues.push({
      code: 'SAME_TEAM',
      message: `Cannot trade assets within the same team (${transaction.fromTeamId}).`,
    });
    return { ok: false, issues };
  }

  const fromKeys = new Set<string>();
  const toKeys = new Set<string>();

  function validateSideAssets(
    assets: TradeOfferAsset[],
    declaredOwnerId: string,
    ownerTeam: Team,
    keySet: Set<string>,
  ) {
    for (const asset of assets) {
      if (asset.teamId !== declaredOwnerId) {
        issues.push({
          code: 'ASSET_OWNER_MISMATCH',
          assetKey: getTradeAssetKey(asset),
          message: `Asset ${asset.description} has teamId ${asset.teamId} but is offered by ${declaredOwnerId}.`,
        });
      }

      const key = getTradeAssetKey(asset);
      if (keySet.has(key)) {
        issues.push({
          code: 'DUPLICATE_ASSET_SAME_SIDE',
          assetKey: key,
          message: `Asset ${key} is duplicated on the same side of the trade.`,
        });
      } else {
        keySet.add(key);
      }

      if (asset.type === 'player') {
        if (!asset.playerId) {
          issues.push({
            code: 'MISSING_PLAYER',
            assetKey: key,
            message: `Player asset ${asset.description} is missing a playerId.`,
          });
          continue;
        }

        const countOnRoster = ownerTeam.roster.filter((p) => p.id === asset.playerId).length;
        if (countOnRoster !== 1) {
          issues.push({
            code: 'PLAYER_NOT_ON_ROSTER',
            assetKey: key,
            message: `Player ${asset.playerId} is not present exactly once on team ${declaredOwnerId} roster (found ${countOnRoster}).`,
          });
        }

        for (const [teamId, otherTeam] of Object.entries(game.teams)) {
          if (teamId === declaredOwnerId) continue;
          if (otherTeam.roster.some((p) => p.id === asset.playerId)) {
            issues.push({
              code: 'PLAYER_NOT_ON_ROSTER',
              assetKey: key,
              message: `Player ${asset.playerId} also appears on team ${teamId} roster.`,
            });
          }
        }

        const canonicalPlayer = game.players[asset.playerId];
        if (!canonicalPlayer) {
          issues.push({
            code: 'MISSING_PLAYER',
            assetKey: key,
            message: `Player ${asset.playerId} does not exist in game.players dictionary.`,
          });
        } else if (canonicalPlayer.teamId !== declaredOwnerId) {
          issues.push({
            code: 'PLAYER_CANONICAL_MISMATCH',
            assetKey: key,
            message: `Player ${asset.playerId} has canonical teamId ${canonicalPlayer.teamId} which differs from ${declaredOwnerId}.`,
          });
        }
      } else if (asset.type === 'pick') {
        if (!asset.pickId) {
          issues.push({
            code: 'MISSING_PICK',
            assetKey: key,
            message: `Pick asset ${asset.description} is missing a pickId.`,
          });
          continue;
        }

        const matchingPicks = ownerTeam.draftPicks.filter(
          (p) => `${p.currentTeamId}-${p.year}-${p.round}-${p.pick}-${p.originalTeamId}` === asset.pickId,
        );

        if (matchingPicks.length !== 1 || matchingPicks[0]?.currentTeamId !== declaredOwnerId) {
          issues.push({
            code: 'PICK_NOT_OWNED',
            assetKey: key,
            message: `Draft pick ${asset.pickId} is not owned by team ${declaredOwnerId}.`,
          });
        }

        let globalPickCount = 0;
        for (const otherTeam of Object.values(game.teams)) {
          globalPickCount += otherTeam.draftPicks.filter(
            (p) => `${p.currentTeamId}-${p.year}-${p.round}-${p.pick}-${p.originalTeamId}` === asset.pickId,
          ).length;
        }
        if (globalPickCount !== 1) {
          issues.push({
            code: 'PICK_NOT_OWNED',
            assetKey: key,
            message: `Draft pick ${asset.pickId} is not present exactly once across the league (found ${globalPickCount}).`,
          });
        }
      } else if (asset.type === 'conditional_pick') {
        if (!asset.conditionalPickId) {
          issues.push({
            code: 'MISSING_CONDITIONAL_PICK',
            assetKey: key,
            message: `Conditional pick asset ${asset.description} is missing conditionalPickId.`,
          });
          continue;
        }

        const condPick = (game.conditionalPicks ?? []).find((cp) => cp.id === asset.conditionalPickId);
        if (!condPick) {
          issues.push({
            code: 'MISSING_CONDITIONAL_PICK',
            assetKey: key,
            message: `Conditional pick ${asset.conditionalPickId} does not exist in game.conditionalPicks.`,
          });
          continue;
        }

        if (condPick.resolved) {
          issues.push({
            code: 'CONDITIONAL_PICK_RESOLVED',
            assetKey: key,
            message: `Conditional pick ${asset.conditionalPickId} is already resolved.`,
          });
        }

        if (condPick.toTeamId !== declaredOwnerId) {
          issues.push({
            code: 'CONDITIONAL_PICK_NOT_OWNED',
            assetKey: key,
            message: `Conditional pick ${asset.conditionalPickId} owner is ${condPick.toTeamId}, not ${declaredOwnerId}.`,
          });
        }

        const basePickId = `${condPick.basePick.currentTeamId}-${condPick.basePick.year}-${condPick.basePick.round}-${condPick.basePick.pick}-${condPick.basePick.originalTeamId}`;
        let basePickGlobalCount = 0;
        for (const otherTeam of Object.values(game.teams)) {
          basePickGlobalCount += otherTeam.draftPicks.filter(
            (p) => `${p.currentTeamId}-${p.year}-${p.round}-${p.pick}-${p.originalTeamId}` === basePickId,
          ).length;
        }
        if (basePickGlobalCount !== 1 || condPick.basePick.currentTeamId !== declaredOwnerId) {
          issues.push({
            code: 'PICK_NOT_OWNED',
            assetKey: key,
            message: `Conditional pick ${asset.conditionalPickId} base pick ${basePickId} is not owned by team ${declaredOwnerId} or is not unique (found ${basePickGlobalCount}).`,
          });
        }
      } else {
        issues.push({
          code: 'INVALID_ASSET_TYPE',
          assetKey: key,
          message: `Asset ${asset.description} has invalid type ${(asset as { type: string }).type}.`,
        });
      }
    }
  }

  validateSideAssets(transaction.assetsFromFromTeam, transaction.fromTeamId, fromTeam, fromKeys);
  validateSideAssets(transaction.assetsFromToTeam, transaction.toTeamId, toTeam, toKeys);

  for (const key of fromKeys) {
    if (toKeys.has(key)) {
      issues.push({
        code: 'DUPLICATE_ASSET_CROSS_SIDE',
        assetKey: key,
        message: `Asset ${key} appears on both sides of the trade transaction.`,
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}
