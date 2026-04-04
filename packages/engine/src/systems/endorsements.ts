import { RNG } from '../rng';
import type {
  EndorsementBrand,
  EndorsementDeal,
  EndorsementRequirement,
  MarketSize,
  Player,
  Team,
} from '../types';

export const ENDORSEMENT_BRANDS: EndorsementBrand[] = [
  { name: 'Apex Athletics', tier: 'global', baseRevenue: 8, baseDuration: 3, positionPreference: ['QB', 'RB', 'WR'], ovrThreshold: 90 },
  { name: 'Titan Sports', tier: 'global', baseRevenue: 6, baseDuration: 4, positionPreference: null, ovrThreshold: 88 },
  { name: 'Velocity Gear', tier: 'global', baseRevenue: 7, baseDuration: 3, positionPreference: ['QB', 'WR'], ovrThreshold: 92 },
  { name: 'GridIron Nutrition', tier: 'national', baseRevenue: 4, baseDuration: 3, positionPreference: null, ovrThreshold: 84 },
  { name: 'Blitz Energy', tier: 'national', baseRevenue: 3.5, baseDuration: 4, positionPreference: ['RB', 'LB', 'DL'], ovrThreshold: 82 },
  { name: 'Shield Insurance', tier: 'national', baseRevenue: 3, baseDuration: 5, positionPreference: null, ovrThreshold: 80 },
  { name: 'Clutch Watches', tier: 'national', baseRevenue: 5, baseDuration: 2, positionPreference: ['QB'], ovrThreshold: 86 },
  { name: 'Hometown Auto', tier: 'regional', baseRevenue: 1.5, baseDuration: 3, positionPreference: null, ovrThreshold: 76 },
  { name: 'Metro Health', tier: 'regional', baseRevenue: 1, baseDuration: 4, positionPreference: null, ovrThreshold: 74 },
  { name: 'City Fresh Foods', tier: 'regional', baseRevenue: 1.2, baseDuration: 3, positionPreference: null, ovrThreshold: 75 },
  { name: 'Corner Deli', tier: 'local', baseRevenue: 0.5, baseDuration: 2, positionPreference: null, ovrThreshold: 70 },
  { name: 'Joe\'s Car Wash', tier: 'local', baseRevenue: 0.3, baseDuration: 1, positionPreference: null, ovrThreshold: 68 },
];

export const ENDORSEMENT_MARKET_MULTIPLIERS: Record<MarketSize, number> = {
  small: 0.6,
  medium: 1,
  large: 1.3,
  mega: 1.6,
};

const TIER_MORALE_BONUS: Record<EndorsementDeal['tier'], number> = {
  local: 2,
  regional: 3,
  national: 4,
  global: 6,
};

function teamIdentity(team: Team): { marketSize: MarketSize; prestige: number } {
  const identity = (team as Partial<Team>).franchiseIdentity;
  return {
    marketSize: identity?.marketSize ?? 'medium',
    prestige: typeof identity?.prestige === 'number' ? identity.prestige : 50,
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 10) / 10;
}

function offerId(player: Player, brand: EndorsementBrand, rng: () => number): string {
  return `endorsement-${player.id}-${brand.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.floor(rng() * 1_000_000).toString(36)}`;
}

function activeDeals(player: Player): EndorsementDeal[] {
  return (player.endorsements ?? []).filter((deal) => deal.active);
}

function playerMeetsRequirement(player: Player, requirement: EndorsementRequirement, teamWins: number): boolean {
  switch (requirement.type) {
    case 'min_ovr':
      return player.ovr >= requirement.value;
    case 'team_wins':
      return teamWins >= requirement.value;
    case 'min_games':
      return player.stats.gamesPlayed >= requirement.value;
    case 'no_suspension':
      return requirement.value;
    default:
      return true;
  }
}

function qualifiesForBrand(player: Player, brand: EndorsementBrand): boolean {
  if (player.ovr < brand.ovrThreshold) return false;
  if (brand.positionPreference && !brand.positionPreference.includes(player.pos)) return false;
  const currentDeals = activeDeals(player);
  if (currentDeals.length >= 2) return false;
  if (currentDeals.some((deal) => deal.tier === brand.tier)) return false;
  return true;
}

function buildRequirement(player: Player, brand: EndorsementBrand): EndorsementRequirement {
  if (brand.tier === 'global' || brand.tier === 'national') {
    return { type: 'min_ovr', value: brand.ovrThreshold };
  }
  return { type: 'team_wins', value: player.pos === 'QB' ? 9 : 8 };
}

function offerScore(team: Team, player: Player, brand: EndorsementBrand): number {
  const identity = teamIdentity(team);
  const marketBoost = ENDORSEMENT_MARKET_MULTIPLIERS[identity.marketSize] ?? 1;
  const ambitionBoost = player.personality.ambition * 2;
  const greedBoost = player.personality.greed;
  const starBoost = player.devTrait === 'x-factor' ? 10 : player.devTrait === 'superstar' ? 7 : player.devTrait === 'star' ? 4 : 0;
  return player.ovr * 4 + identity.prestige * marketBoost + ambitionBoost + greedBoost + starBoost + brand.baseRevenue * 10;
}

export function generateEndorsementOffers(team: Team, players: Player[], rng: () => number): EndorsementDeal[] {
  const identity = teamIdentity(team);
  const prestigeFactor = 0.9 + (identity.prestige / 200);
  const marketFactor = ENDORSEMENT_MARKET_MULTIPLIERS[identity.marketSize] ?? 1;
  const eligiblePairs = players
    .filter((player) => player.teamId === team.id)
    .flatMap((player) => ENDORSEMENT_BRANDS
      .filter((brand) => qualifiesForBrand(player, brand))
      .map((brand) => ({ player, brand, score: offerScore(team, player, brand) })))
    .sort((a, b) => b.score - a.score || a.player.id.localeCompare(b.player.id) || a.brand.name.localeCompare(b.brand.name));

  const offers: EndorsementDeal[] = [];
  const count = Math.max(2, Math.min(5, 2 + Math.floor(rng() * 4)));
  for (const pair of eligiblePairs) {
    if (offers.length >= count) break;
    if (offers.filter((offer) => offer.playerId === pair.player.id).length >= 2) continue;
    const requirement = buildRequirement(pair.player, pair.brand);
    offers.push({
      id: offerId(pair.player, pair.brand, rng),
      playerId: pair.player.id,
      brandName: pair.brand.name,
      revenuePerYear: roundMoney(pair.brand.baseRevenue * marketFactor * prestigeFactor),
      yearsTotal: pair.brand.baseDuration,
      yearsRemaining: pair.brand.baseDuration,
      tier: pair.brand.tier,
      moraleBonus: TIER_MORALE_BONUS[pair.brand.tier],
      requirement,
      active: true,
    });
  }

  return offers;
}

export function acceptEndorsement(player: Player, deal: EndorsementDeal): { player: Player; deal: EndorsementDeal } {
  const deals = activeDeals(player);
  if (deals.length >= 2 || deals.some((existing) => existing.tier === deal.tier)) {
    return { player, deal };
  }
  const nextDeal = { ...deal, active: true, yearsRemaining: Math.max(1, deal.yearsRemaining) };
  player.endorsements = [...(player.endorsements ?? []), nextDeal];
  player.morale = Math.min(100, player.morale + nextDeal.moraleBonus);
  return { player, deal: nextDeal };
}

export function tickEndorsements(
  team: Team,
  seasonResult: { wins: number; losses: number },
  rng: () => number = RNG.ai,
): { expiredDeals: EndorsementDeal[]; lostDeals: EndorsementDeal[]; renewedDeals: EndorsementDeal[] } {
  const expiredDeals: EndorsementDeal[] = [];
  const lostDeals: EndorsementDeal[] = [];
  const renewedDeals: EndorsementDeal[] = [];

  for (const player of team.roster) {
    const nextDeals: EndorsementDeal[] = [];
    for (const deal of player.endorsements ?? []) {
      if (!deal.active) continue;
      const decremented = { ...deal, yearsRemaining: deal.yearsRemaining - 1 };
      const stillQualifies = playerMeetsRequirement(player, decremented.requirement, seasonResult.wins);

      if (!stillQualifies) {
        player.morale = Math.max(0, player.morale - decremented.moraleBonus);
        lostDeals.push(decremented);
        continue;
      }

      if (decremented.yearsRemaining <= 0) {
        expiredDeals.push(decremented);
        if (rng() < 0.5) {
          const renewed = {
            ...decremented,
            yearsRemaining: decremented.yearsTotal,
            active: true,
          };
          renewedDeals.push(renewed);
          nextDeals.push(renewed);
        } else {
          player.morale = Math.max(0, player.morale - decremented.moraleBonus);
        }
        continue;
      }

      nextDeals.push(decremented);
    }

    player.endorsements = nextDeals;
  }

  return { expiredDeals, lostDeals, renewedDeals };
}

export function getEndorsementRevenue(deals: EndorsementDeal[]): number {
  return roundMoney(deals.filter((deal) => deal.active).reduce((total, deal) => total + deal.revenuePerYear, 0));
}

export function getEndorsementNarrative(
  deal: EndorsementDeal,
  player: Player,
  event: 'signed' | 'lost' | 'renewed',
): string {
  const totalValue = roundMoney(deal.revenuePerYear * Math.max(1, deal.yearsTotal));
  if (event === 'signed') {
    return `${player.name} signs a ${deal.yearsTotal}-year, $${totalValue}M deal with ${deal.brandName}.`;
  }
  if (event === 'renewed') {
    return `${player.lastName} renews with ${deal.brandName} for another $${totalValue}M run.`;
  }
  return `${player.lastName} loses the ${deal.brandName} deal after falling short of the contract requirement.`;
}
