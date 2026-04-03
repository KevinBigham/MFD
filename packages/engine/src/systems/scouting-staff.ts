import { RNG } from '../rng';
import type {
  CombineMeasurables,
  DraftProspect,
  EngineOutput,
  GameState,
  Scout,
  ScoutingDepartment,
} from '../types';

const FIRST_NAMES = ['Avery', 'Jordan', 'Taylor', 'Casey', 'Riley', 'Parker', 'Devin', 'Morgan'];
const LAST_NAMES = ['Mason', 'Caldwell', 'Perry', 'Foster', 'Hayes', 'Sawyer', 'Brooks', 'Quinn'];
const POSITIONS: Array<Scout['specialty']> = [null, 'QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'];
const TIER_CONFIG: Record<Scout['tier'], { salary: [number, number]; accuracy: [number, number]; spread: number }> = {
  elite: { salary: [2.2, 3.0], accuracy: [0.92, 0.95], spread: 2 },
  good: { salary: [1.4, 2.1], accuracy: [0.82, 0.9], spread: 4 },
  average: { salary: [0.8, 1.3], accuracy: [0.72, 0.81], spread: 6 },
  poor: { salary: [0.3, 0.7], accuracy: [0.6, 0.71], spread: 8 },
};

function cloneGame(game: GameState): GameState {
  return JSON.parse(JSON.stringify(game)) as GameState;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rangeValue(min: number, max: number, rand: () => number): number {
  return Math.round((min + (max - min) * rand()) * 100) / 100;
}

function scoutSpread(scout: Scout, prospect: DraftProspect): number {
  const base = TIER_CONFIG[scout.tier]?.spread ?? 6;
  return Math.max(1, base - (scout.specialty === prospect.pos ? 1 : 0));
}

export function createDefaultScoutingDepartment(): ScoutingDepartment {
  return {
    scouts: [],
    availableScouts: [],
    budget: 5,
    maxScouts: 5,
  };
}

export function generateScoutPool(rand: () => number = RNG.play, year: number): Scout[] {
  const count = 8 + Math.floor(rand() * 5);
  const tiers: Scout['tier'][] = ['elite', 'good', 'good', 'average', 'average', 'average', 'poor', 'poor'];

  return Array.from({ length: count }, (_, index) => {
    const tier = tiers[Math.floor(rand() * tiers.length)] ?? 'average';
    const config = TIER_CONFIG[tier];
    return {
      id: `scout-${year}-${index + 1}`,
      name: `${FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]!} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]!}`,
      tier,
      specialty: POSITIONS[Math.floor(rand() * POSITIONS.length)] ?? null,
      salary: rangeValue(config.salary[0], config.salary[1], rand),
      accuracy: rangeValue(config.accuracy[0], config.accuracy[1], rand),
    };
  });
}

export function applyScoutAccuracy(
  prospect: DraftProspect,
  scout: Scout,
  rand: () => number = RNG.play,
  scoutingBonus = 1,
): number {
  const spread = Math.max(1, scoutSpread(scout, prospect) / Math.max(1, scoutingBonus));
  const swing = Math.round((rand() * 2 - 1) * spread);
  return clamp(prospect.trueGrade + swing, 40, 99);
}

export function hireScout(game: GameState, scoutId: string): EngineOutput {
  const nextState = cloneGame(game);
  const department = nextState.scoutingDepartment;
  const index = department.availableScouts.findIndex((scout) => scout.id === scoutId);
  if (index === -1 || department.scouts.length >= department.maxScouts) {
    return { nextState, events: [], consequences: [] };
  }

  const [scout] = department.availableScouts.splice(index, 1);
  if (!scout || department.budget < scout.salary) {
    if (scout) department.availableScouts.splice(index, 0, scout);
    return { nextState, events: [], consequences: [] };
  }

  department.scouts.push(scout);
  department.budget = Math.round((department.budget - scout.salary) * 100) / 100;
  return { nextState, events: [], consequences: [] };
}

export function fireScout(game: GameState, scoutId: string): EngineOutput {
  const nextState = cloneGame(game);
  const department = nextState.scoutingDepartment;
  const index = department.scouts.findIndex((scout) => scout.id === scoutId);
  if (index === -1) {
    return { nextState, events: [], consequences: [] };
  }

  const [scout] = department.scouts.splice(index, 1);
  if (scout) {
    department.availableScouts.push(scout);
    department.budget = Math.round((department.budget + scout.salary * 0.5) * 100) / 100;
  }
  return { nextState, events: [], consequences: [] };
}

export function bestScoutForProspect(game: GameState, prospect: DraftProspect): Scout | null {
  const matching = game.scoutingDepartment.scouts
    .filter((scout) => scout.specialty === prospect.pos)
    .sort((a, b) => b.accuracy - a.accuracy || a.id.localeCompare(b.id))[0];
  if (matching) return matching;

  return [...game.scoutingDepartment.scouts]
    .sort((a, b) => b.accuracy - a.accuracy || a.id.localeCompare(b.id))[0] ?? null;
}

function buildCombine(prospect: DraftProspect, rand: () => number): CombineMeasurables {
  const speedBase = prospect.ratings.speed ?? prospect.trueGrade;
  const powerBase = prospect.ratings.strength ?? prospect.trueGrade;
  const fortyBase = clamp(5.4 - speedBase * 0.012, 4.2, 5.3);
  const benchBase = clamp(10 + Math.round(powerBase * 0.18), 8, 40);
  const verticalBase = clamp(22 + powerBase * 0.2, 24, 44);

  return {
    fortyYard: Math.round((fortyBase + rand() * 0.08) * 100) / 100,
    benchPress: Math.round(benchBase + rand() * 2),
    vertical: Math.round((verticalBase + rand() * 1.5) * 10) / 10,
    broadJump: Math.round((100 + speedBase * 0.7 + rand() * 3) * 10) / 10,
    threeCone: Math.round((7.9 - speedBase * 0.01 + rand() * 0.08) * 100) / 100,
    shuttle: Math.round((4.9 - speedBase * 0.008 + rand() * 0.06) * 100) / 100,
  };
}

export function runCombine(game: GameState, rand: () => number = RNG.play): void {
  for (const prospect of game.draftClass) {
    if (!prospect.combine) {
      prospect.combine = buildCombine(prospect, rand);
    }
  }
}

export function runProDay(game: GameState, prospectId: string, rand: () => number = RNG.play): EngineOutput {
  const nextState = cloneGame(game);
  const prospect = nextState.draftClass.find((entry) => entry.id === prospectId);
  if (!prospect || !nextState.offseasonState) {
    return { nextState, events: [], consequences: [] };
  }

  const scout = bestScoutForProspect(nextState, prospect);
  if (!scout) {
    return { nextState, events: [], consequences: [] };
  }

  const keys = Object.keys(prospect.ratings).sort();
  if (keys.length === 0) {
    return { nextState, events: [], consequences: [] };
  }

  const ratingKey = keys[Math.floor(rand() * keys.length)]!;
  const rating = clamp(Math.round((prospect.ratings[ratingKey] ?? prospect.trueGrade) + (rand() * 2 - 1) * scoutSpread(scout, prospect)), 40, 99);
  const current = nextState.offseasonState.scoutingState[prospectId] ?? {
    prospectId,
    actions: [],
    accuracy: 0,
    visibleScoutGrade: prospect.scoutGrade,
    notes: [],
    proDayRating: null,
  };

  current.proDayRating = `${ratingKey.toUpperCase()}: ${rating}`;
  current.notes.push(`Pro Day: ${ratingKey} tested at ${rating}.`);
  nextState.offseasonState.scoutingState[prospectId] = current;
  return { nextState, events: [], consequences: [] };
}
