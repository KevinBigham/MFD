import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { APP_ROUTE_REGISTRY } from '@mfd/engine/config';
import { ROUTE_BEAT_REGISTRY, ROUTE_KEYS, type RouteKey } from './routeBeatRegistry';
import {
  ALL_ROUTE_COACHING_BEAT_IDS,
  __getActiveRouteBeatCacheSize,
  __resetActiveRouteBeatCacheForTests,
  resolveRouteKey,
  selectActiveRouteBeats,
  useActiveRouteBeats,
} from './useActiveRouteBeats';

const APP_SOURCE = readFileSync(new URL('../../app/App.tsx', import.meta.url), 'utf-8');
const ROUTE_COACHED_NAV_PATHS = new Map<string, RouteKey>([
  ['/', 'monday-briefing'],
  ['/roster', 'roster'],
  ['/locker-room', 'locker-room'],
  ['/contracts', 'cap-laboratory'],
  ['/cap-lab', 'cap-laboratory'],
  ['/trades', 'trade-center'],
  ['/trade-block', 'trade-market-radar'],
  ['/team-needs', 'market-planning'],
  ['/free-agency', 'market-planning'],
  ['/fa-targets', 'market-planning'],
  ['/waivers', 'roster-churn'],
  ['/practice-squad', 'roster-churn'],
  ['/scouting', 'scouting-board'],
  ['/draft', 'draft-board'],
  ['/game-plan', 'game-plan'],
  ['/game-day', 'game-day-recap'],
  ['/broadcast', 'broadcast-suite'],
  ['/presentation', 'broadcast-suite'],
  ['/play-by-play', 'broadcast-suite'],
  ['/game-flow', 'broadcast-suite'],
  ['/film-room', 'film-room'],
  ['/super-bowl', 'super-bowl'],
  ['/schedule', 'schedule'],
  ['/watch-list', 'watch-list'],
  ['/inbox', 'inbox'],
  ['/owner', 'owner-promises'],
  ['/handshakes', 'owner-promises'],
  ['/depth-chart', 'depth-chart'],
  ['/coaching', 'staff'],
  ['/coaching/relationships', 'staff'],
  ['/coaching/tree', 'staff'],
  ['/training-camp', 'training-camp'],
  ['/mentors', 'mentors'],
  ['/player-development', 'player-development'],
  ['/compare', 'player-comparison'],
  ['/rivalries', 'player-rivalries'],
  ['/front-office', 'front-office'],
  ['/endorsements', 'endorsements'],
  ['/franchise', 'record-book'],
  ['/franchise/achievements', 'record-book'],
  ['/franchise/book', 'record-book'],
  ['/franchise/career', 'record-book'],
  ['/franchise/chronicle', 'record-book'],
  ['/franchise/eras', 'record-book'],
  ['/franchise/hall', 'record-book'],
  ['/franchise/mvps', 'record-book'],
  ['/franchise/playoff-lore', 'record-book'],
  ['/franchise/scrapbook', 'record-book'],
  ['/franchise/trophy-room', 'record-book'],
  ['/week-advance', 'week-advance'],
  ['/news', 'league-news'],
  ['/newsroom', 'newsroom'],
  ['/social', 'social-feed'],
  ['/commissioner', 'commissioner-governance'],
  ['/cba', 'cba'],
  ['/league-rules', 'league-rules'],
  ['/scenarios', 'scenario-constraints'],
  ['/records', 'record-book'],
  ['/awards', 'awards-hub'],
  ['/legends', 'franchise-legends'],
  ['/standings', 'standings'],
  ['/stat-central', 'analytics-evidence'],
  ['/analytics', 'analytics-evidence'],
  ['/power-rankings', 'power-rankings'],
  ['/league-pulse', 'league-pulse'],
  ['/league/weather', 'league-weather'],
  ['/legacy', 'record-book'],
  ['/legacy/bloodlines', 'record-book'],
  ['/legacy/named-games', 'record-book'],
  ['/season/recap', 'season-recap'],
  ['/draft-recap', 'draft-recap'],
  ['/trade-deadline', 'trade-deadline'],
  ['/relocate', 'relocation'],
  ['/expansion-draft', 'expansion-draft'],
  ['/dynasty', 'dynasty-save-load'],
  ['/settings', 'settings'],
]);
const UNCOACHED_NAV_PATHS = [
  '/about',
  '/credits',
  '/faq',
] as const;
const ROUTE_COACHED_DIRECT_PATHS = new Map<string, RouteKey>([
  ['/player/$playerId', 'player-profile'],
  ['/player/$playerId/timeline', 'player-timeline'],
]);
const UNCOACHED_DIRECT_PATHS = [] as const;

function extractNavItemPaths(): string[] {
  return APP_ROUTE_REGISTRY.map((route) => route.path);
}

function extractDirectOnlyRoutePaths(): string[] {
  const match = APP_SOURCE.match(/const CONTEXTUAL_ROUTE_PATHS = new Set\(\[([^\]]+)]\);/);
  expect(match?.[1], 'CONTEXTUAL_ROUTE_PATHS should be present in App.tsx').toBeDefined();

  return Array.from((match?.[1] ?? '').matchAll(/'([^']+)'/g), (pathMatch) => pathMatch[1]!).sort();
}

describe('useActiveRouteBeats selectors', () => {
  afterEach(() => {
    __resetActiveRouteBeatCacheForTests();
    vi.unstubAllGlobals();
  });

  it('renders App-level route coaching when localStorage property access is blocked', () => {
    const blockedWindow = {};
    Object.defineProperty(blockedWindow, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('route storage property blocked');
      },
    });
    vi.stubGlobal('window', blockedWindow);

    function RouteBeatProbe() {
      const beats = useActiveRouteBeats('/', { currentWeek: 1 });
      return createElement('div', { 'data-route-beat-count': beats.length });
    }

    const markup = renderToStaticMarkup(createElement(RouteBeatProbe));
    expect(markup).toMatch(/data-route-beat-count="[1-9]\d*"/);
  });

  it('returns an empty list for an unknown route', () => {
    expect(selectActiveRouteBeats('/league-news', new Set())).toEqual([]);
  });

  it('returns the full route list when every beat is unseen', () => {
    expect(selectActiveRouteBeats('/roster', new Set())).toEqual(ROUTE_BEAT_REGISTRY.roster);
  });

  it('returns an empty list when every route beat has been seen', () => {
    const seen = new Set(ROUTE_BEAT_REGISTRY.staff.map((beat) => beat.id));

    expect(selectActiveRouteBeats('/coaching', seen)).toEqual([]);
  });

  it('keeps partial unseen beats in registry order', () => {
    const seen = new Set(['chip.route.trade-center.beat-1']);

    expect(selectActiveRouteBeats('/trades', seen).map((beat) => beat.id)).toEqual([
      'chip.route.trade-center.beat-2',
      'chip.route.trade-center.beat-3',
    ]);
  });

  it('does not mutate the provided seen-beat set', () => {
    const seen = new Set(['chip.route.draft-board.beat-1']);
    selectActiveRouteBeats('/draft', seen);

    expect(seen).toEqual(new Set(['chip.route.draft-board.beat-1']));
  });

  it('returns the same reference when route and seen inputs are unchanged', () => {
    const seen = new Set(['chip.route.cap-laboratory.beat-2']);
    const first = selectActiveRouteBeats('/cap-lab', seen);
    const second = selectActiveRouteBeats('/cap-lab', seen);

    expect(second).toBe(first);
  });

  it('returns the same reference for content-equal but different Set instances', () => {
    // Sprint 41 perf fix [11]: store mutations create a fresh seenBeats Set on
    // every change, even if the route's seen state is identical. The cache
    // must hit on content-equality, not Set identity, to avoid breaking
    // useMemo deps in ChipDock.
    const seenA = new Set(['chip.route.scouting-board.beat-1']);
    const seenB = new Set(['chip.route.scouting-board.beat-1']);
    const first = selectActiveRouteBeats('/scouting', seenA);
    const second = selectActiveRouteBeats('/scouting', seenB);

    expect(second).toBe(first);
  });

  it('caps cache at ROUTE_KEYS.length even after many distinct seen-set churns', () => {
    // Sprint 41 perf fix [10]: prior revision keyed on global seenBeatIds, so
    // unrelated beat-progress writes grew the cache unboundedly. The new
    // route-scoped signature must cap the cache at one entry per route.
    __resetActiveRouteBeatCacheForTests();
    expect(__getActiveRouteBeatCacheSize()).toBe(0);

    for (let i = 0; i < 200; i += 1) {
      const seen = new Set([
        // Force the partial-seen path so cache writes happen.
        'chip.route.roster.beat-1',
        // Add a noise id so each iteration's set is unique by content/identity.
        `synthetic-noise-${i}`,
      ]);
      selectActiveRouteBeats('/roster', seen);
    }

    expect(__getActiveRouteBeatCacheSize()).toBe(1);
    expect(__getActiveRouteBeatCacheSize()).toBeLessThanOrEqual(ROUTE_KEYS.length);
  });

  it('caches one entry per route across all post-setup screens', () => {
    __resetActiveRouteBeatCacheForTests();
    const seen = new Set([
      'chip.route.monday-briefing.beat-1',
      'chip.route.roster.beat-1',
      'chip.route.depth-chart.beat-1',
      'chip.route.locker-room.beat-1',
      'chip.route.game-plan.beat-1',
      'chip.route.game-day-recap.beat-1',
      'chip.route.broadcast-suite.beat-1',
      'chip.route.film-room.beat-1',
      'chip.route.super-bowl.beat-1',
      'chip.route.week-advance.beat-1',
      'chip.route.schedule.beat-1',
      'chip.route.watch-list.beat-1',
      'chip.route.inbox.beat-1',
      'chip.route.owner-promises.beat-1',
      'chip.route.staff.beat-1',
      'chip.route.cap-laboratory.beat-1',
      'chip.route.front-office.beat-1',
      'chip.route.endorsements.beat-1',
      'chip.route.draft-board.beat-1',
      'chip.route.draft-recap.beat-1',
      'chip.route.trade-center.beat-1',
      'chip.route.trade-market-radar.beat-1',
      'chip.route.market-planning.beat-1',
      'chip.route.roster-churn.beat-1',
      'chip.route.scouting-board.beat-1',
      'chip.route.standings.beat-1',
      'chip.route.analytics-evidence.beat-1',
      'chip.route.player-profile.beat-1',
      'chip.route.player-timeline.beat-1',
      'chip.route.player-development.beat-1',
      'chip.route.player-comparison.beat-1',
      'chip.route.player-rivalries.beat-1',
      'chip.route.power-rankings.beat-1',
      'chip.route.league-pulse.beat-1',
      'chip.route.league-weather.beat-1',
      'chip.route.league-news.beat-1',
      'chip.route.newsroom.beat-1',
      'chip.route.social-feed.beat-1',
      'chip.route.commissioner-governance.beat-1',
      'chip.route.cba.beat-1',
      'chip.route.league-rules.beat-1',
      'chip.route.scenario-constraints.beat-1',
      'chip.route.record-book.beat-1',
      'chip.route.awards-hub.beat-1',
      'chip.route.franchise-legends.beat-1',
      'chip.route.season-recap.beat-1',
      'chip.route.dynasty-save-load.beat-1',
      'chip.route.settings.beat-1',
      'chip.route.training-camp.beat-1',
      'chip.route.mentors.beat-1',
      'chip.route.trade-deadline.beat-1',
      'chip.route.relocation.beat-1',
      'chip.route.expansion-draft.beat-1',
    ]);

    selectActiveRouteBeats('/', seen);
    selectActiveRouteBeats('/roster', seen);
    selectActiveRouteBeats('/depth-chart', seen);
    selectActiveRouteBeats('/locker-room', seen);
    selectActiveRouteBeats('/game-plan', seen);
    selectActiveRouteBeats('/game-day', seen);
    selectActiveRouteBeats('/broadcast', seen);
    selectActiveRouteBeats('/film-room', seen);
    selectActiveRouteBeats('/super-bowl', seen);
    selectActiveRouteBeats('/week-advance', seen);
    selectActiveRouteBeats('/schedule', seen);
    selectActiveRouteBeats('/watch-list', seen);
    selectActiveRouteBeats('/inbox', seen);
    selectActiveRouteBeats('/owner', seen);
    selectActiveRouteBeats('/coaching', seen);
    selectActiveRouteBeats('/cap-lab', seen);
    selectActiveRouteBeats('/front-office', seen);
    selectActiveRouteBeats('/endorsements', seen);
    selectActiveRouteBeats('/draft', seen);
    selectActiveRouteBeats('/draft-recap', seen);
    selectActiveRouteBeats('/trades', seen);
    selectActiveRouteBeats('/trade-block', seen);
    selectActiveRouteBeats('/team-needs', seen);
    selectActiveRouteBeats('/waivers', seen);
    selectActiveRouteBeats('/scouting', seen);
    selectActiveRouteBeats('/standings', seen);
    selectActiveRouteBeats('/analytics', seen);
    selectActiveRouteBeats('/player/p1', seen);
    selectActiveRouteBeats('/player/p1/timeline', seen);
    selectActiveRouteBeats('/player-development', seen);
    selectActiveRouteBeats('/compare', seen);
    selectActiveRouteBeats('/rivalries', seen);
    selectActiveRouteBeats('/power-rankings', seen);
    selectActiveRouteBeats('/league-pulse', seen);
    selectActiveRouteBeats('/league/weather', seen);
    selectActiveRouteBeats('/news', seen);
    selectActiveRouteBeats('/newsroom', seen);
    selectActiveRouteBeats('/social', seen);
    selectActiveRouteBeats('/commissioner', seen);
    selectActiveRouteBeats('/cba', seen);
    selectActiveRouteBeats('/league-rules', seen);
    selectActiveRouteBeats('/scenarios', seen);
    selectActiveRouteBeats('/records', seen);
    selectActiveRouteBeats('/awards', seen);
    selectActiveRouteBeats('/legends', seen);
    selectActiveRouteBeats('/season/recap', seen);
    selectActiveRouteBeats('/dynasty', seen);
    selectActiveRouteBeats('/settings', seen);
    selectActiveRouteBeats('/training-camp', seen);
    selectActiveRouteBeats('/mentors', seen);
    selectActiveRouteBeats('/trade-deadline', seen);
    selectActiveRouteBeats('/relocate', seen);
    selectActiveRouteBeats('/expansion-draft', seen);

    expect(__getActiveRouteBeatCacheSize()).toBe(ROUTE_KEYS.length);
  });

  it('normalizes app route paths to route coaching keys', () => {
    expect(resolveRouteKey('/')).toBe('monday-briefing');
    expect(resolveRouteKey('#/roster')).toBe('roster');
    expect(resolveRouteKey('/depth-chart')).toBe('depth-chart');
    expect(resolveRouteKey('/locker-room')).toBe('locker-room');
    expect(resolveRouteKey('/game-plan')).toBe('game-plan');
    expect(resolveRouteKey('/game-day')).toBe('game-day-recap');
    expect(resolveRouteKey('/broadcast')).toBe('broadcast-suite');
    expect(resolveRouteKey('/presentation')).toBe('broadcast-suite');
    expect(resolveRouteKey('/play-by-play')).toBe('broadcast-suite');
    expect(resolveRouteKey('/game-flow')).toBe('broadcast-suite');
    expect(resolveRouteKey('/film-room')).toBe('film-room');
    expect(resolveRouteKey('/super-bowl')).toBe('super-bowl');
    expect(resolveRouteKey('/week-advance')).toBe('week-advance');
    expect(resolveRouteKey('/schedule')).toBe('schedule');
    expect(resolveRouteKey('/watch-list')).toBe('watch-list');
    expect(resolveRouteKey('/inbox')).toBe('inbox');
    expect(resolveRouteKey('/owner')).toBe('owner-promises');
    expect(resolveRouteKey('/handshakes')).toBe('owner-promises');
    expect(resolveRouteKey('/coaching/tree')).toBe('staff');
    expect(resolveRouteKey('/cap-lab')).toBe('cap-laboratory');
    expect(resolveRouteKey('/front-office')).toBe('front-office');
    expect(resolveRouteKey('/endorsements')).toBe('endorsements');
    expect(resolveRouteKey('/draft')).toBe('draft-board');
    expect(resolveRouteKey('/draft-recap')).toBe('draft-recap');
    expect(resolveRouteKey('/trades')).toBe('trade-center');
    expect(resolveRouteKey('/trade-block')).toBe('trade-market-radar');
    expect(resolveRouteKey('/team-needs')).toBe('market-planning');
    expect(resolveRouteKey('/free-agency')).toBe('market-planning');
    expect(resolveRouteKey('/fa-targets')).toBe('market-planning');
    expect(resolveRouteKey('/waivers')).toBe('roster-churn');
    expect(resolveRouteKey('/practice-squad')).toBe('roster-churn');
    expect(resolveRouteKey('/scouting')).toBe('scouting-board');
    expect(resolveRouteKey('/standings')).toBe('standings');
    expect(resolveRouteKey('/analytics')).toBe('analytics-evidence');
    expect(resolveRouteKey('/stat-central')).toBe('analytics-evidence');
    expect(resolveRouteKey('/player/$playerId')).toBe('player-profile');
    expect(resolveRouteKey('/player/p1')).toBe('player-profile');
    expect(resolveRouteKey('#/player/p1?from=roster')).toBe('player-profile');
    expect(resolveRouteKey('/player/$playerId/timeline')).toBe('player-timeline');
    expect(resolveRouteKey('/player/p1/timeline')).toBe('player-timeline');
    expect(resolveRouteKey('#/player/p1/timeline?from=profile')).toBe('player-timeline');
    expect(resolveRouteKey('/player-development')).toBe('player-development');
    expect(resolveRouteKey('/compare')).toBe('player-comparison');
    expect(resolveRouteKey('/rivalries')).toBe('player-rivalries');
    expect(resolveRouteKey('/power-rankings')).toBe('power-rankings');
    expect(resolveRouteKey('/league-pulse')).toBe('league-pulse');
    expect(resolveRouteKey('/league/weather')).toBe('league-weather');
    expect(resolveRouteKey('#/league/weather?from=schedule')).toBe('league-weather');
    expect(resolveRouteKey('/news')).toBe('league-news');
    expect(resolveRouteKey('/newsroom')).toBe('newsroom');
    expect(resolveRouteKey('/social')).toBe('social-feed');
    expect(resolveRouteKey('/commissioner')).toBe('commissioner-governance');
    expect(resolveRouteKey('/cba')).toBe('cba');
    expect(resolveRouteKey('/league-rules')).toBe('league-rules');
    expect(resolveRouteKey('/scenarios')).toBe('scenario-constraints');
    expect(resolveRouteKey('/records')).toBe('record-book');
    expect(resolveRouteKey('/awards')).toBe('awards-hub');
    expect(resolveRouteKey('/legends')).toBe('franchise-legends');
    expect(resolveRouteKey('/season/recap')).toBe('season-recap');
    expect(resolveRouteKey('#/season/recap')).toBe('season-recap');
    expect(resolveRouteKey('/legacy/named-games')).toBe('record-book');
    expect(resolveRouteKey('/franchise')).toBe('record-book');
    expect(resolveRouteKey('/dynasty')).toBe('dynasty-save-load');
    expect(resolveRouteKey('/settings')).toBe('settings');
    expect(resolveRouteKey('/training-camp')).toBe('training-camp');
    expect(resolveRouteKey('/mentors')).toBe('mentors');
    expect(resolveRouteKey('/trade-deadline')).toBe('trade-deadline');
    expect(resolveRouteKey('/relocate')).toBe('relocation');
    expect(resolveRouteKey('/expansion-draft')).toBe('expansion-draft');
  });

  it('keeps every primary nav path coached or explicitly uncoached', () => {
    const navPaths = extractNavItemPaths();
    const navPathSet = new Set(navPaths);
    const routeCoachedPaths = [...ROUTE_COACHED_NAV_PATHS.keys()];
    const uncoachedPathSet = new Set<string>(UNCOACHED_NAV_PATHS);

    expect(routeCoachedPaths.filter((path) => !navPathSet.has(path))).toEqual([]);
    expect(UNCOACHED_NAV_PATHS.filter((path) => !navPathSet.has(path))).toEqual([]);
    expect([...new Set([...routeCoachedPaths, ...UNCOACHED_NAV_PATHS])].length).toBe(navPaths.length);
    expect(navPaths.filter((path) => !ROUTE_COACHED_NAV_PATHS.has(path) && !uncoachedPathSet.has(path))).toEqual([]);

    for (const [path, routeKey] of ROUTE_COACHED_NAV_PATHS) {
      expect(resolveRouteKey(path)).toBe(routeKey);
    }

    expect(UNCOACHED_NAV_PATHS.map((path) => [path, resolveRouteKey(path)])).toEqual(
      UNCOACHED_NAV_PATHS.map((path) => [path, null]),
    );
  });

  it('keeps every direct-only route path coached or explicitly uncoached', () => {
    const directOnlyPaths = extractDirectOnlyRoutePaths();
    const routeCoachedPaths = [...ROUTE_COACHED_DIRECT_PATHS.keys()];
    const uncoachedPathSet = new Set<string>(UNCOACHED_DIRECT_PATHS);
    const decidedPaths = [...new Set([...routeCoachedPaths, ...UNCOACHED_DIRECT_PATHS])].sort();

    expect(routeCoachedPaths.filter((path) => !directOnlyPaths.includes(path))).toEqual([]);
    expect(UNCOACHED_DIRECT_PATHS.filter((path) => !directOnlyPaths.includes(path))).toEqual([]);
    expect(decidedPaths).toEqual(directOnlyPaths);
    expect(directOnlyPaths.filter((path) => !ROUTE_COACHED_DIRECT_PATHS.has(path) && !uncoachedPathSet.has(path))).toEqual([]);

    for (const [path, routeKey] of ROUTE_COACHED_DIRECT_PATHS) {
      expect(resolveRouteKey(path)).toBe(routeKey);
    }

    expect(UNCOACHED_DIRECT_PATHS.map((path) => [path, resolveRouteKey(path)])).toEqual(
      UNCOACHED_DIRECT_PATHS.map((path) => [path, null]),
    );
  });

  it('keeps every route coaching key reachable from a nav or documented direct path', () => {
    for (const [path, routeKey] of ROUTE_COACHED_DIRECT_PATHS) {
      expect(resolveRouteKey(path)).toBe(routeKey);
    }

    const reachableRouteKeys = new Set([
      ...ROUTE_COACHED_NAV_PATHS.values(),
      ...ROUTE_COACHED_DIRECT_PATHS.values(),
    ]);

    expect(ROUTE_KEYS.filter((routeKey) => !reachableRouteKeys.has(routeKey))).toEqual([]);
  });
});

describe('ALL_ROUTE_COACHING_BEAT_IDS (G7)', () => {
  it('covers every first-ten beat and every registry beat exactly once', () => {
    const registryIds = ROUTE_KEYS.flatMap((key) => ROUTE_BEAT_REGISTRY[key].map((beat) => beat.id));
    for (const id of registryIds) {
      expect(ALL_ROUTE_COACHING_BEAT_IDS, id).toContain(id);
    }
    expect(ALL_ROUTE_COACHING_BEAT_IDS.some((id) => id.startsWith('chip.first10.'))).toBe(true);
    expect(new Set(ALL_ROUTE_COACHING_BEAT_IDS).size).toBe(ALL_ROUTE_COACHING_BEAT_IDS.length);
  });
});

describe('G9 seeded first-ten flavor through the hook', () => {
  afterEach(() => {
    __resetActiveRouteBeatCacheForTests();
    vi.unstubAllGlobals();
  });

  function flavorProbeMarkup(seed?: number): string {
    function RouteBeatProbe() {
      const beats = useActiveRouteBeats('/roster', { currentWeek: 4, dynastySeed: seed });
      return createElement('div', { 'data-first-beat-text': beats[0]?.text ?? '' });
    }
    return renderToStaticMarkup(createElement(RouteBeatProbe));
  }

  it('serves canonical first-ten text byte-for-byte without a seed', () => {
    const unseeded = flavorProbeMarkup(undefined);
    expect(unseeded).toContain(
      'Recommended: open Roster before Game Plan. Where: injuries and first backups. Consequence: uncovered backups force emergency signings.',
    );
    expect(unseeded).not.toMatch(/Fifty-three names|Roles first|Every name on this page/);
  });

  it('appends a deterministic seeded flavor closer inside the bubble budget', () => {
    const seeded = flavorProbeMarkup(42);
    expect(seeded).toContain('Consequence: uncovered backups force emergency signings.');
    expect(seeded).toMatch(/Fifty-three names|Roles first|Every name on this page/);
    // Same seed + week replays the identical text.
    expect(flavorProbeMarkup(42)).toBe(seeded);
  });
});

describe('G2 playoff beat variants through the hook', () => {
  afterEach(() => {
    __resetActiveRouteBeatCacheForTests();
    vi.unstubAllGlobals();
  });

  function playoffProbeMarkup(phase?: string): string {
    function RouteBeatProbe() {
      const beats = useActiveRouteBeats('/trades', { currentWeek: 19, phase });
      return createElement('div', { 'data-beats': beats.map((beat) => `${beat.id}=${beat.text}`).join('|') });
    }
    return renderToStaticMarkup(createElement(RouteBeatProbe));
  }

  it('serves the playoff variant for a covered tier-1 beat during the playoffs', () => {
    function BriefingProbe() {
      const beats = useActiveRouteBeats('/', { currentWeek: 19, phase: 'playoffs' });
      return createElement('div', { 'data-beats': beats.map((beat) => `${beat.id}=${beat.text}`).join('|') });
    }
    const markup = renderToStaticMarkup(createElement(BriefingProbe));
    expect(markup).toContain('one missed injury or matchup call ends the season.');
  });

  it('keeps canonical text byte-for-byte outside the playoffs and for uncovered beats', () => {
    const regular = playoffProbeMarkup('regular_season');
    expect(regular).toContain('Recommended: choose starter or backup job before calls.');
    expect(regular).not.toContain('ends the season.');

    // Trades is not one of the ten covered routes: playoffs change nothing.
    const playoff = playoffProbeMarkup('playoffs');
    expect(playoff).toContain('Recommended: choose starter or backup job before calls.');
  });
});

describe('G3 week-toned beat variants through the hook', () => {
  afterEach(() => {
    __resetActiveRouteBeatCacheForTests();
    vi.unstubAllGlobals();
  });

  function briefingBeatMarkup(context: { currentWeek?: number; phase?: string }): string {
    function BriefingProbe() {
      const beats = useActiveRouteBeats('/', context);
      return createElement('div', { 'data-beats': beats.map((beat) => `${beat.id}=${beat.text}`).join('|') });
    }
    return renderToStaticMarkup(createElement(BriefingProbe));
  }

  it('serves the early-season variant during weeks 1 through 4', () => {
    const week2 = briefingBeatMarkup({ currentWeek: 2 });
    expect(week2).toContain('small misses in September grow into real problems later.');
    expect(week2).not.toContain('open Action Center. Where: Monday Briefing. Consequence: Advance Week locks');

    const week4 = briefingBeatMarkup({ currentWeek: 4 });
    expect(week4).toContain('small misses in September grow into real problems later.');
  });

  it('serves the stretch-run variant from week 15 on', () => {
    const week16 = briefingBeatMarkup({ currentWeek: 16 });
    expect(week16).toContain('one missed note now costs the playoff picture.');
    expect(week16).not.toContain('open Action Center. Where: Monday Briefing. Consequence: Advance Week locks');

    const week15 = briefingBeatMarkup({ currentWeek: 15 });
    expect(week15).toContain('one missed note now costs the playoff picture.');
  });

  it('keeps canonical text byte-for-byte in mid-season weeks and without context', () => {
    const week8 = briefingBeatMarkup({ currentWeek: 8 });
    expect(week8).toContain('Must Do: open Action Center. Where: Monday Briefing. Consequence: Advance Week locks injuries, promises, deadlines, and opponent prep.');
    expect(week8).not.toContain('September');
    expect(week8).not.toContain('playoff picture');

    const noContext = briefingBeatMarkup({});
    expect(noContext).toContain('Must Do: open Action Center. Where: Monday Briefing. Consequence: Advance Week locks injuries, promises, deadlines, and opponent prep.');
  });

  it('lets the playoff variant win the collision with late-season weeks', () => {
    const playoffWeek19 = briefingBeatMarkup({ currentWeek: 19, phase: 'playoffs' });
    expect(playoffWeek19).toContain('one missed injury or matchup call ends the season.');
    expect(playoffWeek19).not.toContain('playoff picture');

    // Late-season tone still applies to non-playoff phases at the same week.
    const regularWeek19 = briefingBeatMarkup({ currentWeek: 19, phase: 'regular_season' });
    expect(regularWeek19).toContain('one missed note now costs the playoff picture.');
  });
});
