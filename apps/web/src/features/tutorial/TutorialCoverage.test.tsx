import { describe, expect, it } from 'vitest';
import { createDefaultTutorialState } from '@mfd/engine';
import { APP_ROUTE_REGISTRY } from '@mfd/engine/config';

const TUTORIAL_ROUTE_ALLOWLIST = new Set([
  '/locker-room',
  '/watch-list',
  '/cap-lab',
  '/front-office',
  '/endorsements',
  '/team-needs',
  '/draft',
  '/draft-recap',
  '/expansion-draft',
  '/free-agency',
  '/fa-targets',
  '/trade-deadline',
  '/presentation',
  '/play-by-play',
  '/game-flow',
  '/super-bowl',
  '/social',
  '/waivers',
  '/practice-squad',
  '/schedule',
  '/coaching',
  '/coaching/tree',
  '/coaching/relationships',
  '/training-camp',
  '/mentors',
  '/player-development',
  '/compare',
  '/rivalries',
  '/owner',
  '/commissioner',
  '/cba',
  '/league-rules',
  '/legends',
  '/news',
  '/records',
  '/stat-central',
  '/analytics',
  '/power-rankings',
  '/league/weather',
  '/trade-block',
  '/scenarios',
  '/legacy',
  '/legacy/named-games',
  '/legacy/bloodlines',
  '/awards',
  '/franchise/career',
  '/franchise/book',
  '/franchise/chronicle',
  '/franchise/scrapbook',
  '/franchise/hall',
  '/franchise/trophy-room',
  '/franchise/eras',
  '/franchise/mvps',
  '/franchise/playoff-lore',
  '/franchise/achievements',
  '/season/recap',
  '/relocate',
  '/about',
  '/credits',
  '/faq',
  '/dynasty',
  '/settings',
]);

function getSidebarRoutes(): string[] {
  return APP_ROUTE_REGISTRY.map((route) => route.path);
}

describe('Tutorial route coverage', () => {
  it('extracts sidebar routes from App navigation', () => {
    const routes = getSidebarRoutes();

    expect(routes).toContain('/');
    expect(routes).toContain('/game-plan');
    expect(routes).toContain('/league-pulse');
  });

  it('covers every sidebar route with a tutorial step or explicit allowlist entry', () => {
    const tutorialRoutes = new Set(
      createDefaultTutorialState().steps
        .map((step) => step.targetScreen)
        .filter((route): route is string => typeof route === 'string'),
    );
    const uncoveredRoutes = getSidebarRoutes().filter(
      (route) => !tutorialRoutes.has(route) && !TUTORIAL_ROUTE_ALLOWLIST.has(route),
    );

    expect(uncoveredRoutes).toEqual([]);
  });

  it('covers the launch tutorial systems on their owning routes', () => {
    const tutorialRoutes = new Set(createDefaultTutorialState().steps.map((step) => step.targetScreen));

    expect(tutorialRoutes).toContain('/game-plan');
    expect(tutorialRoutes).toContain('/game-day');
    expect(tutorialRoutes).toContain('/film-room');
    expect(tutorialRoutes).toContain('/newsroom');
    expect(tutorialRoutes).toContain('/league-pulse');
  });

  it('does not allowlist routes that already have tutorial steps', () => {
    const tutorialRoutes = new Set(createDefaultTutorialState().steps.map((step) => step.targetScreen));
    const redundantAllowlist = [...TUTORIAL_ROUTE_ALLOWLIST].filter((route) => tutorialRoutes.has(route));

    expect(redundantAllowlist).toEqual([]);
  });

  it('keeps allowlist entries pointed at real sidebar routes', () => {
    const routes = new Set(getSidebarRoutes());
    const staleAllowlistEntries = [...TUTORIAL_ROUTE_ALLOWLIST].filter((route) => !routes.has(route));

    expect(staleAllowlistEntries).toEqual([]);
  });
});
