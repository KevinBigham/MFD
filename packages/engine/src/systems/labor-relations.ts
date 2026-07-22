import { RNG, type PrngFn } from '../rng';
import type {
  CBAState,
  GameState,
  LaborEvent,
  LaborState,
  Player,
  WorkStoppage,
  WorkStoppageCheck,
  WorkStoppageResolution,
} from '../types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function unionMood(game: GameState): number {
  return average(Object.values(game.players).map((player) => player.morale ?? 60));
}

function taggedPlayerCount(game: GameState): number {
  return Object.values(game.teams).reduce((count, team) => {
    const tags = team.franchiseTags ?? (team.franchiseTag973 ? [team.franchiseTag973] : []);
    return count + tags.length;
  }, 0);
}

function taggedHoldouts(game: GameState): Player[] {
  return Object.values(game.players).filter((player) => player.holdout);
}

function buildStoppage(type: WorkStoppage['type'], week: number, affectedTeams: string[], moralePenalty: number, severity: WorkStoppage['severity']): WorkStoppage {
  return {
    type,
    severity,
    startWeek: week,
    resolvedWeek: null,
    affectedTeams,
    moralePenalty,
  };
}

export function initLaborState(): LaborState {
  return {
    unionSatisfaction: 65,
    playerRepId: null,
    grievances: [],
    activeStoppage: null,
    laborEvents: [],
  };
}

export function getUnionLeader(game: GameState): Player | null {
  return Object.values(game.players)
    .filter((player) => player.yearsExp >= 5 && player.personality.ambition >= 7)
    .sort((a, b) => b.ovr - a.ovr || b.yearsExp - a.yearsExp || a.id.localeCompare(b.id))[0] ?? null;
}

export function updateUnionSatisfaction(labor: LaborState, game: GameState): LaborState {
  const moraleScore = unionMood(game);
  const tagPressure = taggedPlayerCount(game) * 6;
  const holdoutPressure = taggedHoldouts(game).length * 8;
  const cba = game.cbaState?.currentDeal;
  const fairnessPenalty = cba
    ? Math.max(0, (0.5 - cba.terms.revenueSplit) * 100) + Math.max(0, (0.9 - cba.terms.capFloorPct) * 100)
    : 0;
  const grievancePressure = labor.grievances.filter((entry) => entry.resolved === null).length * 3;
  const nextSatisfaction = clamp(Math.round(moraleScore - tagPressure - holdoutPressure - fairnessPenalty - grievancePressure), 0, 100);
  const unionLeader = getUnionLeader(game);

  return {
    ...labor,
    unionSatisfaction: nextSatisfaction,
    playerRepId: unionLeader?.id ?? labor.playerRepId,
  };
}

export function checkWorkStoppage(labor: LaborState, cba: CBAState): WorkStoppageCheck {
  if (cba.status === 'lockout') {
    const stoppage = labor.activeStoppage?.type === 'lockout'
      ? labor.activeStoppage
      : buildStoppage('lockout', 1, [], -10, 3);
    return {
      triggered: true,
      stoppage,
      playerOvrPenalty: 0,
      summary: 'The unresolved CBA has triggered a lockout.',
    };
  }
  if (labor.activeStoppage) {
    return {
      triggered: true,
      stoppage: labor.activeStoppage,
      playerOvrPenalty: labor.activeStoppage.type === 'practice_boycott' ? -2 : 0,
      summary: 'Labor unrest is still active.',
    };
  }
  if (labor.unionSatisfaction < 25) {
    return {
      triggered: true,
      stoppage: buildStoppage('practice_boycott', 1, [], -8, 2),
      playerOvrPenalty: -2,
      summary: 'Players are boycotting practice and preparation is suffering.',
    };
  }
  if (labor.unionSatisfaction < 40) {
    return {
      triggered: true,
      stoppage: buildStoppage('holdout_wave', 1, [], -5, 1),
      playerOvrPenalty: 0,
      summary: 'A league-wide holdout wave is brewing around tag frustration.',
    };
  }
  return {
    triggered: false,
    stoppage: null,
    playerOvrPenalty: 0,
    summary: 'Labor conditions are stable.',
  };
}

export function resolveWorkStoppage(labor: LaborState, game: GameState): WorkStoppageResolution {
  if (!labor.activeStoppage) {
    return {
      labor,
      resolved: false,
      summary: 'No active stoppage to resolve.',
    };
  }

  if (labor.activeStoppage.type === 'holdout_wave') {
    for (const player of Object.values(game.players)) {
      if (player.holdout) {
        player.holdout = false;
        player.morale = clamp((player.morale ?? 60) + 4, 0, 100);
      }
    }
  }

  const resolvedEvent: LaborEvent = {
    type: 'mediation_call',
    description: 'League mediators and union leaders reached a temporary peace.',
    impact: { satisfaction: 8, morale: 3 },
  };
  const nextEvents = [...labor.laborEvents, resolvedEvent];

  return {
    labor: {
      ...labor,
      unionSatisfaction: clamp(labor.unionSatisfaction + 8, 0, 100),
      activeStoppage: null,
      laborEvents: nextEvents.slice(-20),
    },
    resolved: true,
    summary: 'The latest labor stoppage has been resolved.',
  };
}

export function generateLaborEvent(labor: LaborState, game: GameState, eventRng: PrngFn = RNG.event): LaborEvent | null {
  const tenseWindow = ['expiring', 'expired', 'negotiating', 'awaiting_owner_vote', 'lockout'].includes(game.cbaState?.status ?? 'active')
    || labor.unionSatisfaction <= 35;
  if (!tenseWindow) return null;

  const eventPool: LaborEvent[] = [
    {
      type: 'union_statement',
      description: 'The players association issued a statement demanding a fairer share of league growth.',
      impact: { satisfaction: 2 },
    },
    {
      type: 'owner_response',
      description: 'Owners publicly defended the current economic framework and warned against rushed concessions.',
      impact: { satisfaction: -2, morale: -1 },
    },
    {
      type: 'media_leak',
      description: 'A leak from the negotiating room pushed the next bargaining session into the spotlight.',
      impact: { satisfaction: -1 },
    },
    {
      type: 'mediation_call',
      description: 'Federal mediators encouraged both sides to return to the table before the rhetoric hardens.',
      impact: { satisfaction: 3 },
    },
  ];

  if (labor.unionSatisfaction <= 35) {
    return eventPool[(game.year + game.week + labor.laborEvents.length) % eventPool.length] ?? eventPool[0]!;
  }
  if (eventRng() > 0.2) return null;
  return eventPool[Math.floor(eventRng() * eventPool.length)] ?? eventPool[0]!;
}
