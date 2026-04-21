import type { GameState } from '@mfd/engine';

export interface RosterContinuity {
  retained: number;
  newlyStarting: number;
  departed: number;
  total: number;
  retentionPct: number;
}

export function computeRosterContinuity(
  game: GameState,
  lastSeasonStarters: string[],
): RosterContinuity {
  const userTeam = Object.values(game.teams).find((team) => team.isUser) ?? null;
  const currentStarterIds = userTeam?.roster.filter((player) => player.isStarter).map((player) => player.id) ?? [];
  const previousStarterIds = Array.from(new Set(lastSeasonStarters));
  const previousStarterSet = new Set(previousStarterIds);
  const currentStarterSet = new Set(currentStarterIds);

  let retained = 0;
  for (const starterId of currentStarterIds) {
    if (previousStarterSet.has(starterId)) retained += 1;
  }

  let departed = 0;
  for (const starterId of previousStarterIds) {
    if (!currentStarterSet.has(starterId)) departed += 1;
  }

  const total = currentStarterIds.length;
  return {
    retained,
    newlyStarting: Math.max(0, total - retained),
    departed,
    total,
    retentionPct: total === 0 ? 0 : Math.round((retained / total) * 100),
  };
}
