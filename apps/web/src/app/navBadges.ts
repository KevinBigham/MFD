export interface NavBadgeInput {
  tradeOfferCount: number;
  starterCount: number;
  hasGamePlan: boolean;
  phase: string;
  activeHandshakeCount: number;
}

export function computeNavBadges(input: NavBadgeInput): Record<string, number> {
  const badges: Record<string, number> = {};

  if (input.tradeOfferCount > 0) {
    badges['/trades'] = input.tradeOfferCount;
  }

  if (input.starterCount < 22) {
    badges['/depth-chart'] = 22 - input.starterCount;
  }

  if ((input.phase === 'regular_season' || input.phase === 'playoffs') && !input.hasGamePlan) {
    badges['/game-plan'] = 1;
  }

  if (input.activeHandshakeCount > 0) {
    badges['/handshakes'] = input.activeHandshakeCount;
  }

  return badges;
}
