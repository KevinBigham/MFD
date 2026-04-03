import { applyFacilityBonuses } from './facilities';
import type {
  FatigueState,
  GameState,
  Player,
  TeamGameStats,
  TrainingFocus,
} from '../types';

const STARTER_FATIGUE: Record<Player['pos'], [number, number]> = {
  QB: [8, 11],
  RB: [12, 15],
  WR: [12, 15],
  TE: [9, 12],
  OL: [5, 8],
  DL: [9, 12],
  LB: [9, 12],
  CB: [12, 15],
  S: [10, 13],
  K: [5, 6],
  P: [5, 6],
};

function averageRange([min, max]: [number, number]): number {
  return (min + max) / 2;
}

function ensureFatigueState(game: GameState, teamId: string, playerId: string): FatigueState {
  const team = game.teams[teamId]!;
  return team.fatigueState[playerId] ?? (team.fatigueState[playerId] = {
    playerId,
    fatigue: 0,
    weeklySnaps: [],
    seasonSnaps: 0,
    restWeeks: 0,
    conditioningBonus: 0,
  });
}

export function calculateGameFatigue(player: Player, isStarter: boolean, workloadMultiplier: number): number {
  const base = averageRange(STARTER_FATIGUE[player.pos]);
  const starterAdjusted = isStarter ? base : base * 0.4;
  const weighted = starterAdjusted * Math.max(0.2, workloadMultiplier);
  return Math.round(weighted * 10) / 10;
}

export function applyWeeklyRecovery(
  state: Pick<FatigueState, 'fatigue' | 'conditioningBonus' | 'restWeeks'>,
  trainingFocus: TrainingFocus | null,
  age: number,
  recoveryBonus: number,
): Pick<FatigueState, 'fatigue' | 'conditioningBonus' | 'restWeeks'> {
  const agePenalty = age >= 30 ? 2 : 0;
  let recovery = 10 + (trainingFocus === 'rest' ? 8 : 0) + (trainingFocus === 'conditioning' ? 5 : 0) - agePenalty;
  recovery *= recoveryBonus;

  return {
    fatigue: Math.max(0, Number((state.fatigue - recovery).toFixed(2))),
    conditioningBonus: trainingFocus === 'conditioning'
      ? Number(Math.min(0.25, state.conditioningBonus + 0.05).toFixed(2))
      : state.conditioningBonus,
    restWeeks: trainingFocus === 'rest' ? state.restWeeks + 1 : 0,
  };
}

export function getFatigueModifier(fatigue: number): number {
  if (fatigue >= 80) return -5;
  if (fatigue >= 60) return -3;
  if (fatigue >= 40) return -1;
  return 0;
}

export function getInjuryRiskMultiplier(fatigue: number): number {
  return fatigue >= 80 ? 1.5 : 1;
}

function estimateWorkload(player: Player, teamStats: TeamGameStats | null): number {
  if (!teamStats) return player.isStarter ? 1 : 0;
  const line = teamStats.playerLines.find((entry) => entry.playerId === player.id);
  if (!line) return player.isStarter ? 0.65 : 0.15;

  const touches =
    (line.passAtt ?? 0) +
    (line.rushAtt ?? 0) +
    (line.targets ?? 0) +
    (line.tackles ?? 0) / 3 +
    (line.sacks ?? 0) * 2 +
    (line.fgAtt ?? 0) * 2;
  return Math.max(player.isStarter ? 0.7 : 0.25, Math.min(1.4, touches / 10 || (player.isStarter ? 0.9 : 0.3)));
}

export function processWeeklyFatigue(
  game: GameState,
  teamId: string,
  teamStats: TeamGameStats | null,
): void {
  const team = game.teams[teamId];
  if (!team) return;
  const facilityBonuses = applyFacilityBonuses(team);

  for (const player of team.roster) {
    const state = ensureFatigueState(game, teamId, player.id);
    const workload = estimateWorkload(player, teamStats);
    const fatigueGain = calculateGameFatigue(player, player.isStarter, workload) * facilityBonuses.fatigueGainBonus * (1 - state.conditioningBonus);

    state.fatigue = Math.min(100, Number((state.fatigue + fatigueGain).toFixed(2)));
    state.weeklySnaps = [...state.weeklySnaps.slice(-4), Math.round(workload * 50)];
    state.seasonSnaps += Math.round(workload * 50);

    const focus = team.trainingAssignments[player.id]?.focus ?? null;
    const recovered = applyWeeklyRecovery(state, focus, player.age, facilityBonuses.recoveryBonus);
    state.fatigue = recovered.fatigue;
    state.conditioningBonus = recovered.conditioningBonus;
    state.restWeeks = recovered.restWeeks;
  }
}

export function getWorkloadReport(game: GameState, teamId: string): Array<{
  playerId: string;
  fatigue: number;
  status: 'fresh' | 'fatigued' | 'exhausted';
}> {
  const team = game.teams[teamId];
  if (!team) return [];

  return team.roster
    .map((player) => {
      const fatigue = team.fatigueState[player.id]?.fatigue ?? 0;
      return {
        playerId: player.id,
        fatigue,
        status: fatigue >= 80 ? 'exhausted' : fatigue >= 60 ? 'fatigued' : 'fresh',
      } as const;
    })
    .sort((a, b) => b.fatigue - a.fatigue || a.playerId.localeCompare(b.playerId));
}

export function buildFatiguePlayerBonuses(game: GameState, teamId: string): Record<string, number> {
  const team = game.teams[teamId];
  if (!team) return {};

  return Object.fromEntries(team.roster
    .map((player) => [player.id, getFatigueModifier(team.fatigueState[player.id]?.fatigue ?? 0)])
    .filter(([, modifier]) => modifier !== 0));
}
