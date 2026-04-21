import type { PrngFn } from '../rng';
import type {
  CoachCareerHistory,
  GameEvent,
  GameState,
  StaffMember,
  StaffRole,
  Team,
} from '../types';
import { coachRetirementChance } from './coach-aging';

export type RetirementEpilogue =
  | 'broadcasting'
  | 'front_office'
  | 'college'
  | 'retired_in_place';

const ROLE_KEYS = {
  HC: 'hc',
  OC: 'oc',
  DC: 'dc',
} as const satisfies Record<StaffRole, keyof Team['staff']>;

const BASE_WEIGHTS: Record<RetirementEpilogue, number> = {
  broadcasting: 30,
  front_office: 25,
  college: 20,
  retired_in_place: 25,
};

const EPILOGUE_LABELS: Record<RetirementEpilogue, (team: Team) => string> = {
  broadcasting: () => 'ESPN Analyst',
  front_office: (team) => `GM, ${team.city}`,
  college: () => 'College HC',
  retired_in_place: () => 'Retired',
};

const EPILOGUE_TEMPLATES: Record<RetirementEpilogue, string[]> = {
  broadcasting: [
    '{coach} trades the headset for a studio desk and becomes an ESPN analyst after {years} seasons on the sideline.',
    'After {years} seasons pacing sidelines, {coach} heads to ESPN to break down Saturdays and Sundays from the studio.',
    '{coach} closes the play sheet for good and lands an ESPN analyst role after a decorated coaching run.',
    'The next chapter for {coach} starts in broadcasting, where ESPN tabs the longtime coach as a new analyst.',
  ],
  front_office: [
    '{coach} steps off the sideline and into the front office as the new GM in {city}.',
    'League circles expect {coach} to stay in football, and {city} quickly brings the veteran aboard as general manager.',
    '{coach} pivots from play-calling to roster building, taking a GM chair in {city}.',
    'The retirement only lasts on paper: {coach} immediately resurfaces in {city} as a general manager.',
  ],
  college: [
    '{coach} takes over a college program, carrying pro lessons into a new campus rebuild.',
    'A college sideline comes calling, and {coach} heads there for a fresh chapter after {years} pro seasons.',
    '{coach} leaves the league for the college game, where a program bets on veteran discipline and structure.',
    'The next whistle for {coach} will blow on Saturdays after accepting a college head coaching job.',
  ],
  retired_in_place: [
    '{coach} walks away content, retiring in place after {years} seasons and a long league grind.',
    'There is no next stop for {coach}, who chooses a quiet retirement after {years} years of coaching.',
    '{coach} decides the run is complete and retires in place after one last season on the headset.',
    'After a long climb through league staffs, {coach} opts for a full retirement instead of another sideline.',
  ],
};

function buildEvent(game: GameState, type: string, description: string, data: Record<string, unknown>): GameEvent {
  return {
    id: `${type}-${game.year}-${game.week}-${game.eventLog.length}`,
    type,
    timestamp: game.year * 1000 + game.week * 10 + game.eventLog.length,
    description,
    data,
  };
}

function roleKey(role: StaffRole): keyof Team['staff'] {
  return ROLE_KEYS[role];
}

function getStaff(team: Team, role: StaffRole): StaffMember | null {
  return team.staff[roleKey(role)];
}

function clearStaff(team: Team, role: StaffRole): void {
  const key = roleKey(role);
  team.staff[key] = null;
  team.coachingStaff[key] = null;
}

function currentSeasonChampionships(game: GameState, team: Team): number {
  return game.playoffBracket?.championTeamId === team.id ? 1 : 0;
}

function recordRetirementHistory(game: GameState, coach: StaffMember, team: Team, seasonYear: number): CoachCareerHistory {
  game.coachingHistory ??= [];

  const wins = team.wins ?? 0;
  const losses = team.losses ?? 0;
  const championships = currentSeasonChampionships(game, team);
  const existing = game.coachingHistory.find((entry) => entry.coachId === coach.id);

  if (existing) {
    existing.age = coach.age ?? existing.age;
    existing.seasonsCoached += 1;
    existing.wins += wins;
    existing.losses += losses;
    existing.championships += championships;
    existing.retired = true;

    const stint = existing.teams.find((entry) => entry.teamId === team.id);
    if (stint) {
      stint.endYear = seasonYear;
      stint.wins += wins;
      stint.losses += losses;
      stint.championships += championships;
    } else {
      existing.teams.push({
        teamId: team.id,
        startYear: seasonYear,
        endYear: seasonYear,
        wins,
        losses,
        championships,
      });
    }

    return existing;
  }

  const history: CoachCareerHistory = {
    coachId: coach.id,
    name: coach.name,
    archetype: coach.archetype,
    age: coach.age ?? 50,
    seasonsCoached: 1,
    wins,
    losses,
    championships,
    awards: 0,
    retired: true,
    teams: [{
      teamId: team.id,
      startYear: seasonYear,
      endYear: seasonYear,
      wins,
      losses,
      championships,
    }],
  };
  game.coachingHistory.push(history);
  return history;
}

function countRecentLosingSeasons(game: GameState, teamId: string): number {
  const seasons = [...game.franchiseHistory]
    .filter((entry) => entry.teamId === teamId)
    .sort((left, right) => right.year - left.year);

  let streak = 0;
  for (const season of seasons) {
    if (season.wins >= season.losses) break;
    streak += 1;
  }

  return streak;
}

function buildWeights(history: CoachCareerHistory): Record<RetirementEpilogue, number> {
  const weights = { ...BASE_WEIGHTS };
  const games = history.wins + history.losses;
  const winPct = games > 0 ? history.wins / games : 0.5;

  if (history.championships >= 2) {
    weights.broadcasting = 40;
    weights.front_office = 17;
    weights.college = 28;
    weights.retired_in_place = 15;
  }

  if (winPct < 0.5) {
    weights.broadcasting = Math.max(0, weights.broadcasting - 5);
    weights.front_office = Math.max(0, weights.front_office - 5);
    weights.college = Math.max(0, weights.college - 5);
    weights.retired_in_place += 20;
  }

  return weights;
}

function pickWeightedEpilogue(rng: PrngFn, weights: Record<RetirementEpilogue, number>): RetirementEpilogue {
  const ordered = Object.entries(weights) as Array<[RetirementEpilogue, number]>;
  const total = ordered.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng() * total;

  for (const [epilogue, weight] of ordered) {
    roll -= weight;
    if (roll <= 0) return epilogue;
  }

  return ordered[ordered.length - 1]![0];
}

function pickTemplate(rng: PrngFn, epilogue: RetirementEpilogue): string {
  const templates = EPILOGUE_TEMPLATES[epilogue];
  const index = Math.floor(rng() * templates.length);
  return templates[index] ?? templates[0]!;
}

function buildDescription(
  rng: PrngFn,
  epilogue: RetirementEpilogue,
  coach: StaffMember,
  team: Team,
  yearsCoached: number,
): string {
  return pickTemplate(rng, epilogue)
    .replaceAll('{coach}', coach.name)
    .replaceAll('{city}', team.city)
    .replaceAll('{years}', String(yearsCoached));
}

export function applyCoachRetirement(
  game: GameState,
  teamId: string,
  role: StaffRole,
  epilogueRng: PrngFn,
): void {
  const team = game.teams[teamId];
  if (!team) return;

  const coach = getStaff(team, role);
  if (!coach) return;

  const existingHistory = game.coachingHistory.find((entry) => entry.coachId === coach.id);
  const yearsAsHC = existingHistory?.seasonsCoached ?? 0;
  const recentLosingSeasons = countRecentLosingSeasons(game, team.id);
  const retirementChance = coachRetirementChance(coach, yearsAsHC, recentLosingSeasons);
  if (epilogueRng() >= retirementChance) return;

  const history = recordRetirementHistory(game, coach, team, game.year - 1);
  const epilogue = pickWeightedEpilogue(epilogueRng, buildWeights(history));
  const label = EPILOGUE_LABELS[epilogue](team);
  const description = buildDescription(epilogueRng, epilogue, coach, team, history.seasonsCoached);
  const event = buildEvent(game, 'coach_retirement', description, {
    coachId: coach.id,
    epilogue,
    yearsCoached: history.seasonsCoached,
    championships: history.championships,
    label,
  });

  game.eventLog.push(event);
  game.narrativeState.recentHeadlines = [event.description, ...game.narrativeState.recentHeadlines].slice(0, 8);
  clearStaff(team, role);
}
