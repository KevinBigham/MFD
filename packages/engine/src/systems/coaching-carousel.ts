import { RNG, uid } from '../rng';
import type { AIBiasConfig } from './ai-bias';
import type { GameEvent, GameState, StaffMember, Team } from '../types';
import { recordNewsItem } from './league-news';
import { ensureLivingWorldState } from './off-field-events';
import { logicalEventTimestamp, withEventDate } from './event-log-retention';

const FIRST_NAMES = ['Marcus', 'Calvin', 'Derrick', 'Andre', 'Jalen', 'Ty', 'Mason', 'Victor'];
const LAST_NAMES = ['Reed', 'Bishop', 'Owens', 'Warren', 'Coleman', 'Bennett', 'Sutton', 'Pryor'];
const ARCHETYPES = ['offensive_minded', 'defensive_minded', 'balanced', 'players_coach', 'disciplinarian'] as const;

function buildEvent(game: GameState, type: string, description: string, data: Record<string, unknown>): GameEvent {
  return {
    id: `${type}-${game.year}-${game.week}-${game.eventLog.length}`,
    type,
    timestamp: logicalEventTimestamp(game.year, game.week, game.eventLog.length),
    description,
    data: withEventDate(data, game.year, game.week),
  };
}

function lastSeasons(game: GameState, teamId: string, count: number): Array<{ year: number; wins: number; losses: number; playoffFinish: string }> {
  return [...game.franchiseHistory]
    .filter((entry) => entry.teamId === teamId)
    .sort((a, b) => b.year - a.year)
    .slice(0, count)
    .map((entry) => ({
      year: entry.year,
      wins: entry.wins,
      losses: entry.losses,
      playoffFinish: entry.playoffFinish,
    }));
}

function shouldFireCoach(game: GameState, team: Team, aiBias?: AIBiasConfig): boolean {
  if (team.isUser) return false;
  if (!team.staff.hc) return false;
  if (aiBias?.fireCoachEverySeason) return true;
  if (team.ownerPatience80 <= 20) return true;

  const recentThree = lastSeasons(game, team.id, 3);
  if (recentThree.length === 3 && recentThree.every((season) => season.wins < season.losses)) {
    return true;
  }

  const recentTwo = lastSeasons(game, team.id, 2);
  if (team.owner.archetypeId === 'win_now' && recentTwo.length === 2 && recentTwo.every((season) => season.playoffFinish === 'missed')) {
    return true;
  }

  return false;
}

function clampRating(value: number): number {
  return Math.max(50, Math.min(95, value));
}

function scoreCandidate(team: Team, candidate: StaffMember): number {
  const gameplan = candidate.ratings.gameplan ?? 70;
  const development = candidate.ratings.development ?? 70;
  const motivation = candidate.ratings.motivation ?? 70;
  const ownerFit = team.owner.archetypeId === 'win_now'
    ? gameplan
    : team.owner.archetypeId === 'patient_builder'
      ? development
      : motivation;
  const schemeFit = candidate.archetype.includes('offensive') && team.schemeOff !== 'balanced' ? 6 : 0;
  const disciplineFit = candidate.archetype === 'disciplinarian' && team.owner.archetypeId === 'win_now' ? 4 : 0;
  return ownerFit + gameplan + schemeFit + disciplineFit;
}

function generateCandidate(role: 'HC'): StaffMember {
  const first = FIRST_NAMES[Math.floor(RNG.ai() * FIRST_NAMES.length)] ?? 'Marcus';
  const last = LAST_NAMES[Math.floor(RNG.ai() * LAST_NAMES.length)] ?? 'Reed';
  const archetype = ARCHETYPES[Math.floor(RNG.ai() * ARCHETYPES.length)] ?? 'balanced';
  const base = 50 + Math.floor(RNG.ai() * 46);
  return {
    id: uid(),
    name: `${first} ${last}`,
    role,
    archetype,
    traits: [],
    ratings: {
      gameplan: clampRating(base + Math.floor(RNG.ai() * 8)),
      development: clampRating(base + Math.floor(RNG.ai() * 8) - 4),
      motivation: clampRating(base + Math.floor(RNG.ai() * 8) - 2),
      strategy: clampRating(base + Math.floor(RNG.ai() * 8) - 1),
    },
    level: 1 + Math.floor(RNG.ai() * 5),
    age: 34 + Math.floor(RNG.ai() * 29),
  };
}

function coachMirror(member: StaffMember): NonNullable<Team['coachingStaff']['hc']> {
  const [firstName, ...rest] = member.name.split(' ');
  return {
    id: member.id,
    firstName: firstName || member.role,
    lastName: rest.join(' ') || 'Coach',
    role: member.role,
    archetype: member.archetype,
    traits: member.traits,
    skillTree: {},
    xp: 0,
    reputation: Math.max(30, Math.min(95, 40 + member.level * 8)),
    tenure: 1,
  };
}

function writeHeadCoach(team: Team, coach: StaffMember): void {
  team.staff.hc = coach;
  team.coachingStaff.hc = coachMirror(coach);
}

function recordCoachHistory(game: GameState, coach: StaffMember, team: Team, seasonYear: number, retired = false): void {
  const existing = game.coachingHistory.find((entry) => entry.coachId === coach.id);
  const wins = team.wins;
  const losses = team.losses;
  const championships = game.playoffBracket?.championTeamId === team.id ? 1 : 0;

  if (existing) {
    existing.age = coach.age ?? existing.age;
    existing.seasonsCoached += 1;
    existing.wins += wins;
    existing.losses += losses;
    existing.championships += championships;
    existing.retired = existing.retired || retired;
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
    return;
  }

  game.coachingHistory.push({
    coachId: coach.id,
    name: coach.name,
    archetype: coach.archetype,
    age: coach.age ?? 50,
    seasonsCoached: 1,
    wins,
    losses,
    championships,
    awards: 0,
    retired,
    teams: [{
      teamId: team.id,
      startYear: seasonYear,
      endYear: seasonYear,
      wins,
      losses,
      championships,
    }],
  });
}

function growIncumbentCoach(team: Team): void {
  const coach = team.staff.hc;
  if (!coach || team.isUser) return;
  const growth = team.wins >= 11 ? 2 : team.wins >= 8 ? 1 : 0;
  if (growth <= 0) return;
  coach.ratings.gameplan = clampRating((coach.ratings.gameplan ?? 70) + growth);
  coach.ratings.development = clampRating((coach.ratings.development ?? 70) + growth);
  coach.ratings.motivation = clampRating((coach.ratings.motivation ?? 70) + growth);
  if (typeof coach.ratings.strategy === 'number') {
    coach.ratings.strategy = clampRating(coach.ratings.strategy + growth);
  }
}

export function runCoachingCarousel(game: GameState, seasonYear: number, aiBias?: AIBiasConfig): { events: GameEvent[] } {
  ensureLivingWorldState(game);
  const events: GameEvent[] = [];

  for (const team of Object.values(game.teams)) {
    if (!shouldFireCoach(game, team, aiBias)) {
      growIncumbentCoach(team);
      continue;
    }

    const oldCoach = team.staff.hc;
    if (oldCoach) {
      recordCoachHistory(game, oldCoach, team, seasonYear, Boolean((oldCoach.age ?? 50) >= 66));
      const fired = buildEvent(game, 'coach_fired', `${team.city} moves on from ${oldCoach.name}.`, { teamId: team.id, coachId: oldCoach.id });
      events.push(fired);
      game.narrativeState.recentHeadlines = [fired.description, ...game.narrativeState.recentHeadlines].slice(0, 8);
      game.eventLog.push(fired);
      recordNewsItem(game, {
        id: `coach-fired-${team.id}-${seasonYear}`,
        year: game.year,
        week: game.week,
        type: 'coaching',
        headline: fired.description,
        body: `${team.city} begins a new search after the ${seasonYear} campaign.`,
        teamIds: [team.id],
        playerIds: [],
        importance: 'major',
      });
    }

    const pool = Array.from({ length: 5 + Math.floor(RNG.ai() * 4) }, () => generateCandidate('HC'));
    const hire = pool.sort((a, b) => scoreCandidate(team, b) - scoreCandidate(team, a) || a.name.localeCompare(b.name))[0]!;
    writeHeadCoach(team, hire);

    const hired = buildEvent(game, 'coach_hired', `${team.city} hires ${hire.name} to run the sideline.`, { teamId: team.id, coachId: hire.id });
    events.push(hired);
    game.narrativeState.recentHeadlines = [hired.description, ...game.narrativeState.recentHeadlines].slice(0, 8);
    game.eventLog.push(hired);
    recordNewsItem(game, {
      id: `coach-hired-${team.id}-${seasonYear}`,
      year: game.year,
      week: game.week,
      type: 'coaching',
      headline: hired.description,
      body: `${hire.name} takes over with a ${hire.archetype.replaceAll('_', ' ')} profile.`,
      teamIds: [team.id],
      playerIds: [],
      importance: 'major',
    });
    recordCoachHistory(game, hire, team, seasonYear, false);
  }

  return { events };
}
