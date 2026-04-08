import type { GameState, Player, Position, Team } from '../types';
import { getFranchiseLegends } from './franchise-legends';

const DEFAULT_MENTOR_BUDGET = 2.5;
const MENTOR_SALARY = 0.5;
const MAX_AVAILABLE_MENTORS = 5;
const MAX_PLAYERS_PER_MENTOR = 3;
const MIN_MENTOR_RATING = 1;
const MAX_MENTOR_RATING = 5;

export type MentorSpecialty = 'technique' | 'leadership' | 'film_study' | 'conditioning' | 'mental_toughness';

export interface AlumniMentor {
  playerId: string;
  name: string;
  position: Position;
  peakOvr: number;
  mentorRating: number;
  specialty: MentorSpecialty;
  hiredYear: number;
  salary: number;
}

export interface MentorEffect {
  targetPlayerId: string;
  devBonus: number;
  traitChance: number;
  description: string;
}

function findUserTeam(game: GameState): Team | null {
  return Object.values(game.teams).find((team) => team.isUser) ?? null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mentorPositionGroup(position: string): string {
  if (position === 'WR' || position === 'TE') return 'WR/TE';
  if (position === 'OL' || position === 'DL') return 'OL/DL';
  if (position === 'LB' || position === 'CB' || position === 'S') return 'LB/DB';
  if (position === 'K' || position === 'P') return 'K/P';
  return position;
}

function mentorSpecialty(position: Position): MentorSpecialty {
  if (position === 'QB' || position === 'WR' || position === 'TE') return 'technique';
  if (position === 'RB') return 'mental_toughness';
  if (position === 'OL' || position === 'DL') return 'conditioning';
  if (position === 'LB' || position === 'CB' || position === 'S') return 'film_study';
  return 'leadership';
}

function mentorRating(peakOvr: number): number {
  return clamp(Math.ceil((peakOvr - 59) / 10), MIN_MENTOR_RATING, MAX_MENTOR_RATING);
}

function traitChanceForRating(rating: number): number {
  if (rating >= 5) return 0.10;
  if (rating >= 4) return 0.05;
  return 0;
}

function buildMentorDescription(mentor: AlumniMentor, player: Player): string {
  return `${mentor.name} shares ${mentor.specialty.replaceAll('_', ' ')} guidance with ${player.name}.`;
}

export function getAvailableMentors(game: GameState): AlumniMentor[] {
  const userTeam = findUserTeam(game);
  if (!userTeam) return [];

  const activeIds = new Set((game.activeMentors ?? []).map((mentor) => mentor.playerId));

  return getFranchiseLegends(game, userTeam.id, MAX_AVAILABLE_MENTORS * 3)
    .map((legend) => {
      const archiveEntry = game.playerArchive.find((entry) => entry.playerId === legend.playerId);
      if (!archiveEntry || archiveEntry.retirementYear === null || activeIds.has(legend.playerId)) return null;

      return {
        playerId: legend.playerId,
        name: legend.playerName,
        position: legend.pos,
        peakOvr: legend.peakOvr,
        mentorRating: mentorRating(legend.peakOvr),
        specialty: mentorSpecialty(legend.pos),
        hiredYear: game.year,
        salary: MENTOR_SALARY,
      } satisfies AlumniMentor;
    })
    .filter((mentor): mentor is AlumniMentor => Boolean(mentor))
    .sort((left, right) =>
      right.mentorRating - left.mentorRating
      || right.peakOvr - left.peakOvr
      || left.name.localeCompare(right.name))
    .slice(0, MAX_AVAILABLE_MENTORS);
}

export function hireMentor(game: GameState, mentorId: string): GameState {
  const nextState = structuredClone(game);
  const activeMentors = [...(nextState.activeMentors ?? [])];

  nextState.mentorBudget = nextState.mentorBudget ?? DEFAULT_MENTOR_BUDGET;
  if (activeMentors.some((mentor) => mentor.playerId === mentorId)) {
    nextState.activeMentors = activeMentors;
    return nextState;
  }

  const mentor = getAvailableMentors(nextState).find((entry) => entry.playerId === mentorId);
  if (!mentor || nextState.mentorBudget < mentor.salary) {
    nextState.activeMentors = activeMentors;
    return nextState;
  }

  activeMentors.push({ ...mentor, hiredYear: nextState.year });
  nextState.activeMentors = activeMentors;
  nextState.mentorBudget = Number((nextState.mentorBudget - mentor.salary).toFixed(2));

  return nextState;
}

export function calculateMentorEffects(mentors: AlumniMentor[], roster: Player[]): MentorEffect[] {
  const effects: MentorEffect[] = [];
  const assignedPlayers = new Set<string>();

  for (const mentor of mentors) {
    const compatiblePlayers = [...roster]
      .filter((player) => !assignedPlayers.has(player.id))
      .filter((player) => mentorPositionGroup(player.pos) === mentorPositionGroup(mentor.position))
      .sort((left, right) => left.age - right.age || left.ovr - right.ovr || left.id.localeCompare(right.id))
      .slice(0, MAX_PLAYERS_PER_MENTOR);

    for (const player of compatiblePlayers) {
      assignedPlayers.add(player.id);
      effects.push({
        targetPlayerId: player.id,
        devBonus: Number((mentor.mentorRating / 100).toFixed(2)),
        traitChance: traitChanceForRating(mentor.mentorRating),
        description: buildMentorDescription(mentor, player),
      });
    }
  }

  return effects;
}

export function fireMentor(game: GameState, mentorId: string): GameState {
  const nextState = structuredClone(game);
  nextState.activeMentors = (nextState.activeMentors ?? []).filter((mentor) => mentor.playerId !== mentorId);
  return nextState;
}
