import { afterEach, describe, expect, it } from 'vitest';
import { ROUTE_BEAT_REGISTRY, ROUTE_KEYS } from './routeBeatRegistry';
import {
  __getActiveRouteBeatCacheSize,
  __resetActiveRouteBeatCacheForTests,
  resolveRouteKey,
  selectActiveRouteBeats,
} from './useActiveRouteBeats';

describe('useActiveRouteBeats selectors', () => {
  afterEach(() => {
    __resetActiveRouteBeatCacheForTests();
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
      'chip.route.game-plan.beat-1',
      'chip.route.week-advance.beat-1',
      'chip.route.inbox.beat-1',
      'chip.route.staff.beat-1',
      'chip.route.cap-laboratory.beat-1',
      'chip.route.draft-board.beat-1',
      'chip.route.trade-center.beat-1',
      'chip.route.scouting-board.beat-1',
      'chip.route.standings.beat-1',
      'chip.route.power-rankings.beat-1',
      'chip.route.league-pulse.beat-1',
      'chip.route.record-book.beat-1',
      'chip.route.settings-save-load.beat-1',
      'chip.route.training-camp.beat-1',
      'chip.route.trade-deadline.beat-1',
      'chip.route.expansion-draft.beat-1',
    ]);

    selectActiveRouteBeats('/', seen);
    selectActiveRouteBeats('/roster', seen);
    selectActiveRouteBeats('/depth-chart', seen);
    selectActiveRouteBeats('/game-plan', seen);
    selectActiveRouteBeats('/week-advance', seen);
    selectActiveRouteBeats('/inbox', seen);
    selectActiveRouteBeats('/coaching', seen);
    selectActiveRouteBeats('/cap-lab', seen);
    selectActiveRouteBeats('/draft', seen);
    selectActiveRouteBeats('/trades', seen);
    selectActiveRouteBeats('/scouting', seen);
    selectActiveRouteBeats('/standings', seen);
    selectActiveRouteBeats('/power-rankings', seen);
    selectActiveRouteBeats('/league-pulse', seen);
    selectActiveRouteBeats('/records', seen);
    selectActiveRouteBeats('/settings', seen);
    selectActiveRouteBeats('/training-camp', seen);
    selectActiveRouteBeats('/trade-deadline', seen);
    selectActiveRouteBeats('/expansion-draft', seen);

    expect(__getActiveRouteBeatCacheSize()).toBe(ROUTE_KEYS.length);
  });

  it('normalizes app route paths to route coaching keys', () => {
    expect(resolveRouteKey('/')).toBe('monday-briefing');
    expect(resolveRouteKey('#/roster')).toBe('roster');
    expect(resolveRouteKey('/depth-chart')).toBe('depth-chart');
    expect(resolveRouteKey('/game-plan')).toBe('game-plan');
    expect(resolveRouteKey('/week-advance')).toBe('week-advance');
    expect(resolveRouteKey('/inbox')).toBe('inbox');
    expect(resolveRouteKey('/coaching/tree')).toBe('staff');
    expect(resolveRouteKey('/cap-lab')).toBe('cap-laboratory');
    expect(resolveRouteKey('/draft')).toBe('draft-board');
    expect(resolveRouteKey('/trades')).toBe('trade-center');
    expect(resolveRouteKey('/scouting')).toBe('scouting-board');
    expect(resolveRouteKey('/standings')).toBe('standings');
    expect(resolveRouteKey('/power-rankings')).toBe('power-rankings');
    expect(resolveRouteKey('/news')).toBe('league-pulse');
    expect(resolveRouteKey('/newsroom')).toBe('league-pulse');
    expect(resolveRouteKey('/records')).toBe('record-book');
    expect(resolveRouteKey('/legacy/named-games')).toBe('record-book');
    expect(resolveRouteKey('/dynasty')).toBe('settings-save-load');
    expect(resolveRouteKey('/settings')).toBe('settings-save-load');
    expect(resolveRouteKey('/training-camp')).toBe('training-camp');
    expect(resolveRouteKey('/trade-deadline')).toBe('trade-deadline');
    expect(resolveRouteKey('/expansion-draft')).toBe('expansion-draft');
  });
});
