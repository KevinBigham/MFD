import { getDepthChartStarterReadout } from '../lib/depth-chart-starters';

export interface NavBadgeInput {
  tradeOfferCount: number;
  starterCount: number;
  hasGamePlan: boolean;
  phase: string;
  activeHandshakeCount: number;
}

export function computeNavBadges(input: NavBadgeInput): Record<string, number> {
  const badges: Record<string, number> = {};
  const starterReadout = getDepthChartStarterReadout(input.starterCount);

  if (input.tradeOfferCount > 0) {
    badges['/trades'] = input.tradeOfferCount;
  }

  if (!starterReadout.complete) {
    badges['/depth-chart'] = starterReadout.missing;
  }

  if ((input.phase === 'regular_season' || input.phase === 'playoffs') && !input.hasGamePlan) {
    badges['/game-plan'] = 1;
  }

  if (input.activeHandshakeCount > 0) {
    badges['/handshakes'] = input.activeHandshakeCount;
  }

  return badges;
}
