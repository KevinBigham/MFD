// @ts-nocheck - test-only file, vitest provides node APIs.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { ROUTE_BEAT_REGISTRY, ROUTE_KEYS } from './routeBeatRegistry';

// Maps each route key to the post-setup screen file that should contain its
// data-spotlight-target anchors. Keep this in lockstep with the post-setup
// route table in apps/web/src/app/App.tsx — see resolveRouteKey in
// useActiveRouteBeats.ts for the routing source of truth.
const ROUTE_SCREEN_FILES: Record<(typeof ROUTE_KEYS)[number], string> = {
  roster: 'apps/web/src/features/roster/RosterManagement.tsx',
  staff: 'apps/web/src/features/coaching/CoachingStaff.tsx',
  'cap-laboratory': 'apps/web/src/features/contracts/CapLaboratory.tsx',
  'draft-board': 'apps/web/src/features/draft/DraftBoard.tsx',
  'trade-center': 'apps/web/src/features/trades/TradeCenter.tsx',
  'scouting-board': 'apps/web/src/features/scouting/ScoutingBoard.tsx',
};

function readScreen(relativePath: string): string {
  const url = new URL(`../../../../../${relativePath}`, import.meta.url);
  return readFileSync(url, 'utf-8');
}

describe('route coaching spotlight anchors', () => {
  it('every route key has a matching screen file', () => {
    for (const routeKey of ROUTE_KEYS) {
      expect(ROUTE_SCREEN_FILES[routeKey]).toBeDefined();
    }
  });

  it.each(ROUTE_KEYS)(
    '%s screen contains data-spotlight-target for every beat in the registry',
    (routeKey) => {
      const beats = ROUTE_BEAT_REGISTRY[routeKey];
      const source = readScreen(ROUTE_SCREEN_FILES[routeKey]);

      for (const beat of beats) {
        if (beat.spotlightTarget === null) continue;
        const anchor = `data-spotlight-target="${beat.spotlightTarget}"`;
        expect(
          source.includes(anchor),
          `${ROUTE_SCREEN_FILES[routeKey]} is missing anchor ${anchor}; route coaching spotlight will resolve null`,
        ).toBe(true);
      }
    },
  );

  it('every spotlight target across the registry resolves to exactly one anchor in source', () => {
    for (const routeKey of ROUTE_KEYS) {
      const beats = ROUTE_BEAT_REGISTRY[routeKey];
      const source = readScreen(ROUTE_SCREEN_FILES[routeKey]);

      for (const beat of beats) {
        if (beat.spotlightTarget === null) continue;
        const anchor = `data-spotlight-target="${beat.spotlightTarget}"`;
        const matches = source.split(anchor).length - 1;
        expect(matches, `expected exactly one anchor for ${beat.spotlightTarget}`).toBe(1);
      }
    }
  });
});
