/**
 * The navigation model is pure, so the IA is assertable without a browser.
 *
 * What these protect is the audit's core navigation claim: five stable job
 * destinations, derived from the same surface map the route matrix uses, with
 * badges from the same ledger Today renders. Every one of those "same" claims
 * is a place two sources could drift apart, so each has a test that fails when
 * they do.
 */

import { describe, expect, it } from 'vitest';
import { APP_ROUTE_REGISTRY } from '@mfd/engine/config';
import { ROUTE_SURFACE_ENTRIES, routeSurface } from '../routes/route-surface-map';
import { HUB_IDS, HUB_LABELS, type HubId, type RouteSurfaceMeta } from '../routes/route-surface-types';
import { V2_SHELL_ROUTES } from '../migration/ui-overhaul-mode';
import { mergeTaskLedger, taskDestination, type UiTask } from '../tasks/task-ledger';
import {
  MAX_BADGE,
  PRIMARY_HUBS,
  SECONDARY_HUBS,
  SECONDARY_HUB_LANDINGS,
  V2_ROUTE_HUBS,
  buildNavigationModel,
  destinationRoute,
  hubBadges,
  navDestination,
  resolveActiveHub,
} from './navigation-model';

function task(overrides: Partial<UiTask> & { id: string; route: string }): UiTask {
  const { route, ...rest } = overrides;
  return {
    category: 'recommended',
    title: overrides.id,
    reason: 'reason',
    consequence: 'consequence',
    severity: 'warning',
    blocksAdvance: false,
    source: 'state',
    dedupeKey: overrides.id,
    ...rest,
    destination: taskDestination(route),
  };
}

describe('navigation destinations', () => {
  it('offers exactly the five job destinations the IA names, in loop order', () => {
    expect(PRIMARY_HUBS).toEqual(['today', 'team', 'game', 'office', 'league']);
    expect(buildNavigationModel('/').primary.map((entry) => entry.label)).toEqual([
      'Today',
      'Team',
      'Game',
      'Office',
      'League',
    ]);
  });

  it('resolves every primary destination, so no tab is ever missing', () => {
    const model = buildNavigationModel('/');
    expect(model.primary).toHaveLength(PRIMARY_HUBS.length);
    expect(model.secondary).toHaveLength(SECONDARY_HUBS.length);
    expect([...PRIMARY_HUBS, ...SECONDARY_HUBS].sort()).toEqual([...HUB_IDS].sort());
  });

  it('takes each primary landing from the surface map, not from a second list', () => {
    // Exactly one route per phone hub carries `permanentNav`. If the map ever
    // nominates two, or none, the navigation silently picks the first — so
    // assert the property the derivation depends on rather than the result.
    for (const hub of PRIMARY_HUBS) {
      const nominated = ROUTE_SURFACE_ENTRIES.filter((entry) => entry.hub === hub && entry.permanentNav);
      expect(nominated, hub).toHaveLength(1);
    }
    for (const hub of SECONDARY_HUBS) {
      expect(ROUTE_SURFACE_ENTRIES.filter((entry) => entry.hub === hub && entry.permanentNav), hub).toHaveLength(0);
    }
  });

  it('points the migrated hub at the new route and every other hub at its legacy path', () => {
    const byHub = Object.fromEntries(
      buildNavigationModel('/').primary.map((entry) => [entry.hub, entry]),
    ) as Record<HubId, ReturnType<typeof navDestination>>;

    expect(byHub.today).toMatchObject({ route: '/today', migrated: true });
    expect(byHub.team).toMatchObject({ route: '/roster', migrated: false });
    expect(byHub.game).toMatchObject({ route: '/game-day', migrated: false });
    expect(byHub.office).toMatchObject({ route: '/front-office', migrated: false });
    expect(byHub.league).toMatchObject({ route: '/standings', migrated: false });
  });

  it('keeps any structural query state a canonical path carries', () => {
    // `migrated` is decided on the normalised path so `/today?panel=readiness`
    // resolves to the shell's `/today`; the link must still be the full path,
    // or the destination lands on the right screen with the wrong panel.
    //
    // Every real migrated entry today is `/` → `/today`, with no query, so
    // walking the model proves nothing: returning the normalised path instead
    // passes. The rule is exercised on a constructed entry that has one.
    const withPanel: RouteSurfaceMeta = {
      ...ROUTE_SURFACE_ENTRIES.find((entry) => entry.permanentNav && entry.hub === 'today')!,
      canonicalPath: '/today?panel=readiness',
    };

    expect(destinationRoute(withPanel)).toEqual({ route: '/today?panel=readiness', migrated: true });
    expect(destinationRoute({ ...withPanel, canonicalPath: '/team/roster?pos=QB' }))
      .toEqual({ route: withPanel.legacyPath, migrated: false });
  });

  it('marks a destination migrated only when the shell actually owns that path', () => {
    // The migration switch: `migrated` is true exactly for hubs whose canonical
    // path is in the shell's route set. Four of five are false today, and that
    // is the strangler boundary, not a bug — so it is asserted, not assumed.
    for (const destination of buildNavigationModel('/').primary) {
      expect(destination.migrated, destination.hub).toBe(V2_SHELL_ROUTES.has(destination.route));
    }
    expect(buildNavigationModel('/').primary.filter((entry) => entry.migrated)).toHaveLength(1);
  });

  it('sends unmigrated destinations to paths the canonical registry still serves', () => {
    // A nav link into a path no route mounts is a dead end, and ROUTE-01 exists
    // to stop exactly that.
    const canonical = new Set(APP_ROUTE_REGISTRY.map((definition) => definition.path));
    for (const destination of [...buildNavigationModel('/').primary, ...buildNavigationModel('/').secondary]) {
      if (destination.migrated) continue;
      expect(canonical.has(destination.route), destination.route).toBe(true);
    }
  });

  it('keeps the two authored landings inside the hub they claim to lead to', () => {
    for (const [hub, landing] of Object.entries(SECONDARY_HUB_LANDINGS)) {
      expect(routeSurface(landing)?.hub, landing).toBe(hub);
    }
    expect(buildNavigationModel('/').secondary.map((entry) => entry.route)).toEqual([
      '/franchise',
      '/settings',
    ]);
  });

  it('labels every destination with visible text, never an icon alone', () => {
    for (const destination of [...buildNavigationModel('/').primary, ...buildNavigationModel('/').secondary]) {
      expect(destination.label, destination.hub).toBe(HUB_LABELS[destination.hub]);
      expect(destination.label.trim().length, destination.hub).toBeGreaterThan(0);
      expect(destination.placement.trim().length, destination.hub).toBeGreaterThan(0);
    }
  });

  it('agrees with the shell about which routes the new navigation covers', () => {
    expect(Object.keys(V2_ROUTE_HUBS).sort()).toEqual([...V2_SHELL_ROUTES].sort());
    for (const [route, hub] of Object.entries(V2_ROUTE_HUBS)) {
      expect(resolveActiveHub(route), route).toBe(hub);
    }
  });
});

describe('active hub', () => {
  it('finds the hub for a new-shell path through the map, not a special case', () => {
    expect(resolveActiveHub('/today')).toBe('today');
    expect(resolveActiveHub('#/today?panel=readiness')).toBe('today');
  });

  it('finds the hub for legacy paths across every hub', () => {
    expect(resolveActiveHub('/')).toBe('today');
    expect(resolveActiveHub('/depth-chart')).toBe('team');
    expect(resolveActiveHub('/game-day')).toBe('game');
    expect(resolveActiveHub('/cap-lab')).toBe('office');
    expect(resolveActiveHub('/standings')).toBe('league');
    expect(resolveActiveHub('/franchise/book')).toBe('dynasty');
    expect(resolveActiveHub('/settings')).toBe('system');
  });

  it('resolves a hub for all 79 canonical routes, so no screen is orphaned', () => {
    for (const definition of APP_ROUTE_REGISTRY) {
      expect(resolveActiveHub(definition.path), definition.path).toBeDefined();
    }
  });

  it('never has to choose: no path is claimed by two hubs, either way round', () => {
    // `resolveActiveHub` tries legacy paths first and canonical paths second.
    // That order is only safe while no path is claimed twice — otherwise the
    // active tab depends on which lookup ran first and on map order. Rather
    // than pin the order, pin the precondition that makes it irrelevant:
    // every path, legacy or canonical, resolves to exactly one hub.
    const owners = new Map<string, Set<string>>();
    const claim = (raw: string, hub: string) => {
      const [path = raw] = raw.split('?');
      const normalized = path.replace(/\/+$/, '') || '/';
      owners.set(normalized, (owners.get(normalized) ?? new Set()).add(hub));
    };

    for (const entry of ROUTE_SURFACE_ENTRIES) {
      claim(entry.legacyPath, entry.hub);
      claim(entry.canonicalPath, entry.hub);
    }

    expect(owners.size).toBeGreaterThan(79);
    for (const [path, hubs] of owners) {
      expect([...hubs], `${path} is claimed by ${[...hubs].join(' and ')}`).toHaveLength(1);
    }
  });

  it('answers undefined for an unknown path rather than guessing a hub', () => {
    for (const path of ['/not-a-route', '', null, undefined]) {
      expect(resolveActiveHub(path), String(path)).toBeUndefined();
    }
  });
});

describe('hub badges', () => {
  it('counts open jobs into the hub that owns their destination', () => {
    const merged = mergeTaskLedger([
      task({ id: 'a', route: '/roster', dedupeKey: 'roster-moves', category: 'must' }),
      task({ id: 'b', route: '/depth-chart', dedupeKey: 'depth-chart', category: 'must' }),
      task({ id: 'c', route: '/cap-lab', dedupeKey: 'cap' }),
    ]);

    // `/roster` and `/depth-chart` are both team-hub routes; `/cap-lab` is office.
    expect(hubBadges(merged)).toEqual({ team: 2, office: 1 });
  });

  it('counts a merged row once, matching the row Today actually renders', () => {
    const merged = mergeTaskLedger([
      task({ id: 'state-injury', route: '/roster', dedupeKey: 'roster-moves', category: 'must' }),
      task({ id: 'agm-injury', route: '/roster', dedupeKey: 'roster-moves', source: 'agm' }),
    ]);

    expect(merged).toHaveLength(1);
    expect(hubBadges(merged)).toEqual({ team: 1 });
  });

  it('counts jobs behind the overflow disclosure, not only the visible rows', () => {
    // The recommended lane renders three rows and hides the rest. The badge
    // counts open work, so it counts all of them — pinned because the opposite
    // reading ("the rows on screen") is the one the wording invites.
    const merged = mergeTaskLedger(
      Array.from({ length: 9 }, (_unused, index) =>
        task({ id: `r${index}`, route: '/roster', dedupeKey: `roster-${index}` })),
    );

    expect(merged).toHaveLength(9);
    expect(hubBadges(merged)).toEqual({ team: 9 });
  });

  it('excludes the always-available lane, so a badge can reach zero', () => {
    const merged = mergeTaskLedger([task({ id: 'save', route: '/dynasty', dedupeKey: 'save', category: 'optional' })]);

    expect(merged).toHaveLength(1);
    expect(hubBadges(merged)).toEqual({});
  });

  it('ignores a task whose route the map cannot place, rather than mis-attributing it', () => {
    const merged = mergeTaskLedger([task({ id: 'x', route: '/not-a-route', dedupeKey: 'x', category: 'must' })]);

    expect(merged[0]!.destination.hub).toBeUndefined();
    expect(hubBadges(merged)).toEqual({});
  });

  it('bounds the rendered count and keeps the true one', () => {
    const many = Array.from({ length: 12 }, (_unused, index) =>
      task({ id: `t${index}`, route: '/cap-lab', dedupeKey: `cap-${index}`, category: 'must' }),
    );
    const office = navDestination('office', hubBadges(mergeTaskLedger(many)))!;

    expect(office.badge).toBe(12);
    expect(office.badgeLabel).toBe('9+');
    expect(navDestination('office', { office: MAX_BADGE })!.badgeLabel).toBe('9');
    expect(navDestination('office', { office: 1 })!.badgeLabel).toBe('1');
  });

  it('shows no badge at zero rather than a zero', () => {
    const quiet = navDestination('office', {})!;
    expect(quiet.badge).toBe(0);
    expect(quiet.badgeLabel).toBe('');
  });
});
