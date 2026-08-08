import { getSalaryCap } from '../config';
import { getAgeCurve } from './player-archetypes';
import { conditionalPickExpectedValue } from './conditional-picks';
import type {
  DraftPick,
  GameState,
  Player,
  Team,
  TradeOfferAsset,
} from '../types';
import { DIFF_SETTINGS } from '../config/difficulty';

const POSITION_VALUE_MULTIPLIER: Record<Player['pos'], number> = {
  QB: 4,
  RB: 0.95,
  WR: 1,
  TE: 0.95,
  OL: 1.15,
  DL: 1.05,
  LB: 1,
  CB: 1.05,
  S: 1,
  K: 0.55,
  P: 0.45,
};

const DEV_TRAIT_BONUS: Record<Player['devTrait'], number> = {
  normal: 1,
  star: 1.1,
  superstar: 1.2,
  'x-factor': 1.4,
};

const STRATEGY_THRESHOLD: Record<Team['gmStrategy'], number> = {
  rebuild: 0.9,
  neutral: 0.95,
  contend: 1,
};

function teamPhilosophy(team: Team): NonNullable<Team['philosophy']> {
  return team.philosophy ?? 'maintain';
}

function parsePickId(pickId: string): { round: number; pick: number } | null {
  const parts = pickId.split('-');
  if (parts.length < 5) return null;
  const round = Number(parts[parts.length - 3]);
  const pick = Number(parts[parts.length - 2]);
  if (!Number.isFinite(round) || !Number.isFinite(pick)) return null;
  return { round, pick };
}

function buildPickValue(round: number, pick: number): number {
  const clampedPick = Math.min(Math.max(pick, 1), 32);
  const ranges: Record<number, [number, number]> = {
    1: [3000, 590],
    2: [580, 300],
    3: [200, 170],
    4: [120, 80],
    5: [60, 40],
    6: [30, 20],
    7: [10, 5],
  };
  const [start, end] = ranges[round] ?? [5, 1];
  const progress = (clampedPick - 1) / 31;
  return Math.round(start + (end - start) * progress);
}

function ageCurveMultiplier(player: Player): number {
  const curve = getAgeCurve(player.pos, player.archetype?.archetype ?? null);
  if (player.age < curve.prime[0]) {
    return player.age <= curve.prime[0] - 2 ? 1.2 : 1.1;
  }

  if (player.age <= curve.prime[1]) {
    return 1;
  }

  const declineStart = curve.prime[1] + 1;
  const declineEnd = curve.cliff + 3;
  if (player.age >= declineEnd) return 0.3;
  const progress = (player.age - declineStart) / Math.max(1, declineEnd - declineStart);
  return Math.round((1 - progress * 0.7) * 100) / 100;
}

function contractValue(game: GameState, player: Player): number {
  if (!player.contract) return 1;
  const annualCapHit = player.contract.baseSalary + (player.contract.prorated ?? 0);
  const cap = getSalaryCap(game.year, game);
  return 1 - (annualCapHit / (cap * 0.10));
}

function capAwareness(game: GameState, player: Player): number {
  if (!player.contract) return 1;
  const annualCapHit = player.contract.baseSalary + (player.contract.prorated ?? 0);
  return annualCapHit > getSalaryCap(game.year, game) * 0.08 ? 0.5 : 1;
}

function resolvePickValue(game: GameState, asset: TradeOfferAsset): number {
  if (asset.type === 'conditional_pick' && asset.conditionalPickId) {
    const conditionalPick = game.conditionalPicks.find((entry) => entry.id === asset.conditionalPickId);
    if (!conditionalPick) return 0;
    return conditionalPickExpectedValue(conditionalPick, game);
  }

  const pick = game.teams[asset.teamId]?.draftPicks.find((entry) =>
    `${entry.currentTeamId}-${entry.year}-${entry.round}-${entry.pick}-${entry.originalTeamId}` === asset.pickId,
  );
  if (pick) {
    return calcPickValue(pick);
  }

  if (!asset.pickId) return 0;
  const parsed = parsePickId(asset.pickId);
  if (!parsed) return 0;
  return buildPickValue(parsed.round, parsed.pick);
}

export function calcPickValue(pick: Pick<DraftPick, 'round' | 'pick'>): number {
  return buildPickValue(pick.round, pick.pick);
}

export function calcPlayerValue(game: GameState, player: Player, acquiringTeam: Team): number {
  const baseValue = ((player.ovr / 100) ** 3) * 1000;
  const ageMultiplier = ageCurveMultiplier(player);
  const contractMultiplier = contractValue(game, player);
  const devMultiplier = DEV_TRAIT_BONUS[player.devTrait] ?? 1;
  const positionMultiplier = POSITION_VALUE_MULTIPLIER[player.pos] ?? 1;
  const capPenalty = capAwareness(game, player);
  const philosophy = teamPhilosophy(acquiringTeam);
  let raw = baseValue * ageMultiplier * contractMultiplier * devMultiplier * positionMultiplier * capPenalty;

  // Franchise QB protection: Young elite QBs (<= 27 yo, >= 82 OVR) carry a premium
  if (player.pos === 'QB' && player.age <= 27 && player.ovr >= 82) {
    raw *= 1.75;
  }

  // Aging veteran penalty for rebuilding / fire sale acquiring teams
  if ((acquiringTeam.gmStrategy === 'rebuild' || philosophy === 'rebuild' || philosophy === 'fire_sale') && player.age >= 30) {
    raw *= player.age >= 33 ? 0.35 : 0.50;
  }

  if (acquiringTeam.gmStrategy === 'contend' && player.age <= 27 && player.ovr >= 80) {
    return raw * 1.05;
  }
  if (acquiringTeam.gmStrategy === 'rebuild' && player.age >= 29) {
    return raw * 0.9;
  }
  if (philosophy === 'contend' && player.age >= 28 && player.ovr >= 78) {
    return raw * 1.08;
  }
  if (philosophy === 'rebuild' && player.age >= 29) {
    return raw * 0.84;
  }
  if (philosophy === 'rebuild' && player.age <= 26) {
    return raw * 1.06;
  }
  if (philosophy === 'fire_sale' && player.age >= 28) {
    return raw * 0.78;
  }
  return raw;
}

export function evaluateTradeOffer(
  game: GameState,
  team: Team,
  incomingAssets: TradeOfferAsset[],
  outgoingAssets: TradeOfferAsset[],
): {
  accepted: boolean;
  incomingValue: number;
  outgoingValue: number;
  threshold: number;
} {
  const philosophy = teamPhilosophy(team);
  const plan = team.isUser ? undefined : game.franchisePlans?.[team.id];
  const rawIncomingValue = incomingAssets.reduce((sum, asset) => {
    if (asset.type === 'player' && asset.playerId) {
      const player = game.players[asset.playerId];
      return sum + (player ? calcPlayerValue(game, player, team) : 0);
    }
    const pickValue = resolvePickValue(game, asset);
    return sum + ((team.gmStrategy === 'rebuild' || philosophy === 'rebuild' || philosophy === 'fire_sale') ? pickValue * 1.12 : pickValue);
  }, 0);

  // Package size diminishing returns penalty for packages with > 2 assets
  const packageSizePenalty = incomingAssets.length > 2
    ? 1 / (1 + 0.12 * (incomingAssets.length - 2))
    : 1;
  const incomingValue = rawIncomingValue * packageSizePenalty;

  const outgoingValue = outgoingAssets.reduce((sum, asset) => {
    if (asset.type === 'player' && asset.playerId) {
      const player = game.players[asset.playerId];
      if (!player) return sum;
      const value = calcPlayerValue(game, player, team);
      if (plan?.protectedAssets.includes(player.id)) {
        return sum + value * 1.25;
      }
      if (plan?.expendableAssets.includes(player.id)) {
        return sum + value * 0.85;
      }
      if (team.gmStrategy === 'rebuild' && player.age >= 28) {
        return sum + value * 0.9;
      }
      if (philosophy === 'fire_sale' && player.age >= 28) {
        return sum + value * 0.82;
      }
      return sum + value;
    }
    return sum + resolvePickValue(game, asset);
  }, 0);

  // Primary asset floor: for high-value targets (outgoingValue >= 500), at least 1 asset must reach >= 40% of outgoing value
  const maxSingleIncomingValue = incomingAssets.reduce((maxVal, asset) => {
    if (asset.type === 'player' && asset.playerId) {
      const p = game.players[asset.playerId];
      return Math.max(maxVal, p ? calcPlayerValue(game, p, team) : 0);
    }
    return Math.max(maxVal, resolvePickValue(game, asset));
  }, 0);
  const satisfiesPrimaryAssetFloor = outgoingValue < 500 || maxSingleIncomingValue >= outgoingValue * 0.40;

  const baseThreshold = philosophy === 'fire_sale'
    ? 0.82
    : philosophy === 'rebuild'
      ? 0.88
      : STRATEGY_THRESHOLD[team.gmStrategy] ?? 0.95;
  const difficultySettings = DIFF_SETTINGS[game.difficulty] ?? DIFF_SETTINGS.pro;
  const difficultyMultiplier = team.isUser ? 1 : difficultySettings.tradeMod;
  const planRiskMultiplier = plan ? 1.08 - plan.riskTolerance / 500 : 1;
  const threshold = Math.max(0.6, Math.min(1.5, baseThreshold * difficultyMultiplier * planRiskMultiplier));

  const accepted = satisfiesPrimaryAssetFloor && incomingValue >= outgoingValue * threshold;

  return {
    accepted,
    incomingValue,
    outgoingValue,
    threshold,
  };
}
