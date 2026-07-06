export const DEPTH_CHART_FIELD_STARTER_TARGET = 22;

export interface DepthChartStarterReadout {
  marked: number;
  target: number;
  missing: number;
  complete: boolean;
}

export function countDepthChartStarterFlags(roster: readonly { isStarter?: boolean }[]): number {
  return roster.filter((player) => Boolean(player.isStarter)).length;
}

export function getDepthChartStarterReadout(
  starterCount: number,
  target = DEPTH_CHART_FIELD_STARTER_TARGET,
): DepthChartStarterReadout {
  const marked = Math.max(0, starterCount);
  const expected = Math.max(0, target);
  const missing = Math.max(0, expected - marked);

  return {
    marked,
    target: expected,
    missing,
    complete: missing === 0,
  };
}

