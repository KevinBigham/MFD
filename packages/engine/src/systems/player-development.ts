import { applyFacilityBonuses } from './facilities';
import type { GameState, Player, Team, TrainingAssignment, TrainingFocus } from '../types';

const TRAINING_BASE: Record<TrainingFocus, number> = {
  film_study: 3,
  position_drills: 4,
  conditioning: 3,
  mentorship: 3,
  rest: 2,
};

const DEV_TRAIT_MULTIPLIER: Record<Player['devTrait'], number> = {
  normal: 1,
  star: 1.1,
  superstar: 1.2,
  'x-factor': 1.4,
};

export function emptyFocusXp(): Record<TrainingFocus, number> {
  return {
    film_study: 0,
    position_drills: 0,
    conditioning: 0,
    mentorship: 0,
    rest: 0,
  };
}

function coachRating(team: Team): number {
  return team.staff.hc?.ratings?.development ?? 70;
}

function primaryRatingsForPosition(player: Player): string[] {
  switch (player.pos) {
    case 'QB':
      return ['throwPower', 'throwAccuracy', 'decisionSpeed'];
    case 'RB':
      return ['elusiveness', 'ballCarrierVision', 'breakTackle'];
    case 'WR':
      return ['routeRunning', 'catching', 'release'];
    case 'TE':
      return ['catching', 'routeRunning', 'blocking'];
    case 'OL':
      return ['passBlock', 'runBlock', 'strength'];
    case 'DL':
      return ['blockShed', 'passRush', 'powerMoves'];
    case 'LB':
      return ['playRecognition', 'tackle', 'blockShed'];
    case 'CB':
      return ['manCoverage', 'zoneCoverage', 'press'];
    case 'S':
      return ['zoneCoverage', 'playRecognition', 'tackle'];
    case 'K':
      return ['kickPower', 'kickAccuracy'];
    case 'P':
      return ['kickPower', 'kickAccuracy'];
    default:
      return ['awareness'];
  }
}

function ensureAssignment(team: Team, playerId: string, focus: TrainingFocus): TrainingAssignment {
  const existing = team.trainingAssignments[playerId];
  if (existing) {
    existing.focus = focus;
    return existing;
  }

  const created: TrainingAssignment = {
    playerId,
    focus,
    weeksAssigned: 0,
    xpGained: 0,
    focusXp: emptyFocusXp(),
  };
  team.trainingAssignments[playerId] = created;
  return created;
}

function autoFocus(game: GameState, team: Team, player: Player): TrainingFocus {
  if (player.morale <= 45 || player.injury) return 'rest';
  if (team.mentoringPairs.some((pair) => pair.menteeId === player.id)) return 'mentorship';
  if (player.age <= 24 || player.devTrait !== 'normal') return 'position_drills';
  if (player.age >= 29 && player.pos === 'QB') return 'film_study';
  if ((player.pos === 'RB' || player.pos === 'WR' || player.pos === 'CB') && player.age >= 27) return 'conditioning';
  return 'film_study';
}

export function calculateTrainingXP(
  player: Player,
  focus: TrainingFocus,
  coachDevelopment: number,
  devTrait: Player['devTrait'],
): { totalXp: number; projectedRatings: string[] } {
  const baseXp = TRAINING_BASE[focus];
  const coachBonus = Math.max(0, (coachDevelopment - 60) * 0.05);
  const totalXp = Number((baseXp * (DEV_TRAIT_MULTIPLIER[devTrait] ?? 1) + coachBonus).toFixed(2));

  const projectedRatings = focus === 'film_study'
    ? ['awareness', 'decision']
    : focus === 'position_drills'
      ? [player.pos === 'QB' ? 'accuracy' : player.pos === 'RB' ? 'elusiveness' : player.pos === 'WR' ? 'routeRunning' : 'technique']
      : focus === 'conditioning'
        ? ['speed', 'stamina']
        : focus === 'mentorship'
          ? ['awareness', 'leadership']
          : ['morale', 'durability'];

  return { totalXp, projectedRatings };
}

export function assignTraining(game: GameState, teamId: string, playerId: string, focus: TrainingFocus): TrainingAssignment | null {
  const team = game.teams[teamId];
  if (!team) return null;
  return ensureAssignment(team, playerId, focus);
}

export function processWeeklyTraining(game: GameState, teamId: string, rand: () => number = () => 0.5): void {
  const team = game.teams[teamId];
  if (!team) return;
  if (!team.trainingAssignments) team.trainingAssignments = {};

  const roster = team.roster.filter((player) => !player.injury || player.injury.gamesOut <= 1);
  if (!team.isUser) {
    for (const player of roster) {
      ensureAssignment(team, player.id, autoFocus(game, team, player));
    }
  }

  const devRating = coachRating(team);
  const facilityBonuses = applyFacilityBonuses(team);
  for (const assignment of Object.values(team.trainingAssignments)) {
    const player = game.players[assignment.playerId];
    if (!player || player.teamId !== teamId) continue;

    const xp = calculateTrainingXP(player, assignment.focus, devRating, player.devTrait);
    const variance = Number((rand() * 1.5).toFixed(2));
    const totalXp = Number(((xp.totalXp + variance) * facilityBonuses.trainingXPBonus).toFixed(2));
    assignment.weeksAssigned += 1;
    assignment.xpGained = Number((assignment.xpGained + totalXp).toFixed(2));
    assignment.focusXp[assignment.focus] = Number((assignment.focusXp[assignment.focus] + totalXp).toFixed(2));

    if (assignment.focus === 'rest') {
      player.morale = Math.min(99, Math.round(player.morale + 3 * facilityBonuses.moraleBonus));
    }
  }
}

export function getTrainingProgress(game: GameState, teamId: string, playerId: string): {
  focus: TrainingFocus | null;
  weeksAssigned: number;
  totalXp: number;
  projectedRatingChanges: string[];
} {
  const team = game.teams[teamId];
  const player = game.players[playerId];
  const assignment = team?.trainingAssignments[playerId];
  if (!team || !player || !assignment) {
    return {
      focus: null,
      weeksAssigned: 0,
      totalXp: 0,
      projectedRatingChanges: [],
    };
  }

  return {
    focus: assignment.focus,
    weeksAssigned: assignment.weeksAssigned,
    totalXp: assignment.xpGained,
    projectedRatingChanges: calculateTrainingXP(player, assignment.focus, coachRating(team), player.devTrait).projectedRatings,
  };
}

export function clearTrainingAssignments(game: GameState): void {
  for (const team of Object.values(game.teams)) {
    team.trainingAssignments = {};
  }
}

export function buildTrainingProgressionBonuses(game: GameState): Map<string, { overall: number; ratings: Record<string, number> }> {
  const bonuses = new Map<string, { overall: number; ratings: Record<string, number> }>();

  for (const team of Object.values(game.teams)) {
    for (const assignment of Object.values(team.trainingAssignments ?? {})) {
      const player = game.players[assignment.playerId];
      if (!player) continue;

      const ratings: Record<string, number> = {};
      const filmXp = assignment.focusXp.film_study ?? 0;
      const drillsXp = assignment.focusXp.position_drills ?? 0;
      const conditioningXp = assignment.focusXp.conditioning ?? 0;
      const mentorshipXp = assignment.focusXp.mentorship ?? 0;
      const restXp = assignment.focusXp.rest ?? 0;

      if (filmXp > 0) {
        for (const key of ['awareness', 'playRecognition', 'fieldVision', 'decisionSpeed', 'assignmentIQ']) {
          ratings[key] = Number(Math.min(2.5, filmXp / 22).toFixed(2));
        }
      }

      if (drillsXp > 0) {
        for (const key of primaryRatingsForPosition(player)) {
          ratings[key] = Number(((ratings[key] ?? 0) + Math.min(3, drillsXp / 18)).toFixed(2));
        }
      }

      if (conditioningXp > 0) {
        for (const key of ['speed', 'stamina', 'acceleration', 'agility']) {
          ratings[key] = Number(((ratings[key] ?? 0) + Math.min(2, conditioningXp / 24)).toFixed(2));
        }
      }

      if (mentorshipXp > 0) {
        for (const key of ['awareness', 'leadership']) {
          ratings[key] = Number(((ratings[key] ?? 0) + Math.min(1.5, mentorshipXp / 28)).toFixed(2));
        }
      }

      if (restXp > 0) {
        for (const key of ['stamina', 'durability']) {
          ratings[key] = Number(((ratings[key] ?? 0) + Math.min(1, restXp / 30)).toFixed(2));
        }
      }

      const ageMultiplier = player.age >= 33 ? 0.25 : player.age >= 30 ? 0.5 : 1;
      const overall = Number((Math.min(
        0.9,
        filmXp / 150 +
        drillsXp / 130 +
        conditioningXp / 170 +
        mentorshipXp / 210 +
        restXp / 260,
      ) * ageMultiplier).toFixed(2));

      bonuses.set(player.id, { overall, ratings });
    }
  }

  return bonuses;
}
