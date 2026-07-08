import type {
  CoachDevelopmentDelta,
  CoachRetentionDecision,
  GameEvent,
  GameState,
  PoachingDeparture,
  StaffMember,
  StaffRole,
  Team,
} from '../types';
import { getClinicMods } from './coaching-clinic';
import { getActiveBonus } from './coach-skill-tree';
import { logicalEventTimestamp, withEventDate } from './event-log-retention';
import { recordNewsItem } from './league-news';

const ROLE_KEYS = {
  HC: 'hc',
  OC: 'oc',
  DC: 'dc',
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildEvent(game: GameState, type: string, description: string, data: Record<string, unknown>): GameEvent {
  return {
    id: `${type}-${game.year}-${game.week}-${game.eventLog.length}`,
    type,
    timestamp: logicalEventTimestamp(game.year, game.week, game.eventLog.length),
    description,
    data: withEventDate(data, game.year, game.week),
  };
}

function roleKey(role: StaffRole): keyof Team['staff'] {
  return ROLE_KEYS[role];
}

function getStaff(team: Team, role: StaffRole): StaffMember | null {
  return team.staff[roleKey(role)];
}

function teamSuccess(team: Team): number {
  const wins = team.wins ?? 0;
  const losses = team.losses ?? 0;
  const ties = team.ties ?? 0;
  const games = Math.max(1, wins + losses + ties);
  return (wins + ties * 0.5) / games;
}

function staffName(staff: StaffMember): string {
  return staff.name || `${staff.role} Coach`;
}

export function buildCoachRetentionDecision(game: GameState, teamId: string, role: StaffRole): CoachRetentionDecision {
  const team = game.teams[teamId];
  if (!team) {
    throw new Error(`Cannot build retention decision for missing team ${teamId}.`);
  }
  const staff = getStaff(team, role);
  if (!staff) {
    throw new Error(`Cannot build retention decision for missing ${role} on ${teamId}.`);
  }

  const success = teamSuccess(team);
  const yearsRemaining = staff.term ?? (role === 'HC' ? 4 : 3);
  const poachRisk = clamp(
    Math.round(
      30
      + (staff.ambition ?? 5) * 5
      - (staff.loyalty ?? 6) * 4
      + Math.max(0, 2 - yearsRemaining) * 10
      + (role === 'HC' ? -8 : 6)
      - success * 25,
    ),
    5,
    95,
  );
  const askingTerm = role === 'HC' ? 4 : 3;
  const acceptsExtension = poachRisk < 45 || ((staff.loyalty ?? 6) >= 8 && success >= 0.6);
  const buyoutPenalty = clamp((staff.buyoutPenalty ?? (role === 'HC' ? 3 : 2)) + Math.round((staff.ambition ?? 5) / 4), 1, 6);
  const reasoning = acceptsExtension
    ? `${staffName(staff)} values the current trajectory and would extend at ${askingTerm} years.`
    : `${staffName(staff)} sees upward mobility elsewhere and carries elevated poach risk.`;

  return {
    teamId,
    role,
    staffId: staff.id,
    poachRisk,
    acceptsExtension,
    askingTerm,
    buyoutPenalty,
    reasoning,
  };
}

export function advanceCoachDevelopment(game: GameState, teamId: string): CoachDevelopmentDelta {
  const team = game.teams[teamId];
  if (!team) {
    throw new Error(`Cannot advance coach development for missing team ${teamId}.`);
  }
  const staff = team.staff.hc ?? team.staff.oc ?? team.staff.dc;
  if (!staff) {
    throw new Error(`Cannot advance coach development for team ${teamId} without staff.`);
  }

  const role = staff.role;
  const clinicMods = getClinicMods(team.clinic);
  const skillBonus = getActiveBonus(team.skillSelections, staff.id, staff.level, staff.archetype);
  const xpGain = clamp(
    Math.round(
      8
      + team.wins * 1.5
      - team.losses * 0.5
      + (clinicMods.devBoost * 10)
      + ((skillBonus.devBoost ?? 0) * 2),
    ),
    4,
    40,
  );
  const oldLevel = staff.level;
  const levelUps = Math.floor(xpGain / 20);
  staff.level = clamp(staff.level + levelUps, oldLevel, 12);

  const gameplanGrowth = clamp(Math.floor(xpGain / 12), 0, 3);
  const developmentGrowth = clamp(Math.floor(xpGain / 16), 0, 2);
  const motivationGrowth = clamp(Math.floor((xpGain + (clinicMods.credBonus * 2)) / 20), 0, 2);
  const strategyGrowth = clamp(Math.floor((xpGain + (skillBonus.counterBoost ?? 0)) / 18), 0, 2);
  staff.ratings.gameplan = clamp((staff.ratings.gameplan ?? 70) + gameplanGrowth, 50, 99);
  staff.ratings.development = clamp((staff.ratings.development ?? 70) + developmentGrowth, 50, 99);
  staff.ratings.motivation = clamp((staff.ratings.motivation ?? 70) + motivationGrowth, 50, 99);
  staff.ratings.strategy = clamp((staff.ratings.strategy ?? 70) + strategyGrowth, 50, 99);

  return {
    teamId,
    role,
    staffId: staff.id,
    xpGain,
    levelUps,
    ratingGrowth: {
      gameplan: gameplanGrowth,
      development: developmentGrowth,
      motivation: motivationGrowth,
      strategy: strategyGrowth,
    },
    summary: `${staffName(staff)} banked ${xpGain} XP and sharpened weekly coaching tools.`,
  };
}

function removeStaff(team: Team, role: StaffRole): void {
  const key = roleKey(role);
  team.staff[key] = null;
  team.coachingStaff[key] = null;
}

export function resolvePoachingCycle(game: GameState, rand: () => number): PoachingDeparture[] {
  const departures: PoachingDeparture[] = [];

  for (const team of Object.values(game.teams)) {
    for (const role of ['OC', 'DC'] as const) {
      const staff = getStaff(team, role);
      if (!staff) continue;
      const decision = buildCoachRetentionDecision(game, team.id, role);
      if (rand() >= decision.poachRisk / 100) continue;

      removeStaff(team, role);
      const departure: PoachingDeparture = {
        teamId: team.id,
        role,
        staffId: staff.id,
        staffName: staff.name,
        poachRisk: decision.poachRisk,
        reason: decision.reasoning,
      };
      departures.push(departure);

      const event = buildEvent(game, 'coach_departed', `${team.city} loses ${staff.name} after outside interest escalates.`, {
        teamId: team.id,
        coachId: staff.id,
        role,
      });
      game.eventLog.push(event);
      recordNewsItem(game, {
        id: `coach-departed-${team.id}-${staff.id}`,
        year: game.year,
        week: game.week,
        type: 'coaching',
        headline: event.description,
        body: decision.reasoning,
        teamIds: [team.id],
        playerIds: [],
        importance: 'major',
      });
    }
  }

  return departures;
}
