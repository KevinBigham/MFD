import { getDepthChartStarterReadout } from '../lib/depth-chart-starters';
import { hubForLegacyPath } from '../ui/routes/route-surface-map';
import type { HubId } from '../ui/routes/route-surface-types';

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

/**
 * Roll route badges up to their hubs for the new navigation.
 *
 * The hub for each route comes from the WP-04 surface map, so there is never a
 * second hardcoded list of which screens live where. A badge on a path the map
 * does not know is dropped rather than silently attributed to a hub — an
 * unattributed count on a nav tab is worse than no count.
 */
export function computeHubBadges(badges: Record<string, number>): Partial<Record<HubId, number>> {
  const hubBadges: Partial<Record<HubId, number>> = {};

  for (const [path, count] of Object.entries(badges)) {
    const hub = hubForLegacyPath(path);
    if (!hub || count <= 0) continue;
    hubBadges[hub] = (hubBadges[hub] ?? 0) + count;
  }

  return hubBadges;
}
