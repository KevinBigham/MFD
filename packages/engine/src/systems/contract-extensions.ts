import { getSalaryCap } from '../config';
import { makeContract } from './contracts';
import { calcPlayerValue } from './trade-value';
import type {
  CapProjectionYear,
  ContractExtensionRecord,
  ExtensionEvaluation,
  ExtensionOffer,
  GameState,
  Player,
  Position,
  Team,
} from '../types';

const POSITION_MARKET_MULTIPLIER: Record<Position, number> = {
  QB: 1.35,
  RB: 0.88,
  WR: 1.05,
  TE: 0.92,
  OL: 1.08,
  DL: 1.04,
  LB: 0.98,
  CB: 1.03,
  S: 0.96,
  K: 0.45,
  P: 0.4,
};

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function annualCapHit(player: Player): number {
  if (!player.contract) return 0;
  return round(player.contract.baseSalary + player.contract.prorated);
}

function marketBaseline(player: Player, team: Team, game: GameState): number {
  const value = calcPlayerValue(game, player, team);
  const ageMultiplier = player.age <= 25 ? 1.08 : player.age <= 29 ? 1 : player.age <= 32 ? 0.9 : 0.76;
  return round(Math.max(1, value / 65) * (POSITION_MARKET_MULTIPLIER[player.pos] ?? 1) * ageMultiplier);
}

export function generateExtensionOffer(player: Player, team: Team, game: GameState): ExtensionOffer {
  const baseline = marketBaseline(player, team, game);
  const yearsRemaining = player.contract?.years ?? 0;
  const newYears = player.age <= 26 ? 4 : player.age <= 29 ? 3 : 2;
  const newAvgSalary = round(Math.max(1, baseline + Math.max(0, player.ovr - 75) * 0.08 - Math.max(0, player.age - 30) * 0.2));
  const guaranteedAmount = round(newAvgSalary * Math.min(newYears, 2) * (player.personality.loyalty >= 8 ? 0.95 : 1.05));
  const signingBonus = round(newAvgSalary * newYears * 0.2);
  const proratedBonus = round(signingBonus / Math.max(1, newYears));
  const capHitByYear = Array.from({ length: newYears }, (_, index) => {
    const escalator = 1 + index * 0.04;
    return round(newAvgSalary * escalator + proratedBonus + (yearsRemaining > 0 && index === 0 ? annualCapHit(player) * 0.15 : 0));
  });

  return {
    playerId: player.id,
    newYears,
    newAvgSalary,
    guaranteedAmount,
    signingBonus,
    capHitByYear,
  };
}

export function evaluateExtension(
  offer: ExtensionOffer,
  player: Player,
  team: Team,
  game: GameState,
): ExtensionEvaluation {
  const fairOffer = generateExtensionOffer(player, team, game);
  const teamSuccessBoost = team.wins >= 10 ? 0.04 : team.wins >= 8 ? 0.02 : 0;
  const loyaltyBoost = player.personality.loyalty >= 8 ? 0.03 : 0;
  const greedPenalty = player.personality.greed >= 8 ? 0.06 : 0;
  const offeredScore = offer.newAvgSalary + offer.guaranteedAmount * 0.25 + offer.signingBonus * 0.08;
  const fairScore = fairOffer.newAvgSalary + fairOffer.guaranteedAmount * 0.25 + fairOffer.signingBonus * 0.08;
  const acceptanceThreshold = fairScore * (1 - teamSuccessBoost - loyaltyBoost + greedPenalty);

  if (offeredScore >= acceptanceThreshold) {
    return {
      playerAccepts: true,
      reasoning: `${player.name} sees the offer as fair market value with enough guarantees to sign now.`,
    };
  }

  return {
    playerAccepts: false,
    counterOffer: {
      ...fairOffer,
      newAvgSalary: round((offer.newAvgSalary + fairOffer.newAvgSalary) / 2),
      guaranteedAmount: round((offer.guaranteedAmount + fairOffer.guaranteedAmount) / 2),
      signingBonus: round((offer.signingBonus + fairOffer.signingBonus) / 2),
      capHitByYear: fairOffer.capHitByYear,
    },
    reasoning: `${player.name} wants a stronger market match before agreeing to an extension.`,
  };
}

export function postJune1Cut(player: Player, team: Team, year: number): {
  capSavings: number;
  deadCap: number;
  acceleratedCap: number;
} {
  if (!player.contract) {
    return {
      capSavings: 0,
      deadCap: 0,
      acceleratedCap: 0,
    };
  }

  const currentYearDead = round(player.contract.prorated);
  const remainingProration = round(Math.max(0, player.contract.prorated * Math.max(0, player.contract.years - 1)));
  const capSavings = round(Math.max(0, annualCapHit(player) - currentYearDead));
  team.deadCapByYear[year] = round((team.deadCapByYear[year] ?? 0) + currentYearDead);
  team.deadCapByYear[year + 1] = round((team.deadCapByYear[year + 1] ?? 0) + remainingProration);

  return {
    capSavings,
    deadCap: round(currentYearDead + remainingProration),
    acceleratedCap: remainingProration,
  };
}

export function capProjection(team: Team, startYear: number, years = 3): CapProjectionYear[] {
  return Array.from({ length: years }, (_, offset) => {
    const year = startYear + offset + 1;
    const totalCap = getSalaryCap(year);
    const committedCap = round(team.roster.reduce((sum, player) => {
      if (!player.contract) return sum;
      const contractYear = player.contract.yearlyBreakdown.find((entry) => entry.year === year);
      if (contractYear) return sum + contractYear.capHit;
      if (offset < player.contract.years) return sum + annualCapHit(player);
      return sum;
    }, 0));
    const deadCap = round(team.deadCapByYear[year] ?? 0);

    return {
      year,
      totalCap,
      committedCap,
      deadCap,
      freeSpace: round(totalCap - committedCap - deadCap),
    };
  });
}

export function applyExtensionOffer(game: GameState, teamId: string, offer: ExtensionOffer): GameState {
  const nextState = structuredClone(game);
  const team = nextState.teams[teamId];
  const player = nextState.players[offer.playerId];
  if (!team || !player) return nextState;

  player.contract = makeContract(
    offer.newAvgSalary,
    offer.newYears,
    offer.signingBonus,
    offer.guaranteedAmount,
    player.id,
    team.id,
  );
  player.teamId = team.id;

  const teamRosterPlayer = team.roster.find((entry) => entry.id === player.id);
  if (teamRosterPlayer) {
    teamRosterPlayer.contract = player.contract;
  }

  const record: ContractExtensionRecord = {
    playerId: player.id,
    teamId: team.id,
    status: 'accepted',
    offer,
    counterOffer: null,
    reasoning: `${player.name} signed a new extension.`,
    year: nextState.year,
    week: nextState.week,
  };
  nextState.contractExtensions = [
    ...nextState.contractExtensions.filter((entry: ContractExtensionRecord) => !(entry.playerId === player.id && entry.teamId === team.id)),
    record,
  ];

  return nextState;
}
