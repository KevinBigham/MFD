import { describe, expect, it } from 'vitest';
import { createDefaultTutorialState } from '@mfd/engine';
import appSource from '../../app/App.tsx?raw';

const TUTORIAL_ROUTE_ALLOWLIST = new Set([
  '/locker-room',
  '/watch-list',
  '/cap-lab',
  '/front-office',
  '/endorsements',
  '/team-needs',
  '/draft',
  '/free-agency',
  '/fa-targets',
  '/presentation',
  '/play-by-play',
  '/game-flow',
  '/super-bowl',
  '/social',
  '/waivers',
  '/practice-squad',
  '/schedule',
  '/coaching',
  '/training-camp',
  '/mentors',
  '/owner',
  '/commissioner',
  '/legends',
  '/news',
  '/records',
  '/stat-central',
  '/analytics',
  '/power-rankings',
  '/trade-block',
  '/scenarios',
  '/legacy',
  '/awards',
  '/about',
  '/credits',
  '/faq',
  '/dynasty',
  '/settings',
]);

function getSidebarRoutes(): string[] {
  const navItemsBlock = appSource.match(/const NAV_ITEMS: NavItem\[\] = \[([\s\S]*?)\];/)?.[1];

  expect(navItemsBlock).toBeDefined();

  return [...navItemsBlock!.matchAll(/\{\s*path:\s*'([^']+)'/g)].map((match) => match[1]!);
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
