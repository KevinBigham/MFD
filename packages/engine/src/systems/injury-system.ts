import { RNG } from '../rng';
import { applyFacilityBonuses } from './facilities';
import type {
  GameState,
  Injury,
  InjuryDetail,
  InjurySeverityTier,
  InjuryType,
  MedicalStaff,
  Player,
} from '../types';

const BASE_INJURY_CHANCE = 0.04;
const POSITION_RISK: Record<Player['pos'], number> = {
  QB: 0.005,
  RB: 0.015,
  WR: 0.015,
  TE: 0.008,
  OL: 0.003,
  DL: 0.008,
  LB: 0.01,
  CB: 0.015,
  S: 0.008,
  K: 0,
  P: 0,
};

const RECOVERY_BY_TIER: Record<MedicalStaff['tier'], number> = {
  elite: 0.8,
  good: 0.9,
  average: 1,
  poor: 1.2,
};

const INJURY_TABLE: Array<{
  type: InjuryType;
  tier: InjurySeverityTier;
  severity: Injury['severity'];
  games: [number, number];
  reinjuryRisk: number;
  affectedRatings: string[];
}> = [
  { type: 'hamstring', tier: 'minor', severity: 'questionable', games: [1, 2], reinjuryRisk: 0.1, affectedRatings: ['speed', 'acceleration'] },
  { type: 'ankle_sprain', tier: 'minor', severity: 'questionable', games: [1, 2], reinjuryRisk: 0.1, affectedRatings: ['agility', 'speed'] },
  { type: 'concussion', tier: 'moderate', severity: 'doubtful', games: [1, 3], reinjuryRisk: 0.15, affectedRatings: ['awareness'] },
  { type: 'shoulder', tier: 'moderate', severity: 'doubtful', games: [2, 4], reinjuryRisk: 0.14, affectedRatings: ['throwPower', 'catching'] },
  { type: 'groin', tier: 'moderate', severity: 'doubtful', games: [2, 4], reinjuryRisk: 0.16, affectedRatings: ['speed', 'agility'] },
  { type: 'quad', tier: 'severe', severity: 'out', games: [4, 6], reinjuryRisk: 0.22, affectedRatings: ['speed', 'strength'] },
  { type: 'knee_sprain', tier: 'severe', severity: 'out', games: [4, 8], reinjuryRisk: 0.24, affectedRatings: ['speed', 'agility'] },
  { type: 'back', tier: 'severe', severity: 'out', games: [3, 6], reinjuryRisk: 0.2, affectedRatings: ['strength', 'stamina'] },
  { type: 'foot', tier: 'severe', severity: 'out', games: [4, 7], reinjuryRisk: 0.22, affectedRatings: ['speed', 'acceleration'] },
  { type: 'ribs', tier: 'moderate', severity: 'doubtful', games: [2, 4], reinjuryRisk: 0.18, affectedRatings: ['stamina', 'strength'] },
  { type: 'hand', tier: 'minor', severity: 'questionable', games: [1, 2], reinjuryRisk: 0.08, affectedRatings: ['catching', 'throwPower'] },
  { type: 'acl', tier: 'season_ending', severity: 'ir', games: [12, 17], reinjuryRisk: 0.35, affectedRatings: ['speed', 'acceleration', 'agility'] },
];

const FIRST_NAMES = ['Sam', 'Jordan', 'Taylor', 'Parker', 'Morgan', 'Riley', 'Avery', 'Casey'];
const LAST_NAMES = ['Harper', 'Lane', 'Bennett', 'Foster', 'Perry', 'Hayes', 'Brooks', 'Carter'];

function randomInt(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function severityPenalty(rand: () => number, tier: InjurySeverityTier): number {
  if (tier === 'season_ending') return 3;
  if (tier === 'severe') return randomInt(rand, 1, 3);
  return 0;
}

function ageRisk(player: Player): number {
  return player.age >= 30 ? (player.age - 29) * 0.01 : 0;
}

function traitRisk(player: Player): number {
  let risk = 0;
  if (player.traits.includes('ironman')) risk -= 0.02;
  if (player.traits.includes('glass')) risk += 0.03;
  return risk;
}

function normalizedMedicalStaff(medicalStaff: MedicalStaff | null): MedicalStaff {
  return medicalStaff ?? {
    id: 'medical-neutral',
    name: 'League Average Medical Team',
    tier: 'average',
    salary: 0,
    recoveryBonus: 1,
    preventionBonus: 1,
  };
}

function selectInjury(rand: () => number): typeof INJURY_TABLE[number] {
  const roll = rand();
  if (roll < 0.28) return INJURY_TABLE[0]!;
  if (roll < 0.46) return INJURY_TABLE[1]!;
  if (roll < 0.58) return INJURY_TABLE[2]!;
  if (roll < 0.68) return INJURY_TABLE[3]!;
  if (roll < 0.76) return INJURY_TABLE[4]!;
  if (roll < 0.84) return INJURY_TABLE[5]!;
  if (roll < 0.9) return INJURY_TABLE[6]!;
  if (roll < 0.94) return INJURY_TABLE[7]!;
  if (roll < 0.97) return INJURY_TABLE[8]!;
  if (roll < 0.985) return INJURY_TABLE[9]!;
  if (roll < 0.995) return INJURY_TABLE[10]!;
  return INJURY_TABLE[11]!;
}

export type GameAvailability = 'available' | 'questionable' | 'out';

export function getGameAvailability(player: Player): GameAvailability {
  if (!player.injury) return 'available';
  if (player.injury.gamesOut > 0 || player.injury.onIR) return 'out';
  return 'questionable';
}

export function isPlayerUnavailable(player: Player): boolean {
  return getGameAvailability(player) === 'out';
}

export function getInjuryPenalty(player: Player): number {
  if (!player.injury || player.injury.gamesOut > 0) return 0;
  return -Math.abs(player.injury.ratingPenalty ?? 0);
}

export function calculateRecoveryGames(
  baseGamesOut: number,
  medicalStaff: MedicalStaff | null,
  facilityRecoveryBonus = 1,
): number {
  const normalized = normalizedMedicalStaff(medicalStaff);
  const tierBonus = RECOVERY_BY_TIER[normalized.tier] ?? normalized.recoveryBonus ?? 1;
  return Math.max(1, Math.round(baseGamesOut * tierBonus / Math.max(0.01, facilityRecoveryBonus)));
}

export function generateInjury(
  rand: () => number,
  player: Player,
  fatigueLevel: number,
  medicalStaff: MedicalStaff | null,
  injuryModifier = 1,
  injuryPreventionBonus = 1,
): InjuryDetail | null {
  const normalized = normalizedMedicalStaff(medicalStaff);
  const fatigueRisk = fatigueLevel > 50 ? ((fatigueLevel - 50) / 10) * 0.02 : 0;
  const chance = Math.max(
    0,
    (BASE_INJURY_CHANCE + POSITION_RISK[player.pos] + ageRisk(player) + traitRisk(player) + fatigueRisk)
      * injuryModifier
      * normalized.preventionBonus
      * injuryPreventionBonus,
  );

  if (rand() >= chance) {
    return null;
  }

  const selected = selectInjury(rand);
  const baseGames = randomInt(rand, selected.games[0], selected.games[1]);
  const gamesOut = calculateRecoveryGames(baseGames, normalized, 1);

  return {
    id: `inj-${player.id}-${selected.type}-${baseGames}`,
    type: selected.type,
    severity: selected.severity,
    severityTier: selected.tier,
    gamesOut,
    gamesRecovered: 0,
    reinjuryRisk: selected.reinjuryRisk,
    affectedRatings: [...selected.affectedRatings],
    ratingPenalty: 0,
    onIR: selected.severity === 'ir',
  };
}

export function processInjuryRecovery(
  game: GameState,
  teamId: string,
  rand: () => number = RNG.injury,
): void {
  const team = game.teams[teamId];
  if (!team) return;

  for (const player of team.roster) {
    if (!player.injury) continue;

    if (player.injury.gamesOut > 0) {
      player.injury.gamesOut = Math.max(0, player.injury.gamesOut - 1);
      if (player.injury.gamesOut === 0) {
        if (player.injury.severityTier === 'severe' || player.injury.severityTier === 'season_ending') {
          player.injury.ratingPenalty = severityPenalty(rand, player.injury.severityTier);
          player.injury.gamesRecovered = 0;
          player.injury.onIR = false;
        } else {
          player.injury = null;
        }
      }
      continue;
    }

    if (player.injury.reinjuryRisk > 0.1 && rand() < player.injury.reinjuryRisk) {
      player.injury.gamesOut = Math.max(1, Math.round(player.injury.ratingPenalty || 1));
      player.injury.gamesRecovered = 0;
      player.injury.severity = player.injury.gamesOut >= 4 ? 'out' : 'doubtful';
      continue;
    }

    player.injury.gamesRecovered += 1;
    player.injury.reinjuryRisk = Number(Math.max(0, player.injury.reinjuryRisk - 0.03).toFixed(3));
    if (player.injury.gamesRecovered >= 4) {
      player.injury = null;
    }
  }
}

export function placeOnIR(game: GameState, teamId: string, playerId: string): boolean {
  const player = game.teams[teamId]?.roster.find((entry) => entry.id === playerId);
  if (!player?.injury) return false;

  player.injury.onIR = true;
  player.injury.severity = 'ir';
  player.injury.gamesOut = Math.max(player.injury.gamesOut, 4);
  return true;
}

export function activateFromIR(game: GameState, teamId: string, playerId: string): boolean {
  const player = game.teams[teamId]?.roster.find((entry) => entry.id === playerId);
  if (!player?.injury || !player.injury.onIR || player.injury.gamesOut > 0) return false;

  player.injury.onIR = false;
  return true;
}

export function generateMedicalStaffPool(rand: () => number = RNG.ai, year = 0): MedicalStaff[] {
  const count = 6 + Math.floor(rand() * 3);
  const tiers: MedicalStaff['tier'][] = ['elite', 'good', 'good', 'average', 'average', 'poor', 'poor'];

  return Array.from({ length: count }, (_, index) => {
    const tier = tiers[Math.floor(rand() * tiers.length)] ?? 'average';
    return {
      id: `medical-${year}-${index + 1}`,
      name: `${FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]!} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]!}`,
      tier,
      salary: tier === 'elite' ? 2.8 : tier === 'good' ? 1.8 : tier === 'average' ? 1.1 : 0.6,
      recoveryBonus: RECOVERY_BY_TIER[tier],
      preventionBonus: tier === 'elite' ? 0.8 : tier === 'good' ? 0.9 : tier === 'average' ? 1 : 1,
    };
  });
}

export function hireMedicalStaff(game: GameState, teamId: string, staffId: string): boolean {
  if (game.phase !== 'offseason') return false;

  const team = game.teams[teamId];
  const index = game.availableMedicalStaff.findIndex((entry) => entry.id === staffId);
  if (!team || index === -1) return false;

  const [staff] = game.availableMedicalStaff.splice(index, 1);
  if (!staff) return false;

  if (team.medicalStaff) {
    game.availableMedicalStaff.push(team.medicalStaff);
  }
  team.medicalStaff = staff;
  return true;
}

export function maybeGenerateTeamInjury(
  game: GameState,
  teamId: string,
  player: Player,
  fatigueLevel: number,
  injuryModifier = 1,
  rand: () => number = RNG.injury,
): InjuryDetail | null {
  const team = game.teams[teamId];
  if (!team) return null;
  const facilityBonuses = applyFacilityBonuses(team);
  const injury = generateInjury(
    rand,
    player,
    fatigueLevel,
    team.medicalStaff,
    injuryModifier,
    facilityBonuses.injuryPreventionBonus,
  );
  if (injury) {
    injury.gamesOut = calculateRecoveryGames(injury.gamesOut, team.medicalStaff, facilityBonuses.recoveryBonus);
    player.injury = injury;
    game.players[player.id] = player;
  }
  return injury;
}
