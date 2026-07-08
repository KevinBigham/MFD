import { mulberry32 } from '../rng';
import type {
  CoachingMarketState,
  GameEvent,
  GameState,
  StaffCandidate,
  StaffMember,
  StaffRole,
  Team,
} from '../types';
import { logicalEventTimestamp, withEventDate } from './event-log-retention';
import { recordNewsItem } from './league-news';

const ROLE_KEYS = {
  HC: 'hc',
  OC: 'oc',
  DC: 'dc',
} as const;

const FIRST_NAMES = ['Marcus', 'Calvin', 'Derrick', 'Andre', 'Jalen', 'Ty', 'Mason', 'Victor', 'Noah', 'Julian'];
const LAST_NAMES = ['Reed', 'Bishop', 'Owens', 'Warren', 'Coleman', 'Bennett', 'Sutton', 'Pryor', 'Howard', 'Carter'];
const ARCHETYPES_BY_ROLE: Record<StaffRole, string[]> = {
  HC: ['balanced', 'motivator', 'strategist', 'disciplinarian', 'offensive_minded', 'defensive_minded'],
  OC: ['offensive_minded', 'strategist', 'air_attack', 'west_coast', 'balanced'],
  DC: ['defensive_minded', 'disciplinarian', 'aggressive', 'coverage_specialist', 'balanced'],
};
const OFFENSE_HINTS = ['spread', 'west_coast', 'power_run', 'air_raid', 'balanced'];
const DEFENSE_HINTS = ['3-4', '4-3', 'cover_2', 'cover_3', 'man_press'];

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function eventStamp(game: GameState): number {
  return logicalEventTimestamp(game.year, game.week, game.eventLog.length);
}

function buildEvent(game: GameState, type: string, description: string, data: Record<string, unknown>): GameEvent {
  return {
    id: `${type}-${game.year}-${game.week}-${game.eventLog.length}`,
    type,
    timestamp: eventStamp(game),
    description,
    data: withEventDate(data, game.year, game.week),
  };
}

function roleKey(role: StaffRole): keyof Team['staff'] {
  return ROLE_KEYS[role];
}

function staffDefaults(member: StaffMember, team: Team, year: number, role = member.role): StaffMember {
  return {
    ...member,
    role,
    term: member.term ?? (role === 'HC' ? 4 : 3),
    buyoutPenalty: member.buyoutPenalty ?? (role === 'HC' ? 3 : 2),
    loyalty: member.loyalty ?? 6,
    ambition: member.ambition ?? 5,
    schemeLean: member.schemeLean ?? {
      offense: team.schemeOff ?? 'balanced',
      defense: team.schemeDef ?? '4-3',
    },
    lastHiredYear: member.lastHiredYear ?? year,
  };
}

function coachMirror(member: StaffMember | null): Team['coachingStaff'][keyof Team['coachingStaff']] {
  if (!member) return null;
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
    reputation: clamp(40 + member.level * 8, 30, 95),
    tenure: 1,
  };
}

function rosterStrength(team: Team, positions: Array<Team['roster'][number]['pos']>): number {
  const players = team.roster.filter((player) => positions.includes(player.pos));
  return average(players.map((player) => player.ovr || 60));
}

function ownerFit(team: Team, candidate: StaffMember): number {
  const owner = team.owner.archetypeId;
  if (owner === 'win_now') return candidate.ratings.gameplan ?? 70;
  if (owner === 'patient_builder') return candidate.ratings.development ?? 70;
  return candidate.ratings.motivation ?? 70;
}

function schemeMatch(team: Team, candidate: StaffMember): number {
  const schemeLean = candidate.schemeLean ?? { offense: 'balanced', defense: '4-3' };
  let fit = 0;
  if (schemeLean.offense === team.schemeOff) fit += 8;
  if (schemeLean.defense === team.schemeDef) fit += 8;
  if (candidate.role === 'OC' && candidate.archetype.includes('off')) fit += 4;
  if (candidate.role === 'DC' && (candidate.archetype.includes('def') || candidate.archetype.includes('coverage'))) fit += 4;
  if (candidate.role === 'HC' && (candidate.archetype.includes('balanced') || candidate.archetype.includes('strateg'))) fit += 3;
  return fit;
}

function rosterFit(team: Team, candidate: StaffMember): number {
  if (candidate.role === 'OC') {
    return average([
      rosterStrength(team, ['QB', 'WR', 'TE']),
      rosterStrength(team, ['RB', 'OL']),
    ]);
  }
  if (candidate.role === 'DC') {
    return average([
      rosterStrength(team, ['DL', 'LB']),
      rosterStrength(team, ['CB', 'S']),
    ]);
  }
  return average([
    rosterStrength(team, ['QB', 'WR', 'TE', 'RB', 'OL']),
    rosterStrength(team, ['DL', 'LB', 'CB', 'S']),
  ]);
}

function continuityTag(score: number): StaffCandidate['continuityTag'] {
  if (score >= 84) return 'ideal';
  if (score >= 76) return 'strong';
  if (score >= 67) return 'transition';
  return 'risky';
}

function buildReasoning(team: Team, candidate: StaffMember, fitScore: number): string[] {
  const lines = [
    `${candidate.name} grades ${Math.round(fitScore)}/100 for ${team.city}.`,
    `${candidate.schemeLean?.offense ?? 'balanced'} / ${candidate.schemeLean?.defense ?? '4-3'} lean versus ${team.schemeOff} / ${team.schemeDef}.`,
  ];
  if ((candidate.ratings.gameplan ?? 70) >= 82) lines.push('Game-plan rating gives immediate weekly upside.');
  if ((candidate.ratings.development ?? 70) >= 80) lines.push('Development profile supports long-term continuity.');
  if ((candidate.loyalty ?? 6) >= 8) lines.push('High loyalty lowers retention risk.');
  return lines;
}

function generateCandidate(game: GameState, team: Team, role: StaffRole, index: number): StaffCandidate {
  const rng = mulberry32(hashSeed(`${game.seed}:${game.year}:${game.week}:${team.id}:${role}:${index}`));
  const first = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)] ?? 'Marcus';
  const last = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)] ?? 'Reed';
  const archetypePool = ARCHETYPES_BY_ROLE[role];
  const archetype = archetypePool[Math.floor(rng() * archetypePool.length)] ?? 'balanced';
  const base = 63 + Math.floor(rng() * 24);
  const member: StaffMember = {
    id: `staff-${team.id}-${role.toLowerCase()}-${index}`,
    name: `${first} ${last}`,
    role,
    archetype,
    traits: [],
    ratings: {
      gameplan: clamp(base + Math.floor(rng() * 8), 55, 95),
      development: clamp(base - 3 + Math.floor(rng() * 10), 55, 95),
      motivation: clamp(base - 2 + Math.floor(rng() * 10), 55, 95),
      strategy: clamp(base - 1 + Math.floor(rng() * 10), 55, 95),
    },
    level: 2 + Math.floor(rng() * 6),
    age: 35 + Math.floor(rng() * 22),
    term: role === 'HC' ? 4 : 3,
    buyoutPenalty: role === 'HC' ? 3 : 2,
    loyalty: 3 + Math.floor(rng() * 7),
    ambition: 3 + Math.floor(rng() * 7),
    schemeLean: {
      offense: OFFENSE_HINTS[Math.floor(rng() * OFFENSE_HINTS.length)] ?? 'balanced',
      defense: DEFENSE_HINTS[Math.floor(rng() * DEFENSE_HINTS.length)] ?? '4-3',
    },
    lastHiredYear: game.year,
  };
  const fitScore = scoreStaffFit(team, member);
  return {
    ...member,
    desiredRole: role,
    fitScore,
    continuityTag: continuityTag(fitScore),
    reasoning: buildReasoning(team, member, fitScore),
  };
}

export function scoreStaffFit(team: Team, candidate: StaffMember): number {
  const cappedOwnerFit = ownerFit(team, candidate) * 0.35;
  const cappedRosterFit = rosterFit(team, candidate) * 0.2;
  const ratingsFit = average([
    candidate.ratings.gameplan ?? 70,
    candidate.ratings.development ?? 70,
    candidate.ratings.motivation ?? 70,
    candidate.ratings.strategy ?? 70,
  ]) * 0.3;
  const continuity = schemeMatch(team, candidate) + ((candidate.loyalty ?? 6) - (candidate.ambition ?? 5)) * 1.5;
  return clamp(Math.round(cappedOwnerFit + cappedRosterFit + ratingsFit + continuity), 1, 99);
}

function buildRoleBoard(game: GameState, team: Team, role: StaffRole): StaffCandidate[] {
  return Array.from({ length: 5 }, (_, index) => generateCandidate(game, team, role, index))
    .sort((left, right) => right.fitScore - left.fitScore || left.name.localeCompare(right.name));
}

function refreshMarket(game: GameState, teamId: string): CoachingMarketState {
  return buildCoachingMarket(game, teamId);
}

export function buildCoachingMarket(game: GameState, teamId: string): CoachingMarketState {
  const team = game.teams[teamId];
  if (!team) {
    throw new Error(`Cannot build coaching market for missing team ${teamId}.`);
  }

  const market: CoachingMarketState = {
    teamId,
    updatedYear: game.year,
    updatedWeek: game.week,
    hotSeat: (team.owner.approval ?? team.ownerMood ?? 50) <= 30 && (team.ownerPatience80 ?? 50) <= 25,
    candidates: {
      HC: buildRoleBoard(game, team, 'HC'),
      OC: buildRoleBoard(game, team, 'OC'),
      DC: buildRoleBoard(game, team, 'DC'),
    },
  };
  return market;
}

function writeStaff(team: Team, staff: StaffMember | null, role: StaffRole): void {
  const key = roleKey(role);
  team.staff[key] = staff;
  team.coachingStaff[key] = coachMirror(staff);
}

function hireDescription(team: Team, candidate: StaffCandidate, role: StaffRole): string {
  return `${team.city} hires ${candidate.name} as ${role}.`;
}

export function hireStaffCandidate(game: GameState, teamId: string, candidate: StaffCandidate, role: StaffRole): StaffMember {
  const team = game.teams[teamId];
  if (!team) {
    throw new Error(`Cannot hire staff for missing team ${teamId}.`);
  }
  const member = staffDefaults({ ...candidate, role }, team, game.year, role);
  writeStaff(team, member, role);
  const event = buildEvent(game, 'coach_hired', hireDescription(team, candidate, role), {
    teamId,
    coachId: member.id,
    role,
  });
  game.eventLog.push(event);
  recordNewsItem(game, {
    id: `coach-hired-${teamId}-${role}-${member.id}`,
    year: game.year,
    week: game.week,
    type: 'coaching',
    headline: event.description,
    body: `${member.name} arrives with a ${member.archetype.replaceAll('_', ' ')} profile and fit score ${scoreStaffFit(team, member)}.`,
    teamIds: [teamId],
    playerIds: [],
    importance: 'major',
  });
  refreshMarket(game, teamId);
  return member;
}

export function fireStaffMember(game: GameState, teamId: string, role: StaffRole): void {
  const team = game.teams[teamId];
  if (!team) {
    throw new Error(`Cannot fire staff for missing team ${teamId}.`);
  }
  const key = roleKey(role);
  const current = team.staff[key];
  writeStaff(team, null, role);
  team.owner.approval = clamp((team.owner.approval ?? team.ownerMood ?? 50) - 3, 0, 100);
  team.ownerMood = clamp((team.ownerMood ?? team.owner.approval ?? 50) - 3, 0, 100);

  const event = buildEvent(game, 'coach_fired', `${team.city} parts with ${current?.name ?? `${role} coach`}.`, {
    teamId,
    coachId: current?.id ?? null,
    role,
  });
  game.eventLog.push(event);
  recordNewsItem(game, {
    id: `coach-fired-${teamId}-${role}-${game.week}`,
    year: game.year,
    week: game.week,
    type: 'coaching',
    headline: event.description,
    body: 'The move resets continuity and turns up the pressure to find a better fit.',
    teamIds: [teamId],
    playerIds: [],
    importance: 'major',
  });
  refreshMarket(game, teamId);
}

export function promoteCoordinator(game: GameState, teamId: string, fromRole: 'OC' | 'DC'): StaffMember {
  const team = game.teams[teamId];
  if (!team) {
    throw new Error(`Cannot promote coordinator for missing team ${teamId}.`);
  }
  const fromKey = roleKey(fromRole);
  const current = team.staff[fromKey];
  if (!current) {
    throw new Error(`Cannot promote missing ${fromRole} for ${teamId}.`);
  }

  const promoted = staffDefaults({
    ...current,
    role: 'HC',
    term: 4,
    buyoutPenalty: 3,
    lastHiredYear: game.year,
  }, team, game.year, 'HC');

  writeStaff(team, promoted, 'HC');
  writeStaff(team, null, fromRole);
  const event = buildEvent(game, 'coach_promoted', `${team.city} promotes ${current.name} from ${fromRole} to HC.`, {
    teamId,
    coachId: current.id,
    fromRole,
    toRole: 'HC',
  });
  game.eventLog.push(event);
  recordNewsItem(game, {
    id: `coach-promoted-${teamId}-${current.id}`,
    year: game.year,
    week: game.week,
    type: 'coaching',
    headline: event.description,
    body: 'Continuity wins out over a full external search.',
    teamIds: [teamId],
    playerIds: [],
    importance: 'major',
  });
  refreshMarket(game, teamId);
  return promoted;
}
