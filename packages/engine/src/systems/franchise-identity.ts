import type {
  FranchiseIdentity,
  MarketSize,
  RelocationDestination,
  StadiumDeal,
  StadiumSponsor,
  Team,
} from '../types';
import type { PrngFn } from '../rng';
import { cl } from '../utils';

const INAUGURAL_YEAR = 2026;

const MARKET_SIZE_BY_CITY: Record<string, MarketSize> = {
  'New York': 'mega',
  'Los Angeles': 'mega',
  London: 'mega',
  'Mexico City': 'mega',
  Chicago: 'large',
  Dallas: 'large',
  Philadelphia: 'large',
  Washington: 'large',
  Atlanta: 'large',
  Miami: 'large',
  Houston: 'large',
  'San Francisco': 'large',
  Seattle: 'large',
  Phoenix: 'large',
  Toronto: 'large',
  Berlin: 'large',
  Boston: 'large',
  Portland: 'medium',
  Orlando: 'medium',
  Charlotte: 'medium',
  Austin: 'medium',
  'St. Louis': 'medium',
  'San Antonio': 'medium',
  Nashville: 'medium',
  Memphis: 'medium',
  Cleveland: 'medium',
  Cincinnati: 'medium',
  Pittsburgh: 'medium',
  Baltimore: 'medium',
  Jacksonville: 'medium',
  Indianapolis: 'medium',
  Denver: 'medium',
  'Kansas City': 'medium',
  Detroit: 'medium',
  Minneapolis: 'medium',
  'New Orleans': 'medium',
  Tampa: 'medium',
  'Tampa Bay': 'medium',
  Honolulu: 'small',
  'Green Bay': 'small',
};

const MARKET_MODIFIER_BY_SIZE: Record<MarketSize, number> = {
  small: 0.85,
  medium: 1,
  large: 1.1,
  mega: 1.2,
};

export const RELOCATION_DESTINATIONS: RelocationDestination[] = [
  { city: 'London', teamName: 'Monarchs', abbr: 'LDN', marketSize: 'mega', marketModifier: 1.25, fanbaseStart: 40, prestigeBonus: 15, cost: 55, stadiumType: 'dome', description: 'International expansion, massive market' },
  { city: 'Mexico City', teamName: 'Aztecs', abbr: 'MEX', marketSize: 'mega', marketModifier: 1.15, fanbaseStart: 45, prestigeBonus: 10, cost: 48, stadiumType: 'outdoor', description: 'Passionate fans, largest metro in North America' },
  { city: 'Berlin', teamName: 'Sentinels', abbr: 'BER', marketSize: 'large', marketModifier: 1.2, fanbaseStart: 38, prestigeBonus: 12, cost: 52, stadiumType: 'dome', description: 'European powerhouse, hungry for American football' },
  { city: 'Toronto', teamName: 'Raptors', abbr: 'TOR', marketSize: 'large', marketModifier: 1.1, fanbaseStart: 50, prestigeBonus: 8, cost: 42, stadiumType: 'dome', description: 'Hungry sports town with deep pockets' },
  { city: 'Austin', teamName: 'Blazers', abbr: 'AUS', marketSize: 'medium', marketModifier: 1.05, fanbaseStart: 55, prestigeBonus: 5, cost: 38, stadiumType: 'outdoor', description: 'Tech money meets college football culture' },
  { city: 'Portland', teamName: 'Wolves', abbr: 'PDX', marketSize: 'medium', marketModifier: 0.95, fanbaseStart: 48, prestigeBonus: 3, cost: 34, stadiumType: 'outdoor', description: 'Pacific Northwest loyalty runs deep' },
  { city: 'St. Louis', teamName: 'Stallions', abbr: 'STL', marketSize: 'medium', marketModifier: 0.9, fanbaseStart: 60, prestigeBonus: 2, cost: 32, stadiumType: 'dome', description: 'A city starving for football — instant love' },
  { city: 'San Antonio', teamName: 'Rattlers', abbr: 'SAT', marketSize: 'medium', marketModifier: 0.95, fanbaseStart: 52, prestigeBonus: 4, cost: 35, stadiumType: 'dome', description: 'Military town with fierce loyalty' },
  { city: 'Orlando', teamName: 'Thunder', abbr: 'ORL', marketSize: 'medium', marketModifier: 1, fanbaseStart: 50, prestigeBonus: 4, cost: 36, stadiumType: 'dome', description: 'Tourism capital with year-round weather' },
  { city: 'Honolulu', teamName: 'Tides', abbr: 'HNL', marketSize: 'small', marketModifier: 0.85, fanbaseStart: 42, prestigeBonus: 5, cost: 45, stadiumType: 'outdoor', description: 'Paradise location, tiny but passionate market' },
];

export const STADIUM_SPONSORS: StadiumSponsor[] = [
  { name: 'TechNova Field', baseRevenue: 8, baseDuration: 5, prestigeBonus: 3 },
  { name: 'Ironclad Arena', baseRevenue: 6, baseDuration: 7, prestigeBonus: 2 },
  { name: 'Velocity Park', baseRevenue: 10, baseDuration: 4, prestigeBonus: 5 },
  { name: 'Pioneer Stadium', baseRevenue: 5, baseDuration: 10, prestigeBonus: 1 },
  { name: 'Nexus Dome', baseRevenue: 12, baseDuration: 3, prestigeBonus: 4 },
  { name: 'Heritage Field', baseRevenue: 4, baseDuration: 15, prestigeBonus: 6 },
  { name: 'Apex Center', baseRevenue: 9, baseDuration: 5, prestigeBonus: 3 },
  { name: 'Titan Grounds', baseRevenue: 7, baseDuration: 6, prestigeBonus: 2 },
  { name: 'Summit Stadium', baseRevenue: 11, baseDuration: 4, prestigeBonus: 4 },
  { name: 'Citadel Park', baseRevenue: 6, baseDuration: 8, prestigeBonus: 3 },
];

export const STADIUM_UPGRADE_COSTS = [0, 50, 150] as const;
export const STADIUM_REVENUE_BONUS = [0, 0.1, 0.25] as const;
export const STADIUM_PRESTIGE_BONUS = [0, 5, 12] as const;
export const STADIUM_CROWD_BONUS = [0, 1, 2] as const;

function stadiumUpgradeCost(level: FranchiseIdentity['stadiumLevel']): number {
  return level === 1 ? STADIUM_UPGRADE_COSTS[1] : STADIUM_UPGRADE_COSTS[2];
}

function stadiumRevenueBonus(level: FranchiseIdentity['stadiumLevel']): number {
  return level === 1 ? STADIUM_REVENUE_BONUS[0] : level === 2 ? STADIUM_REVENUE_BONUS[1] : STADIUM_REVENUE_BONUS[2];
}

function stadiumPrestigeBonus(level: FranchiseIdentity['stadiumLevel']): number {
  return level === 1 ? STADIUM_PRESTIGE_BONUS[0] : level === 2 ? STADIUM_PRESTIGE_BONUS[1] : STADIUM_PRESTIGE_BONUS[2];
}

function stadiumCrowdBonus(level: FranchiseIdentity['stadiumLevel']): number {
  return level === 1 ? STADIUM_CROWD_BONUS[0] : level === 2 ? STADIUM_CROWD_BONUS[1] : STADIUM_CROWD_BONUS[2];
}

function inferMarketSize(city: string): MarketSize {
  return MARKET_SIZE_BY_CITY[city] ?? 'medium';
}

function inferMarketModifier(city: string, marketSize: MarketSize): number {
  return RELOCATION_DESTINATIONS.find((destination) => destination.city === city)?.marketModifier
    ?? MARKET_MODIFIER_BY_SIZE[marketSize];
}

function clampIdentity(identity: FranchiseIdentity): FranchiseIdentity {
  return {
    ...identity,
    fanbase: cl(Math.round(identity.fanbase), 20, 99),
    prestige: cl(Math.round(identity.prestige), 10, 99),
    attendance: cl(Math.round(identity.attendance), 0, 100),
  };
}

function genericStadiumName(city: string): string {
  return `${city} Stadium`;
}

function inferCurrentIdentityCity(identity: FranchiseIdentity, currentCity?: string): string {
  if (currentCity) return currentCity;
  const lastRelocation = identity.relocationHistory[identity.relocationHistory.length - 1];
  if (lastRelocation?.toCity) return lastRelocation.toCity;
  if (identity.stadiumName.endsWith(' Stadium')) {
    return identity.stadiumName.replace(/ Stadium$/, '');
  }
  return 'City';
}

function randRange(rng: PrngFn, min: number, max: number): number {
  return min + (max - min) * rng();
}

function randInt(rng: PrngFn, min: number, max: number): number {
  return Math.floor(randRange(rng, min, max + 1));
}

function removeCurrentDealPrestige(identity: FranchiseIdentity): number {
  return identity.stadiumDeal?.prestigeBonus ?? 0;
}

export function createDefaultFranchiseIdentity(team: Pick<Team, 'city' | 'stadiumType'>): FranchiseIdentity {
  const marketSize = inferMarketSize(team.city);
  return {
    fanbase: 55,
    prestige: 50,
    marketSize,
    marketModifier: inferMarketModifier(team.city, marketSize),
    stadiumName: genericStadiumName(team.city),
    stadiumDeal: null,
    stadiumLevel: 1,
    attendance: 70,
    relocationHistory: [],
  };
}

export function initializeFranchiseIdentity(team: Team, rng: PrngFn): FranchiseIdentity {
  const base = createDefaultFranchiseIdentity(team);
  const marketBoost = base.marketSize === 'mega' ? 8 : base.marketSize === 'large' ? 4 : base.marketSize === 'small' ? -4 : 0;

  return clampIdentity({
    ...base,
    fanbase: 58 + marketBoost / 2 + randRange(rng, -8, 12),
    prestige: 52 + marketBoost + randRange(rng, -10, 18),
    attendance: 70 + marketBoost / 2 + randRange(rng, -10, 12),
  });
}

export function updateFanbase(
  identity: FranchiseIdentity,
  team: Team,
  seasonResult: { wins: number; losses: number; playoffFinish: string },
): FranchiseIdentity {
  let delta = 0;
  if (seasonResult.playoffFinish === 'champion') delta += 10;
  else if (seasonResult.playoffFinish !== 'missed_playoffs' && seasonResult.playoffFinish !== 'regular_season') delta += 6;
  else if (seasonResult.wins > seasonResult.losses) delta += 3;
  else if (seasonResult.losses > seasonResult.wins) delta -= 3;

  if (seasonResult.losses > seasonResult.wins && team.streak <= -3) {
    delta -= 2;
  }
  if (seasonResult.wins > seasonResult.losses && team.streak >= 3) {
    delta += 2;
  }

  return clampIdentity({
    ...identity,
    fanbase: identity.fanbase + delta,
  });
}

export function updatePrestige(
  identity: FranchiseIdentity,
  team: Team,
  achievements: { championships: number; playoffAppearances: number; hallOfFamers: number },
): FranchiseIdentity {
  let delta = achievements.championships * 5 + achievements.playoffAppearances * 2 + achievements.hallOfFamers * 3;
  if (team.losses > team.wins) delta -= 1;

  return clampIdentity({
    ...identity,
    prestige: identity.prestige + delta,
  });
}

export function updateAttendance(identity: FranchiseIdentity, team: Team): number {
  const gamesPlayed = team.wins + team.losses + team.ties;
  const winPct = gamesPlayed > 0 ? (team.wins + team.ties * 0.5) / gamesPlayed : 0.5;
  const recordScore = 35 + winPct * 50;
  const fanScore = identity.fanbase * 0.9;
  const prestigeScore = identity.prestige * 0.75;
  const stadiumScore = identity.stadiumLevel === 3 ? 100 : identity.stadiumLevel === 2 ? 84 : 70;

  return cl(
    Math.round(fanScore * 0.4 + recordScore * 0.3 + prestigeScore * 0.15 + stadiumScore * 0.15),
    0,
    100,
  );
}

export function getStadiumHomeFieldBonus(identity: FranchiseIdentity): number {
  return stadiumCrowdBonus(identity.stadiumLevel);
}

export function generateStadiumDeals(rng: PrngFn): StadiumDeal[] {
  const sponsors = [...STADIUM_SPONSORS];
  const deals: StadiumDeal[] = [];

  while (sponsors.length > 0 && deals.length < 3) {
    const index = randInt(rng, 0, sponsors.length - 1);
    const [sponsor] = sponsors.splice(index, 1);
    if (!sponsor) continue;

    const revenuePerYear = Math.round(sponsor.baseRevenue * (0.8 + rng() * 0.4) * 10) / 10;
    const yearsTotal = cl(sponsor.baseDuration + randInt(rng, -1, 1), 3, 15);
    deals.push({
      sponsorName: sponsor.name,
      revenuePerYear,
      yearsTotal,
      yearsRemaining: yearsTotal,
      prestigeBonus: sponsor.prestigeBonus,
    });
  }

  return deals;
}

export function acceptStadiumDeal(identity: FranchiseIdentity, deal: StadiumDeal): FranchiseIdentity {
  const currentBonus = removeCurrentDealPrestige(identity);
  return clampIdentity({
    ...identity,
    prestige: identity.prestige - currentBonus + deal.prestigeBonus,
    stadiumName: deal.sponsorName,
    stadiumDeal: { ...deal },
  });
}

export function tickStadiumDeal(identity: FranchiseIdentity, currentCity?: string): FranchiseIdentity {
  if (!identity.stadiumDeal) return identity;

  const yearsRemaining = identity.stadiumDeal.yearsRemaining - 1;
  if (yearsRemaining > 0) {
    return {
      ...identity,
      stadiumDeal: {
        ...identity.stadiumDeal,
        yearsRemaining,
      },
    };
  }

  return clampIdentity({
    ...identity,
    prestige: identity.prestige - identity.stadiumDeal.prestigeBonus,
    stadiumName: genericStadiumName(inferCurrentIdentityCity(identity, currentCity)),
    stadiumDeal: null,
  });
}

export function upgradeStadium(identity: FranchiseIdentity, team: Team): { identity: FranchiseIdentity; cost: number } | null {
  if (identity.stadiumLevel >= 3) return null;
  const cost = stadiumUpgradeCost(identity.stadiumLevel);
  if (team.capSpace < cost) return null;

  const nextLevel = (identity.stadiumLevel + 1) as FranchiseIdentity['stadiumLevel'];
  const prestigeDelta = stadiumPrestigeBonus(nextLevel) - stadiumPrestigeBonus(identity.stadiumLevel);

  return {
    identity: clampIdentity({
      ...identity,
      stadiumLevel: nextLevel,
      prestige: identity.prestige + prestigeDelta,
    }),
    cost,
  };
}

export function canRelocate(identity: FranchiseIdentity, team: Team, currentYear: number): boolean {
  const seasonsPlayed = currentYear - INAUGURAL_YEAR;
  const cheapest = Math.min(...RELOCATION_DESTINATIONS.map((destination) => destination.cost));
  const lastRelocationYear = identity.relocationHistory[identity.relocationHistory.length - 1]?.year ?? null;
  const longEnoughSinceMove = lastRelocationYear === null || currentYear - lastRelocationYear >= 5;

  return seasonsPlayed >= 3 && team.capSpace >= cheapest && longEnoughSinceMove;
}

export function getRelocationDestinations(identity: FranchiseIdentity, currentCity?: string): RelocationDestination[] {
  const activeCity = inferCurrentIdentityCity(identity, currentCity);
  return RELOCATION_DESTINATIONS.filter((destination) => destination.city !== activeCity);
}

export function relocateTeam(
  team: Team,
  identity: FranchiseIdentity,
  destination: RelocationDestination,
  currentYear: number,
  rng: PrngFn,
): { team: Team; identity: FranchiseIdentity } {
  const movedTeam: Team = {
    ...team,
    city: destination.city,
    name: destination.teamName,
    abbr: destination.abbr,
    icon: destination.abbr.toLowerCase(),
    stadiumType: destination.stadiumType,
    ownerMood: cl(team.ownerMood + 15, 0, 100),
    owner: {
      ...team.owner,
      approval: cl(team.owner.approval + 15, 0, 100),
    },
    roster: team.roster.map((player) => ({
      ...player,
      chemistry: cl(player.chemistry - randInt(rng, 3, 8), 0, 100),
      morale: cl(player.morale - randInt(rng, 2, 5), 0, 100),
    })),
  };

  const movedIdentity = clampIdentity({
    ...identity,
    fanbase: destination.fanbaseStart + randInt(rng, -3, 4),
    prestige: identity.prestige + destination.prestigeBonus,
    marketSize: destination.marketSize,
    marketModifier: destination.marketModifier,
    stadiumName: genericStadiumName(destination.city),
    stadiumDeal: null,
    stadiumLevel: 1,
    attendance: 60,
    relocationHistory: [
      ...identity.relocationHistory,
      {
        fromCity: team.city,
        fromName: team.name,
        toCity: destination.city,
        toName: destination.teamName,
        year: currentYear,
      },
    ],
  });

  movedTeam.franchiseIdentity = movedIdentity;
  return { team: movedTeam, identity: movedIdentity };
}

export function getFanbaseEffect(identity: FranchiseIdentity): { faInterestBonus: number; revenueMultiplier: number } {
  if (identity.fanbase >= 80) {
    return { faInterestBonus: 0.05, revenueMultiplier: 1.15 + stadiumRevenueBonus(identity.stadiumLevel) };
  }
  if (identity.fanbase < 40) {
    return { faInterestBonus: -0.1, revenueMultiplier: 0.9 + stadiumRevenueBonus(identity.stadiumLevel) };
  }
  return {
    faInterestBonus: 0,
    revenueMultiplier: 1 + stadiumRevenueBonus(identity.stadiumLevel),
  };
}
