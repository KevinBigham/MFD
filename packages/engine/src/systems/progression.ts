import { cl } from '../utils';
import { getAgeCurve } from './player-archetypes';
import { getAgingMultiplier } from './trust-aging';
import { recordPlayerRetirement, syncPlayerArchiveEntry } from './history';
import { recordNewsItem } from './league-news';
import { getArchetypeProgressionMultipliers } from './archetype-progression';
import { getPositionCoachBonus } from './position-coaches';
import type { GameEvent, GameState, Player, Position, Team } from '../types';

const DEV_TRAIT_MULTIPLIER: Record<Player['devTrait'], number> = {
  normal: 1,
  star: 1.1,
  superstar: 1.2,
  'x-factor': 1.4,
};

const RETIREMENT_THRESHOLD: Record<Position, number> = {
  QB: 55,
  RB: 58,
  WR: 56,
  TE: 55,
  OL: 54,
  DL: 56,
  LB: 57,
  CB: 58,
  S: 56,
  K: 50,
  P: 50,
};

export interface ProgressionResult {
  retiredPlayerIds: string[];
  events: GameEvent[];
}

interface ProgressionOptions {
  mentoringBonuses?: Map<string, number>;
  trainingBonuses?: Map<string, { overall: number; ratings: Record<string, number> }>;
}

function getCoachMultiplier(team: Team | null): number {
  const development = team?.staff.hc?.ratings?.development ?? 70;
  return cl(0.5 + (development / 100), 0.9, 1.5);
}

function getPerformanceMultiplier(player: Player): number {
  let multiplier = player.isStarter ? 1 : 0.82;

  switch (player.pos) {
    case 'QB': {
      const attempts = Math.max(1, player.stats.passAtt);
      const completionRate = player.stats.passComp / attempts;
      multiplier += cl((completionRate - 0.58) * 1.8, -0.08, 0.2);
      multiplier += cl(player.stats.passYds / 5000, 0, 0.16);
      multiplier += cl(player.stats.passTD / 40, 0, 0.14);
      multiplier -= cl(player.stats.passINT / 24, 0, 0.12);
      break;
    }
    case 'RB': {
      const carries = Math.max(1, player.stats.rushAtt);
      const ypc = player.stats.rushYds / carries;
      multiplier += cl((ypc - 4.1) * 0.12, -0.08, 0.12);
      multiplier += cl(player.stats.rushYds / 1400, 0, 0.16);
      multiplier += cl(player.stats.rushTD / 14, 0, 0.1);
      break;
    }
    case 'WR':
    case 'TE': {
      multiplier += cl(player.stats.recYds / 1400, 0, 0.16);
      multiplier += cl(player.stats.recTD / 12, 0, 0.1);
      multiplier += cl(player.stats.targets / 120, 0, 0.08);
      break;
    }
    case 'DL':
    case 'LB': {
      multiplier += cl(player.stats.sacks / 14, 0, 0.18);
      multiplier += cl(player.stats.tackles / 110, 0, 0.08);
      break;
    }
    case 'CB':
    case 'S': {
      multiplier += cl(player.stats.defINT / 6, 0, 0.18);
      multiplier += cl(player.stats.tackles / 90, 0, 0.08);
      break;
    }
    case 'K':
    case 'P': {
      multiplier += cl(player.stats.fgMade / 30, 0, 0.1);
      break;
    }
    default:
      break;
  }

  return cl(multiplier, 0.72, 1.4);
}

function getBaseAgeDelta(player: Player): number {
  const upcomingAge = player.age + 1;
  const curve = getAgeCurve(player.pos, player.archetype?.archetype ?? null);

  if (upcomingAge < curve.prime[0]) {
    return 1.2 + (curve.prime[0] - upcomingAge) * 0.35;
  }

  if (upcomingAge <= curve.prime[1]) {
    return 0.75;
  }

  if (upcomingAge <= curve.cliff) {
    return -(upcomingAge - curve.prime[1]) * curve.decayRate * 0.12;
  }

  return -1 - (upcomingAge - curve.cliff) * curve.decayRate * 0.22;
}

function getAgingPhase(player: Player): Parameters<typeof getAgingMultiplier>[1] {
  const upcomingAge = player.age + 1;
  const curve = getAgeCurve(player.pos, player.archetype?.archetype ?? null);
  if (upcomingAge < curve.prime[0]) return 'peak';
  if (upcomingAge <= curve.prime[1]) return 'prime';
  if (upcomingAge <= curve.cliff) return 'decline';
  return 'twilight';
}

function applyRatingProgression(player: Player, overallDelta: number, ratingBonuses: Record<string, number> = {}): void {
  const phase = getAgingPhase(player);
  const curve = getAgeCurve(player.pos, player.archetype?.archetype ?? null);
  const upcomingAge = player.age + 1;
  const archetypeMults = getArchetypeProgressionMultipliers(player);

  for (const [ratingName, ratingValue] of Object.entries(player.ratings)) {
    let delta = overallDelta;

    if (overallDelta >= 0) {
      if (upcomingAge > curve.prime[1]) {
        if (['awareness', 'playRecognition', 'fieldVision', 'decisionSpeed', 'leadership', 'assignmentIQ'].includes(ratingName)) {
          delta *= 0.75;
        } else {
          delta *= 0.05;
        }
      } else if (['awareness', 'playRecognition', 'fieldVision', 'decisionSpeed', 'leadership', 'assignmentIQ'].includes(ratingName)) {
        delta *= 0.9;
      } else {
        delta *= 0.8;
      }

      // Archetype progression: key ratings develop faster, off-key slower
      const archetypeMult = archetypeMults.multipliers[ratingName] ?? 1;
      delta *= archetypeMult;
    } else {
      const agingWeight = getAgingMultiplier(ratingName, phase, curve.decayRate);
      if (['awareness', 'playRecognition', 'fieldVision', 'decisionSpeed', 'leadership', 'assignmentIQ'].includes(ratingName)) {
        delta *= 0.35;
      } else {
        delta *= 0.75 + agingWeight * 0.05;
      }
    }

    player.ratings[ratingName] = cl(Math.round(ratingValue + delta + (ratingBonuses[ratingName] ?? 0)), 40, 99);
  }
}

function makeRetirementEvent(game: GameState, player: Player, teamId: string | null): GameEvent {
  return {
    id: `player-retired-${player.id}-${game.year}`,
    type: 'player_retired',
    timestamp: game.year * 1000 + game.eventLog.length,
    description: `${player.name} retires.`,
    data: { playerId: player.id, teamId },
  };
}

function progressSinglePlayer(
  game: GameState,
  player: Player,
  team: Team | null,
  options: ProgressionOptions,
): number {
  const baseAgeDelta = getBaseAgeDelta(player);
  const performanceMultiplier = getPerformanceMultiplier(player);
  const coachMultiplier = getCoachMultiplier(team);
  const devTraitMultiplier = DEV_TRAIT_MULTIPLIER[player.devTrait] ?? 1;
  const mentoringBonus = options.mentoringBonuses?.get(player.id) ?? 0;
  const trainingBonus = options.trainingBonuses?.get(player.id) ?? { overall: 0, ratings: {} };
  const posCoachBonus = getPositionCoachBonus(team?.positionCoaches, player);
  const overallDelta = (
    baseAgeDelta * performanceMultiplier * coachMultiplier * devTraitMultiplier * posCoachBonus.devMultiplier +
    mentoringBonus +
    trainingBonus.overall
  );

  const previousSeasonStart = player.careerStats.seasonStartOvr ?? player.ovr;
  player.careerStats.previousSeasonOvr = previousSeasonStart;

  // Merge position coach rating boosts with training bonuses
  const mergedRatingBonuses = { ...trainingBonus.ratings };
  for (const [k, v] of Object.entries(posCoachBonus.ratingBoosts)) {
    mergedRatingBonuses[k] = (mergedRatingBonuses[k] ?? 0) + v;
  }
  applyRatingProgression(player, overallDelta, mergedRatingBonuses);
  player.ovr = cl(Math.round(player.ovr + overallDelta), 40, 99);
  player.pot = Math.max(player.pot, player.ovr);
  player.careerStats.seasonStartOvr = player.ovr;
  syncPlayerArchiveEntry(game, player, game.year);

  return overallDelta;
}

export function progressPlayers(game: GameState, options: ProgressionOptions = {}): ProgressionResult {
  const retiredPlayerIds: string[] = [];
  const events: GameEvent[] = [];

  for (const team of Object.values(game.teams)) {
    const retirees: Player[] = [];

    for (const player of team.roster) {
      progressSinglePlayer(game, player, team, options);
      if (player.ovr < RETIREMENT_THRESHOLD[player.pos]) {
        retirees.push(player);
      }
    }

    for (const retiree of retirees) {
      team.roster = team.roster.filter((player) => player.id !== retiree.id);
      retiree.teamId = null;
      retiree.contract = null;
      recordPlayerRetirement(game, retiree, game.year);
      game.players[retiree.id] = retiree;
      retiredPlayerIds.push(retiree.id);
      events.push(makeRetirementEvent(game, retiree, team.id));
      recordNewsItem(game, {
        id: `retirement-${retiree.id}-${game.year}`,
        year: game.year,
        week: game.week,
        type: 'milestone',
        headline: `${retiree.name} calls it a career`,
        body: `${retiree.name} steps away after ${retiree.careerStats.seasons ?? 0} seasons in the league.`,
        teamIds: [team.id],
        playerIds: [retiree.id],
        importance: 'major',
      });
    }
  }

  for (const playerId of game.freeAgents) {
    const player = game.players[playerId];
    if (!player) continue;
    progressSinglePlayer(game, player, null, options);
    if (player.ovr < RETIREMENT_THRESHOLD[player.pos]) {
      player.teamId = null;
      player.contract = null;
      recordPlayerRetirement(game, player, game.year);
      game.freeAgents = game.freeAgents.filter((id) => id !== playerId);
      retiredPlayerIds.push(player.id);
      events.push(makeRetirementEvent(game, player, null));
      recordNewsItem(game, {
        id: `retirement-${player.id}-${game.year}`,
        year: game.year,
        week: game.week,
        type: 'milestone',
        headline: `${player.name} calls it a career`,
        body: `${player.name} steps away after ${player.careerStats.seasons ?? 0} seasons in the league.`,
        teamIds: [],
        playerIds: [player.id],
        importance: 'major',
      });
    }
  }

  return { retiredPlayerIds, events };
}
