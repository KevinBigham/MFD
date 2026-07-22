/**
 * Sprint 43 — Progressive tab disclosure tests.
 */

import { describe, it, expect } from 'vitest';
import {
  NAV_UNLOCK_RULES,
  MIDSEASON_UNLOCK_WEEK,
  getNavUnlockStatus,
  isNavItemUnlocked,
} from './navigation';
import { APP_ROUTE_REGISTRY, APP_ROOMS, NERD_NAV_GROUPS } from './route-registry';

describe('navigation unlock rules', () => {
  it('covers current primary shell routes while preserving explicit gates', () => {
    expect(NAV_UNLOCK_RULES).toHaveLength(APP_ROUTE_REGISTRY.length);
    expect(NAV_UNLOCK_RULES[0]).toEqual({ route: '/', label: 'Monday Briefing', unlockWeek: 'always' });
    expect(NAV_UNLOCK_RULES.at(-1)).toEqual({ route: '/settings', label: 'Settings', unlockWeek: 'always' });
    expect(NAV_UNLOCK_RULES.filter((rule) => rule.unlockWeek === 4).map((rule) => rule.route))
      .toEqual(['/contracts', '/trades']);
    expect(NAV_UNLOCK_RULES.filter((rule) => rule.unlockWeek === 'midseason').map((rule) => rule.route))
      .toEqual(['/scouting', '/power-rankings']);
    expect(NAV_UNLOCK_RULES.filter((rule) => rule.unlockPhase).map((rule) => [rule.route, rule.unlockPhase]))
      .toEqual([
        ['/training-camp', 'training_camp'],
        ['/draft', 'draft'],
        ['/free-agency', 'free_agency'],
      ]);
  });

  it('roster is always unlocked', () => {
    expect(isNavItemUnlocked('/roster', { week: 1, phase: 'regular_season' })).toBe(true);
    expect(isNavItemUnlocked('/roster', { week: 17, phase: 'playoffs' })).toBe(true);
  });

  it('trades unlocks at week 4', () => {
    expect(isNavItemUnlocked('/trades', { week: 3, phase: 'regular_season' })).toBe(false);
    expect(isNavItemUnlocked('/trades', { week: 4, phase: 'regular_season' })).toBe(true);
    expect(getNavUnlockStatus('/trades', { week: 2, phase: 'regular_season' }).unlockLabel)
      .toBe('Unlocks Week 4');
  });

  it('midseason routes unlock at MIDSEASON_UNLOCK_WEEK', () => {
    expect(isNavItemUnlocked('/scouting', { week: MIDSEASON_UNLOCK_WEEK - 1, phase: 'regular_season' }))
      .toBe(false);
    expect(isNavItemUnlocked('/scouting', { week: MIDSEASON_UNLOCK_WEEK, phase: 'regular_season' }))
      .toBe(true);
  });

  it('draft is offseason-phase-gated', () => {
    expect(isNavItemUnlocked('/draft', { week: 10, phase: 'regular_season' })).toBe(false);
    expect(isNavItemUnlocked('/draft', { week: 1, phase: 'draft' })).toBe(true);
  });

  it('returns readable labels for phase-gated routes before they unlock', () => {
    expect(getNavUnlockStatus('/draft', { week: 10, phase: 'regular_season' }).unlockLabel)
      .toBe('Unlocks in Draft');
    expect(getNavUnlockStatus('/free-agency', { week: 10, phase: 'regular_season' }).unlockLabel)
      .toBe('Unlocks in Free Agency');
    expect(getNavUnlockStatus('/training-camp', { week: 10, phase: 'regular_season' }).unlockLabel)
      .toBe('Unlocks in Training Camp');
  });

  it('unknown routes fall through to unlocked', () => {
    expect(isNavItemUnlocked('/custom-unregistered', { week: 1, phase: 'regular_season' }))
      .toBe(true);
  });

  it('does not list the unregistered briefing alias as progressive unlock metadata', () => {
    expect(NAV_UNLOCK_RULES.some((rule) => rule.route === '/briefing')).toBe(false);
    expect(getNavUnlockStatus('/briefing', { week: 1, phase: 'regular_season' })).toEqual({
      unlocked: true,
      unlockLabel: null,
    });
  });

  it('every rule has a unique route', () => {
    const routes = NAV_UNLOCK_RULES.map((r) => r.route);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('uses one canonical registry for five-room and nerd navigation', () => {
    expect(APP_ROOMS).toHaveLength(5);
    expect(NERD_NAV_GROUPS).toHaveLength(8);
    expect(new Set(APP_ROUTE_REGISTRY.map((entry) => entry.path)).size).toBe(APP_ROUTE_REGISTRY.length);
    expect(new Set(APP_ROUTE_REGISTRY.map((entry) => entry.room)))
      .toEqual(new Set(APP_ROOMS.map((room) => room.id)));
    expect(new Set(APP_ROUTE_REGISTRY.map((entry) => entry.nerdGroup)))
      .toEqual(new Set(NERD_NAV_GROUPS.map((group) => group.id)));
    expect(NAV_UNLOCK_RULES.map((rule) => rule.route))
      .toEqual(APP_ROUTE_REGISTRY.map((entry) => entry.path));
  });
});
