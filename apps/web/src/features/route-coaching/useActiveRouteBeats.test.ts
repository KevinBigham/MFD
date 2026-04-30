import { describe, expect, it } from 'vitest';
import { ROUTE_BEAT_REGISTRY } from './routeBeatRegistry';
import { resolveRouteKey, selectActiveRouteBeats } from './useActiveRouteBeats';

describe('useActiveRouteBeats selectors', () => {
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

  it('normalizes app route paths to route coaching keys', () => {
    expect(resolveRouteKey('#/roster')).toBe('roster');
    expect(resolveRouteKey('/coaching/tree')).toBe('staff');
    expect(resolveRouteKey('/cap-lab')).toBe('cap-laboratory');
    expect(resolveRouteKey('/draft')).toBe('draft-board');
    expect(resolveRouteKey('/trades')).toBe('trade-center');
    expect(resolveRouteKey('/scouting')).toBe('scouting-board');
  });
});
