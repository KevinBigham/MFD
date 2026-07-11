import type { CoachCareerHistory, GameState, StaffRole, Team } from '../types';
import { readGameEventYear } from './event-log-retention';

interface ActiveCoachNode {
  coachId: string;
  name: string;
  role: StaffRole;
  teamAbbr: string;
  disciples: string[];
}

export interface CoachingLegacy {
  treeDepth: number;
  headCoachesProduced: number;
  coordinatorsPlaced: number;
  retiredWithEpilogue: number;
  notableProteges: Array<{
    coachId: string;
    name: string;
    teamAbbr: string;
    role: StaffRole;
    championships: number;
  }>;
}

const EMPTY_LEGACY: CoachingLegacy = {
  treeDepth: 0,
  headCoachesProduced: 0,
  coordinatorsPlaced: 0,
  retiredWithEpilogue: 0,
  notableProteges: [],
};

const ROLE_KEYS = {
  HC: 'hc',
  OC: 'oc',
  DC: 'dc',
} as const satisfies Record<StaffRole, keyof Team['staff']>;

function collectActiveCoaches(game: GameState): Map<string, ActiveCoachNode> {
  const byId = new Map<string, ActiveCoachNode>();

  for (const team of Object.values(game.teams)) {
    for (const role of ['HC', 'OC', 'DC'] as const) {
      const coach = team.staff[ROLE_KEYS[role]];
      if (!coach || byId.has(coach.id)) continue;
      byId.set(coach.id, {
        coachId: coach.id,
        name: coach.name,
        role,
        teamAbbr: team.abbr,
        disciples: coach.disciples ?? [],
      });
    }
  }

  return byId;
}

function collectRecentRetirementEvents(game: GameState): Set<string> {
  const cutoffYear = game.year - 20;

  return new Set(
    game.eventLog
      .filter((event) => event.type === 'coach_retirement')
      .filter((event) => readGameEventYear(event, game.year) >= cutoffYear)
      .map((event) => {
        const coachId = event.data['coachId'];
        return typeof coachId === 'string' ? coachId : null;
      })
      .filter((coachId): coachId is string => Boolean(coachId)),
  );
}

export function buildCoachingLegacy(game: GameState, rootCoachId: string): CoachingLegacy {
  const activeById = collectActiveCoaches(game);
  const root = activeById.get(rootCoachId);
  if (!root) return EMPTY_LEGACY;

  const historyByCoachId = new Map(game.coachingHistory.map((entry) => [entry.coachId, entry] as const));
  const recentRetirements = collectRecentRetirementEvents(game);
  const visited = new Set<string>([rootCoachId]);
  const queue: Array<{ coachId: string; depth: number }> = [{ coachId: rootCoachId, depth: 0 }];
  const descendants = new Map<string, ActiveCoachNode>();
  const fallbackRetirees = new Map<string, CoachCareerHistory>();
  let treeDepth = 0;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    if (current.depth >= 5) continue;

    const node = activeById.get(current.coachId);
    if (!node) continue;

    for (const discipleId of node.disciples) {
      if (visited.has(discipleId)) continue;
      visited.add(discipleId);

      const activeDisciple = activeById.get(discipleId);
      if (activeDisciple) {
        descendants.set(discipleId, activeDisciple);
        const nextDepth = current.depth + 1;
        treeDepth = Math.max(treeDepth, nextDepth);
        queue.push({ coachId: discipleId, depth: nextDepth });
        continue;
      }

      const retiredHistory = historyByCoachId.get(discipleId);
      if (retiredHistory) {
        fallbackRetirees.set(discipleId, retiredHistory);
      }
    }
  }

  const descendantEntries = [...descendants.values()];
  const headCoachesProduced = descendantEntries.filter((entry) => entry.role === 'HC').length;
  const coordinatorsPlaced = descendantEntries.filter((entry) => entry.role === 'OC' || entry.role === 'DC').length;
  const retiredWithEpilogue = [...fallbackRetirees.values()].filter(
    (history) => history.retired && recentRetirements.has(history.coachId),
  ).length;

  const notableProteges = descendantEntries
    .map((entry) => {
      const history = historyByCoachId.get(entry.coachId);
      return {
        coachId: entry.coachId,
        name: history?.name ?? entry.name,
        teamAbbr: entry.teamAbbr,
        role: entry.role,
        championships: history?.championships ?? 0,
        seasonsCoached: history?.seasonsCoached ?? 0,
      };
    })
    .sort((left, right) => {
      if (right.championships !== left.championships) return right.championships - left.championships;
      if (right.seasonsCoached !== left.seasonsCoached) return right.seasonsCoached - left.seasonsCoached;
      return left.coachId.localeCompare(right.coachId);
    })
    .slice(0, 5)
    .map(({ seasonsCoached: _seasonsCoached, ...entry }) => entry);

  return {
    treeDepth,
    headCoachesProduced,
    coordinatorsPlaced,
    retiredWithEpilogue,
    notableProteges,
  };
}
