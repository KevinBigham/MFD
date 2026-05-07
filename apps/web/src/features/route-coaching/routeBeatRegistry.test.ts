import { describe, expect, it } from 'vitest';
import {
  CHIP_ROUTE_POSES,
  ROUTE_BEAT_REGISTRY,
  ROUTE_KEYS,
  type RouteBeat,
  type RouteKey,
} from './routeBeatRegistry';

const allBeats: readonly RouteBeat[] = ROUTE_KEYS.reduce<RouteBeat[]>(
  (beats, routeKey) => [...beats, ...ROUTE_BEAT_REGISTRY[routeKey]],
  [],
);

describe('route beat registry', () => {
  it('keeps total route beats inside the public-release range', () => {
    expect(allBeats.length).toBeGreaterThanOrEqual(38);
    expect(allBeats.length).toBeLessThanOrEqual(42);
  });

  it('gives every coached route at least two beats', () => {
    for (const routeKey of ROUTE_KEYS) {
      expect(ROUTE_BEAT_REGISTRY[routeKey].length).toBeGreaterThanOrEqual(2);
    }
  });

  it('uses ids that are unique repo-wide within the registry', () => {
    const ids = allBeats.map((beat) => beat.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses only route spotlight targets matching the locked route pattern or null', () => {
    for (const beat of allBeats) {
      expect(beat.spotlightTarget).toSatisfy((target: string | null) =>
        target === null || /^chip\.route\.[a-z-]+\.beat-\d$/.test(target),
      );
    }
  });

  it('keeps every beat line below 140 characters', () => {
    for (const beat of allBeats) {
      expect(beat.text.length).toBeLessThan(140);
    }
  });

  it('uses only locked route Chip pose codes', () => {
    for (const beat of allBeats) {
      expect(CHIP_ROUTE_POSES).toContain(beat.pose);
    }
  });

  it('uses the public-release route coaching key set', () => {
    const expected: RouteKey[] = [
      'monday-briefing',
      'roster',
      'depth-chart',
      'game-plan',
      'week-advance',
      'inbox',
      'staff',
      'cap-laboratory',
      'draft-board',
      'trade-center',
      'scouting-board',
      'standings',
      'power-rankings',
      'league-pulse',
      'record-book',
      'settings-save-load',
      'training-camp',
      'trade-deadline',
      'expansion-draft',
    ];

    expect(ROUTE_KEYS).toEqual(expected);
    expect(Object.keys(ROUTE_BEAT_REGISTRY)).toEqual(expected);
  });

  it('keeps beat order stable by route and beat number', () => {
    expect(ROUTE_KEYS.map((routeKey) => ROUTE_BEAT_REGISTRY[routeKey].map((beat) => beat.id))).toEqual([
      ['chip.route.monday-briefing.beat-1', 'chip.route.monday-briefing.beat-2'],
      ['chip.route.roster.beat-1', 'chip.route.roster.beat-2'],
      ['chip.route.depth-chart.beat-1', 'chip.route.depth-chart.beat-2'],
      ['chip.route.game-plan.beat-1', 'chip.route.game-plan.beat-2'],
      ['chip.route.week-advance.beat-1', 'chip.route.week-advance.beat-2'],
      ['chip.route.inbox.beat-1', 'chip.route.inbox.beat-2'],
      ['chip.route.staff.beat-1', 'chip.route.staff.beat-2'],
      ['chip.route.cap-laboratory.beat-1', 'chip.route.cap-laboratory.beat-2'],
      ['chip.route.draft-board.beat-1', 'chip.route.draft-board.beat-2'],
      ['chip.route.trade-center.beat-1', 'chip.route.trade-center.beat-2'],
      ['chip.route.scouting-board.beat-1', 'chip.route.scouting-board.beat-2'],
      ['chip.route.standings.beat-1', 'chip.route.standings.beat-2'],
      ['chip.route.power-rankings.beat-1', 'chip.route.power-rankings.beat-2'],
      ['chip.route.league-pulse.beat-1', 'chip.route.league-pulse.beat-2'],
      ['chip.route.record-book.beat-1', 'chip.route.record-book.beat-2'],
      ['chip.route.settings-save-load.beat-1', 'chip.route.settings-save-load.beat-2'],
      ['chip.route.training-camp.beat-1', 'chip.route.training-camp.beat-2'],
      ['chip.route.trade-deadline.beat-1', 'chip.route.trade-deadline.beat-2'],
      ['chip.route.expansion-draft.beat-1', 'chip.route.expansion-draft.beat-2'],
    ]);
  });
});
